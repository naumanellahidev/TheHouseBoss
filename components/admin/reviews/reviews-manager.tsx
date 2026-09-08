"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ExternalLink,
  Mail,
  Pencil,
  Plus,
  Save,
  Star,
  Trash2,
} from "lucide-react";

import {
  createReview,
  deleteReview,
  saveReview,
  setReviewPublished,
} from "@/app/(admin)/admin/(shell)/content-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { REVIEW_SOURCES, type ReviewInput } from "@/lib/validation/place";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/utils/date";
import type { AdminReview } from "@/types/domain";

/**
 * Reviews — docs/06 § 7.
 *
 * ── Cards to read, a dialog to edit ───────────────────────────────────────
 *
 * This screen used to be a stack of open forms — every review, every field,
 * always editable. That is the right shape for a screen you arrive at to
 * change something and the wrong one for this screen, which is mostly opened to
 * READ: what came in, what is live, and does this one belong on the site. Ten
 * reviews meant ten forms and roughly two thousand pixels of scrolling before
 * you had seen five of them.
 *
 * So the list is cards that show the review the way a visitor sees it, and the
 * pencil opens the one you actually mean to change. Editing is a deliberate
 * act; reading should not require one.
 *
 * The warning at the top is not decoration. docs/09 § 7: publish only reviews
 * actually received, attribute the source, and do not edit their substance. The
 * FTC treats fabricated or undisclosed incentivised reviews as a deceptive
 * practice, and `AggregateRating` markup is never emitted from this data.
 */

type EditableReview = AdminReview;

/** What the editor dialog is open on: an existing review, a new one, or nothing. */
type Editing = EditableReview | "new" | null;

export function ReviewsManager({ reviews }: { reviews: EditableReview[] }) {
  const router = useRouter();
  const toast = useToast();

  const [editing, setEditing] = React.useState<Editing>(null);
  const [deleting, setDeleting] = React.useState<EditableReview | null>(null);
  const [published, setPublishedState] = React.useState<Record<string, boolean>>({});

  const isPublished = (review: EditableReview) =>
    published[review.id] ?? review.published;

  /*
    Split on the two facts, not on one.

    A review is "waiting" when it arrived through the public form AND has not
    been published. `isPublished` rather than `review.published`, so approving
    one moves it out of this section on the optimistic toggle instead of after
    the router refresh — otherwise it sits in "Waiting for you" with its switch
    already on, which reads as a failure.
  */
  const pending = reviews.filter(
    (review) => review.submittedAt !== null && !isPublished(review),
  );
  const rest = reviews.filter((review) => !pending.includes(review));

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

  const grid = (items: EditableReview[]) => (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((review) => (
        <li key={review.id}>
          <ReviewSummary
            review={review}
            published={isPublished(review)}
            onEdit={() => setEditing(review)}
          />
        </li>
      ))}
    </ul>
  );

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

      <Button variant="accent" className="self-start" onClick={() => setEditing("new")}>
        <Plus aria-hidden="true" />
        Add a review
      </Button>

      {reviews.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface-sunken p-6 text-sm text-foreground-muted">
          No reviews yet. The public reviews page hides itself until there are
          at least three published, so it never shows a thin list.
        </p>
      ) : null}

      {/*
        Submissions first, and in their own section.

        `submittedAt` is set only by the public form, so this is exactly "someone
        wrote this and it is waiting for you" — as distinct from an unpublished
        review the admin typed and has not finished, which stays in the list
        below. Sorting them to the top of one long list would have been less
        code and would not have answered the question the client will actually
        open this screen to ask.
      */}
      {pending.length > 0 ? (
        <section aria-labelledby="pending-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 id="pending-heading" className="text-h4 font-semibold">
              Waiting for you
            </h2>
            <span className="text-sm text-foreground-muted">
              <span className="tabular font-semibold text-foreground">
                {pending.length}
              </span>{" "}
              {pending.length === 1 ? "review" : "reviews"} sent from the site
            </span>
          </div>
          {grid(pending)}
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section aria-labelledby="onfile-heading" className="flex flex-col gap-4">
          {pending.length > 0 ? (
            <h2 id="onfile-heading" className="text-h4 font-semibold">
              On file
            </h2>
          ) : null}
          {grid(rest)}
        </section>
      ) : null}

      {/*
        One dialog, keyed on what it is editing.

        The key matters: without it React keeps the form's state between two
        different reviews, so opening a second one shows the first one's text
        until every field happens to be overwritten. Remounting is the whole fix.
      */}
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        {editing !== null ? (
          <DialogContent
            title={editing === "new" ? "Add a review" : "Edit this review"}
            description={
              editing === "new"
                ? "Only what you actually received."
                : "Changes go live as soon as you save, if it is published."
            }
            className="max-w-3xl"
          >
            <div className="overflow-y-auto px-5 py-5">
              <ReviewEditor
                key={editing === "new" ? "new" : editing.id}
                initial={editing === "new" ? null : editing}
                published={editing === "new" ? undefined : isPublished(editing)}
                onTogglePublished={
                  editing === "new"
                    ? undefined
                    : (value) => void togglePublished(editing, value)
                }
                onDelete={
                  editing === "new"
                    ? undefined
                    : () => {
                        /*
                          Close the editor before opening the confirmation.
                          Two stacked modals trap focus in the wrong one and
                          leave the reader unable to tell which Escape closes.
                        */
                        const target = editing;
                        setEditing(null);
                        setDeleting(target);
                      }
                }
                onCancel={() => setEditing(null)}
                onSaved={() => {
                  setEditing(null);
                  router.refresh();
                }}
              />
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

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

/**
 * One review, as a card.
 *
 * Shows what a visitor would see — the stars, the words, who wrote them — plus
 * the two things only the client needs: whether it is live, and whether it came
 * in through the site rather than being typed in here.
 *
 * The body is clamped rather than truncated with a character count. A review is
 * read in lines, and cutting at a line boundary keeps the cards the same height
 * whatever the sentence lengths happen to be; the full text is one click away.
 */
function ReviewSummary({
  review,
  published,
  onEdit,
}: {
  review: EditableReview;
  published: boolean;
  onEdit: () => void;
}) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {review.rating ? (
            <span className="flex items-center gap-0.5">
              {Array.from({ length: review.rating }).map((_, index) => (
                <Star
                  key={index}
                  className="size-4 fill-current text-accent"
                  aria-hidden="true"
                />
              ))}
              <span className="sr-only">{review.rating} out of 5</span>
            </span>
          ) : (
            <span className="text-xs text-foreground-subtle">No rating</span>
          )}

          <Badge tone={published ? "active" : "neutral"}>
            {published ? "Live" : "Hidden"}
          </Badge>

          {review.submittedAt ? (
            <Badge tone="accent">From the site</Badge>
          ) : null}
        </div>

        {/*
          The pencil is an icon button with a real accessible name that includes
          the reviewer, because a screen reader hears this list as a run of
          identical "Edit" buttons otherwise.
        */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={`Edit the review by ${review.authorName}`}
          title="Edit"
        >
          <Pencil aria-hidden="true" />
        </Button>
      </div>

      <blockquote className="line-clamp-5 text-sm leading-relaxed text-foreground-muted">
        {review.body}
      </blockquote>

      <div className="mt-auto flex flex-col gap-1 border-t border-border pt-3">
        <span className="text-sm font-semibold text-foreground">
          {review.authorName}
        </span>
        {review.authorRole ? (
          <span className="text-xs text-foreground-subtle">{review.authorRole}</span>
        ) : null}

        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-subtle">
          {review.source ? <span>via {review.source}</span> : null}
          {review.reviewedAt ? <span>{formatDate(review.reviewedAt)}</span> : null}
          {review.sourceUrl ? (
            <a
              href={review.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
            >
              Original
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : null}
        </span>

        {/*
          The submitter's address, on the card rather than only inside the
          editor. Checking that a review is genuine is what the warning at the
          top of this screen asks for, and it should not need a click.
        */}
        {review.submittedAt && review.authorEmail ? (
          <a
            href={`mailto:${review.authorEmail}`}
            className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
          >
            <Mail className="size-3" aria-hidden="true" />
            {review.authorEmail}
          </a>
        ) : null}
      </div>
    </article>
  );
}

function ReviewEditor({
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
    <div className="flex flex-col gap-4">
      {/*
        Where this one came from, on the reviews that came from somewhere.

        The email is the only way to check that a review is genuine, which is
        what the warning at the top of this screen asks for. It is shown as a
        mailto so checking is one click rather than a copy and paste, and it is
        never rendered anywhere public — anon has no privilege to read the
        column at all (migration 024).
      */}
      {initial?.submittedAt ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-accent-wash px-4 py-3 text-sm">
          <span className="font-semibold text-foreground">Sent from the site</span>
          <span className="text-foreground-muted">
            {formatDateTime(initial.submittedAt)}
          </span>
          {initial.authorEmail ? (
            <a
              href={`mailto:${initial.authorEmail}`}
              className="font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
            >
              {initial.authorEmail}
            </a>
          ) : (
            <span className="text-foreground-subtle">No email given</span>
          )}
        </div>
      ) : null}

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
