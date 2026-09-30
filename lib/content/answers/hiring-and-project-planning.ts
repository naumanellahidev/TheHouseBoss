import type { AnswerBody } from "@/lib/content/answers";

/** Published copy for the hiring-and-planning answers (docs/18 § 3). */
export const hiringAndProjectPlanning: Record<string, AnswerBody> = {
  "contractor-wants-fifty-percent-upfront": {
    updated: "2026-09-30",
    shortAnswer:
      "No. A large deposit is the clearest warning sign in residential construction. Normal is a modest mobilisation deposit, often around ten per cent or capped at a materials figure, then draws tied to completed and inspected milestones.",
    sections: [
      {
        heading: "What a normal payment schedule looks like",
        blocks: [
          {
            kind: "p",
            text: "Money should follow work that exists. A schedule tied to milestones rather than dates keeps both sides honest, because a milestone can be looked at and a date cannot.",
          },
          {
            kind: "steps",
            items: [
              "A mobilisation deposit, modest, often around ten per cent or capped at the materials that must be ordered.",
              "Demolition and rough-in complete.",
              "Rough inspections passed.",
              "Drywall complete.",
              "Finishes complete.",
              "Final inspection passed, punch list done, retainage released.",
            ],
          },
          {
            kind: "p",
            text: "Some states cap the deposit a residential contractor may take. Ask what the rule is where you are before you agree to anything unusual.",
          },
        ],
      },
      {
        heading: "What to insist on in the contract",
        blocks: [
          {
            kind: "list",
            items: [
              "A written scope with allowances stated for every selection item.",
              "A draw schedule tied to milestones, not to the calendar.",
              "Lien releases from subcontractors and suppliers at each draw.",
              "Proof of licence, general liability and workers compensation — verified with the state and the insurer, not accepted as an emailed PDF.",
              "A real retainage held until the punch list is finished.",
            ],
          },
        ],
      },
      {
        heading: "Why the big deposit is the red flag it is",
        blocks: [
          {
            kind: "p",
            text: "A contractor who needs half your money before starting is either funding another job with it or has no credit with suppliers. Both are problems you will feel later, usually as a stalled site while they chase the next deposit.",
          },
          {
            kind: "p",
            text: "An honest contractor will not blink at any of the list above. I certainly do not, and I would rather every homeowner asked.",
          },
        ],
      },
      {
        heading: "Before you sign",
        blocks: [
          {
            kind: "p",
            text: "Run the four checks in [how to check a contractor is legitimate](/answers/hiring-and-project-planning/how-to-check-a-contractor-is-licensed), and if the job is a whole-house remodel, decide early [whether you are living in it](/answers/hiring-and-project-planning/living-in-the-house-during-a-renovation). If you would rather hand the whole thing to someone who is licensed to build it, that is [what I do](/hire-contractor).",
          },
        ],
      },
      {
        heading: "How to say no without losing the contractor",
        blocks: [
          {
            kind: "p",
            text: "Most contractors asking for a large deposit are not trying anything; it is how they have always done it. So make the counter easy to accept: agree to fund the materials that genuinely have to be ordered, against an invoice, and tie the rest to milestones.",
          },
          {
            kind: "list",
            items: [
              "Offer to pay suppliers directly for long-lead items.",
              "Offer a milestone schedule with short gaps, so cash flow is not the objection.",
              "Ask for lien releases at each draw, which protects both of you.",
            ],
          },
          {
            kind: "p",
            text: "If none of that is acceptable, you have learned something useful before any money moved.",
          },
        ],
      },
    ],
  },

  "how-to-check-a-contractor-is-licensed": {
    updated: "2026-09-30",
    shortAnswer:
      "Four checks, about twenty minutes: look the licence up on the state board site yourself, call the insurance agent named on the certificate, search the county clerk for liens and suits, and ask for two addresses of jobs finished more than two years ago.",
    sections: [
      {
        heading: "The four checks",
        blocks: [
          {
            kind: "steps",
            items: [
              "Look up the licence on the state licensing board site yourself. Do not accept a photograph of a card, and confirm the name on the licence matches the company you are about to pay.",
              "Telephone the insurance agent listed on the certificate and confirm the policy is active and covers your type of work. Certificates are trivially faked.",
              "Search the county clerk records for liens and suits against both the business name and the individual.",
              "Ask for two addresses of jobs finished more than two years ago. Recent work looks good; problems show up in year two.",
            ],
          },
        ],
      },
      {
        heading: "Why each one catches something different",
        blocks: [
          {
            kind: "list",
            items: [
              "The licence check catches the person working under someone else qualifier, or with a licence in a different category from your job.",
              "The insurance call catches the lapsed policy, which is the one that leaves you liable for an injury on your property.",
              "The clerk search catches a pattern — one dispute is life, five is a business model.",
              "The old addresses catch workmanship that fails after a season or two, which no photograph will show you.",
            ],
          },
        ],
      },
      {
        heading: "Then put the scope in writing",
        blocks: [
          {
            kind: "p",
            text: "A verified contractor and a vague scope still produce an argument. Write down what is included, what is excluded, what the allowances are, and how changes get priced, before any money moves. Pair it with the payment terms in [contractor wants 50% upfront](/answers/hiring-and-project-planning/contractor-wants-fifty-percent-upfront).",
          },
        ],
      },
      {
        heading: "The workers compensation exemption",
        blocks: [
          {
            kind: "p",
            text: "Ask specifically whether the contractor carries workers compensation or holds an exemption, and whether their subcontractors do. An exemption is legal and common for a sole operator, and it also means an injury on your job can become your problem. Know which you are dealing with before the crew arrives.",
          },
          {
            kind: "p",
            text: "If nobody is calling you back at all, that is a different problem with a different fix: [why three contractors did not return your call](/answers/hiring-and-project-planning/contractors-not-calling-back).",
          },
        ],
      },
      {
        heading: "What to ask the old references",
        blocks: [
          {
            kind: "list",
            items: [
              "Did the job finish on the programme you were given, and if not, why?",
              "What went wrong, and how was it handled? Something always goes wrong.",
              "Were there change orders, and were they priced before the work or after?",
              "Has anything needed attention since, and did they come back?",
            ],
          },
          {
            kind: "p",
            text: "The last one is the reason for asking about jobs finished two years ago rather than two months ago. Coming back is the part that separates a contractor from a crew.",
          },
        ],
      },
    ],
  },

  "living-in-the-house-during-a-renovation": {
    updated: "2026-09-30",
    shortAnswer:
      "Possible, unpleasant, and usually slower. The compromise that works is moving out for demolition and rough-in — the loud, dusty, no-water phase — and moving back for finishes.",
    sections: [
      {
        heading: "The real cost of staying",
        blocks: [
          {
            kind: "p",
            text: "Moving out for three or four months is visible money. Staying has costs too, they are just harder to see: the crew works around you so productivity drops, dust protection has to be constant rather than adequate, and some work cannot be phased efficiently at all.",
          },
          {
            kind: "list",
            items: [
              "Flooring, which wants an empty run of rooms.",
              "HVAC changeouts, which take the system offline.",
              "A whole-house repipe, which takes the water off and opens walls at every fixture.",
            ],
          },
        ],
      },
      {
        heading: "The compromise that usually works",
        blocks: [
          {
            kind: "p",
            text: "Move out for demolition and rough-in, and move back for finishes. That covers the phase where the house is genuinely unusable and returns you for the part where progress is visible and the mess is contained.",
          },
        ],
      },
      {
        heading: "If you must stay throughout",
        blocks: [
          {
            kind: "steps",
            items: [
              "Insist on a sealed work zone with negative air pressure, not plastic sheeting taped to a doorway.",
              "Set up a working kitchen somewhere — a sink, a fridge, a microwave, even in the garage.",
              "Agree working hours in writing, up front, including Saturdays.",
              "Agree where materials are stored and where the skip goes before day one.",
            ],
          },
        ],
      },
      {
        heading: "Set the expectation on day one",
        blocks: [
          {
            kind: "p",
            text: "Most of the friction I have seen on lived-in jobs comes from expectations nobody stated: when the crew arrives, whether the dog can be out, which bathroom is theirs. Written down at the start, it is administration. Raised in week three, it is a dispute.",
          },
          {
            kind: "p",
            text: "Deciding the selections early removes the other common delay: [what order to pick finishes in](/answers/hiring-and-project-planning/what-order-to-pick-finishes).",
          },
        ],
      },
      {
        heading: "Dust is the part people underestimate",
        blocks: [
          {
            kind: "p",
            text: "Construction dust is not the dust a house makes. It travels through the air-conditioning system, settles in every room and takes weeks to stop appearing. If you are staying, the return vents in the work zone get sealed, the system is filtered properly, and the zone is kept under negative pressure with an extractor.",
          },
          {
            kind: "p",
            text: "Plastic taped across a doorway does none of that. It is the single most common reason a lived-in renovation feels worse than people expected, and it is cheap to do correctly.",
          },
        ],
      },
      {
        heading: "Agree the house rules in writing",
        blocks: [
          { kind: "p", text: "Working hours, which bathroom the crew uses, where materials and the skip go, whether music is on, how the house is secured at the end of each day, and what happens if a pet gets out." },
          { kind: "p", text: "None of this is about trust. It is about six people working in your home for eight weeks, where everything unstated becomes a conversation at the worst possible moment." },
        ],
      },
    ],
  },

  "what-order-to-pick-finishes": {
    updated: "2026-09-30",
    shortAnswer:
      "Pick the hardest-to-change, most-constrained thing first and work outward: usually tile or stone, then cabinets, then counters, then paint. Paint is the easiest thing in the world to change and should always be last.",
    sections: [
      {
        heading: "The order, and why it is that order",
        blocks: [
          {
            kind: "steps",
            items: [
              "Tile or stone. Limited palettes, long lead times, and the thing you will be looking at longest.",
              "Cabinets. Colour and door style, which have to sit with the tile.",
              "Countertops, chosen against the cabinets with a real slab in front of you.",
              "Plumbing and lighting fixtures, which are easier to substitute late.",
              "Paint, last, because it can be matched to anything.",
            ],
          },
          {
            kind: "p",
            text: "Picking paint first and then hunting for a tile that matches it is how people spend three weekends in a tile shop and end up with neither.",
          },
        ],
      },
      {
        heading: "See the actual material, in the actual room",
        blocks: [
          {
            kind: "p",
            text: "Get physical samples and look at them in the room they are going into, in morning light and in the evening. A showroom is lit to sell tile. Lay the floor tile out loose before anyone sets it, so the variation across the batch is a decision rather than a surprise.",
          },
          {
            kind: "p",
            text: "For stone, go to the yard and choose the slab. The difference between a sample chip and the slab is the whole point of natural stone: [quartz or granite](/answers/kitchens-and-bathrooms/quartz-vs-granite-countertops).",
          },
        ],
      },
      {
        heading: "Order before demolition starts",
        blocks: [
          {
            kind: "p",
            text: "Lead times, not trades, are what stall jobs. Cabinets, tile, windows and anything imported should be ordered and confirmed before the first wall comes down. A crew waiting on a vanity is a crew you are paying for twice.",
          },
          {
            kind: "p",
            text: "The phrase that adds two weeks to a project is we will pick that later.",
          },
        ],
      },
      {
        heading: "Keep one schedule everyone can see",
        blocks: [
          {
            kind: "p",
            text: "A simple selections list with the item, the choice, the supplier, the order date and the expected delivery stops most of the arguments about who was waiting for whom. It is also what tells you, in week two, whether the programme is real.",
          },
          {
            kind: "p",
            text: "If you are living on site while this happens, read [living in the house during a renovation](/answers/hiring-and-project-planning/living-in-the-house-during-a-renovation) as well.",
          },
        ],
      },
      {
        heading: "The selections that hold up a job",
        blocks: [
          {
            kind: "list",
            items: [
              "Cabinets, because they are made to order and everything after them waits.",
              "Tile, because a discontinued line is discovered at the worst moment.",
              "Windows and exterior doors, which are the longest lead of all.",
              "Anything imported or made to measure, including shower glass and stone.",
            ],
          },
          {
            kind: "p",
            text: "Everything else can be decided while the work runs. Those four decide the programme, so they get chosen, priced and ordered before demolition, not during.",
          },
        ],
      },
    ],
  },

  "contractors-not-calling-back": {
    updated: "2026-09-30",
    shortAnswer:
      "Probably nothing you did — contractors triage, and vague small jobs sink. Make yourself easy to bid: a written scope with photographs and rough dimensions, a budget range rather than what would it cost, and a clear statement that you expect a licensed, insured contractor to pull permits.",
    sections: [
      {
        heading: "What a contractor is deciding when your message arrives",
        blocks: [
          {
            kind: "p",
            text: "Whether the job is real, whether it is the kind of work they do, whether the scope is knowable without a site visit, and whether the budget is in the same universe as the work. A message that leaves three of those open goes to the bottom of the pile, not because you are being ignored but because there are five above it that do not.",
          },
        ],
      },
      {
        heading: "What gets answered first",
        blocks: [
          {
            kind: "list",
            items: [
              "A scope in a few bullets: what, where, and what finish level.",
              "Photographs and rough dimensions.",
              "A budget range. What would it cost reads as a fishing expedition; my range is X to Y reads as a client.",
              "Your timing, and whether it is flexible.",
              "A line saying you expect permits to be pulled and the contractor to be licensed and insured. It filters for the ones you actually want.",
            ],
          },
        ],
      },
      {
        heading: "How and when to make contact",
        blocks: [
          {
            kind: "p",
            text: "Telephone rather than email, early in the morning before eight or after five, when someone is in a truck rather than on a roof. Leave the scope in a message and follow with an email so it can be read properly later.",
          },
        ],
      },
      {
        heading: "Make sure you are calling the right trade",
        blocks: [
          {
            kind: "p",
            text: "If the job is genuinely two hours of work, you want a handyman, not a general contractor — a GC pricing a two-hour job has to cover mobilisation, insurance and overhead, and the number will offend you both. If it involves structure, permits or several trades in sequence, it is a contractor job and the scope above is what gets it moving.",
          },
          {
            kind: "p",
            text: "Once someone does call back, run the [four verification checks](/answers/hiring-and-project-planning/how-to-check-a-contractor-is-licensed) before you let them quote, and know [what payment terms are normal](/answers/hiring-and-project-planning/contractor-wants-fifty-percent-upfront). If you would rather skip the search, [here is how I run a project](/hire-contractor).",
          },
        ],
      },
      {
        heading: "A template that gets answered",
        blocks: [
          {
            kind: "p",
            text: "Keep it to six lines: what the job is, where it is, the rough size, a budget range, when you want it done, and that you expect permits and a licensed, insured contractor. Attach three photographs.",
          },
          {
            kind: "p",
            text: "That message can be priced roughly without a visit, which is what decides whether it gets a call back today or a maybe next month. It also filters out the contractors who were never going to pull a permit, which saves you the conversation later.",
          },
        ],
      },
    ],
  },
};
