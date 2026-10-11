import type { MutationCtx, QueryCtx } from "../_generated/server";

export async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  return identity;
}

function envList(value: string | undefined) {
  return (value || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Admin-only functions. Being signed in is not enough: every student has an
 * account. Admins are named in the Convex environment, as Clerk user ids
 * (ADMIN_CLERK_USER_IDS) and/or verified sign-in emails (ADMIN_EMAILS), both
 * comma-separated. With neither set, nobody is an admin.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx);

  const adminIds = envList(process.env.ADMIN_CLERK_USER_IDS);
  const adminEmails = envList(process.env.ADMIN_EMAILS);
  const email = identity.emailVerified === false ? "" : (identity.email || "").toLowerCase();

  if (adminIds.includes(identity.subject.toLowerCase()) || (email && adminEmails.includes(email))) {
    return identity;
  }

  throw new Error("Not authorized");
}

export function nowTs() {
  return Date.now();
}
