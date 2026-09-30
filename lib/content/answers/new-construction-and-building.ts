import type { AnswerBody } from "@/lib/content/answers";

/** Published copy for the new-construction answers (docs/18 § 3). */
export const newConstructionAndBuilding: Record<string, AnswerBody> = {
  "what-to-check-before-buying-a-lot": {
    updated: "2026-09-30",
    shortAnswer:
      "Before you close, not after: zoning and the real setbacks, utilities at the street against well and septic, the soil, and the flood zone. Order a boundary survey, a topographic survey and a soil boring, and keep a due diligence period in the contract.",
    sections: [
      {
        heading: "The four that decide whether you can build your plan",
        blocks: [
          {
            kind: "list",
            items: [
              "Zoning and setbacks. A sixty-foot lot with seven-and-a-half-foot sides changes the whole footprint, and no amount of design work recovers it.",
              "Utilities. Water, sewer and power at the street is a different budget from a well and a septic system, and septic capacity is tied to bedroom count.",
              "Soil. This is the one people skip.",
              "Flood zone, which drives both what you can build and what it costs to insure.",
            ],
          },
        ],
      },
      {
        heading: "The surveys and the soil boring",
        blocks: [
          {
            kind: "p",
            text: "Get a boundary survey and a topographic survey. The boundary tells you where the lot actually is, which is not always where the fence is; the topo tells you how water moves across it, which decides your fill and your drainage.",
          },
          {
            kind: "p",
            text: "Then order a soil boring. A test that costs around a thousand dollars can find muck that adds tens of thousands in fill or piers, and it is the single cheapest way to avoid the worst surprise in custom building. If the boring comes back badly, you renegotiate or you walk, and either is better than discovering it after closing.",
          },
        ],
      },
      {
        heading: "The costs that surprise people",
        blocks: [
          {
            kind: "list",
            items: [
              "Impact fees. Ask the county directly what they are for your parcel and your house size before you budget. They are not trivial in Central Florida and they vary by jurisdiction.",
              "Plat restrictions or an old HOA that limits square footage, metal roofs or outbuildings, even where zoning would allow them.",
              "Clearing, fill and a long driveway, which are site costs and belong nowhere near a per-square-foot figure.",
            ],
          },
        ],
      },
      {
        heading: "Protect yourself in the contract",
        blocks: [
          {
            kind: "steps",
            items: [
              "Write a due diligence period into the purchase contract and make it long enough to get the surveys and the boring back.",
              "Make the deposit refundable inside that period.",
              "Confirm in writing what the seller knows about prior fill, prior structures and any easements.",
            ],
          },
          {
            kind: "p",
            text: "Lot selection is where most custom builds quietly go over budget, well before anyone argues about tile. Once the lot is right, the next question is [what a realistic build cost looks like](/answers/new-construction-and-building/cost-per-square-foot-to-build-florida), and [the contractor side](/hire-contractor) explains how I run a build from here.",
          },
        ],
      },
      {
        heading: "Questions for the seller, in writing",
        blocks: [
          {
            kind: "list",
            items: [
              "Has anything been built here before, and was it demolished with a permit?",
              "Has fill been brought in, and is there any documentation of it?",
              "Are there easements, and where do they run?",
              "Is there a current survey, a soil report or a percolation test?",
            ],
          },
          {
            kind: "p",
            text: "Written answers matter because they become part of the record if something turns up later. A seller who does not know is a fine answer; a seller who will not put it in writing is information of a different kind.",
          },
        ],
      },
    ],
  },

  "cost-per-square-foot-to-build-florida": {
    updated: "2026-09-30",
    shortAnswer:
      "Per square foot is the most abused number in building. Ask instead for a line-item budget with the allowances called out, and site costs separated entirely — fill, clearing, septic and long driveways are site-specific and belong nowhere near a per-foot figure.",
    sections: [
      {
        heading: "Why one number hides everything",
        blocks: [
          {
            kind: "p",
            text: "Cost per square foot moves with your site, your plan complexity and your finish level. Two houses of the same size on the same street can differ by a third, and a quote expressed as one number per foot is usually hiding which one you are getting.",
          },
          {
            kind: "p",
            text: "It is a useful shorthand between builders. It is a poor basis for a homeowner decision.",
          },
        ],
      },
      {
        heading: "Ask for the line items instead",
        blocks: [
          {
            kind: "p",
            text: "A real budget separates the work into trades and then calls out the allowances. Five allowances account for most overruns:",
          },
          {
            kind: "list",
            items: [
              "Cabinets.",
              "Tile.",
              "Plumbing fixtures.",
              "Lighting.",
              "Flooring.",
            ],
          },
          {
            kind: "p",
            text: "An allowance is a placeholder, not a price. If it is set low the budget looks attractive and the overrun arrives at selection time, which is the oldest trick in residential construction and usually not even deliberate.",
          },
        ],
      },
      {
        heading: "Keep site costs out of the per-foot conversation",
        blocks: [
          {
            kind: "p",
            text: "Clearing, fill, septic, a long driveway and any retaining work are properties of the lot rather than the house. Mixing them into a per-foot figure makes a difficult site look like an expensive house, and an easy site look like a bargain builder.",
          },
          {
            kind: "p",
            text: "Permits and impact fees sit on top of all of it. Ask the county what they will be for your parcel rather than accepting an estimate.",
          },
        ],
      },
      {
        heading: "How to compare two builders honestly",
        blocks: [
          {
            kind: "steps",
            items: [
              "Give both the same plan and the same written specification.",
              "Ask both for the same allowance list, with the same quantities.",
              "Ask what is excluded. The exclusions list tells you more than the total.",
              "Ask how change orders are priced and who signs them.",
            ],
          },
          {
            kind: "p",
            text: "Before any of this, the lot has to be right: [what to check before buying a lot](/answers/new-construction-and-building/what-to-check-before-buying-a-lot). If you are choosing between a production builder and a custom build, [how much you can change a builder plan](/answers/new-construction-and-building/changing-a-builders-floor-plan) frames the trade-off.",
          },
        ],
      },
      {
        heading: "Where budgets move after signing",
        blocks: [
          {
            kind: "list",
            items: [
              "Selections above the allowance, which is the most common and the most avoidable.",
              "Site conditions found after clearing, which is why the soil boring matters before closing.",
              "Change orders during framing, because a decision made on paper costs a fraction of the same decision on site.",
              "Delays, which cost money in extended financing rather than in materials.",
            ],
          },
          {
            kind: "p",
            text: "The defence against all four is the same: a written specification, allowances you have actually shopped, and a change-order process agreed before the first inspection.",
          },
        ],
      },
    ],
  },

  "eleven-month-warranty-list": {
    updated: "2026-09-30",
    shortAnswer:
      "Walk it like an inspector and submit in writing before month eleven, not month twelve. Expect drywall cracks at door and window corners, nail pops, doors that no longer latch, grout and caulk failures, settled grading and any window that leaks in driving rain.",
    sections: [
      {
        heading: "The deadline is the whole point",
        blocks: [
          {
            kind: "p",
            text: "A one-year builder warranty means the list has to be with the builder inside the year, in writing, with dates. Submitting in month twelve leaves no time for anyone to inspect and argue, and a verbal report to a superintendent is not a submission.",
          },
          {
            kind: "p",
            text: "Diarise month ten. Walk the house over a couple of evenings, photograph everything with a date visible in the file, and send one consolidated list.",
          },
        ],
      },
      {
        heading: "What genuinely turns up at eleven months",
        blocks: [
          {
            kind: "list",
            items: [
              "Drywall cracks at door and window corners, and nail pops across ceilings.",
              "Doors that no longer latch because the frame has settled.",
              "Grout and caulk failures at the tub and shower.",
              "Exterior caulk failing at penetrations.",
              "Garage slab cracks beyond hairline.",
              "Grading that has settled and now slopes towards the house.",
              "HVAC that will not balance between floors.",
              "Any window or slider that leaks in driving rain.",
            ],
          },
        ],
      },
      {
        heading: "Pay for an independent inspection",
        blocks: [
          {
            kind: "p",
            text: "A warranty inspection costs a few hundred dollars and finds what you cannot see: attic work, duct connections, flashing details, plumbing under the house. It is the best money spent in the first year of a new house, and it gives your list the authority of a third party.",
          },
        ],
      },
      {
        heading: "How to submit it so it gets done",
        blocks: [
          {
            kind: "steps",
            items: [
              "One document, numbered items, one photograph per item.",
              "Location described the way a trade would find it: room, wall, height.",
              "Send by email so there is a timestamp, and ask for written acknowledgement.",
              "Keep the original list and tick items off as they are completed rather than starting a new one.",
            ],
          },
          {
            kind: "p",
            text: "I do these walks for buyers. The written-before-eleven-months part is what people miss, not the finding. If you are still choosing a builder, read [whether you need your own agent for new construction](/answers/buying-and-selling/own-agent-for-new-construction), and for the cracks themselves, [why they come back at door corners](/answers/systems-and-maintenance/drywall-cracks-at-door-corners).",
          },
        ],
      },
      {
        heading: "What is usually not covered",
        blocks: [
          {
            kind: "p",
            text: "Normal wear, anything you or another contractor altered, landscaping after a stated period, and cosmetic items outside the window written into the warranty document. Read that document once at closing and once at month ten; it defines the deadlines you are working to.",
          },
          {
            kind: "p",
            text: "Structural coverage usually runs far longer than one year and is handled separately, which is worth knowing before you write off a crack because the first year has passed.",
          },
        ],
      },
    ],
  },

  "block-vs-wood-frame-florida": {
    updated: "2026-09-30",
    shortAnswer:
      "Both are code-legal and both work. Block is the Florida default for the first floor — better in wind, no termite food, generally better insurance treatment. Frame is faster, cheaper, easier to insulate and far easier to renovate later.",
    sections: [
      {
        heading: "What block gives you",
        blocks: [
          {
            kind: "list",
            items: [
              "Performance in wind, which is the reason it became the default here.",
              "Nothing for termites to eat in the wall assembly.",
              "Generally better treatment on insurance.",
              "A solidity you can feel, which matters more to people than they expect.",
            ],
          },
          {
            kind: "p",
            text: "The downsides are real too. Block is slower to modify: running new electrical or plumbing means furring out or chasing the wall. Its thermal mass cuts both ways in this climate, holding heat as readily as it holds cool.",
          },
        ],
      },
      {
        heading: "What frame gives you",
        blocks: [
          {
            kind: "p",
            text: "Speed, lower cost, a wall cavity that takes a high insulation value easily, and renovation that does not involve a demolition saw. If you expect to change the house — move a wall, add a bathroom, run new services — frame is materially cheaper to live with.",
          },
        ],
      },
      {
        heading: "What most two-storey houses here actually are",
        blocks: [
          {
            kind: "p",
            text: "Block on the first floor and frame above is the common compromise in Central Florida, and it is a sensible one: the wind loads are highest low down, and the upper floor gets the easier assembly.",
          },
        ],
      },
      {
        heading: "If you are choosing for insurance",
        blocks: [
          {
            kind: "p",
            text: "Call an agent and ask for a quote both ways on your actual plan and location before you decide. The difference is usually smaller than people claim, and it is specific to the carrier and the rest of the wind mitigation picture — the other credits are in [retrofits that lower a Florida insurance bill](/answers/inspections-and-insurance/retrofits-that-lower-florida-insurance).",
          },
          {
            kind: "p",
            text: "If you are building rather than buying, this decision sits alongside [what a realistic build cost looks like](/answers/new-construction-and-building/cost-per-square-foot-to-build-florida) and [what to check before buying a lot](/answers/new-construction-and-building/what-to-check-before-buying-a-lot).",
          },
        ],
      },
      {
        heading: "What it means when you want to change the house",
        blocks: [
          {
            kind: "p",
            text: "This is the part people feel five years later rather than at the sales office. Moving a socket, adding a bathroom or opening a wall is ordinary work in frame and a bigger job in block, because the services have to be chased or furred out and the openings need lintels.",
          },
          {
            kind: "p",
            text: "If a renovation is likely, that cost belongs in the comparison now. If the house is being bought as it is, it does not. Either way the structural question sits with an engineer rather than a salesperson: [is this wall load-bearing](/answers/additions-and-conversions/is-this-wall-load-bearing).",
          },
        ],
      },
    ],
  },

  "new-communities-near-sanford-low-hoa": {
    updated: "2026-09-30",
    shortAnswer:
      "There are a few, and the number to compare is not the monthly HOA fee but what it covers and whether a CDD sits on top. A $60 monthly HOA with a large annual CDD assessment on the tax bill is not a cheap community.",
    sections: [
      {
        heading: "The HOA fee is not the cost",
        blocks: [
          {
            kind: "p",
            text: "Two communities with the same monthly fee can be completely different purchases. What matters is what the fee covers, what the association has in reserve, and whether there is a Community Development District assessment on the property tax bill on top of it.",
          },
          {
            kind: "p",
            text: "A CDD funds the infrastructure of the community and is collected with your taxes for a long period. It is not hidden, but it is easy to miss when you are comparing brochures.",
          },
        ],
      },
      {
        heading: "Ask for the budget and the reserve study",
        blocks: [
          {
            kind: "p",
            text: "The brochure tells you what the community wants to be. The budget and the reserve study tell you whether the fee is realistic. An association with thin reserves and ageing shared assets is a special assessment waiting to happen, and new communities are not exempt — the developer sets the early budget.",
          },
          {
            kind: "steps",
            items: [
              "Ask for the current operating budget and the reserve study.",
              "Ask what the CDD assessment is, per year, on the specific lot.",
              "Ask when control of the association transfers from the developer to the owners.",
              "Ask what the fee covers: is it the gate and the lawn, or the roof over your head in a townhome.",
            ],
          },
        ],
      },
      {
        heading: "Around Sanford specifically",
        blocks: [
          {
            kind: "p",
            text: "Look at what is going in around the historic downtown side and out towards the airport. There are smaller block-construction communities there with low HOA fees and no CDD, which is unusual in this market and worth knowing about before you assume everything new carries both.",
          },
          {
            kind: "p",
            text: "I am involved in one of those near Sanford, so take my enthusiasm with that in mind — but the budget and reserve question is the right one to ask of any of them, including mine. [Ask me directly](/contact) and I will tell you which ones are worth your Saturday, or read the [Sanford guide](/sanford) for the wider market.",
          },
        ],
      },
      {
        heading: "The related purchase decisions",
        blocks: [
          {
            kind: "p",
            text: "If you are buying new anywhere, [bring your own agent to the first visit](/answers/buying-and-selling/own-agent-for-new-construction), and understand [how much of the plan you can actually change](/answers/new-construction-and-building/changing-a-builders-floor-plan) before you fall for a model home.",
          },
        ],
      },
      {
        heading: "What a low fee usually means",
        blocks: [
          {
            kind: "list",
            items: [
              "Fewer shared amenities, which is often exactly what people want.",
              "Owners maintaining more themselves, which is cheaper and less uniform.",
              "A young association with thin reserves, which is the one to check rather than assume.",
            ],
          },
          {
            kind: "p",
            text: "None of those is a problem on its own. They become a problem when the fee is low because the budget is optimistic, which is what a reserve study tells you and a brochure does not.",
          },
        ],
      },
    ],
  },

  "changing-a-builders-floor-plan": {
    updated: "2026-09-30",
    shortAnswer:
      "With a production builder, almost nothing structural — the options list is the options list. With a semi-custom builder or one working on your lot, you can usually move non-bearing walls and extend the footprint. Changes on paper are cheap; changes after the slab is poured are brutal.",
    sections: [
      {
        heading: "What a production builder will usually allow",
        blocks: [
          {
            kind: "list",
            items: [
              "Cabinet and countertop upgrades.",
              "Moving a laundry within the same area.",
              "Adding a bathroom rough-in.",
              "Extending a lanai, where it is a pre-priced option.",
              "Pre-wiring for data, speakers or a future generator.",
            ],
          },
          {
            kind: "p",
            text: "What they will not do is move a bearing wall, change the roof line, or anything that sends the plan back for re-engineering. That is not obstruction; their price depends on building the same house repeatedly.",
          },
        ],
      },
      {
        heading: "What changes with a semi-custom builder",
        blocks: [
          {
            kind: "p",
            text: "On your own lot, or with a builder who engineers per house, the answer flips. Non-bearing walls move freely, the footprint can extend, and window and door positions are yours. You pay for that in plan and engineering time, and in a slower start.",
          },
        ],
      },
      {
        heading: "The rule that decides the cost",
        blocks: [
          {
            kind: "p",
            text: "A change made on paper is cheap. A change made after permitting costs a revision. A change made after the slab is poured costs demolition, rework and time, and in Florida the slab carries the plumbing, so a bathroom that moves after the pour means cutting concrete.",
          },
          {
            kind: "steps",
            items: [
              "Decide the layout before permitting, not during framing.",
              "Walk the taped-out plan on the slab if you can, before the frame goes up.",
              "Get every change in writing with a price, before it is built.",
            ],
          },
        ],
      },
      {
        heading: "Where I would spend the change budget",
        blocks: [
          {
            kind: "p",
            text: "On the things that are expensive to add later and invisible to a sales office: rough-ins, blocking in walls for future grab bars, conduit, an extra circuit to the garage, and drainage. Finishes can be changed any weekend for the next thirty years; a rough-in cannot.",
          },
          {
            kind: "p",
            text: "If accessibility is on the horizon, [plan the in-law suite properly](/answers/additions-and-conversions/in-law-suite-planning-mistakes). And whatever you agree, walk the house at [pre-drywall with your own representation](/answers/buying-and-selling/own-agent-for-new-construction).",
          },
        ],
      },
      {
        heading: "The upgrades worth paying the builder for",
        blocks: [
          {
            kind: "p",
            text: "Anything structural or inside a wall: rough-ins, extra circuits, conduit, blocking, a bathroom addition, a lanai extension that is part of the engineered plan. These are cheap now and disruptive later.",
          },
          {
            kind: "p",
            text: "Anything cosmetic is usually cheaper afterwards with your own contractor, and you get a wider choice: flooring, light fittings, mirrors, cabinet hardware, paint colours. The exception is anything that would mean tearing out new work to replace it.",
          },
        ],
      },
    ],
  },

  "which-renovations-need-a-permit": {
    updated: "2026-09-30",
    shortAnswer:
      "It varies by jurisdiction, but the general shape is: structural work, most electrical, new or relocated plumbing, HVAC changeouts, roofing, window and door replacement, decks over a certain height, larger sheds, pools and fences. Paint, flooring and like-for-like cabinets usually do not.",
    sections: [
      {
        heading: "Usually needs a permit",
        blocks: [
          {
            kind: "list",
            items: [
              "Structural changes, including removing or altering a bearing wall.",
              "Electrical work beyond swapping a fixture.",
              "New or relocated plumbing.",
              "HVAC changeouts.",
              "Roofing.",
              "Window and door replacement.",
              "Decks above a certain height, sheds above a certain size, pools and fences.",
            ],
          },
        ],
      },
      {
        heading: "Usually does not",
        blocks: [
          {
            kind: "list",
            items: [
              "Paint, inside or out.",
              "Flooring.",
              "Cabinets replaced in the same footprint.",
              "Countertops.",
              "Trim and interior doors.",
            ],
          },
          {
            kind: "p",
            text: "Thresholds differ between Seminole County, Orange County and the cities inside them, so confirm yours with the building department before you assume. One phone call with your parcel number settles it.",
          },
        ],
      },
      {
        heading: "Why it matters more than the fine",
        blocks: [
          {
            kind: "p",
            text: "The reason to permit work is not the penalty. It is that unpermitted work follows the house: an appraiser gives it no value, a buyer discounts it, and some insurers will decline a claim connected to it. That is three costs, and they all arrive at the worst moment.",
          },
          {
            kind: "p",
            text: "Roughly half the low appraisals I see are missing permitted square footage — the detail is in [what to do when an appraisal comes in low](/answers/buying-and-selling/appraisal-came-in-low-options).",
          },
        ],
      },
      {
        heading: "If the work was done before you bought it",
        blocks: [
          {
            kind: "p",
            text: "You can often permit it after the fact. It involves a fee, an application and an inspection, and sometimes opening up part of the work so an inspector can see it. It is less painful than people fear and it converts a liability into square footage that counts.",
          },
          {
            kind: "steps",
            items: [
              "Pull the permit history on the parcel so you know what is missing.",
              "Ask the building department what they require for an after-the-fact permit on that scope.",
              "Have a licensed contractor make the application where the trade requires one.",
            ],
          },
          {
            kind: "p",
            text: "I pull permits weekly and can tell you which route is realistic for your particular piece of work: [the contractor side](/hire-contractor). If the work in question is a garage conversion, read [what that does to resale](/answers/additions-and-conversions/garage-conversion-resale-value) first.",
          },
        ],
      },
      {
        heading: "What a permit actually involves",
        blocks: [
          {
            kind: "steps",
            items: [
              "An application, usually with a drawing or a product approval number attached.",
              "A fee, which varies by jurisdiction and by the value of the work.",
              "Inspections at defined stages, which is the part that protects you.",
              "A final inspection and a closed permit, which is the document to keep.",
            ],
          },
          {
            kind: "p",
            text: "An open permit is worse than no permit at resale, because it shows work that was started and never signed off. If you inherit one, closing it is usually straightforward and always better than leaving it.",
          },
        ],
      },
    ],
  },

  "architect-vs-design-build": {
    updated: "2026-09-30",
    shortAnswer:
      "Hire an architect separately when the design is the hard part — a difficult site, a heavily custom house, historic review, or when you want competitive bids from one set of drawings. Go design-build when the construction is the hard part, which covers most additions and whole-house remodels.",
    sections: [
      {
        heading: "When to hire the architect first",
        blocks: [
          {
            kind: "list",
            items: [
              "The site is difficult: slope, trees, an awkward shape, a tight envelope.",
              "The house is genuinely custom rather than a variation on a known plan.",
              "There is a historic or design review to satisfy.",
              "You want three builders bidding the same drawings, which requires the drawings to exist first.",
            ],
          },
        ],
      },
      {
        heading: "When design-build is the better answer",
        blocks: [
          {
            kind: "p",
            text: "When the construction is the hard part and you want one contract and one point of responsibility. Most additions and most whole-house remodels are in this category: the design problem is modest, the sequencing and the existing conditions are not.",
          },
        ],
      },
      {
        heading: "How each one fails",
        blocks: [
          {
            kind: "p",
            text: "The separate route fails as a beautiful set of drawings that comes back over budget, at which point you pay for a redesign and lose months. Ask your architect for a construction budget check at the schematic stage, not after permit drawings.",
          },
          {
            kind: "p",
            text: "Design-build fails through lack of price transparency, because the same firm designs the work and prices it. Ask for an open-book budget, with subcontractor quotes visible and the fee stated separately. A firm that will not show you that is telling you something.",
          },
        ],
      },
      {
        heading: "What I would ask either one for",
        blocks: [
          {
            kind: "steps",
            items: [
              "A written scope with allowances called out.",
              "A programme with the permit period shown honestly rather than optimistically.",
              "A change-order process agreed before work starts.",
              "Proof of licence and insurance, verified with the state and the insurer.",
            ],
          },
          {
            kind: "p",
            text: "I do design-build, and I will tell a client when they need an architect instead — usually for the reasons in the first list. Before either conversation, read [contractor wants 50% upfront](/answers/hiring-and-project-planning/contractor-wants-fifty-percent-upfront) and [how to check a contractor is legitimate](/answers/hiring-and-project-planning/how-to-check-a-contractor-is-licensed).",
          },
        ],
      },
      {
        heading: "What each route costs you in time",
        blocks: [
          {
            kind: "p",
            text: "The separate route adds a design phase and a bidding phase before anything is priced firmly, which on a whole-house project is months rather than weeks. Design-build compresses that, at the cost of a single source for both the design and the price.",
          },
          {
            kind: "p",
            text: "If the schedule matters more than competitive bidding, that is a legitimate reason to choose design-build. If the budget is tight and the design is simple, three bids on one set of drawings is usually worth the wait.",
          },
        ],
      },
    ],
  },
};
