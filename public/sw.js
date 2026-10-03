/*
  The service worker.

  ── What it is for ─────────────────────────────────────────────────────────

  Two things, and deliberately not a third. It makes the site installable, and
  it makes an offline tap produce a page that explains itself instead of the
  browser's dinosaur. It is NOT an offline copy of the dashboard, and it is not
  a performance layer — Vercel's CDN already is one.

  ── What it must never do ──────────────────────────────────────────────────

  Cache anything behind a session. A service worker is shared by every tab on
  the origin and outlives the page that installed it, so a cached admin screen
  is a page that can be served after sign-out, to whoever is holding the phone.
  Every request to /admin and /api goes straight to the network, always.

  The same rule covers Supabase: those are cross-origin and carry an auth
  header, and they are skipped before anything else is considered.

  ── Versioning ─────────────────────────────────────────────────────────────

  The cache name carries a version. Bump it and the activate handler deletes
  every older cache, which is the one reliable way to get out of a bad deploy —
  a worker that cannot be replaced is the failure mode that makes people afraid
  of service workers, and it is almost always a stale cache rather than a stale
  worker.
*/

const VERSION = "v1";
const STATIC_CACHE = `hb-static-${VERSION}`;
const PAGE_CACHE = `hb-pages-${VERSION}`;
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

/** True for anything that must never be served from a cache. */
function isPrivate(url) {
  return (
    url.pathname.startsWith("/admin") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/auth") ||
    // Next's server actions and RSC payloads: both are request-specific and
    // several of them carry session state.
    url.searchParams.has("_rsc")
  );
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
      page behind that.

      Never cache-first: a public page that changed — a new listing, a published
      article — would otherwise be served stale from a phone that is online,
      which is worse than a slightly slower load.
    */
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, copy));
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

/*
  A page can ask the worker to step aside.

  `registerServiceWorker` posts this after it detects an update, so a new
  deployment takes effect on the next navigation instead of whenever the last
  tab happens to close.
*/
self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
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
    badge: "/icon-192.png",
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
