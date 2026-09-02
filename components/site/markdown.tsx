import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { TableScroll } from "@/components/site/prose";
import { cn } from "@/lib/utils";

/**
 * Renders the `intro_md` / `body_md` columns on `cities` and `communities`.
 *
 * This is NOT a second rich-text system — Tiptap owns articles. The schema
 * defines these two columns as markdown (docs/02), and this renders them.
 * Server components only, so it never ships to the browser.
 *
 * `react-markdown` builds React elements rather than an HTML string, so raw
 * HTML in the source is inert by default — which matters because these columns
 * are edited in a plain textarea.
 *
 * Heading levels are shifted down: markdown `#` becomes an `<h2>`, because the
 * page title is the only H1 on any page (design-system skill, HTML validity
 * traps).
 */
export function Markdown({
  children,
  className,
  /** Renders the first paragraph at lead size — used for a city intro. */
  lead = false,
}: {
  children: string | null | undefined;
  className?: string;
  lead?: boolean;
}) {
  if (!children?.trim()) return null;

  return (
    <div
      className={cn(
        "max-w-[68ch] text-foreground-muted",
        lead ? "text-lead" : "text-body",
        "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-h2 [&_h2]:text-foreground [&_h2]:scroll-mt-28",
        "[&_h3]:mt-9 [&_h3]:mb-3 [&_h3]:text-h3 [&_h3]:text-foreground [&_h3]:scroll-mt-28",
        "[&_h4]:mt-7 [&_h4]:mb-2 [&_h4]:text-h4 [&_h4]:text-foreground",
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
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Shift every heading down one level; the page owns the H1.
          h1: ({ children }) => <h2>{children}</h2>,
          h2: ({ children }) => <h2>{children}</h2>,
          h3: ({ children }) => <h3>{children}</h3>,
          h4: ({ children }) => <h4>{children}</h4>,
          h5: ({ children }) => <h4>{children}</h4>,
          h6: ({ children }) => <h4>{children}</h4>,

          a: ({ href, children }) => {
            const target = href ?? "";
            if (!/^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(target)) {
              // Drop the link, keep the text: a `javascript:` href is the only
              // genuinely dangerous thing markdown can carry here.
              return <>{children}</>;
            }
            return /^https?:\/\//i.test(target) ? (
              <a href={target} rel="noopener noreferrer" target="_blank">
                {children}
              </a>
            ) : (
              <Link href={target}>{children}</Link>
            );
          },

          // A wide table has to scroll inside its own container rather than
          // pushing the page sideways (docs/04 § 2).
          table: ({ children }) => (
            <TableScroll>
              <table>{children}</table>
            </TableScroll>
          ),

          // Images in these columns would bypass the storage pipeline and the
          // alt-text requirement, so they are not rendered. The hero image
          // field is the supported way to put a picture on a city page.
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
