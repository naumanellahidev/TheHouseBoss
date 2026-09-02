"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Phone, Trash2 } from "lucide-react";

import {
  deleteLead,
  setLeadNotes,
  setLeadStatus,
} from "@/app/(admin)/admin/(shell)/leads/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { leadTypeLabel } from "@/lib/email/templates";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { Lead } from "@/types/domain";

/**
 * Lead detail — docs/06 § 8.
 *
 * Contact actions come first and are real links: `tel:` and a `mailto:` with a
 * prefilled subject. On the phone — which is where she will read most of these
 * — tapping the number should dial, not select text.
 *
 * The note field saves on blur rather than behind a button. A note typed and
 * then navigated away from is the most likely thing to be lost on this screen,
 * and admin UX rule 1 is "never lose work".
 */

const STATUSES: { value: Lead["status"]; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
  { value: "spam", label: "Spam" },
];

export function LeadDetail({
  lead,
  listingAddress,
}: {
  lead: Lead;
  listingAddress: string | null;
}) {
  const router = useRouter();
  const toast = useToast();

  const [status, setStatus] = React.useState<Lead["status"]>(lead.status);
  const [notes, setNotes] = React.useState(lead.notes ?? "");
  const [savingNote, setSavingNote] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  // A different lead selected in the list must reset local state, or the
  // previous lead's note follows the selection. Adjusted during render, not in
  // an effect — otherwise the previous lead's note is painted once first.
  const [shownLeadId, setShownLeadId] = React.useState(lead.id);
  if (shownLeadId !== lead.id) {
    setShownLeadId(lead.id);
    setStatus(lead.status);
    setNotes(lead.notes ?? "");
  }

  async function changeStatus(next: Lead["status"]) {
    const previous = status;
    setStatus(next);
    const result = await setLeadStatus({ id: lead.id, status: next });
    if (!result.ok) {
      setStatus(previous);
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function saveNote() {
    if (notes === (lead.notes ?? "")) return;
    setSavingNote(true);
    const result = await setLeadNotes({ id: lead.id, notes });
    setSavingNote(false);
    if (!result.ok) {
      toast.error(result.error, { label: "Try again", onClick: () => void saveNote() });
      return;
    }
    toast.success("Note saved.");
    router.refresh();
  }

  const mailto = `mailto:${lead.email}?subject=${encodeURIComponent(
    `Re: your enquiry — The House Boss`,
  )}`;

  const facts: [string, React.ReactNode][] = [
    ["Received", formatDateTime(lead.createdAt)],
    ["Interested in", leadTypeLabel(lead.leadType)],
    [
      "Came from",
      lead.sourcePage ? (
        <Link
          href={lead.sourcePage}
          target="_blank"
          rel="noreferrer"
          className="text-accent-quiet underline underline-offset-4 hover:text-foreground"
        >
          {lead.sourcePage}
        </Link>
      ) : (
        "—"
      ),
    ],
    [
      "About a listing",
      lead.listingId ? (
        <Link
          href={`/admin/listings/${lead.listingId}/edit`}
          className="text-accent-quiet underline underline-offset-4 hover:text-foreground"
        >
          {listingAddress ?? "View listing"}
        </Link>
      ) : (
        "—"
      ),
    ],
  ];

  const utmEntries = Object.entries(lead.utm ?? {});

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-5 shadow-xs md:p-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-h3">{lead.name}</h3>
          <Badge tone={status === "new" ? "accent" : status === "spam" ? "neutral" : "active"}>
            {status}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {lead.phone ? (
            <Button asChild variant="primary" size="sm">
              <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}>
                <Phone aria-hidden="true" />
                {lead.phone}
              </a>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <a href={mailto}>
              <Mail aria-hidden="true" />
              {lead.email}
            </a>
          </Button>
        </div>
      </div>

      {lead.message ? (
        <div className="flex flex-col gap-2">
          <h4 className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
            Message
          </h4>
          <p className="rounded-md border-l-2 border-accent bg-surface-sunken p-4 text-body leading-relaxed whitespace-pre-wrap">
            {lead.message}
          </p>
        </div>
      ) : null}

      <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="flex flex-wrap items-baseline justify-between gap-4">
            <dt className="text-foreground-muted">{label}</dt>
            <dd className="min-w-0 text-right text-foreground">{value}</dd>
          </div>
        ))}
        {utmEntries.map(([key, value]) => (
          <div key={key} className="flex flex-wrap items-baseline justify-between gap-4">
            <dt className="text-foreground-muted">{key}</dt>
            <dd className="min-w-0 text-right text-foreground">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <h4 className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
          Status
        </h4>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => void changeStatus(option.value)}
              aria-pressed={status === option.value}
              className={cn(
                "inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium",
                "transition-colors duration-(--dur-fast)",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                status === option.value
                  ? "border-accent bg-accent-wash text-foreground"
                  : "border-border-strong text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <Field className="border-t border-border pt-4">
        <FieldLabel>Notes</FieldLabel>
        <Textarea
          value={notes}
          rows={4}
          onChange={(event) => setNotes(event.target.value)}
          onBlur={() => void saveNote()}
          placeholder="What was discussed, what happens next."
        />
        <FieldDescription>
          {savingNote ? "Saving…" : "Saved automatically when you click away."}
        </FieldDescription>
      </Field>

      <div className="border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger-bg hover:text-danger"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 aria-hidden="true" />
          Delete this lead
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this lead"
        description="This cannot be undone."
        confirmPhrase={lead.name}
        confirmHint="Type the sender's name to confirm."
        consequence={
          <>
            Marking a lead as <strong>Spam</strong> keeps the record and hides it
            from the default view. Deleting removes it permanently, including the
            message.
          </>
        }
        onConfirm={async () => {
          const result = await deleteLead(lead.id);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Lead deleted.");
          setConfirmDelete(false);
          router.push("/admin/leads");
        }}
      />
    </div>
  );
}
