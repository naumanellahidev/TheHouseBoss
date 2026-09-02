"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";

/**
 * Branded error boundary. Never leaks a stack trace or a Postgres message to
 * the visitor (docs/01-architecture.md § Error handling).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Phase 7 wires this to the error monitor.
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="flex flex-1 items-center">
      <Container className="flex flex-col items-start gap-6 py-20 md:py-28">
        <span
          aria-hidden="true"
          className="flex size-12 items-center justify-center rounded-full bg-danger-bg text-danger"
        >
          <AlertTriangle className="size-6" />
        </span>

        <h1 className="max-w-[22ch] text-h1">Something went wrong.</h1>
        <p className="max-w-[56ch] text-lead text-foreground-muted">
          This one is on us, not on you. Try again — if it keeps happening,
          please get in touch and we will sort it out.
        </p>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Button variant="accent" size="lg" onClick={reset}>
            Try again
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/contact">Contact us</Link>
          </Button>
        </div>

        {error.digest ? (
          <p className="text-xs text-foreground-subtle tabular">
            Reference: {error.digest}
          </p>
        ) : null}
      </Container>
    </main>
  );
}
