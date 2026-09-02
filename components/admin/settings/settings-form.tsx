"use client";

import * as React from "react";
import { AlertTriangle, Save, Sparkles, Trash2 } from "lucide-react";

import {
  runPurgeNow,
  saveSettings,
} from "@/app/(admin)/admin/(shell)/settings/actions";
import { runOrphanSweep } from "@/app/(admin)/admin/(shell)/media/actions";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Textarea,
} from "@/components/ui/field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { formatBytes } from "@/lib/storage/budget";
import { PROFILE_FIELDS } from "@/lib/validation/settings";
import { siteConfig } from "@/lib/site-config";
import { formatDateTime } from "@/lib/utils/date";
import type { AdminSettings } from "@/types/domain";

/**
 * Settings — docs/06 § 10.
 *
 * Five panels: Contact, Profiles, Site, Compliance, Notifications, plus
 * Maintenance. Every field says what it AFFECTS, not just what it is: a URL
 * box labelled "Zillow" teaches nothing, while "appears in the footer and in
 * the structured data search engines read" tells her why it is worth filling
 * in.
 *
 * The compliance panel carries a standing warning. Those values are legally
 * required to be accurate (docs/09 § 1) and this is the one screen where a
 * casual edit has a regulatory consequence.
 */
export function SettingsForm({ settings }: { settings: AdminSettings }) {
  const toast = useToast();
  const [saving, setSaving] = React.useState(false);
  const [busy, setBusy] = React.useState<null | "purge" | "orphans">(null);

  const [form, setForm] = React.useState(() => ({
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    addressStreet: settings.address.street ?? "",
    addressLocality: settings.address.locality ?? "",
    addressRegion: settings.address.region ?? "",
    addressPostal: settings.address.postalCode ?? "",
    officeHours: settings.officeHours ?? "",
    positioning: settings.positioning ?? "",
    announcement: settings.announcement ?? "",
    announcementHref: settings.announcementHref ?? "",
    brokerageName: settings.brokerageName ?? "",
    licenseRe: settings.licenseRe ?? "",
    licenseContractor: settings.licenseContractor ?? "",
    disclosureText: settings.disclosureText ?? "",
    leadNotifyEmail: settings.leadNotifyEmail ?? "",
    autoresponderSubject: settings.autoresponderSubject ?? "",
    autoresponderBody: settings.autoresponderBody ?? "",
  }));

  const [profiles, setProfiles] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(
      PROFILE_FIELDS.map((field) => [field.key, settings.profiles[field.key] ?? ""]),
    ),
  );

  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setErrors({});

    const result = await saveSettings({ ...form, profiles });
    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved. The whole site has been refreshed.");
  }

  const errorOf = (key: string) => errors[key]?.[0];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <Tabs defaultValue="contact">
        <TabsList>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="site">Site</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        {/* ── Contact ──────────────────────────────────────────────────── */}
        <TabsContent value="contact">
          <div className="grid max-w-3xl gap-5 md:grid-cols-2">
            <Field error={errorOf("phone")}>
              <FieldLabel>Phone</FieldLabel>
              <Input
                value={form.phone}
                onChange={(event) => set("phone")(event.target.value)}
                inputMode="tel"
                placeholder="+1 407 555 0142"
              />
              <FieldDescription>
                Shown in the footer as a tap-to-call link, and in the structured
                data. Left blank, the whole block is hidden rather than showing a
                placeholder.
              </FieldDescription>
            </Field>

            <Field error={errorOf("email")}>
              <FieldLabel>Public email</FieldLabel>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => set("email")(event.target.value)}
                placeholder="krisi@thehousebossfl.com"
              />
              <FieldDescription>
                The address visitors see. Enquiry notifications go to the address
                on the Notifications tab, which can be different.
              </FieldDescription>
            </Field>

            <Field error={errorOf("addressStreet")} className="md:col-span-2">
              <FieldLabel>Brokerage street address</FieldLabel>
              <Input
                value={form.addressStreet}
                onChange={(event) => set("addressStreet")(event.target.value)}
              />
              <FieldDescription>
                The office address. Marketing email is legally required to carry a
                physical address, so this is not optional before launch.
              </FieldDescription>
            </Field>

            <Field error={errorOf("addressLocality")}>
              <FieldLabel>City</FieldLabel>
              <Input
                value={form.addressLocality}
                onChange={(event) => set("addressLocality")(event.target.value)}
                placeholder="Lake Mary"
              />
            </Field>

            <Field error={errorOf("addressRegion")}>
              <FieldLabel>State</FieldLabel>
              <Input
                value={form.addressRegion}
                onChange={(event) => set("addressRegion")(event.target.value)}
                placeholder="FL"
              />
            </Field>

            <Field error={errorOf("addressPostal")}>
              <FieldLabel>ZIP</FieldLabel>
              <Input
                value={form.addressPostal}
                onChange={(event) => set("addressPostal")(event.target.value)}
                inputMode="numeric"
              />
            </Field>

            <Field error={errorOf("officeHours")}>
              <FieldLabel>Office hours</FieldLabel>
              <Input
                value={form.officeHours}
                onChange={(event) => set("officeHours")(event.target.value)}
                placeholder="Monday–Saturday, 9am–7pm ET"
              />
            </Field>
          </div>
        </TabsContent>

        {/* ── Profiles ─────────────────────────────────────────────────── */}
        <TabsContent value="profiles">
          <div className="flex max-w-3xl flex-col gap-5">
            <p className="max-w-[70ch] rounded-md border border-info/30 bg-info-bg p-4 text-sm text-foreground">
              These links do two jobs. They appear in the footer, and they go into
              the structured data as the list of profiles that are verifiably the
              same person. That second job is what helps search engines and AI
              assistants connect this site to your Google and Zillow presence, so
              a real URL here is worth more than a social icon.
            </p>

            <div className="grid gap-5 md:grid-cols-2">
              {PROFILE_FIELDS.map((field) => (
                <Field key={field.key} error={errorOf(`profiles.${field.key}`)}>
                  <FieldLabel>{field.label}</FieldLabel>
                  <Input
                    type="url"
                    value={profiles[field.key] ?? ""}
                    onChange={(event) =>
                      setProfiles((current) => ({
                        ...current,
                        [field.key]: event.target.value,
                      }))
                    }
                    placeholder="https://…"
                  />
                </Field>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── Site ─────────────────────────────────────────────────────── */}
        <TabsContent value="site">
          <div className="flex max-w-3xl flex-col gap-5">
            <Field error={errorOf("positioning")}>
              <FieldLabel>Positioning line</FieldLabel>
              <Textarea
                rows={2}
                value={form.positioning}
                onChange={(event) => set("positioning")(event.target.value)}
                placeholder={siteConfig.positioning}
              />
              <FieldDescription>
                Used in the hero, in meta descriptions and in the structured data.
                Leave blank to keep the current one:{" "}
                <span className="italic">{siteConfig.positioning}</span>
              </FieldDescription>
            </Field>

            <Field error={errorOf("announcement")}>
              <FieldLabel>Announcement bar</FieldLabel>
              <Input
                value={form.announcement}
                onChange={(event) => set("announcement")(event.target.value)}
                placeholder="Open house this Saturday in Heathrow, 1–3pm"
              />
              <FieldDescription>
                Appears across the top of every public page. Clear it to remove the
                bar entirely.
              </FieldDescription>
            </Field>

            <Field error={errorOf("announcementHref")}>
              <FieldLabel>Announcement link</FieldLabel>
              <Input
                type="url"
                value={form.announcementHref}
                onChange={(event) => set("announcementHref")(event.target.value)}
                placeholder="https://thehousebossfl.com/listing/…"
              />
            </Field>
          </div>
        </TabsContent>

        {/* ── Compliance ───────────────────────────────────────────────── */}
        <TabsContent value="compliance">
          <div className="flex max-w-3xl flex-col gap-5">
            <p className="flex max-w-[70ch] items-start gap-2.5 rounded-md border border-warning/30 bg-warning-bg p-4 text-sm text-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
              <span>
                These values appear on every page because Florida advertising rules
                require them, and the brokerage name is rendered at least as
                prominently as your own name for the same reason. They are editable
                so a licence renewal or a brokerage change can be handled without a
                developer — not so they can be shortened. Check with your broker
                before changing anything here.
              </span>
            </p>

            <Field error={errorOf("brokerageName")}>
              <FieldLabel>Brokerage name</FieldLabel>
              <Input
                value={form.brokerageName}
                onChange={(event) => set("brokerageName")(event.target.value)}
                placeholder={siteConfig.brokerage}
              />
            </Field>

            <div className="grid gap-5 md:grid-cols-2">
              <Field error={errorOf("licenseRe")}>
                <FieldLabel>Real estate licence</FieldLabel>
                <Input
                  value={form.licenseRe}
                  onChange={(event) => set("licenseRe")(event.target.value)}
                  placeholder={siteConfig.licenses.realEstate.number}
                />
              </Field>

              <Field error={errorOf("licenseContractor")}>
                <FieldLabel>Contractor licence</FieldLabel>
                <Input
                  value={form.licenseContractor}
                  onChange={(event) => set("licenseContractor")(event.target.value)}
                  placeholder={siteConfig.licenses.contractor.number}
                />
              </Field>
            </div>

            <Field error={errorOf("disclosureText")}>
              <FieldLabel>Additional disclosure</FieldLabel>
              <Textarea
                rows={3}
                value={form.disclosureText}
                onChange={(event) => set("disclosureText")(event.target.value)}
              />
              <FieldDescription>
                Optional extra line in the compliance footer, if your broker asks
                for specific wording.
              </FieldDescription>
            </Field>
          </div>
        </TabsContent>

        {/* ── Notifications ────────────────────────────────────────────── */}
        <TabsContent value="notifications">
          <div className="flex max-w-3xl flex-col gap-5">
            <Field error={errorOf("leadNotifyEmail")}>
              <FieldLabel>Send new enquiries to</FieldLabel>
              <Input
                type="email"
                value={form.leadNotifyEmail}
                onChange={(event) => set("leadNotifyEmail")(event.target.value)}
              />
              <FieldDescription>
                Every form submission emails this address with the message and a
                direct link to it in the dashboard. Replying to that email answers
                the sender.
              </FieldDescription>
            </Field>

            <Field error={errorOf("autoresponderSubject")}>
              <FieldLabel>Auto-reply subject</FieldLabel>
              <Input
                value={form.autoresponderSubject}
                onChange={(event) => set("autoresponderSubject")(event.target.value)}
                placeholder="Thanks for contacting The House Boss"
              />
            </Field>

            <Field error={errorOf("autoresponderBody")}>
              <FieldLabel>Auto-reply message</FieldLabel>
              <Textarea
                rows={5}
                value={form.autoresponderBody}
                onChange={(event) => set("autoresponderBody")(event.target.value)}
                placeholder="Thank you for getting in touch. I have your message and I reply to every enquiry personally, usually the same business day."
              />
              <FieldDescription>
                Sent immediately to whoever submitted the form. Your name, both
                licences and the brokerage are added automatically.
              </FieldDescription>
            </Field>
          </div>
        </TabsContent>

        {/* ── Maintenance ──────────────────────────────────────────────── */}
        <TabsContent value="maintenance">
          <div className="flex max-w-3xl flex-col gap-4">
            <p className="max-w-[70ch] text-sm text-foreground-muted">
              Both of these run automatically every night. The buttons are here for
              when you want the space back now.
            </p>

            <MaintenanceRow
              title="Remove large photos from sold listings"
              lastRun={settings.lastPurgeRun}
              description="Seven days after a sale, the two large sizes of each photo are deleted and the small one is kept. The page stays live and keeps its search ranking."
              icon={Trash2}
              busy={busy === "purge"}
              onRun={async () => {
                setBusy("purge");
                const result = await runPurgeNow();
                setBusy(null);
                if (!result.ok) toast.error(result.error);
                else toast.success(result.message ?? "Done.");
              }}
            />

            <MaintenanceRow
              title="Clean up unused files"
              lastRun={settings.lastOrphanSweep}
              description="Deletes files in storage that nothing points at any more. Anything uploaded in the last 24 hours is left alone."
              icon={Sparkles}
              busy={busy === "orphans"}
              onRun={async () => {
                setBusy("orphans");
                const result = await runOrphanSweep();
                setBusy(null);
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success(
                    `${result.message ?? "Done."} Freed about ${formatBytes(result.freedBytes ?? 0)}.`,
                  );
                }
              }}
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button type="submit" variant="accent" loading={saving}>
          <Save aria-hidden="true" />
          Save settings
        </Button>
        <p className="text-xs text-foreground-muted">
          Saving refreshes every page on the public site.
        </p>
      </div>
    </form>
  );
}

function MaintenanceRow({
  title,
  description,
  lastRun,
  icon: Icon,
  busy,
  onRun,
}: {
  title: string;
  description: string;
  lastRun: string | null;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  busy: boolean;
  onRun: () => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="max-w-[60ch] text-xs text-foreground-muted">{description}</p>
        <p className="text-xs text-foreground-subtle">
          Last run: {lastRun ? formatDateTime(lastRun) : "never"}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        loading={busy}
        onClick={() => void onRun()}
        className="shrink-0"
      >
        <Icon aria-hidden={true} />
        Run now
      </Button>
    </div>
  );
}
