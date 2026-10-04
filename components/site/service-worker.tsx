"use client";

import * as React from "react";

/**
 * Registers the service worker, and nothing else.
 *
 * ── Why it waits for load ─────────────────────────────────────────────────
 *
 * Registration competes with the page's own requests for bandwidth, and the
 * worker is of no use to the page that registers it — it takes effect on the
 * next navigation. Waiting until `load` keeps it off the critical path, which
 * on the mobile profile is the difference the Lighthouse score is measured on.
 *
 * ── Why the update is forced ──────────────────────────────────────────────
 *
 * A new worker normally waits until every tab using the old one has closed. On
 * a phone an installed app is never closed, so a deploy would sit behind a
 * worker from weeks ago. When one is found waiting, it is told to take over and
 * the page reloads once.
 *
 * ── Why the guard is read BEFORE registering ──────────────────────────────
 *
 * `controllerchange` also fires the first time a worker ever takes control —
 * `clients.claim()` in the activate handler causes it. The first version guarded
 * on `navigator.serviceWorker.controller` inside the handler, but by the time
 * the event fires that property already holds the NEW worker, so the guard
 * always passed and every first visit reloaded itself about a second after load.
 *
 * That shipped. It was a visible flash on a phone, it could swallow a form the
 * visitor had started filling in, and it was found only when the admin suite
 * finally ran signed in and every test died with "execution context destroyed
 * by a navigation". The only reliable signal is whether a worker was in control
 * BEFORE this page registered one: if not, this is a first install and there is
 * nothing stale to replace.
 */
export function ServiceWorker() {
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    /*
      Development is excluded.

      A worker caching `/_next/static` against a dev server serves the previous
      compile after every edit, and the symptom — changes that appear only
      sometimes — costs far more time than the feature saves.
    */
    if (process.env.NODE_ENV !== "production") return;

    let reloading = false;

    // Captured now, before anything registers. See the note above: reading it
    // inside the event handler sees the new worker and is always true.
    const hadController = Boolean(navigator.serviceWorker.controller);

    const onLoad = () => {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          const promote = () => {
            const next = registration.waiting;
            if (next) next.postMessage("skip-waiting");
          };

          promote();
          registration.addEventListener("updatefound", () => {
            registration.installing?.addEventListener("statechange", promote);
          });
        })
        .catch(() => {
          // A failed registration costs the offline page and nothing else. It
          // happens on a private window and behind some corporate proxies, and
          // neither is worth a console error on a client's site.
        });
    };

    const onControllerChange = () => {
      // Only an UPDATE reloads. A first install has no stale page to replace.
      if (reloading || !hadController) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}
