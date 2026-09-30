import type { AnswerBody } from "@/lib/content/answers";

/** Published copy for the additions-and-conversions answers (docs/18 § 3). */
export const additionsAndConversions: Record<string, AnswerBody> = {
  "home-addition-vs-moving": {
    updated: "2026-09-30",
    shortAnswer:
      "Sometimes, and the break-even is about your lot and your current house more than the build cost. Additions cost more per square foot than new construction, because you are tying into an existing structure, matching a roof line and often upgrading the panel and the HVAC.",
    sections: [
      {
        heading: "Why an addition costs more per foot",
        blocks: [
          {
            kind: "list",
            items: [
              "You are tying new structure into old, which means opening up what is there and discovering what it actually is.",
              "The roof line has to be matched, and matching an existing roof well is skilled work.",
              "The electrical panel often has to grow to carry the new load.",
              "The HVAC system has to be resized or supplemented rather than simply extended.",
            ],
          },
          {
            kind: "p",
            text: "Add the cost of not living there comfortably for a few months, which is real even when it is not on an invoice.",
          },
        ],
      },
      {
        heading: "When it pencils",
        blocks: [
          {
            kind: "list",
            items: [
              "You love the location, and the location is why you would not move.",
              "The lot has room inside its setbacks for what you want to add.",
              "The existing house is structurally sound, so you are adding to something worth keeping.",
              "You are adding what the market wants — a bedroom and a bathroom rather than a hobby room.",
            ],
          },
        ],
      },
      {
        heading: "When it does not",
        blocks: [
          {
            kind: "p",
            text: "When the finished house would sit well above the neighbourhood ceiling, because that money does not come back. When the setbacks force a compromised layout. And when the existing house has its own list — roof, panel, plumbing — that the addition will make more expensive to address later rather than less.",
          },
        ],
      },
      {
        heading: "How I would decide it",
        blocks: [
          {
            kind: "steps",
            items: [
              "Price the addition properly, with allowances, not per square foot.",
              "Price the house you would buy instead, including the transaction costs both ways.",
              "Value the location honestly. If the answer is that you would not move for any house, the comparison is already made.",
            ],
          },
          {
            kind: "p",
            text: "I run both numbers before anyone swings a hammer, because I sell houses and build them. The adjacent questions are [whether your house can take a second storey](/answers/additions-and-conversions/can-my-house-take-a-second-story) and [whether a primary suite addition is worth it](/answers/additions-and-conversions/is-a-primary-suite-addition-worth-it). For the build itself: [contractor services](/hire-contractor).",
          },
        ],
      },
      {
        heading: "The questions that decide it in an hour",
        blocks: [
          {
            kind: "steps",
            items: [
              "What are the setbacks on this lot, and what footprint do they leave?",
              "Is the roof structure simple enough to tie into without rebuilding it?",
              "Can the panel and the air conditioning carry the extra load, and what does upgrading them cost?",
              "What is the ceiling price on this street, and where would the finished house sit against it?",
            ],
          },
          {
            kind: "p",
            text: "Those four answers give a range that is close enough to compare against the cost of moving, including the transaction costs on both sides. Anything more detailed than that is a design exercise, and it is premature until the four are answered.",
          },
        ],
      },
    ],
  },

  "can-i-build-an-adu-in-my-backyard": {
    updated: "2026-09-30",
    shortAnswer:
      "Zoning answers this, not the internet. Call your county or city planning desk with your parcel ID and ask three things: is an accessory dwelling unit permitted in this district, what is the maximum size and setback, and is separate utility metering allowed or required.",
    sections: [
      {
        heading: "The three questions to ask the planning desk",
        blocks: [
          {
            kind: "steps",
            items: [
              "Is an accessory dwelling unit permitted in this zoning district, for this parcel?",
              "What is the maximum size, and what setbacks apply to a detached structure here?",
              "Is separate utility metering allowed, required, or prohibited?",
            ],
          },
          {
            kind: "p",
            text: "Have the parcel ID in front of you. The answer is parcel-specific and a general answer about the county is worth very little.",
          },
        ],
      },
      {
        heading: "Two things that stop projects after zoning says yes",
        blocks: [
          {
            kind: "list",
            items: [
              "The HOA. An association can prohibit what zoning permits, and many do. Read the covenants before you pay for drawings.",
              "Septic capacity. In unincorporated areas this is the quiet killer: a septic system is sized for a bedroom count, and another dwelling usually means another bedroom.",
            ],
          },
        ],
      },
      {
        heading: "The easier version of the same idea",
        blocks: [
          {
            kind: "p",
            text: "Many jurisdictions treat an attached in-law suite with no separate kitchen far more permissively than a detached unit with one. If what you actually need is somewhere for a parent to live with dignity, that route is often faster, cheaper and less contentious.",
          },
          {
            kind: "p",
            text: "The planning and construction detail for that is in [in-law suite planning mistakes](/answers/additions-and-conversions/in-law-suite-planning-mistakes).",
          },
        ],
      },
      {
        heading: "Get the answer before you pay for drawings",
        blocks: [
          {
            kind: "p",
            text: "The most expensive way to learn your setbacks is from a designer who has already drawn the building. An hour on the phone with the planning desk, before anyone is engaged, is the cheapest step in the project.",
          },
          {
            kind: "p",
            text: "I build these in Seminole and Orange County, and I will make that call with you if it is easier: [get in touch](/contact). If the yard is not the answer, [an addition against moving](/answers/additions-and-conversions/home-addition-vs-moving) is the other way to solve the same problem.",
          },
        ],
      },
      {
        heading: "What an accessory dwelling costs to service",
        blocks: [
          {
            kind: "p",
            text: "The building is the visible part. The services are what people forget: a trench for water, sewer or septic, a sub-panel and a circuit run from the main house or a new meter, and a drainage plan so the new roof does not put water where the yard cannot take it.",
          },
          {
            kind: "p",
            text: "On a deep lot, that trench can be the largest single line on the quote. Ask for it to be priced separately so you can see it, and check whether the utility requires its own permit.",
          },
        ],
      },
    ],
  },

  "garage-conversion-resale-value": {
    updated: "2026-09-30",
    shortAnswer:
      "Usually yes, in a market where everyone else has a garage, and Central Florida is one of those. Appraisers will credit the square footage if the work was permitted and properly conditioned, but buyers still deduct for the missing garage.",
    sections: [
      {
        heading: "What the appraiser sees and what the buyer sees",
        blocks: [
          {
            kind: "p",
            text: "Those are two different valuations and they do not agree. Permitted, properly conditioned and finished space gets counted as heated square footage by an appraiser. A buyer in a street of three-bed, two-bath, two-car houses sees the one house with nowhere to put a car.",
          },
          {
            kind: "p",
            text: "In a neighbourhood where the garage is standard, being the exception is the cost, whatever the appraisal says.",
          },
        ],
      },
      {
        heading: "When it does work",
        blocks: [
          {
            kind: "list",
            items: [
              "You genuinely need the bedroom or the in-law space, and the alternative is moving.",
              "You plan to stay seven years or more, so the use outlasts the resale friction.",
              "You keep the garage door in place, so the conversion is reversible for the next owner.",
            ],
          },
        ],
      },
      {
        heading: "If you do it, do it properly",
        blocks: [
          {
            kind: "steps",
            items: [
              "Permit it. Unpermitted conversions get discounted hard and can cause an insurance problem.",
              "Insulate the slab edge and the walls. A converted garage that is cold in January and unbearable in August is not living space.",
              "Put real HVAC on it, sized for the load, rather than a mini-split as an afterthought.",
              "Deal with the floor level and any drainage fall towards the door.",
            ],
          },
        ],
      },
      {
        heading: "The alternative worth pricing first",
        blocks: [
          {
            kind: "p",
            text: "Before converting the garage, price the addition that would give you the same room without losing it. On some lots it is closer than people expect, and it does not carry the resale drag: [an addition against moving](/answers/additions-and-conversions/home-addition-vs-moving).",
          },
          {
            kind: "p",
            text: "If the conversion was done before you bought the house, read [which renovations need a permit](/answers/new-construction-and-building/which-renovations-need-a-permit) — legalising it is usually possible and it is what makes the space count.",
          },
        ],
      },
      {
        heading: "How to keep the option open",
        blocks: [
          {
            kind: "list",
            items: [
              "Keep the garage door in place rather than infilling the opening with a window.",
              "Do not move the electrical panel or the water heater if they live in the garage.",
              "Keep the slab level change, and finish the floor so it can be lifted.",
              "Permit the work, so the square footage counts while you live there.",
            ],
          },
          {
            kind: "p",
            text: "A conversion that can be reversed in a weekend costs you far less at resale than one that cannot, and the difference is usually a few decisions made at the start.",
          },
        ],
      },
      {
        heading: "If you are buying one",
        blocks: [
          { kind: "p", text: "A converted garage is not a reason to walk away, but it is a reason to check two things: whether the work was permitted, and whether the space is properly conditioned and insulated rather than simply finished." },
          { kind: "p", text: "Unpermitted, it counts for nothing on the appraisal and may complicate the insurance. Permitted and done well, it is square footage like any other, and the discount other buyers apply can work in your favour." },
        ],
      },
    ],
  },

  "can-my-house-take-a-second-story": {
    updated: "2026-09-30",
    shortAnswer:
      "Possibly, and a structural engineer answers it, not a contractor and certainly not a salesman. The three questions are whether the foundation and footings can carry the load, whether the existing walls can, and whether lot coverage and height limits allow it.",
    sections: [
      {
        heading: "Get the engineering report first",
        blocks: [
          {
            kind: "p",
            text: "It is the cheapest step in the project and the only one that can end the conversation before you spend real money. A block first floor is often in reasonable shape for load in Florida, but the tie-downs and the connection detailing are what the engineer is actually working out, and those are not cheap to build.",
          },
        ],
      },
      {
        heading: "What the budget has to include",
        blocks: [
          {
            kind: "list",
            items: [
              "Engineering, and a survey if you do not have a current one.",
              "Temporary roof removal and weather protection, which in this climate is not a formality.",
              "A new staircase, which eats floor area downstairs that you will not get back.",
              "A second HVAC zone or a second system.",
              "Very likely an electrical panel upgrade.",
            ],
          },
          {
            kind: "p",
            text: "The staircase is the one people forget. It takes space from the floor that currently works, and on a small footprint it can undo the reason you wanted more room.",
          },
        ],
      },
      {
        heading: "The planning constraints",
        blocks: [
          {
            kind: "p",
            text: "Height limits and lot coverage are set by your zoning district, and an HOA can add its own. Check both with the parcel ID before you commission drawings, the same way you would for [an accessory dwelling unit](/answers/additions-and-conversions/can-i-build-an-adu-in-my-backyard).",
          },
        ],
      },
      {
        heading: "The order that saves money",
        blocks: [
          {
            kind: "steps",
            items: [
              "Zoning and HOA check.",
              "Structural engineer report on the existing house.",
              "Concept drawings, only once the first two say yes.",
              "Budget with allowances, then permit drawings.",
            ],
          },
          {
            kind: "p",
            text: "If the report says no, the alternatives are out rather than up: [an addition against moving](/answers/additions-and-conversions/home-addition-vs-moving), or reworking the existing layout, which starts with [is this wall load-bearing](/answers/additions-and-conversions/is-this-wall-load-bearing).",
          },
        ],
      },
      {
        heading: "The alternative the engineer may suggest",
        blocks: [
          {
            kind: "p",
            text: "On some houses it is cheaper to remove the existing roof structure and build a new floor than to reinforce what is there, and on others the answer is to go out rather than up. An engineer who is asked for options rather than a yes or no will usually give you both.",
          },
          {
            kind: "p",
            text: "Either way the sequence is the same: engineering first, then planning, then design, then price. Reversing that order is how people spend money on drawings for something that was never going to be permitted.",
          },
        ],
      },
      {
        heading: "What it does to the rest of the house",
        blocks: [
          { kind: "p", text: "A second storey is rarely only a second storey. The staircase changes the ground floor, the air conditioning usually needs a second zone, and the electrical service often has to grow, so parts of the existing house get rebuilt whether or not that was the plan." },
          { kind: "p", text: "Budget for finishing the ground floor back to a whole house, not just for the new rooms above it. That line is what people leave out of the comparison against moving." },
        ],
      },
    ],
  },

  "is-this-wall-load-bearing": {
    updated: "2026-09-30",
    shortAnswer:
      "There are clues, and then there is an engineer. It is probably bearing if it runs perpendicular to the joists above, sits over a beam or a foundation wall, is near the centre of the house, or continues on the floor above. Clues are not a permit.",
    sections: [
      {
        heading: "Clues that it is bearing",
        blocks: [
          {
            kind: "list",
            items: [
              "It runs perpendicular to the joists above it.",
              "It sits over a beam, a foundation wall or a thickened slab.",
              "It is near the centre of the house, where spans meet.",
              "It continues on the floor above.",
              "The joists lap over it rather than passing across.",
            ],
          },
        ],
      },
      {
        heading: "Clues that it is not",
        blocks: [
          {
            kind: "list",
            items: [
              "It runs parallel to the joists.",
              "It is short, or stops at the end of a run.",
              "It is obviously a later addition — different framing, different finish behind the drywall.",
            ],
          },
        ],
      },
      {
        heading: "Why an engineer is not optional",
        blocks: [
          {
            kind: "p",
            text: "Removing a bearing wall needs a beam sized for the span, point loads carried down through the structure to footings that can take them, and an inspection. In Florida there is a second reason: the load path also resists uplift, so a wall can be doing work that is invisible until a storm.",
          },
          {
            kind: "p",
            text: "An engineering letter for a straightforward residential opening costs a few hundred dollars. People skip it, do the work without a permit, and it surfaces as a red flag at resale — or as a claim their insurer will not pay.",
          },
        ],
      },
      {
        heading: "The right sequence",
        blocks: [
          {
            kind: "steps",
            items: [
              "Engineer inspects and specifies the beam and the load path.",
              "Contractor pulls the permit against that specification.",
              "Temporary shoring goes in before anything is removed.",
              "Inspection, then close the wall.",
            ],
          },
          {
            kind: "p",
            text: "Opening up a plan properly is one of the better things you can do to an older Central Florida house, and it is worth doing in the order above: [which renovations need a permit](/answers/new-construction-and-building/which-renovations-need-a-permit), and [contractor services](/hire-contractor) if you want it run for you.",
          },
        ],
      },
      {
        heading: "What it costs, roughly, to do properly",
        blocks: [
          {
            kind: "p",
            text: "The engineering letter is a few hundred dollars. The rest depends on the span, the load above and whether the point loads can be carried down inside existing walls to footings that can take them — which is the part that varies most between two houses that look identical from inside.",
          },
          {
            kind: "p",
            text: "Get the letter first. It turns an unbounded question into a scope three contractors can price, and it is the document that lets a permit be issued at all.",
          },
        ],
      },
      {
        heading: "What happens after the beam goes in",
        blocks: [
          { kind: "p", text: "The opening changes more than the view. Ceiling finishes have to be made good across the join, flooring runs continue where a wall used to be, and any services in that wall — switches, sockets, ducts, plumbing — need a new route before the wall comes down." },
          { kind: "p", text: "None of that is difficult when it is planned. It is expensive when it is discovered mid-demolition, which is the usual order when the work starts without drawings." },
        ],
      },
    ],
  },

  "is-a-primary-suite-addition-worth-it": {
    updated: "2026-09-30",
    shortAnswer:
      "It is one of the better additions for resale, but only up to your neighbourhood ceiling. Going from three-bed one-bath to three-bed two-bath is the highest-return change in most older stock; a grander primary in a modest street returns very little.",
    sections: [
      {
        heading: "Where the return actually is",
        blocks: [
          {
            kind: "p",
            text: "The value is in the second full bathroom, not in the size of the bedroom. A one-bath house is excluded from most family buyers' lists; a two-bath house is not. That is a change of buyer pool, and a change of buyer pool is what moves a price.",
          },
          {
            kind: "p",
            text: "Upgrading a perfectly adequate primary suite into a larger one is a lifestyle purchase. Enjoy it, but do not expect the market to pay for it.",
          },
        ],
      },
      {
        heading: "The practical notes that keep the cost sane",
        blocks: [
          {
            kind: "list",
            items: [
              "Run the plumbing where it can tie in without trenching the slab, if there is any way to arrange the plan that way.",
              "Size the HVAC for the added load rather than hoping the existing system copes. It will not, and the symptom is a humid room you cannot cool.",
              "Do not steal the closet or the dining room to make the footprint work. Both are noticed by every buyer.",
            ],
          },
        ],
      },
      {
        heading: "Think about the roof line early",
        blocks: [
          {
            kind: "p",
            text: "An addition that reads as an addition from the street costs you at resale. Matching the roof pitch, the eaves and the exterior finish is not cosmetic detail, it is most of what makes the house look like one house. Budget for it rather than discovering it at the end.",
          },
        ],
      },
      {
        heading: "Price the build and the after-value together",
        blocks: [
          {
            kind: "p",
            text: "This is the part I can do in one conversation, because I hold both licences. The general rule is in [which renovations add value](/answers/buying-and-selling/which-renovations-add-value), and if the real question is whether to extend at all, read [an addition against moving](/answers/additions-and-conversions/home-addition-vs-moving).",
          },
        ],
      },
      {
        heading: "What buyers notice afterwards",
        blocks: [
          {
            kind: "list",
            items: [
              "Whether the new suite has its own bathroom, or shares.",
              "Whether the closet is real storage or an afterthought.",
              "Whether the original bedrooms still work, or one of them became a corridor.",
              "Whether the addition looks like part of the house from the street.",
            ],
          },
          {
            kind: "p",
            text: "Those four are what the market prices. They are also, conveniently, the ones that make the house better to live in, which is why this addition tends to be a good one when it is done properly.",
          },
        ],
      },
      {
        heading: "Where the plumbing decides the price",
        blocks: [
          { kind: "p", text: "A new bathroom needs supply, waste and venting. Placing the suite where those can tie into the existing stack, or at least run through a wall rather than under a slab, is the single largest cost decision in the project." },
          { kind: "p", text: "Ask for both options to be priced if the plan allows a choice: the convenient location and the cheaper one. The gap is sometimes large enough to change the design." },
        ],
      },
    ],
  },

  "in-law-suite-planning-mistakes": {
    updated: "2026-09-30",
    shortAnswer:
      "Three, usually: accessibility designed in too late or not at all, sound ignored, and the kitchen question — a second full kitchen is often what turns a suite into a legal second dwelling with different rules. A wet bar and a fridge gets most of the function with none of the fight.",
    sections: [
      {
        heading: "Accessibility, while the walls are open",
        blocks: [
          {
            kind: "p",
            text: "If a parent is moving in, design for the next ten years rather than the first one. During framing these cost almost nothing; afterwards they cost a renovation.",
          },
          {
            kind: "list",
            items: [
              "A curbless shower.",
              "A 36-inch door into the bedroom and the bathroom.",
              "Plywood blocking in the walls for future grab bars, whether or not you fit them now.",
              "A bedroom that can take a hospital bed with room to work around it.",
            ],
          },
        ],
      },
      {
        heading: "Sound, which nobody thinks about until week one",
        blocks: [
          {
            kind: "p",
            text: "Share as few walls as possible. Where you must, insulate the cavity and use resilient channel on at least one side. Keep the suite bathroom off the shared wall with the main bedroom, and do not run the suite plumbing through a wall behind a headboard.",
          },
        ],
      },
      {
        heading: "The kitchen question",
        blocks: [
          {
            kind: "p",
            text: "A second full kitchen is frequently the line between an in-law suite and a second dwelling unit, and the second one brings zoning, utility and sometimes impact-fee consequences. Before you plan a range and a full-size sink, ask the planning desk what triggers that classification on your parcel.",
          },
          {
            kind: "p",
            text: "A wet bar, a microwave and a full-height fridge gives most families ninety per cent of the function and none of the argument. If a genuinely separate unit is what you need, the route is [an accessory dwelling unit](/answers/additions-and-conversions/can-i-build-an-adu-in-my-backyard).",
          },
        ],
      },
      {
        heading: "Then the ordinary construction decisions",
        blocks: [
          {
            kind: "steps",
            items: [
              "Separate HVAC zone or a dedicated system, because one thermostat for two households does not work.",
              "Its own entrance if the lot allows, even for an attached suite.",
              "Lighting designed for older eyes: more of it, and on motion sensors between bed and bathroom.",
            ],
          },
          {
            kind: "p",
            text: "I build these in Seminole County, and the accessibility items are the ones I push hardest for, because they are cheap now and expensive later: [aging-in-place modifications](/answers/systems-and-maintenance/aging-in-place-home-modifications).",
          },
        ],
      },
      {
        heading: "The conversation to have before the drawings",
        blocks: [
          {
            kind: "p",
            text: "Two households, one roof, works when the boundaries are decided in advance: the entrance, the laundry, the parking, and whether meals are shared. Those decisions change the plan more than the square footage does.",
          },
          {
            kind: "p",
            text: "It is also worth deciding what happens to the space afterwards. A suite that becomes a guest wing, a home office or a rental later is a different design from one that only works for one person, and the difference is usually a door and a service connection.",
          },
        ],
      },
    ],
  },
};
