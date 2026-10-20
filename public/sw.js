/*
  The service worker.

  ── What it is for ─────────────────────────────────────────────────────────

  It makes the site installable, it makes an offline tap produce a page that
  explains itself instead of the browser's dinosaur, and — from v3, at the
  owner's request (docs/06 § "Offline dashboard") — it keeps the last-seen
  dashboard screens readable with no connection.

  ── The admin cache, and the rule that makes it safe ───────────────────────

  v2 cached nothing behind a session, because a cached admin screen is one that
  could be served after sign-out to whoever is holding the phone. v3 does cache
  admin PAGES, in their own cache, under two rules that keep that from being
  true:

    1. Signing out clears it. The dashboard posts `clear-admin` as part of sign
       out (admin-shell.tsx), and this worker deletes the admin cache. The
       installed app also locks behind a fingerprint, so a snatched unlocked
       phone is the only exposure, and that is the trade the owner asked for.
    2. Only GET navigations are cached, never `/api`, never `/auth`, never an
       RSC/server-action payload. A cached admin page is a rendered snapshot,
       not a live session: every online navigation still hits the network and
       the server re-checks the session, so a signed-out person online is
       bounced to the login screen exactly as before.

  Supabase is cross-origin and carries an auth header; it is skipped before
  anything else is considered.

  ── Versioning ─────────────────────────────────────────────────────────────

  The cache name carries a version. Bump it and the activate handler deletes
  every older cache, which is the one reliable way to get out of a bad deploy —
  a worker that cannot be replaced is the failure mode that makes people afraid
  of service workers, and it is almost always a stale cache rather than a stale
  worker.
*/

const VERSION = "v3";
const STATIC_CACHE = `hb-static-${VERSION}`;
const PAGE_CACHE = `hb-pages-${VERSION}`;
const ADMIN_CACHE = `hb-admin-${VERSION}`;
const OFFLINE_URL = "/offline";

/** Precached so the offline page is available the first time it is needed. */
const PRECACHE = [OFFLINE_URL, "/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      // A precache miss must not stop the worker installing. The offline page
      // is a courtesy; the install is what makes the app installable.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("hb-") && !key.endsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * Never served from a cache, and never written to one: the API, the auth
 * endpoints, and Next's server-action / RSC payloads — all request-specific and
 * several carrying session state. The admin PAGES are deliberately NOT here;
 * they are cached in their own bucket (see the header) and handled below.
 */
function isPrivate(url) {
  return (
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/auth") ||
    url.searchParams.has("_rsc")
  );
}

/** A dashboard page — its own cache, cleared on sign-out. */
function isAdminPage(url) {
  return url.pathname === "/admin" || url.pathname.startsWith("/admin/");
}

/** Build output and the files in /public: immutable, safe to serve from cache. */
function isStatic(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(?:css|js|woff2?|png|jpg|jpeg|webp|avif|svg|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Anything that changes state goes to the network, untouched.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cross-origin — Supabase Storage, the model endpoint, fonts. Left alone:
  // several carry credentials, and the ones that do not are already cached by
  // the browser's own HTTP cache.
  if (url.origin !== self.location.origin) return;

  if (isPrivate(url)) return;

  if (isStatic(url)) {
    /*
      Cache first. These paths are content-hashed by the build, so a hit is
      always the right file and a miss is always a file that has never been
      asked for before.
    */
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    /*
      Network first, with the last good copy as the fallback and the offline
      page behind that. Admin pages use their own cache so sign-out can wipe
      exactly them; public pages use the shared page cache.

      Never cache-first: a page that changed — a new listing, a published
      article, a fresh dashboard figure — would otherwise be served stale from a
      phone that is online, which is worse than a slightly slower load.
    */
    const cacheName = isAdminPage(url) ? ADMIN_CACHE : PAGE_CACHE;
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(cacheName).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit ?? caches.match(OFFLINE_URL))
            .then(
              (hit) =>
                hit ??
                new Response("Offline", {
                  status: 503,
                  headers: { "content-type": "text/plain" },
                }),
            ),
        ),
    );
  }
});

/** Save the main dashboard pages (and their build assets) so they open offline. */
async function warm(paths) {
  const [pageCache, staticCache] = await Promise.all([
    caches.open(ADMIN_CACHE),
    caches.open(STATIC_CACHE),
  ]);
  const assets = new Set();
  for (const path of paths) {
    try {
      const response = await fetch(path, { credentials: "same-origin" });
      // A redirect means signed out — do not cache the login page as a dashboard.
      if (!response.ok || response.redirected) continue;
      const html = await response.clone().text();
      for (const match of html.matchAll(/\/_next\/static\/[^"'\s\\<>]+/g)) {
        assets.add(match[0]);
      }
      await pageCache.put(new Request(path), response);
    } catch {
      /* offline or signed out — try again next time */
    }
  }
  for (const asset of assets) {
    if (await staticCache.match(asset)) continue;
    try {
      const response = await fetch(asset);
      if (response.ok) await staticCache.put(asset, response);
    } catch {
      /* skip */
    }
  }
}

/*
  A page can ask the worker to step aside.

  `registerServiceWorker` posts this after it detects an update, so a new
  deployment takes effect on the next navigation instead of whenever the last
  tab happens to close.
*/
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
  // Sign-out: wipe the dashboard snapshots so nothing signed-in is left on the
  // device. Named cache, so public pages and static assets are untouched.
  if (event.data === "clear-admin") {
    event.waitUntil(caches.delete(ADMIN_CACHE));
  }
  // The app asks for the main dashboard pages to be saved for offline use.
  if (event.data && event.data.type === "warm") {
    event.waitUntil(warm(event.data.paths || []));
  }
});

/* ── Push ──────────────────────────────────────────────────────────────────

  A notification that arrives with the app closed.

  ── Why the payload is read defensively ──────────────────────────────────

  The browser delivers whatever the sender encrypted. A malformed body, an
  empty push (some services send one to test a subscription) and a payload
  from an older version of the app all have to produce something sensible
  rather than an unhandled rejection inside the worker — a worker that throws
  here is one the browser may stop waking.

  ── iOS ──────────────────────────────────────────────────────────────────

  Safari delivers web push only to a web app that has been added to the home
  screen, and only from 16.4. In a browser tab on iOS this handler never runs,
  which is why the UI that asks for permission says so rather than offering a
  switch that does nothing.
*/

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "The House Boss", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "The House Boss";

  const options = {
    body: payload.body || "Something is waiting in the dashboard.",
    icon: "/icon-192.png",
    /*
      The badge is the small icon in the status bar and on the notification
      header. Android draws it from the ALPHA channel only, in one colour — a
      full-colour, fully opaque icon came out as a solid square (client,
      2026-10-13). This is a white silhouette of the logo figure on transparent.
    */
    badge: "/badge-96.png",
    /*
      `tag` collapses repeats.

      Three enquiries in a minute should not stack three notifications on a
      lock screen. Each kind replaces its own previous one, and `renotify`
      makes the replacement buzz rather than arrive silently.
    */
    tag: payload.tag || "house-boss",
    renotify: true,
    // The urgent ones stay on screen until she deals with them; the rest
    // behave normally and clear themselves.
    requireInteraction: payload.priority === "urgent",
    data: { url: payload.url || "/admin" },
  };

  // `waitUntil` keeps the worker alive until the notification is shown. Without
  // it the browser may kill it first and nothing appears.
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/admin";

  /*
    Focus the app if it is already open, rather than opening a second window.

    `includeUncontrolled` matters: a window loaded before this worker took
    control is still the app, and opening another copy next to it is the
    behaviour that makes a PWA feel broken.
  */
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if (client.url.includes("/admin") && "focus" in client) {
            client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      }),
  );
});
