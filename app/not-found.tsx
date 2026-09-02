import Link from "next/link";

import { Container } from "@/components/site/container";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";

/**
 * Branded 404 that offers a real way forward (docs/08 § 9).
 * Never the default Next.js page.
 */
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="flex-1">
        <Container className="flex flex-col items-start gap-6 py-20 md:py-28">
          <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
            404
          </p>
          <h1 className="max-w-[20ch] text-h1">
            That page has moved, sold, or never existed.
          </h1>
          <p className="max-w-[56ch] text-lead text-foreground-muted">
            Listings come and go, but nothing here is a dead end. Try a search,
            or start from a city guide.
          </p>

          {/*
            A real search box rather than a link to one (docs/08 § 9). Someone
            who landed on a dead listing URL usually knows what they were
            looking for; making them arrive at /search and start again loses
            them. A plain GET form needs no JavaScript and works before
            hydration.
          */}
          <form action="/search" method="get" className="flex w-full max-w-lg flex-col gap-3 pt-2 sm:flex-row">
            <label htmlFor="nf-search" className="sr-only">
              Search homes by address, city or keyword
            </label>
            <input
              id="nf-search"
              name="q"
              type="search"
              placeholder="Address, city or keyword"
              className="h-13 w-full min-w-0 flex-1 rounded-md border border-border-strong bg-surface px-4 text-body text-foreground placeholder:text-foreground-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
            <Button type="submit" variant="accent" size="lg">
              Search homes
            </Button>
          </form>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" size="lg" asChild>
              <Link href="/">Back to home</Link>
            </Button>
            <Button variant="ghost" size="lg" asChild>
              <Link href="/contact">Ask me directly</Link>
            </Button>
          </div>

          <nav aria-label="Popular pages" className="pt-6">
            <h2 className="text-overline font-semibold tracking-[0.12em] text-foreground-subtle uppercase">
              Popular
            </h2>
            <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {[
                { href: "/lake-mary", label: "Lake Mary Guide" },
                { href: "/search/new-construction", label: "New Construction" },
                { href: "/guides/va-home-buyer", label: "VA Home-Buyer Guide" },
                {
                  href: "/assumable-mortgage-homes",
                  label: "Assumable Mortgages",
                },
                { href: "/about", label: `About ${siteConfig.legalName}` },
                { href: "/contact", label: "Contact" },
              ].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="inline-flex min-h-9 items-center text-accent-quiet underline underline-offset-4 hover:text-foreground"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </Container>
      </main>
      <Footer />
    </>
  );
}
