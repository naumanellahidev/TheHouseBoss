"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";

import { Container, Section } from "@/components/site/container";
import { EmptyState } from "@/components/site/empty-state";
import { PropertyCard } from "@/components/listing/property-card";
import { Button } from "@/components/ui/button";
import { PropertyCardSkeleton } from "@/components/ui/skeleton";
import type { ListingCard } from "@/types/domain";

/**
 * Search from the hero, results directly beneath it.
 *
 * The form inside the hero is still a server-rendered
 * `<form method="get" action="/search">`. This wrapper listens for its submit
 * and, when JavaScript is available, answers it in place instead of leaving the
 * page: `/api/search` returns six matches and they render below the hero as
 * cards. With JavaScript off the form submits normally and the search page
 * handles it, exactly as before — nothing here is load-bearing.
 *
 * Why an event listener on a wrapper rather than a client form: the form's
 * options come from the database (cities and their counts, property types from
 * `listing_facets`), and keeping it a server component keeps that data — and
 * the whole form — out of the client bundle. Submit bubbles, so a listener on
 * the element around it is enough.
 *
 * The URL is updated with the query so the result is shareable and the browser
 * back button undoes the search rather than leaving the page.
 */

type State =
  | { status: "idle" }
  | { status: "loading"; query: string }
  | { status: "done"; query: string; listings: ListingCard[]; total: number }
  | { status: "error" };

const SearchContext = React.createContext<State>({ status: "idle" });

export function HomeSearch({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>({ status: "idle" });
  const requestId = React.useRef(0);

  const run = React.useCallback(async (query: string) => {
    const id = ++requestId.current;
    setState({ status: "loading", query });

    try {
      const response = await fetch(`/api/search?${query}`, {
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as {
        listings: ListingCard[];
        total: number;
        query: string;
      };
      // A slower earlier search must not overwrite a newer one.
      if (id !== requestId.current) return;
      setState({
        status: "done",
        query: data.query,
        listings: data.listings,
        total: data.total,
      });
    } catch {
      if (id !== requestId.current) return;
      setState({ status: "error" });
    }
  }, []);

  function onSubmit(event: React.FormEvent<HTMLDivElement>) {
    const form = event.target as HTMLFormElement;
    if (!(form instanceof HTMLFormElement) || form.method.toLowerCase() !== "get") {
      return;
    }

    event.preventDefault();

    // The browser's own serialisation, so the query is identical to the one a
    // no-JavaScript submit would have produced — empty fields included, which
    // the parser drops.
    const query = new URLSearchParams(
      [...new FormData(form).entries()]
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .filter(([, value]) => value !== ""),
    ).toString();

    window.history.pushState({ homeSearch: query }, "", query ? `/?${query}` : "/");
    void run(query);

    // Move the reader to the answer, gently and only if they are above it.
    const results = document.getElementById("home-search-results");
    if (results && results.getBoundingClientRect().top > window.innerHeight * 0.6) {
      results.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  /*
    Back and forward. pushState above means the browser stays on this page, so
    popstate is what has to undo (or redo) the search.
  */
  React.useEffect(() => {
    const onPop = () => {
      const query = window.location.search.replace(/^\?/, "");
      if (query) void run(query);
      else setState({ status: "idle" });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [run]);

  /*
    A shared link: /?city=lake-mary lands here with the query already in the
    URL, so run it once on arrival. The page itself stays static and cached —
    this is the only part that varies, and it varies on the client.
  */
  React.useEffect(() => {
    const query = window.location.search.replace(/^\?/, "");
    if (!query) return;

    // Deferred by a frame on purpose: the page paints its static shell first
    // and the fetch starts after, rather than a state update landing inside
    // the same commit as hydration.
    const frame = requestAnimationFrame(() => void run(query));
    return () => cancelAnimationFrame(frame);
  }, [run]);

  return (
    <div onSubmit={onSubmit}>
      <SearchContext value={state}>{children}</SearchContext>
    </div>
  );
}

/**
 * The results, rendered where the page places it — directly under the hero.
 *
 * Renders nothing at all until a search has been run, so the home page is
 * unchanged for a visitor who never searches.
 */
export function HomeSearchResults() {
  const state = React.useContext(SearchContext);

  if (state.status === "idle") return <div id="home-search-results" />;

  return (
    <Section id="home-search-results" tone="sunken" className="scroll-mt-24">
      <Container className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
              Search results
            </p>
            <h2 className="text-h3" aria-live="polite">
              {state.status === "loading"
                ? "Searching…"
                : state.status === "error"
                  ? "Search is unavailable right now"
                  : state.total === 0
                    ? "No homes match those filters"
                    : `${state.total} ${state.total === 1 ? "home" : "homes"} match`}
            </h2>
          </div>

          {state.status === "done" && state.total > state.listings.length ? (
            <Button variant="outline" asChild>
              <Link href={`/search?${state.query}`}>
                See all {state.total}
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>

        {state.status === "loading" ? (
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i}>
                <PropertyCardSkeleton />
              </li>
            ))}
          </ul>
        ) : null}

        {state.status === "error" ? (
          <EmptyState
            icon={SearchX}
            title="That search did not go through"
            description="The connection dropped somewhere between here and the listings. Try again, or open the full search page."
            actions={
              <Button variant="accent" asChild>
                <Link href="/search">Open the search page</Link>
              </Button>
            }
          />
        ) : null}

        {state.status === "done" && state.listings.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nothing matches those filters yet"
            description="Widen the price or the bedroom count, or tell me what you are looking for and I will let you know the moment something lands."
            actions={
              <>
                <Button variant="accent" asChild>
                  <Link href="/search">Browse every home</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/contact">Get new listing alerts</Link>
                </Button>
              </>
            }
          />
        ) : null}

        {state.status === "done" && state.listings.length > 0 ? (
          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {state.listings.map((listing) => (
              <li key={listing.id}>
                <PropertyCard listing={listing} />
              </li>
            ))}
          </ul>
        ) : null}
      </Container>
    </Section>
  );
}
