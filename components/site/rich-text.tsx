import * as React from "react";
import Link from "next/link";

import { PropertyImage } from "@/components/site/property-image";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { AnswerFirst, TableScroll } from "@/components/site/prose";
import { cn } from "@/lib/utils";

/**
 * Renders a Tiptap document (`articles.body_json`) as React elements.
 *
 * Never `dangerouslySetInnerHTML`. Tiptap can serialise to an HTML string, and
 * injecting that would mean the safety of every article depended on the editor
 * never emitting anything unexpected. Walking the node tree instead means the
 * set of things an article can render is exactly the set enumerated here, and
 * an unknown node is skipped rather than trusted.
 *
 * Two rules from the specs are enforced structurally rather than by discipline:
 *
 *  - **No H1 in an article body** (docs/06 § 5). The page title is the H1. A
 *    heading of level 1 is rendered as an H2, so an article that somehow
 *    contains one cannot break the page's heading order.
 *  - **Tables scroll, never overflow** (docs/04 § 2). Every table is wrapped in
 *    <TableScroll />, which is the same wrapper the guides use.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Node = {
  type?: string;
  content?: Node[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, any> }[];
  attrs?: Record<string, any>;
};

/** True when the document has anything worth rendering. */
export function hasContent(doc: unknown): boolean {
  const node = doc as Node | null;
  if (!node?.content?.length) return false;
  return textOf(node).trim().length > 0 || hasBlock(node);
}

function hasBlock(node: Node): boolean {
  if (node.type === "image" || node.type === "horizontalRule") return true;
  return (node.content ?? []).some(hasBlock);
}

/** Flattens to plain text — used for excerpts and reading time on the client. */
export function textOf(doc: unknown): string {
  const node = doc as Node | null;
  if (!node) return "";
  if (node.text) return node.text;
  return (node.content ?? []).map(textOf).join(" ");
}

export function RichText({
  doc,
  className,
}: {
  doc: unknown;
  className?: string;
}) {
  const root = doc as Node | null;

  if (!hasContent(root)) return null;

  return (
    <div
      className={cn(
        "max-w-[68ch] text-lead text-foreground-muted",
        "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-h2 [&_h2]:text-foreground [&_h2]:scroll-mt-28",
        "[&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:text-h3 [&_h3]:text-foreground [&_h3]:scroll-mt-28",
        "[&>*:first-child]:mt-0",
        "[&_p]:my-4 [&_p]:leading-relaxed",
        "[&_strong]:font-semibold [&_strong]:text-foreground",
        "[&_ul]:my-4 [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-5",
        "[&_ol]:my-4 [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-2 [&_ol]:pl-5",
        "[&_li]:pl-1 [&_li]:marker:text-accent-quiet",
        "[&_a]:text-accent-quiet [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-foreground",
        "[&_blockquote]:my-6 [&_blockquote]:border-l-2 [&_blockquote]:border-accent",
        "[&_blockquote]:pl-5 [&_blockquote]:text-foreground [&_blockquote]:italic",
        "[&_code]:rounded-sm [&_code]:bg-surface-sunken [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm",
        "[&_hr]:my-10 [&_hr]:border-border",
        "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
        "[&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-2 [&_th]:text-left",
        "[&_th]:text-xs [&_th]:font-semibold [&_th]:tracking-[0.08em] [&_th]:uppercase [&_th]:text-foreground-subtle",
        "[&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-top",
        className,
      )}
    >
      {renderNodes(root?.content ?? [])}
    </div>
  );
}

function renderNodes(nodes: Node[]): React.ReactNode {
  return nodes.map((node, i) => (
    <React.Fragment key={i}>{renderNode(node, i)}</React.Fragment>
  ));
}

function renderNode(node: Node, key: number): React.ReactNode {
  const children = node.content ? renderNodes(node.content) : null;

  switch (node.type) {
    case "paragraph":
      // Tiptap emits an empty paragraph for a blank line; rendering it would
      // add stray vertical space with no content in it.
      return node.content?.length ? <p>{children}</p> : null;

    case "heading": {
      // Level 1 is folded to 2: the page title owns the only H1 (docs/06 § 5).
      const level = Math.min(Math.max(Number(node.attrs?.level ?? 2), 2), 4);
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      const id = slugifyHeading(textOf(node));
      return <Tag id={id || undefined}>{children}</Tag>;
    }

    case "bulletList":
      return <ul>{children}</ul>;

    case "orderedList":
      return <ol start={node.attrs?.start ?? undefined}>{children}</ol>;

    case "listItem":
      return <li>{children}</li>;

    /*
      The answer-first block, written in the editor and rendered through the
      same component the hand-written guides use — so a CMS article and a coded
      guide present the answer identically, which is what makes the pattern
      recognisable to an extractor across the whole site.
    */
    case "answerFirst":
      return node.content?.length ? <AnswerFirst>{children}</AnswerFirst> : null;

    case "blockquote":
      return <blockquote>{children}</blockquote>;

    case "codeBlock":
      return (
        <pre className="my-6 overflow-x-auto rounded-md bg-surface-sunken p-4 text-sm">
          <code>{textOf(node)}</code>
        </pre>
      );

    case "horizontalRule":
      return <hr />;

    case "hardBreak":
      return <br />;

    case "image": {
      const src = String(node.attrs?.src ?? "");
      if (!src) return null;
      const alt = String(node.attrs?.alt ?? "");
      return (
        <figure className="my-8">
          <PropertyImage
            // Article images are uploaded through the same pipeline as listing
            // photos, so they arrive as an external URL already built from the
            // key by the uploader.
            photo={{
              kind: "external",
              url: src,
              w: Number(node.attrs?.width ?? 1200),
              h: Number(node.attrs?.height ?? 800),
              alt,
            }}
            sizes={IMAGE_SIZES.articleCover}
            aspect="none"
            wrapperClassName="rounded-lg"
          />
          {node.attrs?.title ? (
            <figcaption className="mt-2 text-sm text-foreground-subtle">
              {String(node.attrs.title)}
            </figcaption>
          ) : null}
        </figure>
      );
    }

    case "table":
      return (
        <TableScroll>
          <table>
            <tbody>{children}</tbody>
          </table>
        </TableScroll>
      );

    case "tableRow":
      return <tr>{children}</tr>;

    case "tableHeader":
      return (
        <th colSpan={node.attrs?.colspan} rowSpan={node.attrs?.rowspan} scope="col">
          {children}
        </th>
      );

    case "tableCell":
      return (
        <td colSpan={node.attrs?.colspan} rowSpan={node.attrs?.rowspan}>
          {children}
        </td>
      );

    case "text":
      return applyMarks(node, key);

    default:
      // An unknown node type renders its children rather than nothing, so a
      // future Tiptap extension degrades to its text instead of vanishing.
      return children;
  }
}

function applyMarks(node: Node, key: number): React.ReactNode {
  let element: React.ReactNode = node.text ?? "";

  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":
        element = <strong>{element}</strong>;
        break;
      case "italic":
        element = <em>{element}</em>;
        break;
      case "strike":
        element = <s>{element}</s>;
        break;
      case "code":
        element = <code>{element}</code>;
        break;
      case "underline":
        element = <u>{element}</u>;
        break;
      case "link": {
        const href = String(mark.attrs?.href ?? "");
        if (!href || !isSafeHref(href)) break;
        const external = /^https?:\/\//i.test(href);
        element = external ? (
          <a href={href} rel="noopener noreferrer" target="_blank">
            {element}
          </a>
        ) : (
          <Link href={href}>{element}</Link>
        );
        break;
      }
      default:
        break;
    }
  }

  return <React.Fragment key={key}>{element}</React.Fragment>;
}

/**
 * Only http(s), mailto, tel and same-site paths. A `javascript:` href in a
 * link mark would otherwise execute — the one genuinely dangerous thing a
 * Tiptap document can carry.
 */
function isSafeHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(href);
}

/** Stable ids so an article's table of contents can link to its headings. */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Headings, for the article table of contents. */
export function headingsOf(doc: unknown): { id: string; label: string; level: number }[] {
  const root = doc as Node | null;
  const out: { id: string; label: string; level: number }[] = [];

  for (const node of root?.content ?? []) {
    if (node.type !== "heading") continue;
    const label = textOf(node).trim();
    if (!label) continue;
    out.push({
      id: slugifyHeading(label),
      label,
      level: Math.min(Math.max(Number(node.attrs?.level ?? 2), 2), 4),
    });
  }

  return out;
}
