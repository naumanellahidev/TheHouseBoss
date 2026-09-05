import { isPending, siteConfig } from "@/lib/site-config";
import type { SiteSettings } from "@/types/domain";

/**
 * The floating WhatsApp button.
 *
 * ── When it renders ───────────────────────────────────────────────────────
 *
 * Only when a number resolves. `site_settings.whatsapp` first, then `phone` as
 * a fallback — for many agents they are the same number, and asking twice for
 * one fact is worse than falling back. When neither is set the component
 * returns null rather than rendering a button that opens WhatsApp with no
 * recipient, which is the failure mode of every "add a floating chat widget"
 * snippet on the internet.
 *
 * `PENDING` is treated as absent. `lib/site-config.ts` uses that literal for
 * values the client has not supplied yet, and a `wa.me/PENDING` link is worse
 * than no button.
 *
 * ── Why a server component with no JavaScript ─────────────────────────────
 *
 * It is a link. A link needs no client bundle, no mount effect and no
 * hydration, and shipping a widget script to every page to render an anchor
 * would undo work done elsewhere in this project to keep the marketing routes
 * light. The hover and focus states are CSS.
 *
 * ── Placement ─────────────────────────────────────────────────────────────
 *
 * Fixed bottom-right, above `safe-bottom` so it clears the iOS home indicator.
 * `z-40`, the same rung as the sticky header — below the modal layer, so a
 * dialog is never obscured by a button the reader cannot dismiss.
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 *
 * `--color-whatsapp` is WhatsApp's dark teal, not the familiar bright green.
 * The reasoning, with the measured ratios, is in the token definition in
 * `app/globals.css`: the bright green fails 1.4.11 against both this page and
 * the navy footer.
 */

/** `+1 (407) 555-0142` → `14075550142`. wa.me accepts digits only. */
function toWaNumber(value: string | null | undefined): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  /*
    Seven is the shortest real subscriber number anywhere; below that this is a
    partially-typed value or a placeholder, and a wa.me link built from it opens
    a chat with a stranger. Twenty is the ITU E.164 ceiling.
  */
  if (digits.length < 7 || digits.length > 20) return null;
  return digits;
}

export function WhatsAppButton({
  settings,
}: {
  settings?: SiteSettings | null;
}) {
  /*
    `isPending` rather than a literal comparison. Now that the client has
    supplied a real phone number, TypeScript narrows `siteConfig.contact.phone`
    to that exact string and a `=== "PENDING"` check is a type error — correctly,
    because the two can never be equal. The helper reads the value at runtime,
    which is what a guard against a placeholder actually needs to do.
  */
  const configured =
    settings?.whatsapp ??
    settings?.phone ??
    (isPending(siteConfig.contact.phone) ? null : siteConfig.contact.phone);

  const number = toWaNumber(configured);
  if (!number) return null;

  /*
    A prefilled first message. Someone tapping this from a listing page has a
    property in mind, but the button is site-wide and cannot know which — so the
    text opens the conversation without pretending to context it does not have.
    It is editable before sending, as every WhatsApp prefill is.
  */
  const message = encodeURIComponent(
    "Hi Krisi, I found your site and I have a question about buying or selling in Central Florida.",
  );

  return (
    <a
      href={`https://wa.me/${number}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      /*
        The accessible name says what happens, not what the icon is. "WhatsApp"
        alone leaves a screen-reader user to infer the action; "opens WhatsApp"
        plus the new-tab warning is what a sighted user gets from the icon and
        the cursor.
      */
      aria-label="Message Krisi on WhatsApp (opens WhatsApp in a new tab)"
      /*
        The hook `globals.css` uses to lift this above the listing pages' sticky
        action bar. An attribute rather than a class so a Tailwind class list
        cannot accidentally drop it.
      */
      data-floating-cta
      className={[
        "fixed right-4 bottom-4 z-40 md:right-6 md:bottom-6",
        "safe-bottom",
        // 56px. Comfortably past the 44px minimum, which is the floor for a
        // control you hit with a thumb while scrolling, not a target.
        "flex size-14 items-center justify-center rounded-full",
        "bg-whatsapp text-white shadow-float",
        "transition-[background-color,transform] duration-(--dur-fast) ease-(--ease-out)",
        "hover:bg-whatsapp-hover motion-safe:hover:-translate-y-0.5",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
      ].join(" ")}
    >
      {/*
        The mark inline as SVG rather than an icon-font or an image request. It
        is on every page, so a network round trip for a 1KB glyph is a round
        trip on every page.
      */}
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        className="size-7"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 0 1 6.988 2.898 9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.82 11.82 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.88 11.88 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.82 11.82 0 0 0 20.464 3.488" />
      </svg>
    </a>
  );
}
