import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import type { FaqItem } from "@/types/domain";

/**
 * The visible FAQ and the FAQPage JSON-LD are rendered from the SAME `items`
 * array. Marking up a question that is not visible on the page is a policy
 * violation (docs/08-seo-ai-visibility.md § 6).
 *
 * The JSON-LD is emitted by the page via `faqPageJsonLd(items)` — never by this
 * component, so that a page can compose several FAQ blocks into one graph.
 */
export function FaqAccordion({
  items,
  defaultOpenFirst = false,
  className,
  more,
}: {
  items: FaqItem[];
  defaultOpenFirst?: boolean;
  className?: string;
  /**
   * A fuller answer elsewhere on the site, keyed by the question text
   * (docs/18 § 5). A short FAQ row and a 500-word answer page are different
   * things, and the row is where somebody is standing when they want the
   * second one. Questions with no entry simply render as before.
   */
  more?: Record<string, { href: string; label?: string }>;
}) {
  if (items.length === 0) return null;

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpenFirst ? "faq-0" : undefined}
      className={cn("w-full border-t border-border", className)}
    >
      {items.map((item, i) => (
        <AccordionItem key={item.q} value={`faq-${i}`}>
          <AccordionTrigger>{item.q}</AccordionTrigger>
          <AccordionContent>
            <p className="text-body leading-relaxed">{item.a}</p>
            {more?.[item.q] ? (
              <Link
                href={more[item.q]!.href}
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent-quiet underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {more[item.q]!.label ?? "Read the full answer"}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
