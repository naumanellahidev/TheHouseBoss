/**
 * First-draft body copy and FAQs for the eight city pages.
 *
 *   node --env-file=.env.local scripts/seed-city-content.mjs
 *   node --env-file=.env.local scripts/seed-city-content.mjs --force
 *
 * Only writes where the field is EMPTY, so it can never overwrite something the
 * client has written. `--force` overwrites, for re-running after an edit here.
 *
 * ── What is and is not in this copy ──────────────────────────────────────────
 *
 * Everything here is verifiable: which county a city sits in, which school
 * district serves it, where it is relative to Orlando and I-4, and what it is
 * known for. Nothing else.
 *
 * There are NO market statistics, no school ratings, no population figures and
 * no commute times. Those are exactly the numbers an AI assistant will quote
 * back at someone, and a wrong one is worse than a missing one. `stats_json`
 * stays empty until the client supplies real figures with the dates they were
 * true — the same decision the Phase 1 seed made and for the same reason.
 *
 * This is first-draft copy written by a developer, not by the client. It is
 * structurally complete and factually safe, and it is meant to be replaced or
 * edited in her voice. PROGRESS.md tracks that.
 */
import { createClient } from "@supabase/supabase-js";

const force = process.argv.includes("--force");

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const SEMINOLE = "Seminole County Public Schools";
const ORANGE = "Orange County Public Schools";

/** A question every buyer asks, answered without inventing a number. */
const schoolFaq = (city, district) => ({
  q: `Which school district serves ${city}?`,
  a: `${city} is served by ${district}. School zoning is by address rather than by city, and boundaries are redrawn from time to time, so confirm the assigned schools for a specific property with the district before you write an offer — I will pull the current zoning for any address you are considering.`,
});

const contractorFaq = (city) => ({
  q: `What should I check on an older home in ${city}?`,
  a: `Roof age, the electrical panel, and any sign of water intrusion — in that order. Central Florida roofs work hard, insurers ask about them before they ask about anything else, and a roof near the end of its life changes what a house is worth. I hold a Certified Residential Building Contractor licence, so I can give you a read on all three before you write an offer rather than after the inspection comes back.`,
});

const CITIES = {
  "lake-mary": {
    body: `## Where Lake Mary sits

Lake Mary is in Seminole County, on the I-4 corridor north of Orlando and just south of Sanford. It has its own SunRail station, which puts the rail line into downtown Orlando within reach without driving I-4 at rush hour.

## What it is known for

A concentration of corporate offices along International Parkway, the master-planned communities around Heathrow, and a set of quieter established neighbourhoods away from the parkway. It is the kind of place people move to and then stay in, which is why so much of the market here is people trading up within the same few square miles rather than leaving.

## Schools

${SEMINOLE} serves Lake Mary. Zoning is by address, not by city — two houses on the same street can be assigned to different schools, so confirm the assignment for the specific property.

## Getting around

I-4 runs along the western edge, the 417 loops around the east, and SunRail runs north to DeBary and south into Orlando. Which of those matters depends entirely on where you work, and it is worth being honest with yourself about it before choosing a neighbourhood.

## Why I write about it

I live here. That is the whole reason this page exists rather than a generic city description — I can tell you which streets flood in a heavy summer storm, which builders did good work in which year, and which HOA is actually worth what it charges.`,
    faq: [
      schoolFaq("Lake Mary", SEMINOLE),
      {
        q: "Is Lake Mary a good place to buy right now?",
        a: "That depends far more on your own timeline than on the market. If you are staying five years or more, the question worth asking is whether the specific house is sound and correctly priced, not whether the market is at a peak. If you are staying two years, the transaction costs matter more than anything else. Tell me which you are and I will give you a straight answer.",
      },
      contractorFaq("Lake Mary"),
    ],
  },

  longwood: {
    body: `## Where Longwood sits

Longwood is in Seminole County, between Lake Mary to the north and Altamonte Springs to the south, on the I-4 corridor. It has a SunRail station of its own.

## What it is known for

Older, established neighbourhoods with mature trees — a different feel from the newer master-planned developments further north. The historic district around Church Avenue is genuinely historic rather than themed, and there are large lots here that would be subdivided if anyone tried to build them today.

## Schools

${SEMINOLE} serves Longwood, with zoning assigned by address.

## What to know before you buy

Longwood's housing stock skews older, which cuts both ways. You get lot sizes and tree cover that new construction cannot match, and you inherit whatever the last forty years did to the roof, the panel and the plumbing. This is the market where a contractor's read before the offer saves the most money — an older Longwood house can be an excellent buy or an expensive lesson, and the difference is usually visible on a walkthrough.`,
    faq: [
      schoolFaq("Longwood", SEMINOLE),
      contractorFaq("Longwood"),
      {
        q: "How does Longwood compare with Lake Mary?",
        a: "Longwood's housing stock is generally older and its lots larger; Lake Mary has more newer construction and more master-planned communities. Neither is better — they suit different people. If you want mature trees and space and are willing to take on an older house, look at Longwood first.",
      },
    ],
  },

  sanford: {
    body: `## Where Sanford sits

Sanford is the Seminole County seat, on the south shore of Lake Monroe at the northern end of the I-4 corridor. Orlando Sanford International Airport is here, and SunRail's line runs through the city.

## What it is known for

A genuine historic downtown — brick streets, buildings that predate the theme parks by decades, and a waterfront on Lake Monroe. Sanford has changed a great deal in the last fifteen years, and the parts of it that have changed and the parts that have not sit closer together than a map suggests.

## Schools

${SEMINOLE} serves Sanford, zoned by address.

## What to know before you buy

Sanford covers a wide range, from restored historic homes downtown to newer subdivisions on the outskirts. A historic house is a specific undertaking: the character is real, and so are the questions about wiring, foundations and what previous owners did without permits. Worth doing, with your eyes open.`,
    faq: [
      schoolFaq("Sanford", SEMINOLE),
      {
        q: "Is a historic home in downtown Sanford a good idea?",
        a: "It can be an excellent one, but it is not the same purchase as a house built in 2015. Expect to ask harder questions about the electrical system, the foundation and any unpermitted work, and expect insurance to ask about the roof and the wiring. I can walk one with you and tell you which problems are cosmetic and which are structural before you commit.",
      },
      contractorFaq("Sanford"),
    ],
  },

  casselberry: {
    body: `## Where Casselberry sits

Casselberry is in south Seminole County, between Altamonte Springs and Winter Park, built around a chain of lakes.

## What it is known for

Water. The lakes shape the street layout and the property values, and a house two streets from the water is a different proposition from one on it. It is one of the more affordable ways into Seminole County schools, which is what brings most buyers here.

## Schools

${SEMINOLE} serves Casselberry, zoned by address.

## What to know before you buy

Much of Casselberry's housing stock dates from the 1960s through the 1980s. That means solid construction and established neighbourhoods, and it means the mechanical systems are on their second or third life. Ask about the roof and the panel first; everything else is negotiable.`,
    faq: [
      schoolFaq("Casselberry", SEMINOLE),
      contractorFaq("Casselberry"),
      {
        q: "Is lakefront property in Casselberry worth the premium?",
        a: "It holds value well and it is genuinely scarce, which is the argument for it. The counter-argument is insurance and maintenance, both of which cost more on the water. Whether the premium is worth it depends on whether you will actually use the lake — the people who do rarely regret it, and the people who bought the view alone often do.",
      },
    ],
  },

  orlando: {
    body: `## Where Orlando sits

Orlando is the largest city in Central Florida and the seat of Orange County, south of the Seminole County cities on this site.

## What it is known for

Far more than the theme parks. Orlando is a collection of distinct neighbourhoods with genuinely different characters and price points — the market in one is not the market in another, and a citywide figure tells you almost nothing useful about a specific street.

## Schools

${ORANGE} serves Orlando. Zoning varies considerably across the city and is assigned by address, so confirm it for the specific property.

## What to know before you buy

Because Orlando is so varied, the useful question is never "what is the Orlando market doing" but "what is this neighbourhood doing, and is this house sound". I work the northern side of the metro most closely — if you are looking further south or west, I will tell you plainly if someone else knows that pocket better than I do.`,
    faq: [
      schoolFaq("Orlando", ORANGE),
      {
        q: "Do you work the whole of Orlando?",
        a: "I work the northern side of the metro and Seminole County most closely, and that is where my knowledge is genuinely deep. Orlando is large enough that nobody knows every neighbourhood well. If you are looking somewhere I do not know street by street, I will say so rather than guess.",
      },
      contractorFaq("Orlando"),
    ],
  },

  "altamonte-springs": {
    body: `## Where Altamonte Springs sits

Altamonte Springs is in Seminole County on the I-4 corridor, south of Longwood and immediately north of Orlando's northern edge. It has a SunRail station.

## What it is known for

Cranes Roost Park and the Uptown Altamonte area around it, the Altamonte Mall, and a dense mix of housing that runs from condominiums to established single-family neighbourhoods. It is one of the more walkable pockets in the county, which is unusual here and worth something if it matters to you.

## Schools

${SEMINOLE} serves Altamonte Springs, zoned by address.

## What to know before you buy

The condominium market here is real and worth understanding separately from the single-family market: association finances, reserve funding and any pending assessments matter as much as the unit itself. Ask for the association's documents early, not at the last minute.`,
    faq: [
      schoolFaq("Altamonte Springs", SEMINOLE),
      {
        q: "What should I check before buying a condominium here?",
        a: "The association's finances before the unit itself. Ask for the reserve study, the last two years of minutes, and anything about a pending special assessment. A well-run association with funded reserves is worth paying more for; a poorly funded one hands you a bill you did not budget for, often within a year or two of closing.",
      },
      contractorFaq("Altamonte Springs"),
    ],
  },

  "winter-springs": {
    body: `## Where Winter Springs sits

Winter Springs is in Seminole County, east of Longwood and north of Oviedo, away from the I-4 corridor.

## What it is known for

Residential neighbourhoods, the Tuskawilla area, and a good deal of tree cover and green space. It is quieter than the cities on I-4, which is the point for most of the people who choose it, and it does mean the commute is a car commute.

## Schools

${SEMINOLE} serves Winter Springs, zoned by address.

## What to know before you buy

Much of Winter Springs was built from the 1980s onward in planned communities, so the housing stock is more consistent than in the older cities. Check what the HOA covers and what it costs, and read the covenants before you fall in love with a house you intend to change.`,
    faq: [
      schoolFaq("Winter Springs", SEMINOLE),
      {
        q: "How is the commute from Winter Springs?",
        a: "It is a car commute — Winter Springs is off the I-4 corridor and has no SunRail station, so most people reach the 417 and go from there. How long that actually takes depends entirely on where you are going and when you leave, and it is worth driving it at your real commuting hour before you buy rather than at eleven on a Saturday.",
      },
      contractorFaq("Winter Springs"),
    ],
  },

  oviedo: {
    body: `## Where Oviedo sits

Oviedo is in Seminole County, east of Winter Springs and close to the University of Central Florida.

## What it is known for

Its proximity to UCF and the research and technology employment around it, a well-known historic downtown, and — genuinely — the chickens that roam it. It has grown considerably while keeping a small-town centre, which is a harder trick than it sounds.

## Schools

${SEMINOLE} serves Oviedo, zoned by address.

## What to know before you buy

Oviedo draws a mix of families and people working in the UCF corridor, and the housing stock reflects that range. As anywhere in Seminole County, the assigned schools depend on the address rather than the city, and the difference between two streets can matter — check before you offer.`,
    faq: [
      schoolFaq("Oviedo", SEMINOLE),
      {
        q: "Is Oviedo a good option if I work near UCF?",
        a: "It is one of the closest Seminole County options to the UCF corridor, which is why a lot of people working there look here first. Whether it beats living closer in depends on what you want from the rest of your week — Oviedo trades a shorter commute to UCF for a longer one to downtown Orlando.",
      },
      contractorFaq("Oviedo"),
    ],
  },
};

let updated = 0;
let skipped = 0;

for (const [slug, content] of Object.entries(CITIES)) {
  const { data: city, error } = await db
    .from("cities")
    .select("id, name, body_md, faq_json")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !city) {
    console.log(`  ✗ ${slug}: ${error?.message ?? "not found"}`);
    continue;
  }

  const hasBody = Boolean(city.body_md?.trim());
  const hasFaq = (city.faq_json ?? []).length > 0;

  if (!force && hasBody && hasFaq) {
    console.log(`  · ${slug}: already has content, left alone`);
    skipped += 1;
    continue;
  }

  const patch = {};
  if (force || !hasBody) patch.body_md = content.body;
  if (force || !hasFaq) patch.faq_json = content.faq;

  const { error: writeError } = await db.from("cities").update(patch).eq("id", city.id);

  if (writeError) {
    console.log(`  ✗ ${slug}: ${writeError.message}`);
    continue;
  }

  console.log(
    `  ✓ ${slug}: ${Object.keys(patch).join(" + ")} (${content.body.length} chars, ${content.faq.length} questions)`,
  );
  updated += 1;
}

console.log(`\n${updated} updated, ${skipped} left alone`);
console.log(
  "\nThis is first-draft copy written by a developer. No statistics were\n" +
    "invented — stats_json is untouched and stays empty until the client\n" +
    "supplies real figures with the dates they were true.",
);
