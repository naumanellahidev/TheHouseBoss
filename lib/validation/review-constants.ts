/**
 * The public review form's minimum length, with NO zod import — the review
 * form is a client component, and importing this from `review.ts` (which builds
 * its schema with zod at module scope) shipped all of zod to every visitor.
 * See `search-constants.ts`.
 */
export const PUBLIC_REVIEW_MIN = 60;
