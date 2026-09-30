import * as React from "react";
import Link from "next/link";

import type { AnswerBlock, AnswerSection } from "@/lib/content/answers";
import { cn } from "@/lib/utils";

/**
 * The body of an answer page.
 *
 * Content is data (`lib/content/answers/*.ts`), not MDX: nothing in an answer
 * needs a component inside the prose, and keeping it as typed data means the
 * word-count and link guards can read it without parsing JSX.
 *
 * One inline convention is supported, `[label](/path)`, because docs/18 § 5
 * requires the links to a city, a service or a sibling answer to sit in the
 * sentence that earns them rather than in a footer list. External hrefs are
 * not accepted — every link on these pages is internal by design.
 */

const LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

export function InlineText({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(LINK)) {
    const [whole, label, href] = match;
    const at = match.index ?? 0;
    if (at > cursor) nodes.push(text.slice(cursor, at));
    nodes.push(
      <Link
        key={`${href}-${at}`}
        href={href!}
        className="font-medium text-accent-quiet underline decoration-accent/40 underline-offset-4 transition-colors hover:text-foreground hover:decoration-accent"
      >
        {label}
      </Link>,
    );
    cursor = at + whole.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return <>{nodes}</>;
}

function Block({ block }: { block: AnswerBlock }) {
  if (block.kind === "p") {
    return (
      <p className="text-body leading-relaxed text-foreground-muted">
        <InlineText text={block.text} />
      </p>
    );
  }

  if (block.kind === "list") {
    return (
      <ul className="flex flex-col gap-2">
        {block.items.map((item, i) => (
          <li key={i} className="flex gap-3 text-body leading-relaxed text-foreground-muted">
            <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
            <span>
              <InlineText text={item} />
            </span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ol className="flex flex-col gap-3">
      {block.items.map((item, i) => (
        <li key={i} className="flex gap-3 text-body leading-relaxed text-foreground-muted">
          <span
            aria-hidden="true"
            className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-wash text-xs font-semibold text-accent-quiet tabular"
          >
            {i + 1}
          </span>
          <span>
            <InlineText text={item} />
          </span>
        </li>
      ))}
    </ol>
  );
}

export function AnswerProse({
  sections,
  className,
}: {
  sections: AnswerSection[];
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-10", className)}>
      {sections.map((section) => (
        <section key={section.heading} className="flex flex-col gap-4">
          <h2 className="text-h3 text-foreground">{section.heading}</h2>
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} />
          ))}
        </section>
      ))}
    </div>
  );
}
