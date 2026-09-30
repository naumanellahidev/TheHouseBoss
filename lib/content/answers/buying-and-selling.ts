import type { AnswerBody } from "@/lib/content/answers";

/**
 * Published copy for the buying-and-selling answers.
 *
 * Expanded from the drafts in `answers-source.json`: the specifics are kept,
 * the forum register and the trailing self-identification are not (docs/18
 * § 3). No figure appears here that the client did not put in her own draft.
 */
export const buyingAndSelling: Record<string, AnswerBody> = {
  "lake-mary-vs-longwood-vs-oviedo": {
    updated: "2026-09-30",
    shortAnswer:
      "Lake Mary buys you Seminole County schools and the best I-4 and 417 access, and you pay for it per square foot. Longwood gives you bigger lots and older housing that usually needs work. Oviedo is the quiet family option with the longest downtown commute of the three.",
    sections: [
      {
        heading: "What you are actually choosing between",
        blocks: [
          {
            kind: "p",
            text: "These three sit within twenty minutes of each other and get compared constantly, but they are not variations on one market. They differ in housing stock, in commute, and in how much of your budget goes into the house rather than the address.",
          },
          {
            kind: "list",
            items: [
              "[Lake Mary](/lake-mary) — Seminole schools, 46 and I-4 access, Colonial Town Park for restaurants and offices. Mostly 1990s onward, much of it in HOA communities, and the price per square foot reflects all of that.",
              "[Longwood](/longwood) — older stock, bigger lots, a lot of 1970s and 1980s block ranches. Trees, often no HOA, and frequently a kitchen and a repipe waiting for you.",
              "Oviedo — newer, quieter, family-oriented, and the longest drive of the three if you work downtown.",
            ],
          },
        ],
      },
      {
        heading: "Commute first, everything else second",
        blocks: [
          {
            kind: "p",
            text: "Decide where you physically need to be three days a week before you shortlist anything. From Lake Mary the I-4 and 417 interchange makes both downtown Orlando and the Maitland and Heathrow employment corridor manageable. Longwood is a few minutes closer to Altamonte and Maitland. Oviedo pushes you onto 417 for almost everything, which is fine for the UCF and research park side and tiring for a downtown office.",
          },
        ],
      },
      {
        heading: "The construction difference nobody prices in",
        blocks: [
          {
            kind: "p",
            text: "This is where I look at the three differently from most agents, because I hold a contractor licence as well as a real-estate one. The age of the stock decides your repair exposure more than the town name does.",
          },
          {
            kind: "list",
            items: [
              "Buy an older Longwood or Winter Springs house and budget for polybutylene supply lines and a roof before you fall in love with the lot.",
              "A 1990s Lake Mary house can look move-in ready and still be at the end of its roof, HVAC and water-heater life at the same time.",
              "Newer Oviedo stock usually defers those costs, which is part of what you are paying for.",
            ],
          },
          {
            kind: "p",
            text: "Ask for the roof permit date, the water heater age and whether the house has been repiped, in all three towns. Those three answers change the real price more than the list price does. If the answers are bad, the repair is something I can cost properly — that is the [contractor side of the business](/hire-contractor).",
          },
        ],
      },
      {
        heading: "How I would choose",
        blocks: [
          {
            kind: "steps",
            items: [
              "Fix your commute constraint. It eliminates one of the three most of the time.",
              "Decide whether you want the house or the lot. Longwood sells lots and trees; Lake Mary and Oviedo sell houses and schools.",
              "Get an insurance quote on a specific address before you are emotionally committed, because roof age and plumbing material now price the premium.",
              "Walk the two finalists with someone who can tell you what the repairs cost, not only what the comparable sales say.",
            ],
          },
          {
            kind: "p",
            text: "If you are weighing the premium itself rather than the towns, the follow-up is [whether Lake Mary is worth what it costs](/answers/buying-and-selling/is-lake-mary-worth-the-premium). Moving from out of state? Start with [where to land in Central Florida](/answers/buying-and-selling/moving-to-central-florida-where-to-live).",
          },
        ],
      },
      {
        heading: "What each one costs to own, not to buy",
        blocks: [
          {
            kind: "p",
            text: "The mortgage is the number people compare. The rest of the bill is where these three separate, and it is largely decided by the age of the house rather than the town.",
          },
          {
            kind: "list",
            items: [
              "Insurance. A newer Lake Mary or Oviedo house with a documented roof and current-code openings usually rates better than a 1970s Longwood block ranch with an original roof and no wind mitigation report.",
              "Lawn and irrigation. A bigger Longwood lot is the thing people like most about it and the thing they budget least for.",
              "HOA and CDD. Many newer communities carry one or both, and a CDD assessment sits on the tax bill rather than in the monthly fee.",
              "Deferred maintenance. An older house is cheaper per square foot because somebody has to do the roof, the panel and the plumbing eventually, and that somebody is the buyer.",
            ],
          },
          {
            kind: "p",
            text: "Ask for last year actual figures rather than estimates: the tax bill, the insurance declaration page and the last twelve months of power bills. Sellers have all three and most will hand them over.",
          },
        ],
      },
    ],
  },

  "is-lake-mary-worth-the-premium": {
    updated: "2026-09-30",
    shortAnswer:
      "You are paying for three things: Seminole County schools, I-4 and 417 access, and a newer rebuild profile that insurers price better than older stock. If none of the three applies to you, your money goes further in Sanford or Deltona.",
    sections: [
      {
        heading: "What the premium actually buys",
        blocks: [
          {
            kind: "p",
            text: "The Lake Mary premium is not a vague lifestyle charge. It resolves into three specific things, and each is worth a different amount to a different buyer.",
          },
          {
            kind: "list",
            items: [
              "The school district. If you have children in the system this is most of the premium, and it is not available a few miles away at a discount.",
              "Access. The I-4 and 417 interchange is the reason the office parks are here, and it shortens almost every trip you make.",
              "The 32746 rebuild profile. Newer construction with a documented roof and current-code openings is quietly cheaper to insure than older stock nearby.",
            ],
          },
          {
            kind: "p",
            text: "Remote work and no children in school takes the first two off the table. At that point [Sanford](/sanford) or Deltona gives you more house and you keep the difference.",
          },
        ],
      },
      {
        heading: "Where I watch people overpay",
        blocks: [
          {
            kind: "p",
            text: "The expensive mistake is buying a 1990s Lake Mary house at close to new-construction pricing and then finding it needs a roof, an HVAC system and a repipe inside three years. That is $45,000 to $60,000 nobody budgeted, and it usually lands in the second year when the reserves are gone.",
          },
          {
            kind: "p",
            text: "The house shows beautifully because paint and flooring are the cheapest things in it. The roof, the panel, the windows and the grading are what cost five figures, and none of them photograph badly.",
          },
        ],
      },
      {
        heading: "Three questions before you write the offer",
        blocks: [
          {
            kind: "steps",
            items: [
              "What is the roof permit date? Not the seller memory — the permit record.",
              "How old is the water heater, and where is it? An attic install with no pan is a ceiling waiting to fail.",
              "Has it been repiped, and with what? Polybutylene still turns up in this age of stock and it decides your insurance.",
            ],
          },
          {
            kind: "p",
            text: "Get a real insurance quote on the specific address before your inspection period ends. Insurability is part of the price in Florida now: [when to get that quote](/answers/inspections-and-insurance/when-to-get-a-florida-insurance-quote).",
          },
        ],
      },
      {
        heading: "So is it worth it",
        blocks: [
          {
            kind: "p",
            text: "For a family using the schools and the commute, yes, and the resale depth here is real. For a remote couple who want space, the premium is largely buying things you will not use, and I will say so. To compare the towns rather than the premium, read [Lake Mary against Longwood and Oviedo](/answers/buying-and-selling/lake-mary-vs-longwood-vs-oviedo), or the [Lake Mary guide](/lake-mary) for the market street by street.",
          },
        ],
      },
      {
        heading: "What the premium does not buy",
        blocks: [
          {
            kind: "p",
            text: "It does not buy a maintained house. The address and the school boundary are fixed; the roof, the panel and the plumbing are not, and they do not improve because the postcode is desirable.",
          },
          {
            kind: "p",
            text: "It also does not buy a quiet purchase. The better streets here draw competition, which means less room to negotiate repairs after an inspection. That is a reason to do the inspection thinking before the offer rather than after it, and it is why I walk a house with a builder eye before we write.",
          },
          {
            kind: "list",
            items: [
              "Ask what has been replaced, when, and whether there is a permit for it.",
              "Ask for the last insurance declaration page, which tells you what a carrier already thinks of the house.",
              "Ask whether the HOA has run a reserve study, if there is an association.",
            ],
          },
        ],
      },
    ],
  },

  "is-sanford-worth-buying-into": {
    updated: "2026-09-30",
    shortAnswer:
      "Yes, once you separate the two Sanfords. Historic downtown is 1920s to 1940s housing with real rehab exposure; the newer block construction west and south of town is an ordinary, cheap-to-insure purchase. They are not the same bet.",
    sections: [
      {
        heading: "The part that is genuinely happening",
        blocks: [
          {
            kind: "p",
            text: "Sanford has been described as about to turn a corner for a decade. What is different now is concrete: the Riverwalk, the density of restaurants downtown, and the airport traffic. Those are not projections, they are things you can stand in front of on a Saturday.",
          },
        ],
      },
      {
        heading: "Two markets, one name",
        blocks: [
          {
            kind: "list",
            items: [
              "Historic downtown — 1920s to 1940s houses. Expect leftover knob-and-tube wiring, no wall insulation, and foundations that have moved. Wonderful if you arrive with a contractor eye and a rehab number written down.",
              "West and south of town — newer block construction, unremarkable, and far cheaper to insure and maintain. This is a normal suburban purchase.",
            ],
          },
          {
            kind: "p",
            text: "People conflate the two constantly, then apply the rehab risk of one to the pricing of the other. Decide which purchase you are making before you tour anything.",
          },
        ],
      },
      {
        heading: "If you are buying the historic side",
        blocks: [
          {
            kind: "p",
            text: "Treat it as a renovation project that happens to come with a roof. Before the inspection period ends I would want the electrical service and panel assessed, the plumbing material identified, the framing and floor structure looked at where the house has settled, and the permit history pulled on the parcel so you know what was done with a permit and what was not.",
          },
          {
            kind: "p",
            text: "Unpermitted work matters twice: an appraiser gives it no value, and some insurers will decline a claim connected to it. Legalising it afterwards is usually possible — the process is in [which renovations need a permit](/answers/new-construction-and-building/which-renovations-need-a-permit).",
          },
        ],
      },
      {
        heading: "If you are buying the newer side",
        blocks: [
          {
            kind: "p",
            text: "Then the questions are ordinary: roof age, HVAC age, any HOA or CDD assessment on the tax bill, and what the insurance actually costs. Block construction and current-code openings usually make this the cheaper house to own even when it is not the cheaper house to buy.",
          },
          {
            kind: "p",
            text: "Either way, start with the [Sanford guide](/sanford). If you are weighing it against the pricier end of the county, read [whether Lake Mary is worth the premium](/answers/buying-and-selling/is-lake-mary-worth-the-premium).",
          },
        ],
      },
      {
        heading: "The money question, either side",
        blocks: [
          {
            kind: "p",
            text: "On the historic side, the rehab number decides everything and it is knowable before you close. Get a contractor through the house during the inspection period, not a handyman opinion, and price the four things that carry the budget: electrical service and panel, plumbing supply and drain material, roof and structure, and whether the heating and cooling can be run without cutting the house apart.",
          },
          {
            kind: "p",
            text: "On the newer side, the numbers that move are the ones on the tax bill. Check for a CDD assessment, check the HOA budget, and get a real insurance quote on the address. None of the three shows up in a listing summary and all three change what the house costs to own.",
          },
        ],
      },
    ],
  },

  "moving-to-central-florida-where-to-live": {
    updated: "2026-09-30",
    shortAnswer:
      "Work out where you need to be three days a week first, because commutes here decide everything else. Then check insurance, roof age and whether the house is block or frame before you commit — those three price a house more than the listing does.",
    sections: [
      {
        heading: "Start with the commute, not the house",
        blocks: [
          {
            kind: "list",
            items: [
              "Downtown Orlando job — Winter Park, College Park, Baldwin Park.",
              "Lake Nona or the medical city cluster — Lake Nona or St. Cloud.",
              "I-4 corridor employers — [Lake Mary](/lake-mary), Heathrow, [Longwood](/longwood) or [Sanford](/sanford). That corridor is where I live and work.",
            ],
          },
          {
            kind: "p",
            text: "Seminole County is the usual landing spot for families because of the school district. That is a real reason rather than a slogan, and it is priced in.",
          },
        ],
      },
      {
        heading: "What transplants underestimate",
        blocks: [
          {
            kind: "list",
            items: [
              "Insurance. Get a quote on the specific address before you go under contract, not after. Roof age and plumbing material can make an affordable house unaffordable.",
              "Roof age. A shingle roof has a shorter working life here than the one you are used to further north.",
              "Block against frame. Both are code-legal and both work, and they behave differently on insurance and on renovation: [the comparison](/answers/new-construction-and-building/block-vs-wood-frame-florida).",
            ],
          },
        ],
      },
      {
        heading: "Neighbourhoods change in two miles",
        blocks: [
          {
            kind: "p",
            text: "This is the most useful thing I can tell someone arriving from another state. Two streets can differ by a decade of construction, a school boundary and a flood zone. Renting for six months is not wasted money if it stops you buying the right house in the wrong two miles.",
          },
          {
            kind: "p",
            text: "Use that time to drive your actual commute at the actual hour, and to sit in a school pick-up line if you have children.",
          },
        ],
      },
      {
        heading: "A sensible order of operations",
        blocks: [
          {
            kind: "steps",
            items: [
              "Fix the commute constraint and shortlist two or three areas.",
              "Get an insurance quote on a representative address in each.",
              "Tour with someone who can tell you the repair exposure, not only the comparable sales.",
              "Check permits and roof documentation before the inspection period runs out.",
            ],
          },
          {
            kind: "p",
            text: "If new construction is on your list, read [whether you need your own agent for it](/answers/buying-and-selling/own-agent-for-new-construction) first: the answer changes what you do on your first model-home visit. Or [tell me what you are trying to do](/contact) and I will tell you where I would look.",
          },
        ],
      },
      {
        heading: "Three things that surprise people in the first year",
        blocks: [
          {
            kind: "list",
            items: [
              "The wet season. Afternoon storms from roughly June to September are daily rather than occasional, which is why drainage and grading matter more here than the house tour suggests.",
              "Cooling costs. The air conditioning runs most of the year, so duct condition and attic insulation show up on the bill rather than in the inspection report.",
              "Lawn watering rules. Irrigation days are restricted locally, and an established Florida lawn needs a working system rather than good intentions.",
            ],
          },
          {
            kind: "p",
            text: "None of these change where you should live. They change which house on the shortlist is the sensible one, which is a different question and the one I am usually more useful on.",
          },
        ],
      },
    ],
  },

  "own-agent-for-new-construction": {
    updated: "2026-09-30",
    shortAnswer:
      "Yes, and bring them to the very first visit. Most builders will not let an agent be added after you have signed in without representation, and the two things your agent earns are reading the builder addendum and getting independent inspections at pre-drywall and before closing.",
    sections: [
      {
        heading: "Why the first visit decides it",
        blocks: [
          {
            kind: "p",
            text: "Builder sales representatives are pleasant, knowledgeable people employed by the builder. Their job is the builder interest, which is not a criticism but an arrangement. The moment you sign in at the sales office without representation, most builders will not permit an agent to be added to that transaction later.",
          },
          {
            kind: "p",
            text: "So the registration question is settled before you walk through the door of the first model home, not after you have chosen a lot.",
          },
        ],
      },
      {
        heading: "The builder addendum is not a resale contract",
        blocks: [
          {
            kind: "p",
            text: "This is where most of the value sits. A builder contract is drafted by the builder and typically narrows or removes the remedies a standard resale contract gives you: inspection rights, delay remedies, what happens to your deposit, how change orders are priced, and what the warranty actually covers.",
          },
          {
            kind: "p",
            text: "Read it before the deposit, not after. Ask specifically what happens if completion slips by three months and whether your rate lock survives it.",
          },
        ],
      },
      {
        heading: "Inspect twice, not once",
        blocks: [
          {
            kind: "steps",
            items: [
              "Pre-drywall. The walls are open and the expensive things are visible: framing, strapping and tie-downs, plumbing and electrical rough-in, window flashing, duct runs.",
              "Before closing. Finishes, doors and windows operating correctly, grading and drainage away from the house, and everything on the punch list actually done.",
            ],
          },
          {
            kind: "p",
            text: "I do those walks myself, because I hold a residential contractor licence as well as a real-estate one. Pre-drywall is the one people skip and the one that matters most. Then diarise the [eleven-month warranty walk](/answers/new-construction-and-building/eleven-month-warranty-list), which is a separate exercise with its own deadline.",
          },
        ],
      },
      {
        heading: "Incentives usually live in the lender, not the price",
        blocks: [
          {
            kind: "p",
            text: "When a builder advertises a large incentive it is commonly tied to using their affiliated lender and title company. Ask what the cash price is without their lender, then compare the total cost of both routes rather than the headline credit. Sometimes the builder package genuinely wins; you cannot know until you have both numbers.",
          },
          {
            kind: "p",
            text: "If you would rather build on your own lot than buy builder inventory, the earlier question is [what to check before buying the lot](/answers/new-construction-and-building/what-to-check-before-buying-a-lot), and [the contractor side](/hire-contractor) explains how I run that.",
          },
        ],
      },
      {
        heading: "What to do at the first visit",
        blocks: [
          {
            kind: "steps",
            items: [
              "Register your agent on the sign-in sheet, or have them with you. This is the whole of it, and it cannot be undone later.",
              "Ask for the current price sheet and the lot premium list rather than the monthly payment.",
              "Ask what is standard and what is an option, in writing. Model homes are built with the option list.",
              "Ask for the builder contract and the warranty document to take away and read.",
            ],
          },
          {
            kind: "p",
            text: "A sales office will happily give you all four. What they will not do is tell you which options are worth the money at resale, or which upgrades are cheaper to do after closing with your own contractor — which is the conversation I am there for.",
          },
        ],
      },
    ],
  },

  "sell-now-or-wait": {
    updated: "2026-09-30",
    shortAnswer:
      "Nobody can time it for you, but you can make the question smaller: pull what your subdivision actually closed at in the last 90 days, what you owe, and your rate. On a sub-4% mortgage with an optional move, the arithmetic usually says stay.",
    sections: [
      {
        heading: "Three numbers, then decide",
        blocks: [
          {
            kind: "steps",
            items: [
              "What comparable houses in your subdivision closed at in the last 90 days. Closed, not listed — list prices are opinions.",
              "What you owe today, including any second mortgage or line of credit.",
              "Your rate, and what a replacement mortgage would cost on the house you would buy.",
            ],
          },
          {
            kind: "p",
            text: "Those three turn a mood into an arithmetic problem. I will pull the first for your street if you [ask](/contact); it takes a few minutes and it is the number most people are guessing at.",
          },
        ],
      },
      {
        heading: "If the move is optional",
        blocks: [
          {
            kind: "p",
            text: "A sub-4% mortgage is an asset. Giving it up to buy a similar house at today rates is a large, permanent increase in your monthly cost for a lateral move. Unless the house no longer fits your life, the arithmetic usually says stay and spend some of the difference making the house work — which is a conversation I can price, because I build as well as sell.",
          },
        ],
      },
      {
        heading: "If you are moving regardless",
        blocks: [
          {
            kind: "p",
            text: "Then the market you sell into and the one you buy into largely cancel out. A softer market costs you on the sale and pays you back on the purchase. The real variable is your carrying cost while the house sits: mortgage, insurance, taxes and utilities on an empty property, plus any contingency you have to accept.",
          },
        ],
      },
      {
        heading: "The silent discount sellers forget",
        blocks: [
          {
            kind: "p",
            text: "Roof age and HVAC age are pricing your house now, because they price the buyer insurance. A buyer who cannot get an affordable quote does not negotiate, they withdraw. That is the biggest quiet discount I see, and it is often cheaper to address than to absorb.",
          },
          {
            kind: "p",
            text: "Before you list, work through [what is actually worth fixing](/answers/buying-and-selling/what-to-fix-before-selling) and, for a bigger project, [which renovations add value](/answers/buying-and-selling/which-renovations-add-value). The full sequence is on the [seller guide](/sell-your-central-florida-home).",
          },
        ],
      },
      {
        heading: "If you decide to wait",
        blocks: [
          {
            kind: "p",
            text: "Waiting is a decision rather than a pause, so use the time. The work that shortens a future listing is the work that would otherwise become a buyer objection: the roof if it is near the end, the exterior paint, the drainage at the foundation, and anything with an open permit against it.",
          },
          {
            kind: "p",
            text: "Keep the paperwork as you go. A closed permit, a wind mitigation report after a re-roof and the insurance declaration page are three documents that shorten negotiation later, and they cost nothing to keep in a folder.",
          },
        ],
      },
    ],
  },

  "appraisal-came-in-low-options": {
    updated: "2026-09-30",
    shortAnswer:
      "Four real options: the seller drops to the appraised value, you bring the gap in cash, you split it, or you walk on an intact appraisal contingency. A rebuttal is worth filing properly, with closed comparables the appraiser missed and any permitted work that was not credited.",
    sections: [
      {
        heading: "The four real options",
        blocks: [
          {
            kind: "list",
            items: [
              "The seller reduces the price to the appraised value.",
              "You bring the difference in cash, on top of your down payment.",
              "You split it, which is the most common outcome when both sides want the deal.",
              "You terminate, if your appraisal contingency is intact and inside its deadline.",
            ],
          },
          {
            kind: "p",
            text: "The option people ask for and cannot have is a second appraisal on the same loan. That is generally unavailable without going through the lender reconsideration process first.",
          },
        ],
      },
      {
        heading: "How to file a rebuttal worth reading",
        blocks: [
          {
            kind: "steps",
            items: [
              "Send three closed comparable sales the appraiser did not use, with their closing dates. Active listings do not count.",
              "List any permitted work that was not credited, with the permit numbers.",
              "Note measurable differences the report missed: heated square footage, a properly converted garage, a re-roof, an addition.",
            ],
          },
          {
            kind: "p",
            text: "Keep it factual and short. An appraiser will look at data and will not respond to disappointment.",
          },
        ],
      },
      {
        heading: "Permitted work is where value hides",
        blocks: [
          {
            kind: "p",
            text: "Roughly half the low appraisals I see are missing permitted square footage. Permitted additions and a permitted re-roof carry value; unpermitted ones carry none and can cost you on insurance as well.",
          },
          {
            kind: "p",
            text: "That is why I tell sellers to pull the permit history before listing rather than discovering it inside someone else appraisal. If something was done without a permit, read [which renovations need a permit](/answers/new-construction-and-building/which-renovations-need-a-permit) — after-the-fact permitting is usually less painful than people expect.",
          },
        ],
      },
      {
        heading: "If you are the buyer",
        blocks: [
          {
            kind: "p",
            text: "Decide what the house is worth to you before you negotiate, not during. An appraisal is one opinion on one day; your risk is paying above the market and then needing to move in three years. On a VA loan the low-appraisal path has its own rules, and the neighbouring question is [whether a VA offer gets rejected here](/answers/buying-and-selling/va-offer-rejected-florida).",
          },
        ],
      },
      {
        heading: "Why appraisals come in low here",
        blocks: [
          {
            kind: "list",
            items: [
              "Comparable sales that closed before the most recent movement in the market, which is normal in a thin subdivision.",
              "Heated square footage measured differently from the tax roll, usually around a converted garage or an enclosed lanai.",
              "Condition adjustments for a roof or an air-conditioning system at the end of its life.",
              "Unpermitted work, which is credited at nothing.",
            ],
          },
          {
            kind: "p",
            text: "Three of those four are answerable with documents. That is why the rebuttal is worth the hour: you are not arguing about opinion, you are supplying the records the report was missing.",
          },
        ],
      },
    ],
  },

  "va-offer-rejected-florida": {
    updated: "2026-09-30",
    shortAnswer:
      "Not if it is presented properly. A listing agent cares about two things — whether the buyer is solid and whether the property will pass VA Minimum Property Requirements. Pre-empt both and most of the resistance disappears.",
    sections: [
      {
        heading: "The objection is about the property, not the loan",
        blocks: [
          {
            kind: "p",
            text: "Most resistance to VA offers in this market is inherited myth. What a listing agent actually fears is a deal that dies late: an appraisal that flags repairs the seller will not make, or a buyer whose financing is thinner than the pre-approval suggests.",
          },
        ],
      },
      {
        heading: "Make the buyer look as solid as they are",
        blocks: [
          {
            kind: "p",
            text: "Have your lender telephone the listing agent rather than emailing a pre-approval letter. A two-minute call from a lender who can explain the file does more than any wording in the offer. Keep the timelines tight and realistic, and be specific about what you will and will not ask for.",
          },
        ],
      },
      {
        heading: "Walk the house for the obvious MPR failures first",
        blocks: [
          {
            kind: "list",
            items: [
              "Peeling paint on a pre-1978 house.",
              "Exposed wiring or open junction boxes.",
              "An active roof leak, or a roof with little remaining life.",
              "Broken windows, non-working HVAC, wood rot at the sills.",
              "In Florida, add standing water against the foundation and an unpermitted enclosure.",
            ],
          },
          {
            kind: "p",
            text: "I do this walk with buyers before we write, because I read a house as a builder as well as an agent. Anything found can often be handled with a fix-before-close credit negotiated up front instead of fought over after the appraisal.",
          },
        ],
      },
      {
        heading: "What to send with the offer",
        blocks: [
          {
            kind: "steps",
            items: [
              "A lender letter that names the loan type, states the file has been reviewed, and carries the lender direct number.",
              "A short note that the buyer has already viewed the property against MPR conditions.",
              "Clean, realistic dates. A VA transaction is not slower than any other when the file is ready.",
            ],
          },
          {
            kind: "p",
            text: "Entitlement, the funding fee and what fails a VA appraisal in this climate are covered in the [VA home-buyer guide](/guides/va-home-buyer). If a low appraisal does arrive, [here are the options](/answers/buying-and-selling/appraisal-came-in-low-options).",
          },
        ],
      },
      {
        heading: "What the seller is actually being asked to accept",
        blocks: [
          {
            kind: "p",
            text: "Two things, and it helps to name them. The appraisal will include a condition review against Minimum Property Requirements, and the buyer cannot be charged certain fees, which the contract has to reflect.",
          },
          {
            kind: "p",
            text: "Neither is unusual and both are routine for an agent who has done a few. The offers that get rejected are the ones that leave the listing agent to guess at both, because guessing is where a deal feels risky.",
          },
          {
            kind: "list",
            items: [
              "Name the loan type in the offer rather than burying it in an addendum.",
              "State who pays what, explicitly.",
              "Give realistic appraisal and closing dates rather than optimistic ones.",
            ],
          },
        ],
      },
    ],
  },

  "assumable-mortgage-realistic": {
    updated: "2026-09-30",
    shortAnswer:
      "It is real, and the constraint is the equity gap rather than the process. VA and FHA loans are assumable, conventional generally is not, and you owe the seller their equity — so it pencils best on houses bought in 2020 and 2021 that have not built much of it yet.",
    sections: [
      {
        heading: "What you are actually taking over",
        blocks: [
          {
            kind: "p",
            text: "An assumption transfers the existing loan, with its rate and remaining term, to you. What it does not transfer is the seller equity. You owe that in cash or through a second loan, and on a house that has appreciated substantially the gap is the whole problem.",
          },
          {
            kind: "p",
            text: "VA and FHA loans are assumable. Conventional loans generally are not. That single fact removes most listings before you start.",
          },
        ],
      },
      {
        heading: "Where it genuinely pencils",
        blocks: [
          {
            kind: "list",
            items: [
              "Newer houses bought in 2020 and 2021 at rates around 2.75% to 3.25%, where the owner has not built much equity.",
              "Sellers who are not in a hurry, because servicers are slow: 60 to 120 days is common.",
              "Buyers with cash for the gap, or a lender willing to write a second behind the assumed loan.",
            ],
          },
        ],
      },
      {
        heading: "Questions to ask before you get excited",
        blocks: [
          {
            kind: "steps",
            items: [
              "Who is the servicer? Their assumption department sets the real timeline.",
              "What is the current payoff, and what is the asking price? The difference is your gap.",
              "Is the loan VA, and if so is the seller entitlement being substituted or left in place? That matters enormously to the seller and can stop the deal.",
              "Does the listing agent understand assumption timelines? Many do not, and the contract dates will show it.",
            ],
          },
        ],
      },
      {
        heading: "Running one properly",
        blocks: [
          {
            kind: "p",
            text: "We do run these. They need a patient seller, a contract with realistic dates, and someone chasing the servicer weekly, because assumptions do not progress on their own. Build the delay into the offer rather than discovering it in week eight.",
          },
          {
            kind: "p",
            text: "The full mechanics, including how the equity gap gets financed, are on the [assumable mortgage page](/assumable-mortgage-homes). If the rate is what you are chasing, it is worth reading [sell now or wait](/answers/buying-and-selling/sell-now-or-wait) from the other side of the same market.",
          },
        ],
      },
      {
        heading: "What the process actually looks like",
        blocks: [
          {
            kind: "steps",
            items: [
              "Confirm the loan type and get the servicer name from the seller.",
              "Request the assumption package from the servicer and find out what they require and how long they say it takes.",
              "Qualify with the servicer, which is an underwriting process of its own.",
              "Arrange the equity gap, in cash or with a second loan.",
              "Set contract dates from the servicer timeline rather than from a normal purchase timeline.",
            ],
          },
          {
            kind: "p",
            text: "The step people skip is the second one. Everything after it depends on what that department says, and it is the only way to know whether the deal is a sixty-day one or a four-month one.",
          },
        ],
      },
    ],
  },

  "what-to-fix-before-selling": {
    updated: "2026-09-30",
    shortAnswer:
      "A short list: neutral paint, a deep clean, landscaping and pressure washing, and anything that will show up on an inspection and frighten a buyer. In Florida, add the roof and HVAC conversation, because those price the buyer insurance.",
    sections: [
      {
        heading: "The list that earns its money",
        blocks: [
          {
            kind: "list",
            items: [
              "Paint inside, in a neutral colour. It is the cheapest visual change there is.",
              "A deep clean that includes grout, windows and the inside of the oven. Buyers read cleanliness as maintenance.",
              "Landscaping and pressure washing. The driveway, the walk and the roof edge change the first photograph.",
              "Anything that will appear on an inspection report and spook someone: an active leak, a dead outlet circuit, a broken garage door opener, rotted trim.",
            ],
          },
        ],
      },
      {
        heading: "The Florida additions",
        blocks: [
          {
            kind: "p",
            text: "Roof age and HVAC age drive the buyer insurance quote, and an uninsurable house is a dead listing. If the roof is near the end of its life you have a choice: replace it and price accordingly, or price it in and expect every offer to reflect it. What you cannot do is ignore it and hope.",
          },
          {
            kind: "p",
            text: "If the roof is being replaced anyway, pay for the deck re-nail and the sealed deck while the crew is there. It is a small adder that earns wind-mitigation credit for the next owner, which is a selling point: [retrofits that lower a Florida insurance bill](/answers/inspections-and-insurance/retrofits-that-lower-florida-insurance).",
          },
        ],
      },
      {
        heading: "What is usually not worth it",
        blocks: [
          {
            kind: "list",
            items: [
              "A full kitchen remodel immediately before listing. You rarely recover it and you delay the listing.",
              "A bathroom gut, for the same reason.",
              "New flooring throughout, unless what is there is damaged rather than dated.",
            ],
          },
          {
            kind: "p",
            text: "Buyers discount a dated kitchen far less than they discount a frightening inspection report. If you are weighing a larger project on its merits rather than for the sale, read [which renovations add value](/answers/buying-and-selling/which-renovations-add-value).",
          },
        ],
      },
      {
        heading: "How I price it",
        blocks: [
          {
            kind: "p",
            text: "Holding both licences means I can price the repair and the after-value in the same conversation, which is the only way this question gets a real answer. The full pre-sale sequence is on the [seller guide](/sell-your-central-florida-home).",
          },
        ],
      },
      {
        heading: "The order to do it in",
        blocks: [
          {
            kind: "steps",
            items: [
              "Anything that leaks, sparks or does not work. These become inspection items and inspection items become price reductions.",
              "Exterior: pressure wash, tidy the landscaping, touch up the front door and the garage door.",
              "Interior: paint neutral, deep clean, replace anything visibly broken.",
              "Then, and only then, cosmetic updates if there is budget left.",
            ],
          },
          {
            kind: "p",
            text: "Photographs are taken after all four, not between two and three. The listing goes live once, and the first week decides how the rest of it goes.",
          },
        ],
      },
    ],
  },

  "which-renovations-add-value": {
    updated: "2026-09-30",
    shortAnswer:
      "The ones that fix a functional deficiency: a second full bathroom in a one-bath house, a bedroom where the layout allows, a roof or HVAC at end of life, or legalising unpermitted square footage. Upgrading something already adequate returns the least.",
    sections: [
      {
        heading: "Deficiency beats decoration",
        blocks: [
          {
            kind: "p",
            text: "Value follows function. A house that cannot meet a buyer basic requirement is discounted by everyone who sees it; a house with a dated but working kitchen is discounted by some. So the renovations that move the number are the ones that remove a deficiency.",
          },
          {
            kind: "list",
            items: [
              "Adding a second full bathroom to a one-bath house. The highest-return change in most older stock, because it moves the house into a different buyer pool.",
              "Adding a bedroom where the layout genuinely allows it, without stealing the dining room.",
              "Replacing a roof or HVAC system at end of life, because both price the buyer insurance.",
              "Legalising unpermitted square footage so an appraiser can count it.",
            ],
          },
        ],
      },
      {
        heading: "What partially returns",
        blocks: [
          {
            kind: "p",
            text: "Kitchens and bathrooms return part of their cost — more if the existing one was genuinely dated, much less if it was merely not to your taste. The same money spent on a functional fix usually returns more.",
          },
          {
            kind: "p",
            text: "Almost nothing returns above its cost except your own labour and correcting something broken. Treat any claim otherwise with suspicion.",
          },
        ],
      },
      {
        heading: "The neighbourhood ceiling",
        blocks: [
          {
            kind: "p",
            text: "Every street has a price ceiling, and work that pushes a house above it returns close to nothing. A grand primary suite in a modest neighbourhood is a lifestyle decision rather than an investment, and that is fine as long as you know which one you are making: [is a primary suite addition worth it](/answers/additions-and-conversions/is-a-primary-suite-addition-worth-it).",
          },
        ],
      },
      {
        heading: "Pricing the build and the after-value together",
        blocks: [
          {
            kind: "p",
            text: "This is where holding both licences changes the answer: the construction cost and the resale value get priced in one conversation instead of a builder number and an agent guess that never quite meet. Selling soon? The shorter list is [what is worth fixing before you list](/answers/buying-and-selling/what-to-fix-before-selling). Staying? [The contractor side](/hire-contractor) explains how the work is run.",
          },
        ],
      },
      {
        heading: "How to tell a deficiency from a preference",
        blocks: [
          {
            kind: "p",
            text: "A deficiency is something a buyer cannot live with: one bathroom, no garage where every neighbour has one, a bedroom you have to walk through to reach another, an unusable kitchen layout. A preference is something a buyer would change eventually: the tile, the paint, the light fittings.",
          },
          {
            kind: "p",
            text: "Money spent on a deficiency changes who will buy the house. Money spent on a preference changes how quickly it sells, sometimes, and by less than the work cost. That single distinction answers most of these questions before any numbers are involved.",
          },
        ],
      },
    ],
  },
};
