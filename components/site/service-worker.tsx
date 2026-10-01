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
 * The reload is guarded by a ref: `controllerchange` also fires the first time
 * a worker ever takes control, and reloading then would turn every first visit
 * into two.
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
      // Only when one was already in control: the first install is not an update.
      if (reloading || !navigator.serviceWorker.controller) return;
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
