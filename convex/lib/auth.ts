import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * The signed-in user's id, which is also the key every academic row is stored
 * under. The account is looked up, not just the token: a token outlives a
 * deleted account by up to an hour, and must not be able to write rows for it.
 */
export async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null || (await ctx.db.get(userId)) === null) {
    throw new Error("Not authenticated");
  }

  return userId;
}

/**
 * Admin-only functions. Being signed in is not enough: every student has an
 * account. Admins are the user ids listed, comma-separated, in the Convex
 * environment variable ADMIN_USER_IDS. With it unset, nobody is an admin.
 *
 * Ids, not emails: an email address here is only what someone typed when
 * signing up, never proof of who they are.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await requireUserId(ctx);

  const adminIds = (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (!adminIds.includes(userId)) {
    throw new Error("Not authorized");
  }

  return userId;
}

export function nowTs() {
  return Date.now();
}
