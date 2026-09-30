import type { AnswerBody } from "@/lib/content/answers";

/** Published copy for the investor and landlord answers (docs/18 § 3). */
export const investorsAndLandlords: Record<string, AnswerBody> = {
  "how-to-keep-a-flip-on-budget": {
    updated: "2026-09-30",
    shortAnswer:
      "By scoping before buying, not after. The overruns are almost never the kitchen — they are the panel, the plumbing material, the roof, an unpermitted addition, and whatever is hidden under the flooring. Put a 15% contingency on a line-item scope, not on a lump sum.",
    sections: [
      {
        heading: "Where flips actually go over",
        blocks: [
          {
            kind: "list",
            items: [
              "The electrical panel, and everything a bad one drags with it.",
              "Plumbing material — polybutylene or cast iron changes the whole plan.",
              "The roof, which is also an insurance problem for your buyer.",
              "An unpermitted addition that has to be legalised or removed.",
              "A slab or framing issue found the moment the flooring comes up.",
            ],
          },
          {
            kind: "p",
            text: "None of those are visible on a walkthrough, and all of them are knowable before closing.",
          },
        ],
      },
      {
        heading: "What to do before you buy",
        blocks: [
          {
            kind: "steps",
            items: [
              "Get a real inspection even on a cash purchase. You are buying information, not protection.",
              "Pull the permit history on the parcel so you know what was done legally and what was not.",
              "Write a line-item scope from the inspection, not a lump sum from a hunch.",
              "Add 15% contingency on top of that scope.",
            ],
          },
        ],
      },
      {
        heading: "Make three contractors bid the same thing",
        blocks: [
          {
            kind: "p",
            text: "A scope written well enough that three bidders price the same work is what makes the numbers comparable. Without it you are comparing three different projects and choosing the one with the most exclusions.",
          },
          {
            kind: "p",
            text: "The verification and payment terms are the same as for any other job: [how to check a contractor is legitimate](/answers/hiring-and-project-planning/how-to-check-a-contractor-is-licensed) and [what deposit is normal](/answers/hiring-and-project-planning/contractor-wants-fifty-percent-upfront).",
          },
        ],
      },
      {
        heading: "Fix the unsexy things",
        blocks: [
          {
            kind: "p",
            text: "The appraiser and the buyer inspector will find the panel, the roof and the plumbing whatever you spent on the kitchen. On a resale flip, the money that protects your exit is in those, and in the permits that make your square footage count: [which renovations need a permit](/answers/new-construction-and-building/which-renovations-need-a-permit).",
          },
          {
            kind: "p",
            text: "I scope flips for investors across Seminole and Orange County, as a contractor and as an agent, which means one person prices the work and the resale: [get in touch](/contact).",
          },
        ],
      },
      {
        heading: "The exit decides the scope",
        blocks: [
          {
            kind: "p",
            text: "Work out what the finished house sells for on that street before you decide what to put in it. The ceiling price sets the finish level, and it is the discipline that keeps a flip from becoming somebody else's dream renovation at your expense.",
          },
          {
            kind: "list",
            items: [
              "Match the neighbourhood, do not exceed it.",
              "Spend on the items a buyer inspector will find, because they become price reductions.",
              "Keep finishes durable and neutral, which also photographs better.",
              "Close every permit before listing.",
            ],
          },
        ],
      },
    ],
  },

  "what-to-replace-between-tenants": {
    updated: "2026-09-30",
    shortAnswer:
      "Spend on what fails and gets you an 11pm call; skip what looks good for a month. LVP instead of carpet, one paint colour across the portfolio, decent hardware, and proactive replacement of angle stops, supply lines and wax rings.",
    sections: [
      {
        heading: "Worth the money",
        blocks: [
          {
            kind: "list",
            items: [
              "LVP instead of carpet everywhere except perhaps bedrooms. It survives and it cleans.",
              "One durable paint colour across the whole portfolio, so touch-ups need no matching and no second trip.",
              "Solid-core doors where the budget allows, and decent hardware everywhere.",
              "Angle stops, supply lines and wax rings replaced proactively. They cost pennies and they flood units.",
            ],
          },
        ],
      },
      {
        heading: "Not worth it",
        blocks: [
          {
            kind: "list",
            items: [
              "High-end fixtures, which are stolen, broken or simply unappreciated.",
              "Trendy tile that dates and cannot be matched in three years.",
              "Any finish that shows every water spot.",
            ],
          },
        ],
      },
      {
        heading: "The Florida additions to the turnover list",
        blocks: [
          {
            kind: "p",
            text: "Flush the AC condensate line and check the pan, because a blocked line between tenants becomes a ceiling on day ten. Check the water heater age and the exhaust fans, and run every drain. Those four take an hour and prevent the calls that cost a weekend.",
          },
          {
            kind: "p",
            text: "The homeowner version of the same list is [first-year homeowner maintenance](/answers/systems-and-maintenance/first-year-homeowner-maintenance-florida).",
          },
        ],
      },
      {
        heading: "Photograph everything",
        blocks: [
          {
            kind: "p",
            text: "Dated photographs of every room at move-in and move-out settle deposit disputes instantly and cost nothing. Do it the same way every time, so the two sets compare directly.",
          },
          {
            kind: "p",
            text: "If the flooring is being replaced over a slab, the preparation matters more than the product: [LVP over a concrete slab](/answers/kitchens-and-bathrooms/lvp-flooring-over-a-concrete-slab). I do turnovers for Seminole and Orange County landlords: [contractor services](/hire-contractor).",
          },
        ],
      },
      {
        heading: "A turnover checklist that takes a morning",
        blocks: [
          {
            kind: "steps",
            items: [
              "Change the locks or rekey, and test every window latch.",
              "Flush the air-conditioning condensate line and change the filter.",
              "Run every tap and drain, and check under each sink.",
              "Test smoke and carbon monoxide alarms, and replace batteries as a matter of course.",
              "Touch up paint with the one colour you keep for the whole portfolio.",
              "Photograph every room before the keys go out.",
            ],
          },
          {
            kind: "p",
            text: "Six items, one morning, and it prevents most of the calls that otherwise arrive in the first month of a tenancy.",
          },
        ],
      },
      {
        heading: "What to inspect rather than replace",
        blocks: [
          { kind: "p", text: "Roof, air conditioning, water heater and the electrical panel are inspected between tenancies rather than replaced on a schedule, but their ages belong in your model so the replacement is planned rather than urgent." },
          { kind: "p", text: "An urgent replacement costs more, happens at the worst moment, and often comes with a displaced tenant. A planned one is a line in next year budget." },
        ],
      },
    ],
  },

  "is-a-property-manager-worth-ten-percent": {
    updated: "2026-09-30",
    shortAnswer:
      "Worth it if you are more than about 45 minutes away, if your job cannot take a Tuesday-afternoon call, or if you own more than two or three units without a vendor bench. What you are buying is the vendor list and the legal process, not rent collection.",
    sections: [
      {
        heading: "When it pays",
        blocks: [
          {
            kind: "list",
            items: [
              "You live more than about 45 minutes from the property.",
              "Your working day cannot absorb an emergency call.",
              "You own more than two or three units and have not built a reliable set of trades.",
            ],
          },
          {
            kind: "p",
            text: "When it does not: you are local, reasonably handy, and have one solid tenant in one house. That is a job, but it is a small one.",
          },
        ],
      },
      {
        heading: "Judge a manager on the right things",
        blocks: [
          {
            kind: "steps",
            items: [
              "Ask who their plumber and their air-conditioning company are, and what the response time is.",
              "Ask how many evictions they filed last year and how they went.",
              "Ask how maintenance is approved, and at what threshold they call you.",
              "Ask how they handle a tenant who is two weeks late, specifically.",
            ],
          },
          {
            kind: "p",
            text: "Rent collection is the easy part and every manager does it. The vendor bench and the legal process are where the fee is earned or wasted.",
          },
        ],
      },
      {
        heading: "Read the agreement for the markup",
        blocks: [
          {
            kind: "p",
            text: "The headline is the management percentage. The real cost often sits in the maintenance markup, the leasing fee, the renewal fee and the mark-up on turnover work. Ask for those in writing and model a year with one turnover in it.",
          },
        ],
      },
      {
        heading: "The alternative for a local owner",
        blocks: [
          {
            kind: "p",
            text: "Build the bench yourself: one plumber, one air-conditioning company, one handyman and one contractor who will answer the phone. That is what the fee buys, and if you are local you can assemble it in a year. The turnover list is in [what is worth replacing between tenants](/answers/investors-and-landlords/what-to-replace-between-tenants), and the wider market view in [is Central Florida still a decent rental market](/answers/investors-and-landlords/central-florida-rental-market).",
          },
        ],
      },
      {
        heading: "What to keep even if you self-manage",
        blocks: [
          {
            kind: "list",
            items: [
              "A written lease reviewed by somebody who does this in Florida.",
              "A screening process you apply identically to every applicant.",
              "A maintenance request channel that creates a record.",
              "A contractor who answers the phone, which is the part that is hardest to replace.",
            ],
          },
          {
            kind: "p",
            text: "Self-managing without those four is where the fee looks cheap and the year gets expensive. With them, a local owner with one or two houses is usually better off keeping the ten per cent.",
          },
        ],
      },
      {
        heading: "How to change manager without losing the tenant",
        blocks: [
          { kind: "p", text: "Check the notice period in the management agreement, agree a handover date, and get the tenant file transferred in full: lease, deposit records, inspection reports, maintenance history and contact details." },
          { kind: "p", text: "Tell the tenant yourself, in writing, before the change. A tenant who hears it from a new company they have never dealt with is a tenant deciding whether to renew." },
        ],
      },
    ],
  },

  "central-florida-rental-market": {
    updated: "2026-09-30",
    shortAnswer:
      "It is a market where operating expenses decide the deal rather than rent. Run the numbers with current insurance quotes rather than last year's, and with real roof and HVAC reserves — in this climate a 15-year roof and a 12-year air conditioner are not pessimistic.",
    sections: [
      {
        heading: "Model the expenses, not the rent",
        blocks: [
          {
            kind: "p",
            text: "Rents have held up reasonably. What has moved is the cost of holding the asset: insurance, taxes after a reassessment, and the replacement cycle on a roof and an air-conditioning system that work harder here than almost anywhere.",
          },
          {
            kind: "list",
            items: [
              "Get a current insurance quote on the specific address before you model anything.",
              "Reserve for the roof on a realistic life, not a brochure one.",
              "Reserve for HVAC separately. It is the most common capital surprise in a Florida rental.",
            ],
          },
        ],
      },
      {
        heading: "The submarkets behave differently",
        blocks: [
          {
            kind: "list",
            items: [
              "Seminole County is steadier and more owner-occupied, which usually means longer tenancies and lower turnover cost.",
              "The [Orlando](/orlando) tourist corridor is a different business with different rules, and short-term letting is governed locally rather than uniformly.",
              "Parts of the Osceola growth areas carry CDD assessments that quietly consume cash flow.",
            ],
          },
        ],
      },
      {
        heading: "Check the tax bill before you model",
        blocks: [
          {
            kind: "p",
            text: "A CDD assessment appears on the property tax bill, not in the HOA fee, and it can change the return materially. Pull the actual bill for the parcel rather than trusting a listing summary, and check what happens to the assessment after a sale.",
          },
          {
            kind: "p",
            text: "The same warning applies when buying new: [what to ask about HOA and CDD](/answers/new-construction-and-building/new-communities-near-sanford-low-hoa).",
          },
        ],
      },
      {
        heading: "If you are buying from out of state",
        blocks: [
          {
            kind: "p",
            text: "Have someone walk the property who can price the repairs rather than describe them. I scope rehab budgets for out-of-state investors here, as a licensed contractor and an agent, so the acquisition number and the work number come from the same person: [get in touch](/contact). The management question is next: [is a property manager worth ten per cent](/answers/investors-and-landlords/is-a-property-manager-worth-ten-percent).",
          },
        ],
      },
      {
        heading: "The numbers to run before you offer",
        blocks: [
          {
            kind: "steps",
            items: [
              "Rent, from comparable let properties rather than asking prices.",
              "Insurance, quoted on the specific address.",
              "Taxes at the reassessed value after purchase, not the seller current bill.",
              "Any HOA fee and any CDD assessment.",
              "Reserves for roof, air conditioning and turnover.",
            ],
          },
          {
            kind: "p",
            text: "Line three is where out-of-state buyers are caught most often, because the tax bill they see belongs to an owner who has held the property for years. Model the number you will actually pay.",
          },
        ],
      },
      {
        heading: "Short-term letting is a different business",
        blocks: [
          { kind: "p", text: "Nightly and weekly letting is governed locally rather than uniformly across Central Florida, and some cities and associations prohibit it outright. It also has an entirely different cost base: furnishing, cleaning, management and higher utility use." },
          { kind: "p", text: "If short-term is the plan, confirm what is permitted for the specific parcel and the specific association before you offer, not after." },
        ],
      },
    ],
  },
};
