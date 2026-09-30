import type { AnswerBody } from "@/lib/content/answers";

/** Published copy for the systems-and-maintenance answers (docs/18 § 3). */
export const systemsAndMaintenance: Record<string, AnswerBody> = {
  "polybutylene-repipe-what-is-involved": {
    updated: "2026-09-30",
    shortAnswer:
      "A whole-home repipe, and it is less awful than it sounds. Typically PEX run through the attic and dropped down walls, so drywall is cut at each fixture and at the manifold rather than the slab being trenched. Check whether drywall repair is included — often it is not.",
    sections: [
      {
        heading: "What the work actually involves",
        blocks: [
          {
            kind: "p",
            text: "New PEX lines are run through the attic and dropped down inside the walls to each fixture. That means small, deliberate openings in the drywall at each fixture and at the manifold, rather than cutting the slab, which is what most people are quietly dreading.",
          },
          {
            kind: "p",
            text: "A typical three-bathroom house is often a few days of plumbing, plus drywall repair and paint afterwards.",
          },
        ],
      },
      {
        heading: "The questions that decide the quote",
        blocks: [
          {
            kind: "steps",
            items: [
              "Is drywall repair and texture matching included, and to what standard — patched, or patched and painted?",
              "Are the angle stops and supply lines being replaced while the walls are open? They should be.",
              "Is the water heater connection being redone?",
              "Is the permit pulled and inspected? Your insurer will want the proof.",
            ],
          },
          {
            kind: "p",
            text: "Drywall is the line that varies most between quotes and it is often excluded entirely, which is how two prices that look different turn out to be the same.",
          },
        ],
      },
      {
        heading: "Why the insurer is asking",
        blocks: [
          {
            kind: "p",
            text: "Polybutylene is one of the four-point items that can make a house uninsurable at ordinary rates. Once the repipe is done and the permit is closed, send the documentation to your agent and ask for the policy to be re-rated — the work does nothing for your premium until somebody updates the file.",
          },
          {
            kind: "p",
            text: "The wider list of what carriers look at is in [the 4-point and wind mitigation explained](/answers/inspections-and-insurance/four-point-and-wind-mitigation-explained).",
          },
        ],
      },
      {
        heading: "If you are buying rather than owning",
        blocks: [
          {
            kind: "p",
            text: "Find out before the inspection period ends, get a repipe quote rather than an estimate, and negotiate on the real number. It is a known, finite cost, which makes it one of the easier things to trade in a contract — and one of the worst to discover afterwards: [when to get a Florida insurance quote](/answers/inspections-and-insurance/when-to-get-a-florida-insurance-quote).",
          },
          {
            kind: "p",
            text: "I coordinate these constantly, including the drywall and paint that follows: [contractor services](/hire-contractor).",
          },
        ],
      },
      {
        heading: "What to expect while the work runs",
        blocks: [
          {
            kind: "list",
            items: [
              "Water off for parts of each day, usually with notice.",
              "Ceiling and wall openings at each fixture and at the manifold, then patching.",
              "Attic access needed, so anything stored up there has to move.",
              "An inspection before anything is closed up, which is the part you want.",
            ],
          },
          {
            kind: "p",
            text: "Ask for the schedule in writing, including which days the water is off, and agree where the openings will be cut. Both are easy questions before the job and awkward ones in the middle of it.",
          },
        ],
      },
    ],
  },

  "hvac-quotes-different-sizes-manual-j": {
    updated: "2026-09-30",
    shortAnswer:
      "Whichever one did a Manual J load calculation, and if none of them did, none of them are right. Sizing by square footage or by what is already installed is guessing, and oversizing is the classic Florida mistake — a clammy, cool house.",
    sections: [
      {
        heading: "Why oversizing is the Florida failure",
        blocks: [
          {
            kind: "p",
            text: "A system that is too large cools the air quickly, satisfies the thermostat and shuts off before it has run long enough to remove humidity. You end up with a clammy house at 74 degrees, condensation on vents, and a real mould risk. Bigger is not safer here; it is worse.",
          },
        ],
      },
      {
        heading: "Ask each bidder for the load calculation",
        blocks: [
          {
            kind: "p",
            text: "A Manual J takes the house as it is: orientation, glazing, insulation, infiltration, ceiling heights, and the actual occupancy. It produces a number that has a reason behind it. Ask to see it. A contractor who has done one will hand it over; one who has not will explain why it is unnecessary.",
          },
        ],
      },
      {
        heading: "The two things that get ignored",
        blocks: [
          {
            kind: "list",
            items: [
              "Duct work. Leaky or undersized returns waste a large fraction of a new system's capacity, and no equipment upgrade fixes an undersized return.",
              "Condensate routing. Where the drain runs, whether there is a secondary drain and a pan, and whether it is accessible to flush — this is the number one cause of ceiling damage in Florida houses.",
            ],
          },
        ],
      },
      {
        heading: "What to get in writing",
        blocks: [
          {
            kind: "steps",
            items: [
              "The Manual J result and the equipment selected against it.",
              "What is happening to the ducts and the returns.",
              "Air handler location, drain pan, and how the condensate is routed.",
              "Permit and inspection, in the contractor name.",
              "Start-up readings: airflow and temperature split, recorded on the day.",
            ],
          },
          {
            kind: "p",
            text: "If the goal behind the new system is a lower bill, the equipment is not where the money is: [the best ways to cut a Florida power bill](/answers/systems-and-maintenance/cut-a-florida-power-bill).",
          },
        ],
      },
      {
        heading: "What to ask about humidity specifically",
        blocks: [
          {
            kind: "p",
            text: "In this climate the system is a dehumidifier that also cools. Ask each bidder how their proposal handles humidity: variable-speed equipment, a longer run time at lower capacity, and correctly sized ducts all pull more moisture out than a larger unit does.",
          },
          {
            kind: "p",
            text: "If a house has been humid with an oversized system, the answer is rarely a bigger one. It is usually a correctly sized system, sealed ducts and a return path that lets it run long enough to work.",
          },
        ],
      },
      {
        heading: "The warranty and who honours it",
        blocks: [
          { kind: "p", text: "Equipment warranties are usually from the manufacturer and depend on registration within a set period, while labour is from the installer. Ask who registers the equipment, what the labour warranty is, and what happens if the installer is no longer trading." },
          { kind: "p", text: "Ask about maintenance requirements too. Most manufacturer warranties expect annual servicing and proof of it, which is another reason to keep the folder of documents." },
        ],
      },
    ],
  },

  "cut-a-florida-power-bill": {
    updated: "2026-09-30",
    shortAnswer:
      "In order of return: air sealing first, then attic insulation to R-38 or better, then sealing or replacing bad duct work, then a radiant barrier. Windows are last — they are a comfort and noise upgrade more than an energy one.",
    sections: [
      {
        heading: "The order matters more than the products",
        blocks: [
          {
            kind: "steps",
            items: [
              "Air sealing. Unglamorous and cheap: seal the attic penetrations, top plates, can lights and duct boots before adding anything else.",
              "Attic insulation, up to R-38 or better, once the sealing is done. Insulation over an unsealed ceiling is a filter, not a barrier.",
              "Duct work. Seal it, and replace it if it is bad. Ducts in a 130-degree attic leaking a fifth of the air is common and expensive.",
              "A radiant barrier, which helps here more than in most climates but far less than the first three.",
              "Windows, last, for the reasons below.",
            ],
          },
        ],
      },
      {
        heading: "Why windows are last",
        blocks: [
          {
            kind: "p",
            text: "New windows are a genuine comfort and noise improvement and they can earn an insurance credit, but the energy payback period is long compared with everything above them. Buy them for the reasons in [are impact windows worth it](/answers/exterior-and-florida-climate/are-impact-windows-worth-it-florida), and treat the energy saving as a bonus rather than the business case.",
          },
        ],
      },
      {
        heading: "Measure rather than guess",
        blocks: [
          {
            kind: "p",
            text: "A blower door test tells you how leaky the house actually is and where. It turns this list from general advice into a work order for your specific house, and it is inexpensive next to the work it directs.",
          },
        ],
      },
      {
        heading: "The free half of it",
        blocks: [
          {
            kind: "list",
            items: [
              "Change the filter on schedule. A blocked filter costs capacity and shortens equipment life.",
              "Keep the condenser clear of shrubs and clean the coil.",
              "Use ceiling fans in occupied rooms only — they cool people, not rooms.",
              "Shade the west-facing glass, which is where the afternoon load arrives.",
            ],
          },
          {
            kind: "p",
            text: "If the system itself is due, get the sizing right before you buy: [why four HVAC quotes give four different sizes](/answers/systems-and-maintenance/hvac-quotes-different-sizes-manual-j).",
          },
        ],
      },
      {
        heading: "What each step is worth, roughly",
        blocks: [
          {
            kind: "p",
            text: "Air sealing and insulation change how hard the system has to work, which affects every hour of every day. Duct sealing recovers air you are already paying to cool. A radiant barrier reduces attic temperature, which helps the ducts and the ceiling.",
          },
          {
            kind: "p",
            text: "Equipment replacement is the most expensive step and the one people start with. If the current system is not at the end of its life, do the first three and then re-size the replacement when the time comes: a tighter house often needs a smaller unit, which costs less to buy and less to run.",
          },
        ],
      },
    ],
  },

  "aging-in-place-home-modifications": {
    updated: "2026-09-30",
    shortAnswer:
      "Bathroom first, because that is where the falls happen: a curbless or low-threshold shower, a handheld on a slide bar, a comfort-height toilet and grab bars lagged into blocking. Then lighting, which prevents more falls than almost anything else.",
    sections: [
      {
        heading: "The bathroom, in order",
        blocks: [
          {
            kind: "list",
            items: [
              "A curbless or low-threshold shower, so nothing has to be stepped over.",
              "A handheld shower on a slide bar, usable seated or standing.",
              "A comfort-height toilet.",
              "Real grab bars, lagged into blocking or studs. Suction-cup bars are worse than nothing because they are trusted.",
            ],
          },
        ],
      },
      {
        heading: "Lighting is badly underrated",
        blocks: [
          {
            kind: "p",
            text: "Motion-sensor night lighting from the bed to the bathroom prevents more falls than almost any single modification, and it costs very little. Add more light generally — older eyes need considerably more of it — and remove the sharp contrast between a bright hallway and a dark room.",
          },
        ],
      },
      {
        heading: "The cheap structural moves",
        blocks: [
          {
            kind: "list",
            items: [
              "Thresholds levelled, and rugs removed or properly fixed down.",
              "A 36-inch door on at least one bathroom.",
              "Lever handles instead of knobs, everywhere.",
              "Plywood blocking in the walls now, even if the bars go in later.",
            ],
          },
          {
            kind: "p",
            text: "That last one is the point: during any remodel, blocking costs almost nothing. Afterwards it means opening the wall again.",
          },
        ],
      },
      {
        heading: "If this is part of a bigger plan",
        blocks: [
          {
            kind: "p",
            text: "A parent moving in usually means a suite rather than a set of modifications, and the design decisions are different: [in-law suite planning mistakes](/answers/additions-and-conversions/in-law-suite-planning-mistakes). If a shower is being rebuilt anyway, [do it curbless now](/answers/kitchens-and-bathrooms/tub-to-walk-in-shower-conversion) rather than twice.",
          },
          {
            kind: "p",
            text: "I build these in Central Florida, and the cheap items genuinely do most of the work.",
          },
        ],
      },
      {
        heading: "Outside the bathroom",
        blocks: [
          {
            kind: "list",
            items: [
              "A step-free entrance somewhere, even if it is the garage door rather than the front door.",
              "A bedroom and a full bathroom on the ground floor.",
              "Wider circulation at the kitchen and at the end of hallways, where a walker has to turn.",
              "Non-slip flooring, particularly at the transitions between rooms.",
              "Handrails on both sides of any steps, including the one into the garage.",
            ],
          },
          {
            kind: "p",
            text: "Most of those are cheap during a renovation that is happening anyway, which is why this list belongs in the planning conversation rather than in an emergency after a fall.",
          },
        ],
      },
      {
        heading: "Do it in the right order",
        blocks: [
          { kind: "p", text: "Bathroom first, then lighting, then thresholds and flooring, then the entrance. That order matches where falls actually happen, and it means the most useful work is done first if the budget runs out." },
          { kind: "p", text: "If a renovation is already planned elsewhere in the house, bring the blocking and any wider doorways forward into that job. The labour is already on site and the walls are already open." },
        ],
      },
    ],
  },

  "first-year-homeowner-maintenance-florida": {
    updated: "2026-09-30",
    shortAnswer:
      "Florida-specific and short: flush the AC condensate line monthly, change the filter, clear gutters before the wet season, check for damp under sinks and around the water heater, and know where the main water shutoff is before you need it.",
    sections: [
      {
        heading: "Monthly",
        blocks: [
          {
            kind: "list",
            items: [
              "Check and flush the AC condensate drain line. A clogged line is the number one cause of ceiling damage in this state.",
              "Change or check the filter.",
            ],
          },
        ],
      },
      {
        heading: "Quarterly",
        blocks: [
          {
            kind: "list",
            items: [
              "Run water in unused drains so the traps do not dry out.",
              "Look under every sink and around the water heater for damp.",
              "Test the GFCI outlets.",
            ],
          },
        ],
      },
      {
        heading: "Twice a year",
        blocks: [
          {
            kind: "list",
            items: [
              "Clear the gutters before the wet season starts.",
              "Walk the roof line with binoculars, looking at pipe boots and flashing rather than the shingles.",
              "Trim branches back off the roof.",
              "Clean the dryer vent.",
            ],
          },
        ],
      },
      {
        heading: "Annually, and the one thing to do today",
        blocks: [
          {
            kind: "steps",
            items: [
              "Have the HVAC serviced.",
              "Re-caulk the tub and shower where the joint has opened.",
              "Check the attic for daylight and for wet insulation after a hard rain.",
              "Find the main water shutoff, label it, and make sure it turns.",
            ],
          },
          {
            kind: "p",
            text: "Around nine in ten of the expensive calls I get started as one item on this list. If the house is new, the other date that matters is the [eleven-month warranty list](/answers/new-construction-and-building/eleven-month-warranty-list).",
          },
        ],
      },
      {
        heading: "Set it up once, then it runs",
        blocks: [
          {
            kind: "steps",
            items: [
              "Put the monthly and quarterly items in a calendar with reminders.",
              "Keep one folder: permits, warranties, the insurance declaration page, the wind mitigation report and any inspection reports.",
              "Photograph the model and serial plates on the air handler, condenser and water heater.",
              "Write down the shutoff locations for water, power and gas, and tell everyone in the house.",
            ],
          },
          {
            kind: "p",
            text: "That folder is also the thing that makes the house easy to sell later, because every document a buyer or an insurer asks for is already in it.",
          },
        ],
      },
      {
        heading: "Before the first storm season",
        blocks: [
          { kind: "p", text: "Walk the outside of the house once and look at four things: where water leaves the roof, whether the ground slopes away from the walls, whether trees overhang the roof, and whether anything loose in the garden would move in wind." },
          { kind: "p", text: "Then check that you know how to shut off the water and the power, and that your insurance documents and permits are somewhere you could find them quickly. That is most of storm preparation, and it is done once rather than annually." },
        ],
      },
      {
        heading: "The two things worth paying for",
        blocks: [
          {
            kind: "p",
            text: "An annual air-conditioning service, because the system runs most of the year here and a failed capacitor in August is an emergency call at emergency prices. And a gutter clean before the wet season if the house has trees near it.",
          },
          {
            kind: "p",
            text: "Everything else on this list is yours to do with a torch and half an hour. That is the point of it: almost none of the expensive failures in a Florida house start as something complicated.",
          },
        ],
      },
    ],
  },

  "drywall-cracks-at-door-corners": {
    updated: "2026-09-30",
    shortAnswer:
      "Cracks at the upper corners of doors and windows are the most common cracks there are, because that is where the wall is weakest. Hairline and stable means tape and repair rather than caulk. Worry if they are wide, diagonal across the wall, or matched by cracks in the slab or stucco.",
    sections: [
      {
        heading: "Why they appear there",
        blocks: [
          {
            kind: "p",
            text: "An opening interrupts the wall, and any movement in the structure concentrates at its corners. Seasonal movement in this climate is real: humidity swings, framing that dries, a slab that moves fractionally. Hairline cracking at those corners is normal behaviour, not a defect.",
          },
        ],
      },
      {
        heading: "Repair it properly, once",
        blocks: [
          {
            kind: "steps",
            items: [
              "Cut out the crack into a clean V.",
              "Tape it with mesh or paper tape. Caulk alone always comes back.",
              "Three coats of compound, feathered wide.",
              "Match the texture, then prime and paint the whole wall rather than spot-painting.",
            ],
          },
        ],
      },
      {
        heading: "When it is not cosmetic",
        blocks: [
          {
            kind: "list",
            items: [
              "Wider than about an eighth of an inch.",
              "Running diagonally across the wall rather than off the corner.",
              "The door no longer closes squarely, or the latch has moved.",
              "Matching cracks in the slab, or stair-step cracking in the exterior stucco.",
            ],
          },
          {
            kind: "p",
            text: "That pattern is a foundation conversation rather than a drywall one, and the outside evidence is worth photographing first: [stucco cracks, cosmetic or structural](/answers/exterior-and-florida-climate/stucco-cracks-cosmetic-or-structural).",
          },
        ],
      },
      {
        heading: "In a new house",
        blocks: [
          {
            kind: "p",
            text: "Corner cracks and nail pops in the first year are expected as the house dries and settles, and they belong on the warranty list rather than on your own to-do list: [what to put on the eleven-month list](/answers/new-construction-and-building/eleven-month-warranty-list).",
          },
        ],
      },
      {
        heading: "When to repair, and when to wait",
        blocks: [
          {
            kind: "p",
            text: "If the house is new, wait. Framing dries and settles through the first year, and a crack repaired in month three usually reappears. Put it on the eleven-month list instead.",
          },
          {
            kind: "p",
            text: "If the house is older and the crack is new, watch it for a season and mark the ends with a pencil. A crack that stops growing is movement that has finished; one that keeps extending is telling you something about the structure and is worth looking at properly before it is filled.",
          },
        ],
      },
      {
        heading: "Painting over a repair",
        blocks: [
          { kind: "p", text: "A patched crack that is spot-painted almost always shows, because the sheen and the texture differ from the surrounding wall. Paint the full wall, corner to corner, and match the texture before priming." },
          { kind: "p", text: "If the wall has a heavy texture, ask whoever does the repair to practise the match on a board first. It takes ten minutes and it is the difference between an invisible repair and a permanent patch." },
        ],
      },
    ],
  },
};
