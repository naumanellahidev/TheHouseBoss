# Original client message (verbatim, unedited)

Preserved exactly as received so that no requirement is lost in paraphrase.
Everything else in `docs/` is interpretation; this file is the source.

Received: August 2026. Client: Krisi Kakarova ("The House Boss").

---

## Message 1

> Hello Nauman,
>
> I am sending the details for my website project below.
>
> I would like to have a website that is recognizable by ChatGPT. As a licensed
> realtor, the main page should focus on property search.
>
> Here are my professional credentials and the specific requirements for the site:
>
> - Realtor License: SL3327932
> - Certified Residential Building Contractor License: CRC1335654
> - Main Focus: Property search, including a specific search feature for new construction.
> - Target Cities for Search: Lake Mary, Longwood, Sanford, Casselberry, and Orlando.
> - Landing Pages: A landing page for the city of Lake Mary to write blogs and articles about the city.
> - Branding & Marketing: "The House Boss Powered by World Properties Group" (I am a Realtor with World Properties Group).
> - Domain Details: The domain is thehousebossfl.com, purchased through porkbun.com.
>
> BIO :
>
> **Meet The House Boss**
>
> I'm Krisi Kakarova, a licensed Realtor and Certified Residential Building
> Contractor with 13 years of experience serving buyers, sellers and homeowners
> throughout Central Florida.
>
> I do more than help clients buy and sell homes. My residential construction
> experience gives me a deeper understanding of a property's condition, potential
> repair needs, remodeling possibilities and long-term potential. I help my
> clients look beyond appearances so they can make informed, confident decisions.
>
> I specialize in Lake Mary—the city I am proud to call home. Because I live and
> work here, I offer firsthand knowledge of the community, its neighborhoods and
> its real estate market. I genuinely believe Lake Mary is one of the best places
> to live in Central Florida, and I enjoy helping others discover everything this
> exceptional community has to offer.
>
> Whether you are purchasing an existing home, preparing a property for sale,
> planning a renovation or building from the ground up, I can help you understand
> your options and navigate the entire process. Through The House Boss, I provide
> real estate representation, construction consulting, residential remodeling and
> new-construction guidance.
>
> My business is built on strong professional relationships, organization and
> dependable communication. Over the years, I have developed a trusted network of
> real estate and construction professionals who can help support each stage of a
> transaction or project. I coordinate the details, communicate clearly and work
> diligently to keep the process moving forward.
>
> I believe every successful relationship begins with trust. My clients can expect
> honest guidance, careful attention to detail and a commitment to protecting
> their interests. I take the time to understand each client's goals and provide
> personalized service—not a one-size-fits-all approach.
>
> When you work with The House Boss, you gain more than a Realtor. You gain a
> knowledgeable real estate and construction resource who understands the
> transaction, the property and the work required to turn your vision into reality.
>
> Whether you are buying, selling, remodeling or building, I'm here to help you
> move forward with confidence.
>
> Please let me know if you need any additional information to get started.

---

## Message 2

> Stellarmls is for the search results

**Status: deferred.** See `docs/11-mls-future.md` and CLAUDE.md section 7.

---

## Message 3

> ### Recommended website pages
>
> - **Home**
> - **About Krisi Kakarova**
> - **Lake Mary Homes for Sale**
> - **Central Florida Home Search**
> - **VA Home-Buyer Guide**
> - **Assumable Mortgage Homes**
> - **New-Construction Representation**
> - **Sell Your Central Florida Home**
> - **Lake Mary Communities**
> - **Market Updates**
> - **Reviews**
> - **Contact**
>
> Create separate community pages for:
>
> - Lake Mary
> - Heathrow
> - Sanford
> - Longwood
> - Altamonte Springs
> - Winter Springs
> - Oviedo
>
> Your strongest specialty message should be:
>
> > **Lake Mary Realtor specializing in VA buyers, assumable mortgages and
> > new-construction representation.**
>
> The website should display your full licensed name, brokerage name and required
> advertising disclosures. It should also connect to your Google Business Profile,
> Realtor.com, Zillow and social-media profiles.
>
> Before launching, ask the developer to make the website accessible to
> **OAI-SearchBot**, add real-estate structured data and submit the sitemap to
> Google and Bing. This will improve—not guarantee—its ability to appear in
> ChatGPT search results.

---

## Requirement traceability

Every line above maps to a spec. Nothing may be dropped silently.

| Client requirement | Where it is specified |
|---|---|
| Recognizable by ChatGPT | `08-seo-ai-visibility.md` |
| Main page focuses on property search | `05-page-specs.md` § Home |
| New-construction search feature | `05-page-specs.md` § Search, `02-database-schema.md` (`listing_type`) |
| Target cities: Lake Mary, Longwood, Sanford, Casselberry, Orlando | `02-database-schema.md` (`cities.in_search`) |
| Lake Mary landing page for blogs/articles | `05-page-specs.md` § Lake Mary hub, `14-content-plan.md` |
| Branding "Powered by World Properties Group" | `03-design-system.md` § Brand lockup, `09-compliance-legal.md` |
| Domain thehousebossfl.com (Porkbun) | `12-env-deployment.md` |
| Both licence numbers displayed | `09-compliance-legal.md` |
| Full bio | `05-page-specs.md` § About, `14-content-plan.md` |
| 12 recommended pages | `05-page-specs.md` |
| 7 community pages | `05-page-specs.md` § Cities and communities |
| Specialty positioning line | `CLAUDE.md` § 1, used in metadata |
| Google Business / Realtor.com / Zillow / social links | `08-seo-ai-visibility.md` (`sameAs`), footer |
| Advertising disclosures | `09-compliance-legal.md` |
| OAI-SearchBot access | `08-seo-ai-visibility.md` § robots |
| Real-estate structured data | `08-seo-ai-visibility.md` § JSON-LD |
| Sitemap submitted to Google and Bing | `13-qa-checklists.md` § Launch |

## Information still required from the client

These are blocking for content, not for build. Collect during Phase 0.

1. Professional headshot and any lifestyle photography (high resolution).
2. Logo files — SVG preferred, plus the World Properties Group brokerage logo
   and its usage rules.
3. Brokerage office address, licensed brokerage phone number, and Krisi's
   direct business line.
4. Business email address for lead notifications, and the domain to send from
   (needed for Resend DNS records).
5. Live URLs for: Google Business Profile, Realtor.com profile, Zillow profile,
   Facebook, Instagram, LinkedIn.
6. Testimonials for the Reviews page, with permission to publish names.
7. Sold or active listings to seed the site at launch — with photos.
8. Confirmation of who pays the monthly running costs (Vercel Pro, domain,
   Resend if it exceeds free tier).
9. Written acknowledgement of the Stellar MLS deferral.
