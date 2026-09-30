import type { AnswerBody } from "@/lib/content/answers";

/** Published copy for the exterior-and-climate answers (docs/18 § 3). */
export const exteriorAndFloridaClimate: Record<string, AnswerBody> = {
  "are-impact-windows-worth-it-florida": {
    updated: "2026-09-30",
    shortAnswer:
      "Worth it for three reasons in this order: you never handle shutters again, the noise reduction is dramatic, and there is an insurance credit — though the credit alone rarely justifies the price. Partial protection earns very little, and installation decides everything.",
    sections: [
      {
        heading: "The three reasons, honestly ranked",
        blocks: [
          {
            kind: "list",
            items: [
              "No more shutters. Every storm season you get back a weekend and a garage full of panels.",
              "Noise. This is the benefit people mention a year later, and it is the one nobody expects.",
              "Insurance. There is a credit, and it is real, but on its own it usually does not pay for the windows inside a sensible horizon.",
            ],
          },
        ],
      },
      {
        heading: "Protect every opening or do not bother",
        blocks: [
          {
            kind: "p",
            text: "The wind mitigation credit largely wants the whole building envelope protected, and the garage door is the biggest and weakest opening on most houses. Doing the windows and leaving the garage door is the most common expensive half-measure in this market.",
          },
          {
            kind: "p",
            text: "The full credit list is in [retrofits that lower a Florida insurance bill](/answers/inspections-and-insurance/retrofits-that-lower-florida-insurance).",
          },
        ],
      },
      {
        heading: "Installation is the whole product",
        blocks: [
          {
            kind: "p",
            text: "A great window installed badly leaks and fails, and the failure shows up as stained drywall two seasons later. What to insist on: the right fasteners at the right spacing into solid substrate, correct flashing and sealing, a permit, and an inspection.",
          },
          {
            kind: "steps",
            items: [
              "Ask for the Florida Product Approval or NOA number for the exact window being installed, in writing.",
              "Confirm the permit is pulled in the contractor name.",
              "Ask how the opening is prepared and flashed, and what happens if rot is found in the buck.",
              "Get the wind mitigation inspection afterwards so the credit actually lands.",
            ],
          },
        ],
      },
      {
        heading: "If the budget only stretches so far",
        blocks: [
          {
            kind: "p",
            text: "Spend it on the openings that face the prevailing weather and on the garage door, and plan the rest as a second phase with the same product so the credit is available when it is finished. Doing half now and a different product later is how people end up with neither the discount nor a matching house.",
          },
        ],
      },
      {
        heading: "Impact glass against shutters",
        blocks: [
          {
            kind: "p",
            text: "Accordion or roll-down shutters protect the same openings for less money and earn a similar credit, so the honest comparison is about living with them rather than about protection.",
          },
          {
            kind: "list",
            items: [
              "Shutters are cheaper per opening and can be phased.",
              "They have to be closed by somebody, which matters if you travel or the house is a rental.",
              "They do nothing for noise or ultraviolet, which is where impact glass earns its price day to day.",
              "Roll-downs need maintenance and eventually motors.",
            ],
          },
          {
            kind: "p",
            text: "A common answer is impact glass on the openings you look through and shutters on the rest, which protects the envelope for less.",
          },
        ],
      },
    ],
  },

  "stucco-cracks-cosmetic-or-structural": {
    updated: "2026-09-30",
    shortAnswer:
      "Read the pattern. Hairline cracks in a random web, or a fine crack over a control joint, are usually shrinkage. Worry about diagonal cracks from window and door corners, stair-step cracks following block joints, horizontal cracks, and anything bulging or hollow.",
    sections: [
      {
        heading: "Usually cosmetic",
        blocks: [
          {
            kind: "list",
            items: [
              "Fine, random, web-like cracking across a wall — shrinkage as the stucco cured.",
              "A straight crack sitting over a control joint, which is the joint doing its job.",
              "Hairline cracking around a patch, where old and new meet.",
            ],
          },
        ],
      },
      {
        heading: "Worth investigating",
        blocks: [
          {
            kind: "list",
            items: [
              "Diagonal cracks running from the corners of windows and doors.",
              "Stair-step cracks that follow the block joints.",
              "Horizontal cracks.",
              "Anything wide enough to take a coin.",
              "Any crack with staining, efflorescence or bulging around it.",
            ],
          },
          {
            kind: "p",
            text: "Tap the area. A hollow sound means the stucco has delaminated from the substrate and water is already behind it. On frame construction that can mean rotted sheathing, which is a repair rather than a patch.",
          },
        ],
      },
      {
        heading: "The Florida-specific one",
        blocks: [
          {
            kind: "p",
            text: "Cracking along the band where frame meets block is common on two-storey houses here. That joint moves, because the two materials behave differently, and it needs a proper detail — a joint designed to move — rather than a bead of caulk that fails again next summer.",
          },
        ],
      },
      {
        heading: "What I would do about it",
        blocks: [
          {
            kind: "steps",
            items: [
              "Photograph the pattern, with something for scale, and note which elevation it is on.",
              "Check inside for matching cracks at the same corners, and check doors for square.",
              "If it is the cosmetic kind, repair with a flexible sealant designed for stucco and repaint that elevation.",
              "If it is the other kind, get it looked at before you paint over it, because paint hides the evidence and not the cause.",
            ],
          },
          {
            kind: "p",
            text: "Matching interior cracks at door corners have their own answer: [why they keep coming back](/answers/systems-and-maintenance/drywall-cracks-at-door-corners). And if you are about to repaint, [how often a Florida house needs it](/answers/exterior-and-florida-climate/how-often-to-repaint-a-florida-house).",
          },
        ],
      },
      {
        heading: "Repairing it so it does not come back",
        blocks: [
          {
            kind: "steps",
            items: [
              "Open the crack slightly rather than painting over it, so the repair has something to key into.",
              "Fill with a material that flexes, not a rigid patch that becomes a new crack beside the old one.",
              "Re-texture to match, which is the part that separates a good patch from a visible one.",
              "Prime the repair, then paint the whole elevation rather than spot-painting.",
            ],
          },
          {
            kind: "p",
            text: "If the same crack returns within a season, the movement behind it was not addressed and the repair is not the problem. That is the point to stop patching and find out what is moving.",
          },
        ],
      },
    ],
  },

  "pool-cage-repair-or-replace": {
    updated: "2026-09-30",
    shortAnswer:
      "It depends whether the aluminium frame is sound. Re-screening a structurally fine cage is a fraction of the cost. Replace when the uprights are corroded at the base, when anchors have pulled, or when the structure has racked.",
    sections: [
      {
        heading: "Look at the base of the uprights",
        blocks: [
          {
            kind: "p",
            text: "That is where Florida cages fail first: at the foot, where the upright meets the deck and water sits. Corrosion there is not cosmetic, because that is the connection carrying the whole frame in wind. Push on a few uprights; movement at the base is a replacement conversation.",
          },
        ],
      },
      {
        heading: "When re-screening is the right answer",
        blocks: [
          {
            kind: "p",
            text: "Sound frame, sound anchors, tired screen. Re-screening is good value and quick, and it is worth doing the whole cage rather than the failed panels, so the mesh matches and ages together.",
          },
          {
            kind: "list",
            items: [
              "Standard mesh for general use.",
              "A heavier pet-resistant mesh at the lower panels where a dog leans.",
              "No-see-um mesh if the insects demand it, accepting that it cuts airflow noticeably.",
            ],
          },
        ],
      },
      {
        heading: "What to check on a replacement quote",
        blocks: [
          {
            kind: "steps",
            items: [
              "Is the rebuild engineered and permitted to the current wind load for your county?",
              "What fasteners and anchors are used at the deck, and what happens if the deck concrete is poor?",
              "What is the screen specification, and is it the same throughout?",
              "Is the existing structure removed and disposed of in the price?",
            ],
          },
          {
            kind: "p",
            text: "An unpermitted cage becomes a problem twice: at resale, and after the next storm when an insurer asks for the permit.",
          },
        ],
      },
      {
        heading: "While the cage is off",
        blocks: [
          {
            kind: "p",
            text: "It is the cheapest moment to deal with the deck underneath, because access is never this good again: [cracked pool deck options](/answers/exterior-and-florida-climate/cracked-pool-deck-options). If an outdoor kitchen is part of the plan, decide it now too: [what survives outdoors in Florida](/answers/exterior-and-florida-climate/outdoor-kitchen-materials-florida).",
          },
        ],
      },
      {
        heading: "What to do about the fasteners",
        blocks: [
          {
            kind: "p",
            text: "Cage failures in wind usually start at the connections rather than in the frame. The anchors into the deck, the screws at the beams, and the condition of the concrete they are fixed into are what hold the structure down.",
          },
          {
            kind: "p",
            text: "On a repair, ask for the anchors to be inspected and replaced where they are corroded, and for any spalled concrete around them to be made good. It is a small line on a quote and it is the difference between a cage that stays put and one that leaves in a storm.",
          },
        ],
      },
      {
        heading: "The doors and the kick plates",
        blocks: [
          { kind: "p", text: "Cage doors take the most use and fail first: hinges, closers and the lower panel where feet push it open. Kick plates on the bottom panels prevent most of that damage and cost very little when the screen is being replaced anyway." },
          { kind: "p", text: "If you have pets, specify a heavier mesh on the lower panels rather than the whole cage. It keeps the airflow and puts the durable material where the damage happens." },
        ],
      },
    ],
  },

  "cracked-pool-deck-options": {
    updated: "2026-09-30",
    shortAnswer:
      "Look at why it cracked. Surface shrinkage on a stable slab takes an overlay well. Settlement, heave, or cracks that are offset in height need tear-out or pavers, because an overlay will crack again in the same place within a season.",
    sections: [
      {
        heading: "Diagnose before you choose a product",
        blocks: [
          {
            kind: "list",
            items: [
              "Fine, random surface cracking on a slab that is level — shrinkage. An overlay or texture-and-coat is reasonable.",
              "Cracks where one side sits higher than the other — movement. No coating survives that.",
              "Cracks radiating from a corner or following a sprinkler line — something underneath moved or washed out.",
            ],
          },
        ],
      },
      {
        heading: "What each option is actually good at",
        blocks: [
          {
            kind: "p",
            text: "An overlay is cheap, fast and cosmetic, and it lasts if the preparation and the bond coat are right and the slab is stable. Pavers are the most forgiving choice around a pool, because they move with the ground and you can lift and reset a section instead of redoing the whole deck. Tear-out and repour is the most expensive and the most permanent, and it is the right answer when the base has failed.",
          },
        ],
      },
      {
        heading: "Fix the drainage first",
        blocks: [
          {
            kind: "p",
            text: "Most repeat failures around a pool deck are water: a downspout discharging at the slab edge, a deck that falls towards the house, or a cage foot sitting in a puddle after every storm. Resurfacing over that is doing the job twice, and the second time costs the same as the first.",
          },
        ],
      },
      {
        heading: "Sequence it with the cage",
        blocks: [
          {
            kind: "steps",
            items: [
              "Decide the deck and the cage together; the cage feet are anchored into the deck.",
              "Do drainage corrections first.",
              "Then the deck surface.",
              "Then the cage, so new anchors go into sound concrete.",
            ],
          },
          {
            kind: "p",
            text: "The cage side of that decision is in [repair or replace a pool cage](/answers/exterior-and-florida-climate/pool-cage-repair-or-replace). If the driveway has gone the same way, the logic is similar but not identical: [resurface or replace a driveway](/answers/exterior-and-florida-climate/cracked-driveway-resurface-or-replace).",
          },
        ],
      },
      {
        heading: "Safety and surface temperature",
        blocks: [
          {
            kind: "p",
            text: "Whatever you choose, two properties matter more around a pool than appearance: slip resistance when wet, and how hot the surface becomes in August. Dark pavers and some coatings are uncomfortable to stand on barefoot by mid-afternoon.",
          },
          {
            kind: "p",
            text: "Ask for a sample you can leave in the sun for an hour before choosing, and check the slip rating. Both are easy to establish before the work and impossible to change afterwards without doing it again.",
          },
        ],
      },
      {
        heading: "What it costs to leave",
        blocks: [
          { kind: "p", text: "A cracked deck is not only cosmetic. Water gets under the slab through open cracks, which accelerates the settlement that caused them, and an uneven surface around a pool is a trip hazard that an insurer will mention." },
          { kind: "p", text: "If budget means waiting, at least seal the open cracks and correct the drainage. Both are inexpensive and both slow down whatever is happening underneath." },
        ],
      },
    ],
  },

  "cracked-driveway-resurface-or-replace": {
    updated: "2026-09-30",
    shortAnswer:
      "Resurfacing hides cracks, it does not stop them, so the question is whether the base is still good. Replace when sections sit at different heights, when cracks are wider than about a quarter of an inch, when the surface is spalling, or when the apron is sinking.",
    sections: [
      {
        heading: "Signs the base has failed",
        blocks: [
          {
            kind: "list",
            items: [
              "Sections at different heights across a crack.",
              "Cracks wider than roughly a quarter of an inch.",
              "Spalling, where the surface flakes off in sheets.",
              "Visible sinking near the apron, where delivery trucks turn.",
            ],
          },
          {
            kind: "p",
            text: "Coating over any of those buys you a season of appearance and then the same crack, in the same place, through the new surface.",
          },
        ],
      },
      {
        heading: "What makes a new driveway last",
        blocks: [
          {
            kind: "list",
            items: [
              "A properly compacted base. This is what people underpay for, and it is the whole job.",
              "Adequate thickness — four inches is typical for residential, thicker at the apron.",
              "Fibre or mesh reinforcement.",
              "Control joints cut early and at sensible spacing, roughly every eight to ten feet.",
            ],
          },
        ],
      },
      {
        heading: "The other usual suspect",
        blocks: [
          {
            kind: "p",
            text: "Tree roots. If a mature oak sits within a few feet of the slab, a new driveway without a root barrier or a design that accommodates the roots will crack again, and removing the tree is often neither permitted nor desirable. Deal with the cause in the design rather than in the concrete.",
          },
        ],
      },
      {
        heading: "Before you sign a quote",
        blocks: [
          {
            kind: "steps",
            items: [
              "Ask what base preparation is included and how it is compacted.",
              "Ask the slab thickness, at the drive and at the apron.",
              "Ask when the control joints are cut — early matters.",
              "Ask who is responsible if the county requires a permit for the apron in the right of way.",
            ],
          },
          {
            kind: "p",
            text: "The same reasoning applies around the pool, with one difference — pavers are more forgiving there: [cracked pool deck options](/answers/exterior-and-florida-climate/cracked-pool-deck-options).",
          },
        ],
      },
      {
        heading: "Concrete, pavers or asphalt",
        blocks: [
          {
            kind: "list",
            items: [
              "Concrete: the default here, lowest maintenance, cracks eventually and is patched visibly.",
              "Pavers: more expensive, move with the ground, and individual sections can be lifted and reset rather than replaced.",
              "Asphalt: uncommon on residential drives in this area and softens in the heat.",
            ],
          },
          {
            kind: "p",
            text: "If tree roots are the cause, pavers are usually the better long-term answer, because the failure is repairable rather than permanent. If the drive is simply old, concrete done properly is the cheaper lifetime cost.",
          },
        ],
      },
      {
        heading: "Plan the disruption",
        blocks: [
          { kind: "p", text: "A replacement means no vehicle on the drive for several days while the concrete cures, and a route for the crew to get plant to the back if the job includes a walk or a patio." },
          { kind: "p", text: "Ask how long before you can walk on it, drive on it and park a heavy vehicle on it. Those are three different dates, and driving on new concrete too early is how a new driveway gets its first crack." },
        ],
      },
    ],
  },

  "how-often-to-repaint-a-florida-house": {
    updated: "2026-09-30",
    shortAnswer:
      "Stucco with a good elastomeric or high-grade acrylic lasts roughly seven to twelve years here, less on the south and west elevations. The lifespan is decided by preparation, not by the paint.",
    sections: [
      {
        heading: "Why the south and west go first",
        blocks: [
          {
            kind: "p",
            text: "Those elevations take the sun for the longest part of the day, every day, all year. It is normal for them to fail while the north wall still looks acceptable, and it is reasonable to paint them on a shorter cycle rather than doing the whole house early.",
          },
        ],
      },
      {
        heading: "What a real quote includes",
        blocks: [
          {
            kind: "list",
            items: [
              "Pressure washing, and time to dry properly afterwards.",
              "Scraping and treating any mildew rather than painting over it.",
              "Patching and sealing cracks with a flexible sealant, not bridging them with paint.",
              "Caulking at all penetrations and trim joints.",
              "Priming bare stucco.",
              "Two coats.",
            ],
          },
          {
            kind: "p",
            text: "If a bidder is spraying one heavy coat over unwashed stucco in a single day, that is a three-year paint job priced as a ten-year one.",
          },
        ],
      },
      {
        heading: "Check what is underneath first",
        blocks: [
          {
            kind: "p",
            text: "Painting over a delaminated area seals moisture in and hides the evidence. Tap suspect areas and look at the crack pattern before anyone masks up: [stucco cracks, cosmetic or structural](/answers/exterior-and-florida-climate/stucco-cracks-cosmetic-or-structural).",
          },
        ],
      },
      {
        heading: "Getting more out of the cycle",
        blocks: [
          {
            kind: "steps",
            items: [
              "Keep sprinklers off the walls. Constant wetting shortens any coating.",
              "Trim vegetation back so walls dry after rain.",
              "Re-caulk penetrations at the halfway point rather than waiting for the next full repaint.",
              "Wash the house every couple of years, which removes the mildew that eats the finish.",
            ],
          },
          {
            kind: "p",
            text: "If you are painting before a sale, it is one of the few pre-sale jobs that reliably returns: [what is worth fixing before you list](/answers/buying-and-selling/what-to-fix-before-selling).",
          },
        ],
      },
      {
        heading: "Signs it is due now",
        blocks: [
          {
            kind: "list",
            items: [
              "Chalking: a powdery residue on your hand after touching the wall.",
              "Colour that has visibly faded on the south and west elevations only.",
              "Hairline cracks that have opened enough to hold water.",
              "Caulk that has pulled away at windows, doors and penetrations.",
              "Mildew that returns within weeks of washing.",
            ],
          },
          {
            kind: "p",
            text: "Two or more of those means the coating has stopped protecting the substrate rather than simply looking tired, and waiting another season starts to cost more than the paint would have.",
          },
        ],
      },
      {
        heading: "Colour choice and how long it lasts",
        blocks: [
          { kind: "p", text: "Deep and saturated colours fade faster in this sun, particularly reds and dark blues, and they show chalking sooner. Lighter, less saturated colours hold their appearance longer and reflect heat off the wall." },
          { kind: "p", text: "If you want a strong colour, put it on the front door, the shutters or a small accent wall where repainting is quick, and keep the main elevations in something that will still look deliberate in year eight." },
        ],
      },
    ],
  },

  "do-i-need-a-survey-before-a-fence": {
    updated: "2026-09-30",
    shortAnswer:
      "Get one, or at least find the existing corners. Fences built on guesswork are the most common neighbour dispute there is, and moving one afterwards costs far more than the survey. Check the permit rules, the HOA and any easements before you buy material.",
    sections: [
      {
        heading: "Why the survey is cheap insurance",
        blocks: [
          {
            kind: "p",
            text: "A fence in the wrong place is not a small problem. It can be a neighbour dispute, a title issue at resale, or a demolition. A boundary survey, or at minimum locating the existing corner markers, settles it before anyone digs.",
          },
        ],
      },
      {
        heading: "Three checks before you buy material",
        blocks: [
          {
            kind: "steps",
            items: [
              "Permit. Many jurisdictions require one for a fence, and it is usually inexpensive. Ask the building department with your parcel ID.",
              "HOA. Height, material, and which side the finished face has to point — associations are specific and they do enforce it.",
              "Easements. A utility easement across the rear means your fence may have to come out one day, at your expense.",
            ],
          },
        ],
      },
      {
        heading: "Building it so it stays up",
        blocks: [
          {
            kind: "p",
            text: "There is no frost line to worry about here, but there is wind, and there is sandy soil that gives up quickly. Set posts in concrete deep enough for the wind load and the fence height, use the right post spacing for the panel type, and keep the bottom rail clear of standing water.",
          },
          {
            kind: "p",
            text: "Gates are where fences fail. Use a proper gate post, braced, and hardware rated for the leaf weight.",
          },
        ],
      },
      {
        heading: "One more thing while you are planning",
        blocks: [
          {
            kind: "p",
            text: "Mark irrigation lines and any low-voltage cable before post holes go in, and call for utility locates. A fence contractor who does not ask about either is telling you something about how the job will go — the verification checklist is in [how to check a contractor is legitimate](/answers/hiring-and-project-planning/how-to-check-a-contractor-is-licensed).",
          },
        ],
      },
      {
        heading: "Talking to the neighbour first",
        blocks: [
          {
            kind: "p",
            text: "Most boundary disputes are not about the boundary; they are about the surprise. A short conversation before the posts go in, with the survey in your hand, prevents nearly all of them and occasionally turns into a shared cost.",
          },
          {
            kind: "p",
            text: "If a neighbour disagrees with the survey, stop and resolve it on paper before building. Moving a fence afterwards is expensive, and a fence built over a line becomes a title problem that surfaces when either house sells.",
          },
        ],
      },
      {
        heading: "Gates, drainage and the mower",
        blocks: [
          { kind: "p", text: "Leave a gate wide enough for what actually has to get through: a mower, a wheelbarrow, a skip bag, occasionally a small excavator. A single pedestrian gate at the side of a house is the most common regret." },
          { kind: "p", text: "Keep the fence line clear of the drainage route as well. A solid fence across a swale dams water, and in this climate that shows up as a wet corner of the garden after every storm." },
        ],
      },
    ],
  },

  "outdoor-kitchen-materials-florida": {
    updated: "2026-09-30",
    shortAnswer:
      "Assume salt air, ultraviolet and afternoon rain. A masonry base rather than wood framing, marine-grade polymer or powder-coated 316 stainless cabinetry, granite rather than quartz, and a roof over the whole thing if you possibly can.",
    sections: [
      {
        heading: "What lasts here",
        blocks: [
          {
            kind: "list",
            items: [
              "A block or masonry base. Wood framing outdoors in this climate is a maintenance project with a grill on top.",
              "Marine-grade polymer or powder-coated 316 stainless cabinetry. Standard 304 stainless will pit closer to the coast.",
              "Granite or another properly outdoor-rated stone. Quartz yellows in ultraviolet light.",
              "A roof. Covering the whole run roughly doubles the life of everything under it.",
            ],
          },
        ],
      },
      {
        heading: "The services people underestimate",
        blocks: [
          {
            kind: "p",
            text: "A GFCI circuit actually rated for the load rather than an extension from the lanai, and a gas line sized for the grill rather than a dozen tank swaps a year. Both are cheap while the base is being built and expensive afterwards, and both need a permit.",
          },
        ],
      },
      {
        heading: "Water has to go somewhere",
        blocks: [
          {
            kind: "p",
            text: "Slope the countertop and the deck so water runs away from the cabinets rather than into them, and leave a gap behind the run so wind-driven rain can drain. The failures I see are not dramatic; they are cabinet carcasses that were wet for three years.",
          },
        ],
      },
      {
        heading: "Maintenance that keeps it looking new",
        blocks: [
          {
            kind: "steps",
            items: [
              "Seal the stone annually.",
              "Rinse stainless with fresh water, especially after a storm.",
              "Cover the grill, and keep the burners clear.",
              "Check the gas connection and the GFCI at the start of each season.",
            ],
          },
          {
            kind: "p",
            text: "If the cage is coming off for other reasons, build the outdoor kitchen then: [pool cage, repair or replace](/answers/exterior-and-florida-climate/pool-cage-repair-or-replace). For the counter choice itself, [quartz against granite](/answers/kitchens-and-bathrooms/quartz-vs-granite-countertops) explains why the indoor answer flips outdoors.",
          },
        ],
      },
      {
        heading: "Plan the use before the cabinetry",
        blocks: [
          {
            kind: "p",
            text: "Most outdoor kitchens here are used for a grill, a fridge and a surface to put things down on. A sink needs a drain and a winter plan, a pizza oven needs structure and clearance, and a dishwasher outdoors rarely earns its place.",
          },
          {
            kind: "p",
            text: "Decide the appliance list first, then the layout, then the materials. That order avoids the common result: a large, expensive run of cabinetry where only one section is ever used.",
          },
        ],
      },
      {
        heading: "Where to put it",
        blocks: [
          { kind: "p", text: "Downwind of the seating, close enough to the kitchen door that carrying things is not a project, and under cover if the budget allows. Smoke, sun and rain decide whether an outdoor kitchen gets used or becomes an expensive shelf." },
          { kind: "p", text: "Check the gas and power routes before fixing the position. Moving a run of cabinetry two metres is a design decision; moving a gas line and a circuit is a second permit." },
        ],
      },
    ],
  },
};
