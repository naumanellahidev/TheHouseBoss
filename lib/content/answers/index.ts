import type { AnswerBody } from "@/lib/content/answers";

import { additionsAndConversions } from "@/lib/content/answers/additions-and-conversions";
import { buyingAndSelling } from "@/lib/content/answers/buying-and-selling";
import { exteriorAndFloridaClimate } from "@/lib/content/answers/exterior-and-florida-climate";
import { hiringAndProjectPlanning } from "@/lib/content/answers/hiring-and-project-planning";
import { inspectionsAndInsurance } from "@/lib/content/answers/inspections-and-insurance";
import { investorsAndLandlords } from "@/lib/content/answers/investors-and-landlords";
import { kitchensAndBathrooms } from "@/lib/content/answers/kitchens-and-bathrooms";
import { newConstructionAndBuilding } from "@/lib/content/answers/new-construction-and-building";
import { systemsAndMaintenance } from "@/lib/content/answers/systems-and-maintenance";

/**
 * Every published answer body, keyed by slug.
 *
 * One module per category rather than one per answer: sixty-two files would be
 * sixty-two imports for no gain, and a category is the unit a person actually
 * edits in one sitting.
 *
 * A slug present in `answers-source.json` but missing here simply does not
 * publish — `lib/content/answers.ts` drops it and `scripts/check-answers.mjs`
 * reports it, so a half-written page cannot reach the sitemap.
 */
export const ANSWER_BODIES: Record<string, AnswerBody> = {
  ...buyingAndSelling,
  ...inspectionsAndInsurance,
  ...newConstructionAndBuilding,
  ...hiringAndProjectPlanning,
  ...additionsAndConversions,
  ...kitchensAndBathrooms,
  ...exteriorAndFloridaClimate,
  ...systemsAndMaintenance,
  ...investorsAndLandlords,
};
