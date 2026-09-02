/**
 * Where the signed-in admin session is cached between the setup project and
 * the admin suite.
 *
 * Its own module because Playwright refuses to let a spec import a setup file —
 * a shared constant would otherwise create exactly that edge.
 *
 * Git-ignored: it holds a real session token.
 */
export const ADMIN_STATE = "tests/.auth/admin.json";
