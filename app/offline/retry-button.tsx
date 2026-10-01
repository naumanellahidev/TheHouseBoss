"use client";

import { Button } from "@/components/ui/button";

/**
 * "Try again" on the offline page.
 *
 * A full navigation, not a router link. The client router would try to fetch a
 * payload over the connection that has just failed, and the failure it produces
 * looks like the app being broken rather than the network being out. Assigning
 * `location` is the one thing that reliably works the instant the connection
 * returns, and it is also what re-runs the service worker's navigation handler.
 */
export function RetryButton({ href = "/admin" }: { href?: string }) {
  return (
    <Button
      type="button"
      variant="accent"
      onClick={() => {
        window.location.assign(href);
      }}
    >
      Try again
    </Button>
  );
}
