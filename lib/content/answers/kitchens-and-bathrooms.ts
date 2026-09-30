import type { AnswerBody } from "@/lib/content/answers";

/** Published copy for the kitchens-and-bathrooms answers (docs/18 § 3). */
export const kitchensAndBathrooms: Record<string, AnswerBody> = {
  "bathroom-remodel-cost-central-florida": {
    updated: "2026-09-30",
    shortAnswer:
      "Not automatically, but you cannot tell from one number. Ask for it broken out — demolition, plumbing, electrical, framing, waterproofing, tile, vanity and tops, glass, paint — with the allowances stated. Then get three quotes on the same written scope.",
    sections: [
      {
        heading: "Ask for the breakdown",
        blocks: [
          {
            kind: "p",
            text: "A single figure tells you nothing about what you are buying. The same total can be a careful job on a small hall bathroom or a thin job on a large one.",
          },
          {
            kind: "list",
            items: [
              "Demolition and haul-away.",
              "Plumbing rough and fixtures.",
              "Electrical, including any new circuits and the exhaust fan.",
              "Framing changes.",
              "Waterproofing.",
              "Tile and setting materials.",
              "Vanity, top and mirror.",
              "Shower glass.",
              "Paint and making good.",
            ],
          },
        ],
      },
      {
        heading: "Which bathroom are you actually quoting",
        blocks: [
          {
            kind: "p",
            text: "A hall bathroom with a tub-shower combination and a stock vanity is a different animal from a primary with a curbless shower, a freestanding tub and relocated plumbing. Moving plumbing on a slab means cutting concrete, and that single decision can move the price more than every finish choice combined.",
          },
        ],
      },
      {
        heading: "The line I look at hardest",
        blocks: [
          {
            kind: "p",
            text: "Waterproofing. A proper bonded membrane or a foam pan system, installed as one system rather than mixed brands, is what decides whether this bathroom is still sound in ten years. Cheap bathrooms fail at the pan, and the repair is a demolition.",
          },
          {
            kind: "p",
            text: "The second is glass: it should be measured after the tile is set, not before, or it will not fit the opening you actually built.",
          },
        ],
      },
      {
        heading: "How to compare quotes honestly",
        blocks: [
          {
            kind: "steps",
            items: [
              "Write the scope once, including allowances for tile, vanity and fixtures, and give the same document to everyone.",
              "Ask each bidder what is excluded.",
              "Ask who does the waterproofing and what system they use.",
              "Check the licence and insurance before you compare prices at all.",
            ],
          },
          {
            kind: "p",
            text: "I do bathrooms across [Lake Mary](/lake-mary), [Sanford](/sanford) and [Longwood](/longwood). If the shower is the reason you are remodelling, read [why showers leak behind tile](/answers/kitchens-and-bathrooms/shower-leaking-behind-tile) before you choose anyone.",
          },
        ],
      },
      {
        heading: "Where a bathroom budget usually goes wrong",
        blocks: [
          {
            kind: "list",
            items: [
              "Moving the drain, which on a slab means cutting concrete.",
              "Tile choice made after the quote, at twice the allowance.",
              "A shower glass panel measured from drawings rather than from the finished opening.",
              "Rot or old galvanised pipe found behind the tub, which nobody can quote until the wall is open.",
            ],
          },
          {
            kind: "p",
            text: "The last one is the reason a small contingency belongs in every bathroom. Ask the contractor what they will do if they find it, and how it will be priced, before they start rather than on the day.",
          },
        ],
      },
    ],
  },

  "tub-to-walk-in-shower-conversion": {
    updated: "2026-09-30",
    shortAnswer:
      "A few things. Keep at least one tub in the house if you have small children or plan to sell to families. On a slab the drain usually has to move, which means cutting concrete, and the pan has to be sloped and waterproofed properly — that is where these fail.",
    sections: [
      {
        heading: "Keep one tub in the house",
        blocks: [
          {
            kind: "p",
            text: "Losing the last tub costs you buyers with small children, and that is a large slice of the market in Seminole County. If the house has two bathrooms, convert the primary and leave the hall bathroom alone.",
          },
        ],
      },
      {
        heading: "The slab decides the budget",
        blocks: [
          {
            kind: "p",
            text: "A tub drain and a shower drain are rarely in the same place. On a slab foundation, moving it means cutting and patching concrete, and that is a real line item rather than an afterthought. Price it before you choose the tile.",
          },
        ],
      },
      {
        heading: "Get the pan right",
        blocks: [
          {
            kind: "list",
            items: [
              "Slope: a quarter of an inch per foot, falling to the drain, across the whole pan.",
              "Waterproofing: a bonded membrane over the pan and at least the lower wall. Cement board on its own is not waterproof.",
              "Corners and the curb: the membrane laps up and over, because that is where water finds its way out.",
              "Niches in the wet wall, never in an exterior wall.",
            ],
          },
        ],
      },
      {
        heading: "Curbless, if you can decide early",
        blocks: [
          {
            kind: "p",
            text: "A curbless shower is the accessibility-proof choice and it looks better, but it needs the slab or subfloor recessed, which is a decision made at framing rather than at tiling. Decide it before demolition, not during.",
          },
          {
            kind: "p",
            text: "If the wider plan is a parent moving in, [aging-in-place modifications](/answers/systems-and-maintenance/aging-in-place-home-modifications) covers what else to do while the walls are open. For the overall cost, see [what a bathroom remodel costs here](/answers/kitchens-and-bathrooms/bathroom-remodel-cost-central-florida).",
          },
        ],
      },
      {
        heading: "The details that make it feel finished",
        blocks: [
          {
            kind: "list",
            items: [
              "A bench or a foot ledge, decided before the waterproofing rather than after.",
              "A handheld on a slide bar as well as the fixed head.",
              "A linear drain if the tile is large format, because a centre drain needs four falls and large tiles do not like them.",
              "A door that opens without hitting the vanity, which is a plan decision, not a glass one.",
            ],
          },
          {
            kind: "p",
            text: "None of these cost much when they are part of the design. All of them are expensive or impossible once the pan is poured and the walls are tiled.",
          },
        ],
      },
      {
        heading: "Ventilation, which nobody quotes",
        blocks: [
          { kind: "p", text: "A larger shower puts more moisture into the room. If the extractor is the original builder fan venting into the attic, or nowhere at all, the new tile will be the cleanest surface in a room that now grows mould in the corners." },
          { kind: "p", text: "Replace it with a fan sized for the room, ducted outside, and put it on a timer or a humidity sensor. It is a small line on the quote and it protects everything else on it." },
        ],
      },
    ],
  },

  "shower-leaking-behind-tile": {
    updated: "2026-09-30",
    shortAnswer:
      "Almost always the waterproofing, not the grout. Grout was never waterproof; the membrane behind the tile is what keeps water out. Once water has been getting behind for a while there is usually wet framing, so a surface repair is money thrown away.",
    sections: [
      {
        heading: "Grout is not the problem",
        blocks: [
          {
            kind: "p",
            text: "Grout is a filler between tiles. It is porous by design and it was never the waterproof layer. When a shower leaks, what has failed is the system behind the tile, and re-grouting buys you a season at most.",
          },
        ],
      },
      {
        heading: "What actually failed",
        blocks: [
          {
            kind: "list",
            items: [
              "Cement board installed with no membrane over it.",
              "A pre-formed pan that was never sloped correctly, so water stands.",
              "A membrane that was not lapped up the curb and into the corners.",
              "A mixed system, where two incompatible waterproofing products meet and neither manufacturer will stand behind the joint.",
            ],
          },
        ],
      },
      {
        heading: "Why the honest fix is a tear-out",
        blocks: [
          {
            kind: "p",
            text: "By the time it is visible outside the shower, water has usually been in the wall for months. That means wet framing and sometimes mould, and neither is fixed from the tile side. The repair is normally a tear-out to the studs on the wet wall, new waterproofing installed as a single system, then tile.",
          },
          {
            kind: "p",
            text: "I would rather tell someone that at the start than sell them a re-grout that fails in eight months and costs them the same money twice.",
          },
        ],
      },
      {
        heading: "Making the next one last",
        blocks: [
          {
            kind: "steps",
            items: [
              "One manufacturer system throughout: pan, membrane, corners, bonding flange.",
              "Slope and flood-test the pan before any tile goes on.",
              "Waterproof the full height of the wet wall, not just the lower band.",
              "Silicone, not grout, in every change of plane — corners and the floor-to-wall joint move.",
            ],
          },
          {
            kind: "p",
            text: "If you are rebuilding anyway, it is the moment to consider [converting the tub to a walk-in shower](/answers/kitchens-and-bathrooms/tub-to-walk-in-shower-conversion). For the money side, [what a bathroom costs here](/answers/kitchens-and-bathrooms/bathroom-remodel-cost-central-florida).",
          },
        ],
      },
      {
        heading: "How to tell how far it has gone",
        blocks: [
          {
            kind: "list",
            items: [
              "Staining or soft drywall on the other side of the wet wall.",
              "A musty smell that is stronger near the shower.",
              "Loose or hollow tiles low down, especially at the corners.",
              "Damage to the skirting or the floor outside the shower.",
            ],
          },
          {
            kind: "p",
            text: "Any of those means water has been leaving the shower for a while. At that point a moisture meter on the adjacent framing tells you whether this is a shower repair or a shower and a wall, and it is worth knowing before anyone quotes.",
          },
        ],
      },
    ],
  },

  "reglaze-or-replace-a-bathtub": {
    updated: "2026-09-30",
    shortAnswer:
      "Reglaze when the tub is structurally sound and the problem is the surface — stains, dullness, small chips, a colour you hate. Replace when it is cracked, when it is thin acrylic that flexes, or when you are moving plumbing or retiling the surround anyway.",
    sections: [
      {
        heading: "When reglazing is the right call",
        blocks: [
          {
            kind: "p",
            text: "A sound cast-iron or steel tub with a tired surface is an excellent candidate. A good refinish — by someone who actually etches and prepares the surface rather than spraying over it — lasts roughly eight to twelve years. A cheap one peels in two, and peeling is far uglier than the stains you started with.",
          },
          {
            kind: "p",
            text: "Ask what the preparation is, how long between coats, and what the warranty covers. Ventilate hard during and after; the chemicals involved are not trivial.",
          },
        ],
      },
      {
        heading: "When to replace instead",
        blocks: [
          {
            kind: "list",
            items: [
              "The tub is cracked, or flexes underfoot.",
              "It is a thin acrylic unit that was never much good.",
              "You are moving plumbing or retiling the surround anyway — at that point the tub is the cheap part of the job.",
            ],
          },
        ],
      },
      {
        heading: "The mistake people make either way",
        blocks: [
          {
            kind: "p",
            text: "Reglazing the tub and leaving the surround tile ages badly. Bright new white next to tired 1980s tile makes the tile look worse than it did before, and the room reads as half-finished. Do both, or do neither.",
          },
        ],
      },
      {
        heading: "If you are selling",
        blocks: [
          {
            kind: "p",
            text: "A reglaze is one of the few pre-sale cosmetic jobs that reliably pays, because it removes a visible negative for a small number. It belongs on the same list as paint and cleaning in [what is worth fixing before you list](/answers/buying-and-selling/what-to-fix-before-selling).",
          },
          {
            kind: "p",
            text: "If the tub is coming out for good, read [the tub-to-shower conversion](/answers/kitchens-and-bathrooms/tub-to-walk-in-shower-conversion) before you commit — keeping one tub in the house matters to resale.",
          },
        ],
      },
      {
        heading: "What a good refinish involves",
        blocks: [
          {
            kind: "steps",
            items: [
              "Strip and clean, including removing old caulk and any previous coating.",
              "Etch or abrade the surface so the new coating has something to hold.",
              "Repair chips and level them before coating.",
              "Spray in thin coats, with the room ventilated and masked properly.",
              "Cure, then re-caulk. Using the tub early is what ruins most of these.",
            ],
          },
          {
            kind: "p",
            text: "Ask which of those five steps are in the price. The cheap version skips the second one, and that is the version that peels.",
          },
        ],
      },
      {
        heading: "Living with a refinished tub",
        blocks: [
          { kind: "p", text: "Treat it as a coating rather than a surface. No abrasive cleaners, no bath mats with suction cups, and nothing left standing on it for days. Done properly and looked after, a refinish is unremarkable for a decade." },
          { kind: "p", text: "Tell whoever cleans the house, too. Most early failures I have seen were a cleaning product rather than the coating." },
        ],
      },
    ],
  },

  "why-floor-tiles-crack-and-pop": {
    updated: "2026-09-30",
    shortAnswer:
      "Usually one of four things, and none of them is the tile: movement with no expansion joints, a slab crack telegraphing through, poor mortar coverage, or the wrong mortar for the tile. Fixing the tile without fixing the cause just resets the clock.",
    sections: [
      {
        heading: "The four causes",
        blocks: [
          {
            kind: "list",
            items: [
              "Movement. No expansion or control joints, or tile run tight to the walls with no perimeter gap, so the slab and the tile fight and the tile loses.",
              "A crack in the slab telegraphing straight up. This needs an uncoupling or crack-isolation membrane, not more thinset.",
              "Poor coverage. Hollow spots under the tile from spot-bonding instead of properly combing and back-buttering.",
              "The wrong mortar. Large-format porcelain needs a large-format mortar, because the flatness tolerances are different.",
            ],
          },
        ],
      },
      {
        heading: "How to tell which one you have",
        blocks: [
          {
            kind: "p",
            text: "Tap across the floor with a knuckle or a coin. A hollow sound is coverage. A crack that runs in a straight line across several tiles, in line with a crack you can find at the perimeter or in the garage, is the slab. Tiles failing only at the walls, or along one long run, is movement with nowhere to go.",
          },
        ],
      },
      {
        heading: "Doing the repair once",
        blocks: [
          {
            kind: "steps",
            items: [
              "Establish the cause before lifting anything.",
              "If it is the slab, install an uncoupling or crack-isolation membrane over the affected area.",
              "Leave a perimeter gap at every wall, covered by the skirting, and put soft joints where the floor changes plane or passes through a doorway.",
              "Use the mortar the tile manufacturer specifies, and comb it properly.",
            ],
          },
        ],
      },
      {
        heading: "If it is happening in a wet area",
        blocks: [
          {
            kind: "p",
            text: "Cracked or hollow tile in a shower floor is a different problem with a shorter fuse, because water is already getting in: [why showers leak behind tile](/answers/kitchens-and-bathrooms/shower-leaking-behind-tile).",
          },
          {
            kind: "p",
            text: "If you are replacing the floor throughout rather than patching, the slab preparation matters just as much for the next material: [LVP over a concrete slab](/answers/kitchens-and-bathrooms/lvp-flooring-over-a-concrete-slab).",
          },
        ],
      },
      {
        heading: "What it costs to ignore",
        blocks: [
          {
            kind: "p",
            text: "Cracked tile is rarely just cosmetic once it is underfoot. Loose tiles break at the edges, grout fails, and in a wet area water starts reaching the substrate. The repair grows from a few tiles to a room.",
          },
          {
            kind: "p",
            text: "It also reads badly to a buyer, who assumes movement in the slab whether or not that is what happened. If you are selling, fixing the cause and the tile together is one of the more worthwhile items on the pre-listing list.",
          },
        ],
      },
      {
        heading: "Matching tile you can no longer buy",
        blocks: [
          { kind: "p", text: "Before lifting anything, check whether you have spares in the garage and whether the line is still made. If neither, a repair becomes a visible patch, and it may be worth replacing a whole run or using the opportunity to change the floor." },
          { kind: "p", text: "This is also the argument for buying ten per cent extra at the time of any tile job and keeping it. It costs very little and it is the difference between a repair and a room." },
        ],
      },
    ],
  },

  "cabinet-refacing-vs-replacing": {
    updated: "2026-09-30",
    shortAnswer:
      "Reface when the boxes are solid, the layout works and you are happy with where everything is. Replace when the boxes are swollen particleboard, when the layout has to change, or when you want drawers instead of doors in the base cabinets.",
    sections: [
      {
        heading: "Open a door and look at the box edge",
        blocks: [
          {
            kind: "p",
            text: "That tells you which conversation you are having. Plywood or solid boxes in good order are worth keeping; particleboard that has swollen at the sink base or anywhere damp is not, and no new door will fix it.",
          },
        ],
      },
      {
        heading: "What refacing gets you",
        blocks: [
          {
            kind: "p",
            text: "New doors, new drawer fronts and veneer over the visible box. You keep the layout and the footprint, and you keep the disruption to days rather than weeks. It is meaningfully cheaper than replacement and, done well, is not detectable.",
          },
        ],
      },
      {
        heading: "What only replacement gets you",
        blocks: [
          {
            kind: "list",
            items: [
              "A different layout, or different cabinet sizes.",
              "Drawers instead of doors in the base cabinets, which is the single biggest usability upgrade in a kitchen and cannot be done by refacing.",
              "Proper soft-close hardware throughout on boxes designed for it.",
              "Fixing a bad original design — a corner nobody can reach, a fridge that blocks a run.",
            ],
          },
        ],
      },
      {
        heading: "The middle path people miss",
        blocks: [
          {
            kind: "p",
            text: "Keep the boxes, replace the doors, and add roll-out shelves inside the base cabinets. You get most of the usability improvement and most of the visual change for a fraction of a full replacement, and you can do it one run at a time.",
          },
          {
            kind: "p",
            text: "Whichever route you take, decide the counter material with the doors in front of you rather than afterwards: [quartz or granite](/answers/kitchens-and-bathrooms/quartz-vs-granite-countertops), and pick in [the right order](/answers/hiring-and-project-planning/what-order-to-pick-finishes).",
          },
        ],
      },
      {
        heading: "What refacing cannot hide",
        blocks: [
          {
            kind: "list",
            items: [
              "A layout that does not work. New doors do not move a fridge.",
              "Sagging shelves or boxes that have taken water at the sink.",
              "Worn drawer boxes, unless they are replaced separately.",
              "A worktop that is failing, which usually gets replaced at the same time anyway.",
            ],
          },
          {
            kind: "p",
            text: "If two or more of those apply, price a full replacement before committing to a reface. The gap is often smaller than people expect once the worktop is in both quotes.",
          },
        ],
      },
      {
        heading: "What the quotes should include either way",
        blocks: [
          { kind: "p", text: "Removal and disposal of the old doors or boxes, new hinges and hardware, adjustment of every door and drawer at the end, and making good where the old units meet the wall and the floor." },
          { kind: "p", text: "Ask specifically about the worktop: whether it is being reused, and if so what happens if it does not survive removal. That is the item most likely to turn a tidy reface into a larger job." },
        ],
      },
    ],
  },

  "quartz-vs-granite-countertops": {
    updated: "2026-09-30",
    shortAnswer:
      "Quartz for most kitchens: non-porous, no sealing, consistent pattern. Granite for outdoors and for heat, because quartz can scorch under a hot pan and will yellow in direct sun. Whichever you pick, seam placement and templating after the cabinets are set decide whether you are happy.",
    sections: [
      {
        heading: "Where quartz wins",
        blocks: [
          {
            kind: "list",
            items: [
              "Non-porous, so no annual sealing and better stain resistance.",
              "Consistent pattern, so the slab you choose is the surface you get.",
              "A wider range of pale, uniform colours than natural stone offers.",
            ],
          },
        ],
      },
      {
        heading: "Where quartz loses",
        blocks: [
          {
            kind: "p",
            text: "Heat and ultraviolet light. A hot pan straight from the hob can scorch it, and sustained direct sun will yellow it. That makes it the wrong choice for an outdoor kitchen and a risky one for a sun-blasted window seat — which in Florida is a real consideration rather than a theoretical one.",
          },
          {
            kind: "p",
            text: "For an outdoor kitchen, use granite or another properly outdoor-rated stone: [what survives outdoors here](/answers/exterior-and-florida-climate/outdoor-kitchen-materials-florida).",
          },
        ],
      },
      {
        heading: "What actually decides whether you like it",
        blocks: [
          {
            kind: "list",
            items: [
              "Seam placement. Ask where the seams will fall and why, before fabrication.",
              "Edge profile, which changes the look of the whole kitchen more than people expect.",
              "Templating after the cabinets are set, never from drawings.",
              "Overhang support for any unsupported run, especially on an island with seating.",
            ],
          },
        ],
      },
      {
        heading: "Go and see your slab",
        blocks: [
          {
            kind: "p",
            text: "I send clients to the yard rather than picking from a sample chip. Natural stone varies across a slab and between slabs, and quartz patterns repeat in a way you can only judge at full size. An hour at the yard prevents the one complaint that cannot be fixed afterwards.",
          },
          {
            kind: "p",
            text: "If the cabinets are part of the same project, read [refacing against replacing](/answers/kitchens-and-bathrooms/cabinet-refacing-vs-replacing) first — the counter decision follows the cabinet decision, not the other way round.",
          },
        ],
      },
      {
        heading: "The practical differences day to day",
        blocks: [
          {
            kind: "list",
            items: [
              "Sealing: granite needs it periodically, quartz does not.",
              "Heat: granite takes a hot pan, quartz can mark.",
              "Repair: a granite chip can usually be filled; a quartz burn cannot be undone.",
              "Consistency: quartz looks the same across the kitchen, granite does not, which is either the point or the problem.",
            ],
          },
          {
            kind: "p",
            text: "Both outlast the kitchen they are installed in if they are fabricated and supported properly. Neither survives an unsupported overhang or a seam placed where the slab wants to flex.",
          },
        ],
      },
      {
        heading: "Sinks and edges",
        blocks: [
          { kind: "p", text: "Decide the sink at the same time as the stone. An undermount sink is templated with the worktop, a farmhouse sink changes the cabinet below it, and a drop-in is the only one that can be changed later without touching the stone." },
          { kind: "p", text: "Ask what edge profile is included and what is an upgrade. It is a small number that appears on the final invoice more often than it appears on the quote." },
        ],
      },
    ],
  },

  "lvp-flooring-over-a-concrete-slab": {
    updated: "2026-09-30",
    shortAnswer:
      "Flatness and moisture, in that order. Most LVP wants the slab flat within about three-sixteenths of an inch over ten feet, and Florida slabs on grade need a moisture test rather than an assumption. Then leave the expansion gap the manufacturer specifies.",
    sections: [
      {
        heading: "Flatness first",
        blocks: [
          {
            kind: "p",
            text: "If the slab is not flat, the floor flexes, the locking joints work loose and you get gapping and failed edges. Grind the high spots, fill the low ones with a self-levelling compound, and check with a long straightedge rather than by eye. This is the step that gets skipped when a price looks too good.",
          },
        ],
      },
      {
        heading: "Then moisture, which is the Florida part",
        blocks: [
          {
            kind: "p",
            text: "Slabs on grade here often have a marginal vapour barrier underneath, or none. Do a calcium chloride or relative humidity test rather than assuming, and choose an underlayment or membrane rated for the reading you get. Moisture is what fails these floors in this state, not wear.",
          },
        ],
      },
      {
        heading: "Installation details that matter",
        blocks: [
          {
            kind: "list",
            items: [
              "Leave the expansion gap the manufacturer specifies at every wall and every vertical, including under door jambs.",
              "Do not trap a floating floor under cabinets or a heavy island.",
              "Use transition strips at doorways on long runs rather than running one continuous field.",
              "Acclimate the boxes in the room they are going into, for as long as the manufacturer says.",
            ],
          },
        ],
      },
      {
        heading: "Before you buy the material",
        blocks: [
          {
            kind: "steps",
            items: [
              "Test the slab for moisture and get the number in writing.",
              "Check the product warranty against that number.",
              "Confirm who is doing the floor preparation and whether it is in the price.",
              "Agree what happens if the slab needs more levelling than expected.",
            ],
          },
          {
            kind: "p",
            text: "If the floor you are replacing was tile that cracked, find out why before you cover it: [why floor tiles crack and pop](/answers/kitchens-and-bathrooms/why-floor-tiles-crack-and-pop). For rentals, LVP is usually the right answer for a different reason: [what is worth replacing between tenants](/answers/investors-and-landlords/what-to-replace-between-tenants).",
          },
        ],
      },
      {
        heading: "Glue-down or floating",
        blocks: [
          {
            kind: "p",
            text: "Floating is faster, more forgiving of a slightly uneven slab and easier to repair, but it moves, so it needs the expansion gaps and it can sound hollow underfoot. Glue-down feels more solid, tolerates temperature swings better in a sun room or a lanai conversion, and is much harder to lift later.",
          },
          {
            kind: "p",
            text: "In most Central Florida houses floating is the right default. Rooms with large glazing, direct sun or a history of moisture are where glue-down earns its extra cost.",
          },
        ],
      },
      {
        heading: "Transitions and skirting",
        blocks: [
          { kind: "p", text: "Two details make a floating floor look installed rather than laid: the gap at every wall hidden behind the skirting or a scotia, and a proper threshold where the floor meets tile or carpet." },
          { kind: "p", text: "Ask how door jambs are handled as well. Undercutting them so the flooring runs beneath is the finished way; cutting the plank around them is the quick way, and it shows." },
        ],
      },
    ],
  },
};
