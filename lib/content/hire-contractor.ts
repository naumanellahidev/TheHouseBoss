import { siteConfig } from "@/lib/site-config";

/**
 * The content model for `/hire-contractor` (brief §34, §35, §43).
 *
 * ── Why the defaults live in code ─────────────────────────────────────────
 *
 * `page_sections` holds what the client edits. This holds what the page says
 * when they have edited nothing, which is the state it ships in — and a landing
 * page that renders empty until somebody fills a CMS is a landing page that
 * goes live broken.
 *
 * So every section has a complete default here, the database overrides it per
 * field, and the route merges the two. The same arrangement `site-config.ts`
 * has with `site_settings`, for the same reason.
 *
 * ── What is deliberately absent ───────────────────────────────────────────
 *
 * §4 and §44: no project counts, no awards, no builder partnerships, no
 * guarantees, no pricing, no years of contracting. Every claim below rests on
 * one of two things — the licence, which is verifiable against the Florida
 * DBPR, or a statement about how the work is approached, which is a description
 * of method rather than a claim about results.
 *
 * The services listed are the ones a Certified Residential Building Contractor
 * licence permits and that the client has confirmed. They are editable per §35
 * precisely so that the list stays the client's assertion rather than mine.
 */

export type Cta = { label: string; href: string };

export type HeroSection = {
  eyebrow: string;
  headline: string;
  description: string;
  primaryCta: Cta;
  secondaryCta: Cta;
};

export type ServiceItem = {
  key: string;
  title: string;
  description: string;
  points: string[];
};

export type ProcessStep = {
  number: string;
  title: string;
  description: string;
};

export type FaqItem = { q: string; a: string };

export type HireContractorContent = {
  hero: HeroSection;
  advantage: {
    eyebrow: string;
    headline: string;
    body: string[];
  };
  credentials: {
    eyebrow: string;
    headline: string;
    body: string;
  };
  services: {
    eyebrow: string;
    headline: string;
    lead: string;
    items: ServiceItem[];
  };
  remodeling: { headline: string; body: string[]; cta: Cta };
  newConstruction: { headline: string; body: string[]; cta: Cta };
  process: { eyebrow: string; headline: string; lead: string; steps: ProcessStep[] };
  local: { eyebrow: string; headline: string; body: string[]; areas: string[] };
  lakeMary: { headline: string; body: string[]; cta: Cta };
  faq: { headline: string; items: FaqItem[] };
  cta: { headline: string; body: string; primary: Cta; secondary: Cta };
};

/** The section keys this page understands, in render order (§43). */
export const SECTION_KEYS = [
  "hero",
  "advantage",
  "credentials",
  "services",
  "remodeling",
  "new_construction",
  "process",
  "local",
  "lake_mary",
  "faq",
  "cta",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

const CONTACT = `/contact?interest=construction`;

export const DEFAULT_CONTENT: HireContractorContent = {
  hero: {
    eyebrow: "Residential construction · Central Florida",
    headline: "Hire a contractor who also reads the market",
    description:
      "Remodeling, renovation and new residential construction in Lake Mary and across Central Florida — from a Certified Residential Building Contractor who is also a licensed Realtor. Two ways of looking at a property, in one conversation.",
    primaryCta: { label: "Discuss your project", href: CONTACT },
    secondaryCta: { label: "Call The House Boss", href: siteConfig.contact.phoneHref },
  },

  advantage: {
    eyebrow: "The contractor difference",
    headline: "More than a contractor. A property perspective as well as a build one.",
    body: [
      "Most construction decisions are made without anyone in the room asking what they do to the property's value, how they read to a future buyer, or whether the money would return more somewhere else in the house. Most property decisions are made without anyone asking what the work would actually take.",
      "Holding both licences means both questions get asked in the same conversation. That does not make a renovation cheaper. It makes the plan better informed — about the structure, and about the market the house sits in.",
    ],
  },

  credentials: {
    eyebrow: "Licensed and verifiable",
    headline: "Certified Residential Building Contractor",
    body: "Issued by the Florida Construction Industry Licensing Board and verifiable against the DBPR licence register. Held alongside an active Florida real estate licence — the combination this page exists to offer.",
  },

  services: {
    eyebrow: "What we do",
    headline: "Residential construction and remodeling",
    lead: "Work a residential building contractor licence covers, on homes in Central Florida.",
    items: [
      {
        key: "remodeling",
        title: "Residential remodeling",
        description:
          "Kitchens, bathrooms, layout changes and whole-home renovation, planned around how the space is actually used.",
        points: [
          "Scope and sequence before anything is demolished",
          "What is structural, and what only looks structural",
          "Where the budget returns most, and where it does not",
        ],
      },
      {
        key: "renovation",
        title: "Renovation guidance",
        description:
          "For an owner deciding what to do next, or a buyer working out what a house would need.",
        points: [
          "What the condition actually indicates",
          "The order work should happen in",
          "What is worth doing before a sale, and what is not",
        ],
      },
      {
        key: "consulting",
        title: "Construction consulting",
        description:
          "A construction reading of plans, specifications and proposals, in plain language.",
        points: [
          "Plans and specifications explained",
          "Materials and finishes, and what they cost later",
          "Questions worth putting to a builder before signing",
        ],
      },
      {
        key: "new-construction",
        title: "New construction",
        description:
          "Building new, or buying new from a builder — with someone who can read the build while it is still open.",
        points: [
          "Site and lot considerations",
          "Pre-drywall, when everything is still visible",
          "Selections that hold value and selections that do not",
        ],
      },
      {
        key: "coordination",
        title: "Project coordination",
        description:
          "Keeping a residential project moving through its stages, with one person accountable for the sequence.",
        points: [
          "Stage-by-stage sequencing",
          "Coordination between trades",
          "Where a schedule usually slips, and why",
        ],
      },
    ],
  },

  remodeling: {
    headline: "Transform the home you already have",
    body: [
      "A remodel is rarely a question of taste alone. It is a question of what the house will allow, what it will cost to make it allow more, and whether the result is worth what it takes to get there.",
      "The useful conversation starts before any of that: what is not working now, what you want the room to do, and what the structure and the systems will actually support. The finishes are the easy part and they come last.",
    ],
    cta: { label: "Talk about your project", href: CONTACT },
  },

  newConstruction: {
    headline: "Building new? Start with the right perspective.",
    body: [
      "New construction is a series of decisions made months before anyone lives with them — the lot, the plan, what is behind the walls, and which selections are worth paying for now because they are expensive or impossible to add later.",
      "The most valuable moment is pre-drywall, when the framing, the rough-in plumbing, the electrical and the mechanical are all still visible. After drywall, everything is a guess. Being there at that point, with someone who reads a build for a living, is the difference this licence makes.",
    ],
    cta: { label: "Discuss a new build", href: CONTACT },
  },

  process: {
    eyebrow: "How it works",
    headline: "From first conversation to finished space",
    lead: "Five stages. The first one is free and the most important.",
    steps: [
      {
        number: "01",
        title: "Discuss",
        description:
          "What the property is, what you want it to be, and what is prompting the change. No drawings needed.",
      },
      {
        number: "02",
        title: "Evaluate",
        description:
          "A look at what the structure and the systems will support, and at what the work would actually involve.",
      },
      {
        number: "03",
        title: "Plan",
        description:
          "Scope, sequence and priorities — including what to leave out, which is usually the more useful half.",
      },
      {
        number: "04",
        title: "Coordinate",
        description:
          "The project moves through its stages with one person accountable for the order things happen in.",
      },
      {
        number: "05",
        title: "Complete",
        description:
          "Through to the finished space, with the final walkthrough treated as a real list rather than a formality.",
      },
    ],
  },

  local: {
    eyebrow: "Where we work",
    headline: "Residential construction in Central Florida",
    body: [
      "This climate is hard on houses. Drainage around a slab, flashing details, how the envelope is sealed and whether the mechanical system is sized for the humidity matter more here than they do almost anywhere else — an air conditioner that is undersized in Florida is not an inconvenience, it is a moisture problem that becomes a mould problem.",
      "Work is taken across Seminole County and the surrounding Central Florida market. If a project is outside that, it is better to say so than to take it.",
    ],
    areas: ["Lake Mary", "Longwood", "Sanford", "Casselberry", "Orlando"],
  },

  lakeMary: {
    headline: "Residential contractor services in Lake Mary",
    body: [
      "Lake Mary is the home market, and most of the housing stock here was built between the late eighties and the mid two-thousands. That means the remodeling conversations are consistent: kitchens and primary bathrooms that were laid out for how people lived thirty years ago, closed floor plans, and original mechanical systems reaching the end of their lives.",
      "It also means the value questions are consistent, which is where the second licence earns its place — knowing what a particular street will and will not return on a given piece of work.",
    ],
    cta: { label: "Discuss a Lake Mary project", href: CONTACT },
  },

  faq: {
    headline: "Questions homeowners ask",
    items: [
      {
        q: "What type of residential construction work do you handle?",
        a: "Residential remodeling and renovation, new residential construction, construction consulting and project coordination — the work a Florida Certified Residential Building Contractor licence covers. Specialty trades such as electrical, plumbing and HVAC are performed by the appropriately licensed trades on any project.",
      },
      {
        q: "Do you provide remodeling services?",
        a: "Yes. Kitchens, bathrooms, layout changes and whole-home renovation. The conversation usually starts with what is not working in the space rather than with finishes, because the finishes are the part that is easiest to change and the part that matters least to whether the result works.",
      },
      {
        q: "Can you help with new construction?",
        a: "Yes, in two different ways, and it is worth knowing which you need. If you are building, that is contracting work. If you are buying new from a builder, that is representation — and the most valuable thing there is being at the site pre-drywall, when the framing and the rough-ins are still visible.",
      },
      {
        q: "What areas do you serve?",
        a: "Lake Mary primarily, and the surrounding Central Florida market — Longwood, Sanford, Casselberry, Orlando and nearby areas in Seminole and Orange County. If a project sits outside that, it is better to say so than to take it on.",
      },
      {
        q: "What is the advantage of working with a Realtor who also holds a contractor licence?",
        a: "Two questions get asked in one conversation instead of two: what the work would take, and what it does to the property. Neither answer is worth much without the other — a renovation that is structurally straightforward can still be a poor use of money on a particular street, and a change that would add real value can be impractical for reasons only a build perspective surfaces.",
      },
      {
        q: "How do I discuss my project?",
        a: `Call or message ${siteConfig.contact.phone}, or send the details through the contact form. No drawings are needed to start — what the property is and what you want to change is enough for a first conversation.`,
      },
      {
        q: "What should I consider before starting a renovation?",
        a: "What the room needs to do, what the structure and the systems will support, and the order the work has to happen in. Those three settle most of the budget before a single finish is chosen. The common expensive mistake is choosing finishes first and discovering the layout cannot accommodate them.",
      },
    ],
  },

  cta: {
    headline: "Let's talk about what you're building.",
    body: "A remodel, a renovation, a new build, or a property you are trying to work out. The first conversation costs nothing and usually saves more than it takes.",
    primary: { label: "Discuss your project", href: CONTACT },
    secondary: { label: "Call The House Boss", href: siteConfig.contact.phoneHref },
  },
};
