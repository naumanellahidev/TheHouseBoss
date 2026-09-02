# 15 — Client Launch Checklist

Everything that needs **Krisi** rather than a developer. Written to be worked
through in order and handed back.

Two things this list will not pretend:

- Nobody can guarantee that ChatGPT or any other assistant recommends a specific
  agent. What can be built is a site that is accurate, well structured, openly
  crawlable and corroborated elsewhere — which is what makes a recommendation
  possible. The honest measure is whether assistants answer *questions in your
  field* using your pages, tracked monthly.
- Off-site corroboration matters as much as anything on the site. An assistant
  weighs whether independent sources agree with what a site claims about itself.

---

## 1. Before launch — blocking

These stop the site going live.

| # | Item | Why it blocks |
|---|---|---|
| 1 | **Broker review and sign-off** of the whole site | FREC advertising rules are the brokerage's exposure, not only yours |
| 2 | **Confirm "The House Boss" is registered with the DBPR** as a trade name | Advertising under an unregistered name is a violation. Ask; do not assume |
| 3 | **Business email address** on a domain you control | Needed to send from `thehousebossfl.com` |
| 4 | **Verify the sending domain with Resend** (SPF, DKIM, DMARC records) | Without it, enquiry confirmations land in spam |
| 5 | **Rotate the Supabase service-role key** | It was shared over chat during the build; treat it as exposed |
| 6 | **Phone number** for the site and the brokerage's **office address** | Required in the footer and in any marketing email |
| 7 | **Confirm whether you are a NAR member** | Governs whether the REALTOR® mark may be used |
| 8 | **Written acknowledgement of the Stellar MLS deferral** | The site does not carry MLS listings; this must be agreed in writing, not assumed |
| 9 | **Who pays the ~$20/month running cost**, and on whose card | The site stops if the card fails |
| 10 | **Photo rights** confirmed for every image | Brokerage-hired photography is often licensed to the brokerage, not the agent |

---

## 2. Content you supply

The site works without these; it is considerably better with them.

| Item | Where it appears | Notes |
|---|---|---|
| Professional headshot, high resolution | About, listing pages, social cards | The single highest-value image on the site |
| Lifestyle/brand photography | Home hero, About | |
| Logo files, SVG preferred | Header, footer, favicon | |
| World Properties Group logo and usage rules | Footer | Ask the broker for the brand guidelines |
| Photography of each city | 8 city pages | Real local photographs beat stock decisively. A phone photograph of the actual place is better than a stock skyline |
| First listings with photographs | Search, home, city pages | Up to 15 per listing |
| Sold history | `/sold`, the seller guide | This is your track record; it is worth assembling properly |
| Testimonials **with permission to publish** | `/reviews` | Only reviews actually received. Include the source and a link where there is one |
| A 30-minute interview per guide | VA, assumable, new construction | The guides are structurally complete but written in a developer's approximation of your voice. Your real examples are what make them yours |
| Real market statistics **with the date each was true** | City pages | Left deliberately empty. A figure without a date looks current forever |

**On the city pages specifically.** They currently carry first-draft copy
written during the build: county, school district, position on the I-4 corridor,
and what each city is known for. Everything in it is verifiable and no statistic
was invented. It is meant to be edited into your voice, and the local detail you
can add — which streets flood, which builder did good work in which year — is
exactly what no competitor can copy.

---

## 3. Accounts to create

| Account | Purpose | Notes |
|---|---|---|
| **Google Search Console** | Verify the domain, submit the sitemap, watch what people actually search | Use the DNS verification method at Porkbun so it survives a hosting change |
| **Bing Webmaster Tools** | The same, and it feeds Copilot | Can import directly from Search Console |
| **Google Business Profile** | The single most valuable off-site profile | See section 4 |
| **Vercel** (Pro) | Hosting | Hobby forbids commercial use |

Both sitemaps to submit once verified:

```
https://thehousebossfl.com/sitemap.xml
```

---

## 4. Off-site corroboration

This is the part most agents skip and the part that most affects whether an
assistant is willing to name you. The site says you are a Lake Mary Realtor who
is also a licensed contractor; these are the places something *other than your
own site* says the same thing.

**Make the following identical everywhere** — name, phone number, address and
the description. Inconsistency across profiles is actively harmful; it is the
signal that tells a machine these might be different people.

Use this exactly:

> Krisi Kakarova — The House Boss, powered by World Properties Group. Lake Mary
> Realtor (SL3327932) and Certified Residential Building Contractor
> (CRC1335654), specialising in VA buyers, assumable mortgages and
> new-construction representation across Seminole County and Central Florida.

| Profile | Priority | What to do |
|---|---|---|
| **Google Business Profile** | Highest | Complete every field, add the website, post monthly, and ask past clients for reviews there first |
| **Realtor.com agent profile** | High | Link the website; keep the bio identical |
| **Zillow agent profile** | High | Same |
| **LinkedIn** | High | The description above, verbatim, in the About section |
| **Facebook business page** | Medium | Link the website |
| **Instagram** | Medium | Website in the bio |
| **DBPR licence lookup** | — | Both licences are public record; nothing to do, but this is what corroborates the numbers |
| **Brokerage agent page** | High | Ask World Properties Group to link to `thehousebossfl.com` from your agent page |

Then add each profile URL in **Admin → Settings → Profiles**. They are published
as the `sameAs` list in the site's structured data, which is the machine-readable
statement that all these profiles are the same person. Adding one takes effect
immediately; no developer needed.

**Beyond profiles**, in rough order of value:

1. A local news or community mention that names you and the business.
2. Membership listings — chamber of commerce, professional associations.
3. A guest article or interview on a Central Florida site, linked back.
4. Anything that names *both* licences together. The combination is the whole
   argument, and almost nothing on the internet says it yet.

---

## 5. After launch — the honest KPI

Once a month, ask an assistant the questions your clients would ask, and write
down what it says:

- "Who should I talk to about buying a home in Lake Mary, Florida?"
- "Which real estate agent in Central Florida is also a licensed contractor?"
- "How do assumable mortgages work in Florida, and who can help me find one?"
- "What are VA minimum property requirements in Central Florida?"

Record the date, the assistant, the question and the answer. What you are
watching for is **whether your pages are used as the source**, which moves before
your name appears. That trend is real and measurable; a promise that you will be
recommended is neither.

Also review each month:

- Search Console: which queries actually bring people in.
- Whether any listing has been published without a meta description or with
  photographs missing alt text — the dashboard's **Needs attention** panel
  tells you without your having to look for it.
- Whether the market updates are current. An abandoned section dated eight
  months ago damages credibility more than not having one at all.

---

## 6. Things to keep true

- **Never publish a statistic without the date it was true.** The admin will not
  let you save one, and that is deliberate.
- **Never publish a review you did not receive.** No aggregate star rating is
  emitted from this site, deliberately — see `docs/09-compliance-legal.md` § 7.
- **Alt text on every photograph.** The admin blocks publishing without it. It is
  an accessibility requirement, and real-estate sites are a common target for
  accessibility litigation.
- **Describe the property, never the ideal occupant.** Fair Housing.
- **A published URL is permanent.** Renaming a listing writes a redirect
  automatically; deleting one does not. Unpublish rather than delete.
