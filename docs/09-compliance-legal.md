# 09 — Compliance and Legal

Florida real-estate advertising rules, Fair Housing, and accessibility. Getting
these wrong exposes the client to a brokerage complaint, a FREC citation, a
HUD complaint or an ADA demand letter.

> This document is written by a developer, not a lawyer. Before launch the
> client must have her **broker at World Properties Group review the site**.
> That review is a launch-blocking checklist item.

---

## 1. Florida advertising disclosure

### What must appear

Every public page, in the footer:

| Element | Value |
|---|---|
| Licensee's full name as licensed | Krisi Kakarova |
| Real-estate licence number | SL3327932 |
| Brokerage / registered trade name | World Properties Group |
| Contractor licence number | CRC1335654 |
| Brand / team name | The House Boss |

### The sizing rule

Florida Administrative Code 61J2-10.026 governs team and individual licensee
advertising. The operative constraint:

> The brokerage's registered name must appear in a manner **at least as
> prominent** as the team or individual licensee name.

Practically, in `<ComplianceFooter />`:

- "World Properties Group" renders at a font size **equal to or larger than**
  "Krisi Kakarova" and "The House Boss"
- Same or greater font weight
- Same or greater contrast
- Adjacent, not buried in a separate collapsed region

Enforced in code, not by discipline:

```tsx
// components/site/ComplianceFooter.tsx
const NAME_SIZE = 'text-sm font-medium'        // agent + brand
const BROKERAGE_SIZE = 'text-base font-semibold' // brokerage — never smaller
```

Add a comment in the component: **"FREC 61J2-10.026: BROKERAGE_SIZE must be >=
NAME_SIZE. Do not change without broker approval."**

The `phase-review` skill checks that this component exists, is used in the
marketing layout, and has not been re-implemented inline anywhere.

### Where else disclosure is needed

- Listing pages: the disclosure footer plus the agent card, which names the
  brokerage
- Any page that presents her as representing a buyer or seller
- Social profile links do not carry the disclosure, but the profiles themselves
  should — flag this to the client
- Email templates from Resend: include the same disclosure block in the footer

### Trade-name note

"The House Boss" is a trade or team name. Confirm with the broker that it is
registered with the DBPR as required. If it is not, the site is advertising
under an unregistered name. **Ask; do not assume.** Tracked as an open client
decision.

---

## 2. Fair Housing

### Required marks

Footer, on every page:

- Equal Housing Opportunity logo (the house-and-equals mark)
- The text "Equal Housing Opportunity"
- Optionally the REALTOR® mark if she is a NAR member — **only if she is**;
  the term REALTOR is a registered collective mark

Both marks are SVG, in `/public`, with real `alt` text. They are not decorative.

### Prohibited language

Fair Housing prohibits statements indicating a preference or limitation based on
race, color, religion, sex, familial status, national origin, disability, and —
under Florida and local ordinances — additional protected classes.

This matters because **the client writes the listing descriptions**. Put the
guidance where she writes, not in a document she will never open.

Add a linter to the admin description field that warns (does not block) on:

```
"perfect for families", "family neighborhood", "no kids", "adult community",
"safe neighborhood", "good schools" (use the district name and a link instead),
"walking distance" (disability implication — use the distance),
"master bedroom" (use "primary bedroom"),
"exclusive", "private community", "integrated", "traditional neighborhood",
"near churches", "Christian", "ethnic", "handicap", "able-bodied",
"couples only", "singles", "mature", "retirees"
```

The warning explains why and offers a replacement. It warns rather than blocks —
a false positive must never stop her from publishing.

Also required: descriptions describe **the property**, not the ideal occupant.
Put that sentence in the field's helper text.

### Accessibility of the housing itself

If a property has accessible features, describe them factually
("32-inch doorways", "zero-step entry"). Do not editorialize about who they suit.

---

## 3. Accessibility of the website (ADA / WCAG)

Real-estate websites are among the most frequently targeted in ADA Title III web
accessibility litigation. This is a real, quantified business risk, not
theoretical.

**Target: WCAG 2.1 Level AA.** The full baseline is in `03-design-system.md` § 9
and the test procedure is in `13-qa-checklists.md`.

### Accessibility statement

`/legal/accessibility` must be a real statement, not boilerplate:

- The conformance target (WCAG 2.1 AA)
- What has been done (semantic HTML, keyboard operability, contrast, alt text,
  reduced-motion support, testing method)
- Known limitations, honestly stated (e.g. third-party embedded maps)
- A contact route — email and phone — for reporting a barrier
- A commitment to respond within a stated timeframe
- The date last reviewed

A genuine, dated statement with a working contact route is both the right thing
and meaningful mitigation. A copy-pasted statement that nobody honors is worse
than none.

### Ongoing obligation

Accessibility is not a launch task. Every new page and every article the client
publishes must maintain it. The admin editor enforces the two things she
controls: **alt text on images** (required before publish) and **heading
structure** (no H1 in the article body; H2/H3 only).

---

## 4. IDX and MLS (not applicable today, required later)

There is no MLS integration in v1. All listings are her own, which means:

- No IDX disclaimer is required today
- No Stellar MLS attribution is required today
- Listing data is fully AI-crawlable, which is exactly what we want

When Stellar MLS is added (`11-mls-future.md`), the following become mandatory
and are conditional on `source !== 'manual'`:

- Stellar MLS attribution and the "Information deemed reliable but not
  guaranteed" disclaimer on every IDX listing page and every IDX result set
- The listing brokerage's name on each listing not her own
- A last-updated timestamp on IDX data
- Compliance with Stellar's display rules, including any restriction on
  crawling, framing or scraping
- Removal of off-market IDX listings within the timeframe the agreement requires

Build the `<IdxDisclaimer />` component in the MLS phase, rendered conditionally.
Do not render it now — a disclaimer referencing an MLS feed that does not exist
is itself misleading.

---

## 5. Lead capture, privacy and email

### Privacy policy

`/legal/privacy` must state, accurately:

- What is collected: name, email, phone, message, page, UTM parameters, IP for
  rate limiting, analytics data
- Why: to respond to enquiries and send requested listing alerts
- Who it is shared with: Supabase (hosting/database), Resend (email), Vercel
  (hosting), any analytics provider — name them
- Retention period
- How to request deletion, with a working contact route
- Cookie usage — if analytics cookies are used, say so

Florida has no comprehensive consumer privacy statute equivalent to the CCPA at
the scale this site operates, but the policy must still be accurate. Accuracy is
the requirement, not length.

### Email and CAN-SPAM

Listing alerts are commercial email. Therefore:

- **Double opt-in.** The `saved_searches.confirm_token` flow is not optional.
- Every alert email includes a working one-click unsubscribe
- Every alert email includes a physical postal address (the brokerage office)
- Subject lines are not deceptive
- Unsubscribe is honored within 10 business days — implement it as immediate

### Form protections

- Honeypot field, hidden from users and from screen readers
- Rate limit: 5 submissions per IP per hour on `/api/leads`
- Server-side validation with the same zod schema as the client
- No CAPTCHA in v1 — it harms conversion and accessibility. Add Cloudflare
  Turnstile only if spam actually becomes a problem.
- Never log a full lead payload to a console or a third-party error tracker

### Consent language

Under the contact form:

> By submitting this form you agree to be contacted by Krisi Kakarova about
> your enquiry. You can opt out at any time. See our
> [Privacy Policy](/legal/privacy).

For the listing-alerts form, add: "You will receive an email to confirm your
subscription."

---

## 6. Content claims

The client is a licensed contractor and a licensed Realtor. She may advise on
construction and on real estate. She may **not**:

- Give lending advice, quote rates, or promise loan approval — the VA guide
  needs a clear disclaimer
- Give legal advice on contracts — recommend an attorney where relevant
- Give tax advice — recommend a CPA
- Guarantee a sale price, a timeline, or an appraisal outcome
- Guarantee that the site will appear in ChatGPT

Standard disclaimer blocks, defined once as `<Disclaimer type="lending" | "legal"
| "tax" | "estimate" />` and placed on:

| Page | Disclaimer |
|---|---|
| `/guides/va-home-buyer` | lending |
| `/assumable-mortgage-homes` | lending + legal |
| `/new-construction-representation` | legal |
| `/sell-your-central-florida-home` | estimate |
| `/market-updates/*` | estimate, plus an "as of" date |
| Any page with a valuation form | estimate |

Wording for the lending disclaimer:

> This information is general education, not lending advice. Krisi Kakarova is
> a licensed real estate agent, not a mortgage lender. Loan eligibility, terms
> and rates are determined by your lender and, for VA loans, by the U.S.
> Department of Veterans Affairs.

---

## 7. Reviews and testimonials

- Publish only reviews actually received.
- Attribute the source (Google, Zillow, direct) and link to the original where
  one exists.
- Do not edit a review's substance. Trimming for length is acceptable; changing
  meaning is not.
- Get permission before publishing a full name.
- **Do not emit `AggregateRating` JSON-LD** unless every rating is first-party,
  verifiable and displayed on the page.
- The FTC treats fabricated or incentivized reviews without disclosure as a
  deceptive practice. If a review was incentivized in any way, disclose it.

---

## 8. Images and copyright

- Property photos: she must own them or have a licence. Photos taken by a
  brokerage-hired photographer are frequently licensed to the **brokerage**, not
  the agent — confirm before using them on a personal-brand site.
- Stock imagery for city and guide pages must be properly licensed. Record the
  licence in the `media` table's future `license` field or in a simple sheet.
- Never use an MLS photo for a listing that is not hers.
- Google Street View and Maps imagery has its own attribution requirements —
  follow them if used.
- Do not use the REALTOR® logo unless she is a NAR member in good standing.

---

## 9. Compliance checklist for launch

Every item must be checked and signed off before go-live.

- [ ] `<ComplianceFooter />` renders on every public page, verified by crawling
      the sitemap and asserting the string is present
- [ ] Brokerage name font size ≥ agent name font size, measured in the browser
- [ ] Both licence numbers displayed and correct
- [ ] Equal Housing Opportunity logo and text present
- [ ] REALTOR® mark used only if membership is confirmed
- [ ] Trade name "The House Boss" confirmed registered with the DBPR
- [ ] Fair Housing linter active on the description field
- [ ] Every listing description reviewed for prohibited language
- [ ] `/legal/privacy` accurate and naming every processor
- [ ] `/legal/terms` present
- [ ] `/legal/accessibility` genuine, dated, with a working contact route
- [ ] Double opt-in working end to end for listing alerts
- [ ] Unsubscribe working in every marketing email
- [ ] Physical address in every marketing email
- [ ] Disclaimer blocks on the VA, assumable, new-construction, sell and market
      pages
- [ ] No `AggregateRating` markup unless justified
- [ ] Photo rights confirmed for every image on the site
- [ ] WCAG 2.1 AA verified: axe-core clean, keyboard pass, contrast pass
- [ ] Broker at World Properties Group has reviewed and approved the site
- [ ] Client has acknowledged the Stellar MLS deferral in writing
