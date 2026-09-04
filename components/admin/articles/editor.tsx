"use client";

import * as React from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";

import { AnswerFirstNode } from "@/components/admin/articles/answer-first-node";
import {
  Bold,
  Code,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageSquareQuote,
  Minus,
  Quote,
  Redo2,
  Table as TableIcon,
  Undo2,
  Unlink,
} from "lucide-react";

import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/**
 * The article editor — docs/06 § 5.
 *
 * Toolbar: H2, H3, bold, italic, bullet list, numbered list, quote, link,
 * image, table, horizontal rule, code. **No H1** — the page title is the H1,
 * so the option is not offered rather than being offered and then stripped.
 *
 * Images go through `/api/admin/upload`, the same route listing photos use, and
 * land under `articles/{id}/`. That is what keeps every stored object inside
 * the media accounting and the 1 GB budget (HR9), and it is why the editor
 * needs the article id before an image can be inserted.
 *
 * The document is Tiptap JSON. A Postgres trigger flattens it into `body_text`
 * for search and reading time, so nothing here computes either for storage —
 * the live counts below are for the writer, not for the database.
 */

export type ArticleEditorProps = {
  value: unknown;
  onChange: (doc: unknown, text: string) => void;
  /** Null until the article has been saved once; image upload needs it. */
  articleId: string | null;
};

export function ArticleEditor({ value, onChange, articleId }: ArticleEditorProps) {
  const toast = useToast();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);

  const editor = useEditor({
    // Next renders this on the server first; Tiptap must not try to match.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Only H2–H4 are offered. An article body with an H1 competes with the
        // page title and breaks the heading order (docs/06 § 5).
        heading: { levels: [2, 3, 4] },
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto", "tel"],
        HTMLAttributes: { rel: "noopener noreferrer" },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      TableKit.configure({ table: { resizable: false } }),
      /*
        The answer-first block. Until now it existed only in the hand-written
        guide pages, so every CMS article was missing the one structure an AI
        assistant extracts first (docs/14 § 1, rule 1).
      */
      AnswerFirstNode,
      Placeholder.configure({
        placeholder:
          "Write the article. Lead with the answer, then support it — that is what gets quoted.",
      }),
    ],
    content: (value as object) ?? { type: "doc", content: [] },
    editorProps: {
      attributes: {
        class: cn(
          "min-h-96 max-w-[68ch] px-4 py-4 text-lead leading-relaxed text-foreground",
          "focus:outline-none",
        ),
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getJSON(), editor.getText()),
  });

  async function insertImage(file: File) {
    if (!editor) return;
    if (!articleId) {
      toast.error("Save the article once before adding images.");
      return;
    }

    setUploading(true);
    try {
      const { default: compress } = await import("browser-image-compression");
      const compressed = await compress(file, {
        maxWidthOrHeight: 2400,
        initialQuality: 0.85,
        fileType: "image/webp",
        useWebWorker: true,
      });

      const body = new FormData();
      body.append("file", compressed, file.name);
      body.append("entityType", "article");
      body.append("entityId", articleId);

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const payload = (await response.json()) as
        | { key: string; w: number; h: number }
        | { error: string };

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Upload failed.");
      }

      const alt = window.prompt(
        "Describe this image in a few words. This is read aloud to anyone using a screen reader, and it is required.",
        "",
      );

      editor
        .chain()
        .focus()
        .setImage({
          // The URL is built from the key here, once, by the same helper the
          // rest of the site uses — the DB still only ever sees the key (HR1).
          src: mediaUrl(payload.key, 800),
          alt: alt?.trim() || "",
        })
        .run();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "That image could not be added.",
      );
    } finally {
      setUploading(false);
    }
  }

  if (!editor) {
    return (
      <div className="min-h-96 rounded-md border border-border-strong bg-surface" />
    );
  }

  return (
    <div className="flex flex-col rounded-md border border-border-strong bg-surface">
      <Toolbar
        editor={editor}
        uploading={uploading}
        onPickImage={() => fileRef.current?.click()}
      />

      <EditorContent editor={editor} />

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void insertImage(file);
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-2 text-xs text-foreground-subtle">
        <span className="tabular">{wordCount(editor)} words</span>
        <span className="tabular">
          about {Math.max(1, Math.ceil(wordCount(editor) / 225))} min read
        </span>
        <span className="ml-auto">Markdown shortcuts work: ## , - , &gt; , **bold**</span>
      </div>
    </div>
  );
}

function wordCount(editor: Editor): number {
  const text = editor.getText().trim();
  return text ? text.split(/\s+/).length : 0;
}

/** Mirrors lib/storage/url.ts. The editor is a client component, so it cannot
 *  import the server-side helper — the layout is identical and both derive from
 *  NEXT_PUBLIC_MEDIA_URL, which is public by definition. */
function mediaUrl(key: string, size: number): string {
  const base = (process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/+$/, "");
  return `${base}/${key}-${size}.webp`;
}

function Toolbar({
  editor,
  uploading,
  onPickImage,
}: {
  editor: Editor;
  uploading: boolean;
  onPickImage: () => void;
}) {
  function setLink() {
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link address", previous ?? "https://");

    if (href === null) return;
    if (href === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    if (!/^(https?:\/\/|mailto:|tel:|\/)/i.test(href)) {
      window.alert("Use a full https:// address, an email, a phone number, or a path starting with /.");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  }

  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="scroll-row items-center gap-0.5 border-b border-border px-2 py-1.5"
    >
      <Tool
        label="Heading 2"
        icon={Heading2}
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      />
      <Tool
        label="Heading 3"
        icon={Heading3}
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      />

      <Divider />

      <Tool
        label="Bold"
        icon={Bold}
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <Tool
        label="Italic"
        icon={Italic}
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <Tool
        label="Inline code"
        icon={Code}
        active={editor.isActive("code")}
        onClick={() => editor.chain().focus().toggleCode().run()}
      />

      <Divider />

      <Tool
        label="Bullet list"
        icon={List}
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <Tool
        label="Numbered list"
        icon={ListOrdered}
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />
      <Tool
        label="Quote"
        icon={Quote}
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      />
      {/*
        Labelled "Answer" and not "Summary". It marks the sentence that answers
        the question the section asks — the block an assistant lifts when it
        cites this article — and calling it a summary invites a paragraph of
        throat-clearing instead.
      */}
      <Tool
        label="Answer"
        icon={MessageSquareQuote}
        active={editor.isActive("answerFirst")}
        onClick={() => editor.chain().focus().toggleAnswerFirst().run()}
      />

      <Divider />

      <Tool label="Add link" icon={Link2} active={editor.isActive("link")} onClick={setLink} />
      <Tool
        label="Remove link"
        icon={Unlink}
        disabled={!editor.isActive("link")}
        onClick={() => editor.chain().focus().unsetLink().run()}
      />
      <Tool
        label={uploading ? "Uploading image" : "Insert image"}
        icon={ImagePlus}
        disabled={uploading}
        onClick={onPickImage}
      />
      <Tool
        label="Insert table"
        icon={TableIcon}
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      />
      <Tool
        label="Horizontal rule"
        icon={Minus}
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      />

      <Divider />

      <Tool
        label="Undo"
        icon={Undo2}
        disabled={!editor.can().undo()}
        onClick={() => editor.chain().focus().undo().run()}
      />
      <Tool
        label="Redo"
        icon={Redo2}
        disabled={!editor.can().redo()}
        onClick={() => editor.chain().focus().redo().run()}
      />
    </div>
  );
}

function Tool({
  label,
  icon: Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-md",
        "transition-colors duration-(--dur-fast)",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        "disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-accent-wash text-foreground"
          : "text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden={true} />
    </button>
  );
}

function Divider() {
  return (
    <span aria-hidden="true" className="mx-1 h-6 w-px shrink-0 bg-border" />
  );
}
