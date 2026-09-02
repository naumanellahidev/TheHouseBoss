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
}: {
  items: FaqItem[];
  defaultOpenFirst?: boolean;
  className?: string;
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
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
