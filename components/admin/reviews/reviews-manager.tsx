"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ExternalLink, Plus, Save, Star, Trash2 } from "lucide-react";

import {
  createReview,
  deleteReview,
  saveReview,
  setReviewPublished,
} from "@/app/(admin)/admin/(shell)/content-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { REVIEW_SOURCES, type ReviewInput } from "@/lib/validation/place";
import { cn } from "@/lib/utils";
import type { Review } from "@/types/domain";

/**
 * Reviews — docs/06 § 7.
 *
 * Deliberately one screen rather than a list plus an editor: a review is a
 * name, a source, a date and a paragraph. Sending someone to a separate page to
 * edit four fields is friction with nothing bought by it.
 *
 * The warning at the top is not decoration. docs/09 § 7: publish only reviews
 * actually received, attribute the source, and do not edit their substance. The
 * FTC treats fabricated or undisclosed incentivised reviews as a deceptive
 * practice, and `AggregateRating` markup is never emitted from this data.
 */

type EditableReview = Review & { published: boolean; sortOrder: number };

export function ReviewsManager({ reviews }: { reviews: EditableReview[] }) {
  const router = useRouter();
  const toast = useToast();

  const [creating, setCreating] = React.useState(false);
  const [deleting, setDeleting] = React.useState<EditableReview | null>(null);
  const [published, setPublishedState] = React.useState<Record<string, boolean>>({});

  const isPublished = (review: EditableReview) =>
    published[review.id] ?? review.published;

  async function togglePublished(review: EditableReview, value: boolean) {
    setPublishedState((current) => ({ ...current, [review.id]: value }));
    const result = await setReviewPublished({ id: review.id, value });
    if (!result.ok) {
      setPublishedState((current) => ({ ...current, [review.id]: !value }));
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="flex max-w-[75ch] items-start gap-2.5 rounded-lg border border-warning/30 bg-warning-bg p-4 text-sm text-foreground">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
        <span>
          <strong>Only publish reviews you actually received.</strong> Attribute
          the source and link to the original where there is one. Trimming a
          review for length is fine; changing what it says is not. Fabricated or
          incentivised reviews without disclosure are treated as a deceptive
          practice, and consumers check.
        </span>
      </p>

      {creating ? (
        <ReviewCard
          key="new"
          initial={null}
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            router.refresh();
          }}
        />
      ) : (
        <Button
          variant="accent"
          className="self-start"
          onClick={() => setCreating(true)}
        >
          <Plus aria-hidden="true" />
          Add a review
        </Button>
      )}

      {reviews.length === 0 && !creating ? (
        <p className="rounded-lg border border-dashed border-border bg-surface-sunken p-6 text-sm text-foreground-muted">
          No reviews yet. The public reviews page hides itself until there are
          at least three published, so it never shows a thin list.
        </p>
      ) : null}

      <ul className="flex flex-col gap-4">
        {reviews.map((review) => (
          <li key={review.id}>
            <ReviewCard
              initial={review}
              published={isPublished(review)}
              onTogglePublished={(value) => void togglePublished(review, value)}
              onDelete={() => setDeleting(review)}
              onSaved={() => router.refresh()}
            />
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this review"
        description="This cannot be undone."
        confirmPhrase={deleting?.authorName ?? ""}
        confirmHint="Type the reviewer's name to confirm."
        consequence={
          <>
            Unpublishing hides a review while keeping the record. Deleting
            removes it entirely.
          </>
        }
        onConfirm={async (typed) => {
          if (!deleting) return;
          const result = await deleteReview(deleting.id, typed);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Review deleted.");
          setDeleting(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function ReviewCard({
  initial,
  published,
  onTogglePublished,
  onDelete,
  onCancel,
  onSaved,
}: {
  initial: EditableReview | null;
  published?: boolean;
  onTogglePublished?: (value: boolean) => void;
  onDelete?: () => void;
  onCancel?: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const [values, setValues] = React.useState<ReviewInput>({
    authorName: initial?.authorName ?? "",
    authorRole: initial?.authorRole ?? null,
    rating: initial?.rating ?? null,
    body: initial?.body ?? "",
    source: (initial?.source as ReviewInput["source"]) ?? null,
    sourceUrl: initial?.sourceUrl ?? null,
    reviewedAt: initial?.reviewedAt ?? null,
    published: initial?.published ?? false,
    sortOrder: initial?.sortOrder ?? 0,
  });

  function set<K extends keyof ReviewInput>(key: K, value: ReviewInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  const errorOf = (key: string) => errors[key]?.[0];

  async function save() {
    setSaving(true);
    setErrors({});

    const payload = { ...values, published: published ?? values.published };
    const result = initial
      ? await saveReview(initial.id, payload)
      : await createReview(payload);

    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      return;
    }

    toast.success(initial ? "Review saved." : "Review added.");
    onSaved();
  }

  const controlClass = cn(
    "w-full rounded-md border border-border-strong bg-surface px-3 text-body text-foreground",
    "placeholder:text-foreground-subtle",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  );

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-xs">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">
            Name <span className="font-medium text-foreground-subtle">Required</span>
          </span>
          <input
            value={values.authorName}
            onChange={(event) => set("authorName", event.target.value)}
            placeholder="Dana R."
            className={cn(controlClass, "h-11")}
          />
          {errorOf("authorName") ? (
            <span className="text-xs font-medium text-danger">{errorOf("authorName")}</span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">Role</span>
          <input
            value={values.authorRole ?? ""}
            onChange={(event) => set("authorRole", event.target.value)}
            placeholder="Buyer, Lake Mary"
            className={cn(controlClass, "h-11")}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">Source</span>
          <select
            value={values.source ?? ""}
            onChange={(event) =>
              set("source", (event.target.value || null) as ReviewInput["source"])
            }
            className={cn(controlClass, "h-11")}
          >
            <option value="">Not recorded</option>
            {REVIEW_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-foreground">Date</span>
          <input
            type="date"
            value={values.reviewedAt ?? ""}
            onChange={(event) => set("reviewedAt", event.target.value)}
            className={cn(controlClass, "h-11")}
          />
        </label>

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-xs font-semibold text-foreground">
            Link to the original
          </span>
          <input
            type="url"
            value={values.sourceUrl ?? ""}
            onChange={(event) => set("sourceUrl", event.target.value)}
            placeholder="https://g.page/…"
            className={cn(controlClass, "h-11")}
          />
          {errorOf("sourceUrl") ? (
            <span className="text-xs font-medium text-danger">{errorOf("sourceUrl")}</span>
          ) : null}
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs font-semibold text-foreground">Rating</legend>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={values.rating === n}
              aria-label={`${n} ${n === 1 ? "star" : "stars"}`}
              onClick={() => set("rating", values.rating === n ? null : n)}
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-sm font-medium",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                values.rating === n
                  ? "border-accent bg-accent-wash text-foreground"
                  : "border-border-strong text-foreground-muted hover:bg-surface-sunken",
              )}
            >
              <Star className="size-4" aria-hidden="true" />
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-foreground">
          Review <span className="font-medium text-foreground-subtle">Required</span>
        </span>
        <textarea
          rows={4}
          value={values.body}
          onChange={(event) => set("body", event.target.value)}
          placeholder="Paste what they actually wrote."
          className={cn(controlClass, "min-h-28 py-2.5 leading-relaxed")}
        />
        {errorOf("body") ? (
          <span className="text-xs font-medium text-danger">{errorOf("body")}</span>
        ) : null}
      </label>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        {initial && onTogglePublished ? (
          <span className="flex items-center gap-2">
            <Switch
              checked={published ?? false}
              onCheckedChange={onTogglePublished}
              label={`Published — review by ${values.authorName || "this reviewer"}`}
            />
            <span aria-hidden="true" className="text-sm text-foreground-muted">
              {published ? "Published" : "Hidden"}
            </span>
          </span>
        ) : null}

        {values.sourceUrl ? (
          <Button asChild variant="ghost" size="sm">
            <a href={values.sourceUrl} target="_blank" rel="noreferrer noopener">
              <ExternalLink aria-hidden="true" />
              Original
            </a>
          </Button>
        ) : null}

        <div className="ml-auto flex gap-2">
          {onCancel ? (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}

          {onDelete ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-danger hover:bg-danger-bg hover:text-danger"
              onClick={onDelete}
            >
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          ) : null}

          <Button variant="outline" size="sm" loading={saving} onClick={save}>
            <Save aria-hidden="true" />
            {initial ? "Save" : "Add review"}
          </Button>
        </div>
      </div>
    </div>
  );
}
