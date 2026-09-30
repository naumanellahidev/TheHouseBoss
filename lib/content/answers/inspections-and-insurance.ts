import type { AnswerBody } from "@/lib/content/answers";

/** Published copy for the inspections-and-insurance answers (docs/18 § 3). */
export const inspectionsAndInsurance: Record<string, AnswerBody> = {
  "inspection-report-many-items-should-i-walk": {
    updated: "2026-09-30",
    shortAnswer:
      "Forty items is a normal report, not a bad house — inspectors list everything, including missing outlet covers. Sort them into three buckets: structure and water, systems with a date on them, and safety. Everything else is a Saturday.",
    sections: [
      {
        heading: "Why the number itself means nothing",
        blocks: [
          {
            kind: "p",
            text: "An inspector is paid to notice, and a good one notices everything. A forty-item report on a well-kept 1990s house and a forty-item report on a neglected one look identical in length and are nothing alike in content. Read the items, not the count.",
          },
        ],
      },
      {
        heading: "Bucket one: structure and water",
        blocks: [
          {
            kind: "p",
            text: "These are the ones worth walking away over, or renegotiating hard on.",
          },
          {
            kind: "list",
            items: [
              "Foundation movement, particularly where it shows in the slab and the wall finishes at the same time.",
              "Roof condition and roof age, which in Florida is also an insurance question.",
              "Active leaks anywhere, including around windows and at plumbing penetrations.",
              "Grading that sends water towards the house rather than away from it.",
            ],
          },
        ],
      },
      {
        heading: "Bucket two: systems with a date on them",
        blocks: [
          {
            kind: "p",
            text: "These are not defects so much as a schedule of future spending, and they are the ones people misjudge. Ask for the age of each and work out what is due in the first three years.",
          },
          {
            kind: "list",
            items: [
              "Roof, HVAC and water heater.",
              "The electrical panel, including the brand — some older panels are effectively uninsurable.",
              "In Florida, the plumbing material. Polybutylene supply lines change both the repair plan and the insurance quote.",
            ],
          },
        ],
      },
      {
        heading: "Bucket three: safety, then the Saturday list",
        blocks: [
          {
            kind: "p",
            text: "Double-tapped breakers, missing GFCI protection where it is required, and anything involving gas belong in the safety bucket and are usually inexpensive to correct. Everything left after those three buckets — loose handles, a sticking door, missing outlet covers — is a Saturday with a screwdriver, and arguing about it costs you leverage on the items that matter.",
          },
        ],
      },
      {
        heading: "Ask for money, not repairs",
        blocks: [
          {
            kind: "p",
            text: "A seller under time pressure hires the cheapest available person, and you inherit that work. A credit lets you choose the contractor and the specification. It also keeps the closing date intact, which is usually worth more to both sides than the repair itself.",
          },
          {
            kind: "p",
            text: "I read these reports as a builder first, which changes what I tell buyers to fight for. If the report raises the roof, the next step is [how to judge roof replacement quotes](/answers/inspections-and-insurance/how-to-compare-roof-replacement-quotes); if it raises insurance, read [when to get a Florida insurance quote](/answers/inspections-and-insurance/when-to-get-a-florida-insurance-quote). For the repair side of it, that is what [my contractor licence](/hire-contractor) is for.",
          },
        ],
      },
      {
        heading: "What to do with the report in the next 48 hours",
        blocks: [
          {
            kind: "steps",
            items: [
              "Read the summary, then read the body. The summary is what the inspector thought was notable; the body is where the dates and the ages are.",
              "Mark every item with a cost that starts in four figures. That is your negotiation list.",
              "Get one real quote for the largest item rather than three guesses. A written quote is what moves a seller.",
              "Send the request as a credit with the quote attached, inside the inspection period.",
            ],
          },
          {
            kind: "p",
            text: "Sellers respond to evidence and deadlines. A list of forty items with no numbers reads as a renegotiation attempt; one quote for a roof with a date on it reads as a fact.",
          },
        ],
      },
    ],
  },

  "four-point-and-wind-mitigation-explained": {
    updated: "2026-09-30",
    shortAnswer:
      "They are two different Florida reports and both affect your premium. The 4-point covers roof, electrical, plumbing and HVAC and is usually required once a house is around 30 years old. The wind mitigation is the one that saves you money.",
    sections: [
      {
        heading: "The 4-point: can this house be insured at all",
        blocks: [
          {
            kind: "p",
            text: "The 4-point inspection looks at four systems — roof, electrical, plumbing and HVAC — and most carriers ask for one once a house reaches roughly thirty years old. It is close to pass or fail in practice.",
          },
          {
            kind: "list",
            items: [
              "An old roof with little remaining life.",
              "A Federal Pacific or Zinsco electrical panel.",
              "Polybutylene supply lines.",
              "Cloth wiring.",
            ],
          },
          {
            kind: "p",
            text: "Any of those can make a house uninsurable at ordinary rates, which is a pricing problem long before it is a repair problem.",
          },
        ],
      },
      {
        heading: "The wind mitigation: what actually lowers the bill",
        blocks: [
          {
            kind: "p",
            text: "This is the report that pays for itself. It documents the features that decide how a house behaves in a windstorm, and each one is credited separately.",
          },
          {
            kind: "list",
            items: [
              "Roof shape, because a hip roof performs differently from a gable.",
              "Roof deck attachment — the nail size and spacing holding the deck down.",
              "Roof-to-wall connections: toe-nails, clips or straps, in ascending order of credit.",
              "Opening protection, meaning impact glass or shutters, on every opening including the garage door.",
            ],
          },
          {
            kind: "p",
            text: "Hip roof plus straps plus impact glass is a meaningful discount. I have seen this swing premiums by thousands in Seminole County.",
          },
        ],
      },
      {
        heading: "Get the wind mitigation even if nobody asks",
        blocks: [
          {
            kind: "p",
            text: "Carriers do not chase you to reduce your own premium. If your house already has clips or straps and current-code openings and nobody has documented it, you are paying for protection you have. The report is inexpensive and lasts several years.",
          },
          {
            kind: "steps",
            items: [
              "Order the wind mitigation before your renewal, not after.",
              "Give the completed form to your agent and ask for the premium to be re-rated.",
              "Repeat it after any roof work, because a re-roof can change three of the four credited items at once.",
            ],
          },
        ],
      },
      {
        heading: "If the reports come back badly",
        blocks: [
          {
            kind: "p",
            text: "Most of what fails is fixable, and some of it is cheap during work you are doing anyway. The order of impact is in [retrofits that lower a Florida insurance bill](/answers/inspections-and-insurance/retrofits-that-lower-florida-insurance), and if the roof is the problem, [how to compare roof quotes](/answers/inspections-and-insurance/how-to-compare-roof-replacement-quotes) covers what to insist on.",
          },
        ],
      },
      {
        heading: "Who orders them, and when",
        blocks: [
          {
            kind: "p",
            text: "A buyer usually orders both during the inspection period, and an owner orders the wind mitigation whenever a renewal is coming or work has been done to the roof. They are separate appointments from the home inspection and they are inexpensive next to what they decide.",
          },
          {
            kind: "list",
            items: [
              "The 4-point is required by the carrier, so ask your agent which form they accept before you book.",
              "The wind mitigation form is standard statewide, which is why the same report works across carriers when you shop.",
              "Keep both in a folder with the permits. They are the documents that shorten every future insurance conversation.",
            ],
          },
        ],
      },
    ],
  },

  "retrofits-that-lower-florida-insurance": {
    updated: "2026-09-30",
    shortAnswer:
      "In rough order of impact: roof-to-wall connections, roof deck attachment, a secondary water barrier, opening protection on every opening including the garage door, and roof shape, which you cannot change but which is credited.",
    sections: [
      {
        heading: "The order that matters",
        blocks: [
          {
            kind: "p",
            text: "Every credit on the wind mitigation form is not worth the same amount of money or the same amount of disruption. This is the order I would spend in.",
          },
          {
            kind: "steps",
            items: [
              "Roof-to-wall connections. Moving from toe-nails to clips, and from clips to straps, is a significant step each time.",
              "Roof deck attachment. Nail size and spacing, or a re-nail carried out during a re-roof.",
              "A secondary water barrier, also called a sealed roof deck.",
              "Opening protection on every opening, the garage door included.",
              "Roof shape. You cannot change it without rebuilding, but it is credited, so make sure the report records it correctly.",
            ],
          },
        ],
      },
      {
        heading: "The cheapest real win",
        blocks: [
          {
            kind: "p",
            text: "When you re-roof, pay for the deck re-nail and the sealed deck. Both are small additions to a job you are already paying for, the crew is already there, and both are credited for years afterwards. Skipping them to save a few hundred is the most common expensive decision I see on a roof contract.",
          },
          {
            kind: "p",
            text: "Ask for them to be itemised on the quote so you can see what you are buying, and make sure the permit and the final inspection are in the contractor name.",
          },
        ],
      },
      {
        heading: "Opening protection is all or nothing",
        blocks: [
          {
            kind: "p",
            text: "Partial protection earns very little. The credit largely wants every opening protected, and the garage door is the biggest and weakest opening on most houses. Protecting the windows and leaving the garage door untouched is a common and expensive mistake.",
          },
          {
            kind: "p",
            text: "Whether impact glass is worth it on its own is a different question: [are impact windows worth the money](/answers/exterior-and-florida-climate/are-impact-windows-worth-it-florida).",
          },
        ],
      },
      {
        heading: "Then go and collect the discount",
        blocks: [
          {
            kind: "p",
            text: "None of this reduces a premium until it is documented. Get a wind mitigation inspection after the work is finished and hand the form to your agent. People leave this money on the table constantly — the work is done, the paperwork is not.",
          },
          {
            kind: "p",
            text: "If you are not sure which report is which, start with [the 4-point and wind mitigation explained](/answers/inspections-and-insurance/four-point-and-wind-mitigation-explained).",
          },
        ],
      },
      {
        heading: "What this looks like as a plan",
        blocks: [
          {
            kind: "p",
            text: "Most houses do not need all of it at once, and the sensible version is to attach the work to jobs already happening rather than treating it as a separate project.",
          },
          {
            kind: "steps",
            items: [
              "At the next re-roof: deck re-nail, secondary water barrier, and ask whether roof-to-wall connections can be improved while the deck is open.",
              "At the next window replacement: current-code openings, and the garage door in the same phase rather than later.",
              "Then order a wind mitigation inspection and hand the form to your agent.",
              "Keep the closed permits. A carrier asking for proof two years later is routine.",
            ],
          },
        ],
      },
    ],
  },

  "how-to-compare-roof-replacement-quotes": {
    updated: "2026-09-30",
    shortAnswer:
      "Compare on the parts nobody itemises: deck re-nailing, replacement of bad sheathing at a stated price per sheet, a secondary water barrier, new drip edge, valley metal and pipe boots, and whose name the permit is in. The cheapest bid has usually skipped two of those.",
    sections: [
      {
        heading: "What to ask every bidder for",
        blocks: [
          {
            kind: "list",
            items: [
              "The shingle line and the warranty that comes with it, in writing.",
              "Whether the deck is being re-nailed to current code, and whether bad sheathing is replaced at a stated price per sheet.",
              "Whether a secondary water barrier or self-adhered underlayment is included.",
              "New drip edge and valley metal, or reuse of the existing.",
              "New pipe boots, and how the ridge vent is handled.",
              "Whether the permit is pulled in their name, and whether they carry workers compensation rather than an exemption.",
            ],
          },
        ],
      },
      {
        heading: "Why the cheapest bid is cheapest",
        blocks: [
          {
            kind: "p",
            text: "It is rarely the shingle. The savings almost always come from the deck re-nail and the secondary water barrier — which are exactly the two items that earn you insurance credit afterwards. A roof that costs less and insures worse is not a saving.",
          },
          {
            kind: "p",
            text: "The second common gap is sheathing. If bad sheathing is not priced per sheet in the contract, it becomes a change order on the day, at whatever rate is convenient.",
          },
        ],
      },
      {
        heading: "The paperwork is part of the job",
        blocks: [
          {
            kind: "steps",
            items: [
              "Permit pulled in the contractor name, not yours. A homeowner permit moves the liability onto you.",
              "Insurance certificate confirmed with the agent named on it, not accepted as a PDF.",
              "Final inspection passed, and a copy of the closed permit for your file.",
              "A wind mitigation inspection afterwards, so the new roof actually reduces your premium.",
            ],
          },
        ],
      },
      {
        heading: "One more thing while the crew is there",
        blocks: [
          {
            kind: "p",
            text: "Ask what else is being touched: attic ventilation, the condition of the boots, whether the gutters come off and go back. A roof is the one time those are easy, and the incremental cost is small compared with a second mobilisation later.",
          },
          {
            kind: "p",
            text: "The related questions are [which retrofits lower the bill](/answers/inspections-and-insurance/retrofits-that-lower-florida-insurance) and, if you are buying rather than owning, [when to get a Florida insurance quote](/answers/inspections-and-insurance/when-to-get-a-florida-insurance-quote). If you would rather have someone run the roof job for you, that is [what the contractor side does](/hire-contractor).",
          },
        ],
      },
      {
        heading: "Timing, and what a storm season does to it",
        blocks: [
          {
            kind: "p",
            text: "Roofing capacity here is seasonal and event-driven. After a significant storm the good crews are booked and the pricing reflects it, which is the worst moment to be choosing between three quotes for a roof that was already overdue.",
          },
          {
            kind: "p",
            text: "If the roof is at the end of its life, plan it rather than react to it. It is also the only way to get the insurance-credit items done properly, because a crew working through a backlog will not stop to re-nail a deck that nobody put in writing.",
          },
        ],
      },
    ],
  },

  "when-to-get-a-florida-insurance-quote": {
    updated: "2026-09-30",
    shortAnswer:
      "Before you are in love with the house, and ideally before you write the offer. In Florida the insurability of a house is part of its price, and a house you cannot insure affordably is a house you cannot buy.",
    sections: [
      {
        heading: "What to have in hand before you call",
        blocks: [
          {
            kind: "list",
            items: [
              "Roof age and roof material.",
              "Year built.",
              "Plumbing material.",
              "The electrical panel brand.",
              "Any wind mitigation report the seller already holds.",
            ],
          },
          {
            kind: "p",
            text: "With those five, an independent agent can give you a real number rather than an online estimate. The estimate is the problem: it is generated without the details that decide the price.",
          },
        ],
      },
      {
        heading: "The deal-breakers to watch",
        blocks: [
          {
            kind: "list",
            items: [
              "A shingle roof over roughly fifteen years old.",
              "Polybutylene supply lines.",
              "Federal Pacific or Zinsco electrical panels.",
              "Cloth wiring.",
              "An unpermitted addition, which some carriers will not cover and some will not pay a claim on.",
            ],
          },
          {
            kind: "p",
            text: "Any one of those can turn a perfectly nice house into a surprise two weeks before closing, when your options have narrowed to paying more or walking away.",
          },
        ],
      },
      {
        heading: "Where it fits in the timeline",
        blocks: [
          {
            kind: "steps",
            items: [
              "Before the offer, if the listing shows roof age or year built that concerns you.",
              "Immediately after going under contract, in parallel with scheduling the inspection.",
              "Again after the inspection, if anything it found changes the picture.",
            ],
          },
          {
            kind: "p",
            text: "I check this on every deal now, because it has moved from an afterthought to a condition of purchase in this state.",
          },
        ],
      },
      {
        heading: "If the quote comes back badly",
        blocks: [
          {
            kind: "p",
            text: "You have three routes: negotiate the repair or a credit, carry out the retrofit yourself and re-rate, or walk. Which one is sensible depends on what failed, and the ordered list is in [retrofits that lower a Florida insurance bill](/answers/inspections-and-insurance/retrofits-that-lower-florida-insurance). If the inspection report is what set this off, [how to read it](/answers/inspections-and-insurance/inspection-report-many-items-should-i-walk) comes first.",
          },
        ],
      },
      {
        heading: "What to do with a quote that is high but not fatal",
        blocks: [
          {
            kind: "p",
            text: "A high quote is not always a reason to walk. Shop it with an independent agent who can place it with more than one carrier, then find out which single item is driving it — usually the roof age or the absence of a wind mitigation report.",
          },
          {
            kind: "list",
            items: [
              "If it is the roof, price the replacement and negotiate on that number rather than on the premium.",
              "If it is the wind mitigation, order the report. The house may already have the features and nobody has documented them.",
              "If it is the panel or the plumbing, price the repair and treat it as part of the purchase.",
            ],
          },
        ],
      },
    ],
  },
};
