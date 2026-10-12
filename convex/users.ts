import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { DEFAULT_SUBJECTS, buildDefaultTimetableEntries } from "./defaults";
import { requireUserId, nowTs } from "./lib/auth";

const ACADEMIC_TABLES = [
  "subjects",
  "timetableEntries",
  "attendanceDaily",
  "attendanceTotals",
  "holidays",
] as const;

function usernameFor(user: Doc<"users">) {
  return user.username || (user.email || "").split("@")[0] || "user";
}

// The shape every screen receives. `name` falls back to the username, which
// is how the app tells that no name has been entered yet.
export function toProfile(user: Doc<"users">) {
  const username = usernameFor(user);
  return {
    id: user._id as string,
    username,
    name: user.name || username,
    email: user.email || "",
    imageUrl: user.image || "",
  };
}

async function ensureDefaultAcademicState(ctx: MutationCtx, userId: string) {
  const existingSubject = await ctx.db
    .query("subjects")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .first();

  if (existingSubject) {
    return;
  }

  const timestamp = nowTs();
  for (const subject of DEFAULT_SUBJECTS) {
    await ctx.db.insert("subjects", {
      userId,
      code: subject.code,
      name: subject.name,
      room: subject.room,
      isLab: Boolean(subject.isLab),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }

  for (const entry of buildDefaultTimetableEntries()) {
    await ctx.db.insert("timetableEntries", {
      userId,
      day: entry.day,
      slotIndex: entry.slotIndex,
      subjectCode: entry.subjectCode,
      room: entry.room,
      isLab: entry.isLab,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  }
}

async function deleteAcademicRows(ctx: MutationCtx, userId: string) {
  for (const table of ACADEMIC_TABLES) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
    }
  }
}

/**
 * Brings an account from the Clerk sign-in across to the account its owner
 * has just created here with the same email: every subject, timetable slot,
 * attendance mark, total and holiday is re-filed under the new id, the name
 * and join date carry over, and the old row is removed.
 *
 * Returns the old Clerk id, so the device can also re-file anything it had
 * queued under it while offline.
 */
async function relinkLegacyAccount(ctx: MutationCtx, user: Doc<"users">) {
  if (!user.email || user.clerkUserId) return null;

  const sameEmail = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", user.email))
    .collect();
  const legacy = sameEmail.find((row) => row._id !== user._id && row.clerkUserId);
  if (!legacy?.clerkUserId) return null;

  const legacyId = legacy.clerkUserId;
  const hasLegacyData = await ctx.db
    .query("subjects")
    .withIndex("by_user_id", (q) => q.eq("userId", legacyId))
    .first();

  if (hasLegacyData) {
    // The new account holds nothing but the starter timetable at this point.
    await deleteAcademicRows(ctx, user._id);
    for (const table of ACADEMIC_TABLES) {
      const rows = await ctx.db
        .query(table)
        .withIndex("by_user_id", (q) => q.eq("userId", legacyId))
        .collect();
      for (const row of rows) {
        await ctx.db.patch(row._id, { userId: user._id });
      }
    }
  }

  const legacyName = legacy.name && legacy.name !== legacy.username ? legacy.name : undefined;
  await ctx.db.patch(user._id, {
    name: user.name || legacyName,
    username: user.username || legacy.username,
    createdAt: legacy.createdAt ?? legacy._creationTime,
    updatedAt: nowTs(),
  });
  await ctx.db.delete(legacy._id);

  return legacyId;
}

/**
 * Called by the app once after every sign-in and every launch. Makes sure the
 * account has its profile fields and a timetable, and performs the one-time
 * move from the Clerk sign-in described above.
 */
export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = (await ctx.db.get(userId))!;

    const legacyId = await relinkLegacyAccount(ctx, user);

    const current = (await ctx.db.get(userId))!;
    if (!current.username || !current.createdAt) {
      await ctx.db.patch(userId, {
        username: usernameFor(current),
        createdAt: current.createdAt ?? current._creationTime,
        updatedAt: nowTs(),
      });
    }

    await ensureDefaultAcademicState(ctx, userId);

    return { ...toProfile((await ctx.db.get(userId))!), legacyId };
  },
});

export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get(userId);
    return user ? toProfile(user) : null;
  },
});

export const updateCurrentProfile = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const name = args.name.trim().slice(0, 80);
    if (!name) {
      throw new Error("Name is required");
    }

    await ctx.db.patch(userId, { name, updatedAt: nowTs() });
  },
});

/**
 * Deletes the account and everything stored for it: academic data, the
 * password, every session on every device, and the profile row.
 */
export const deleteCurrentUserData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    await deleteAcademicRows(ctx, userId);

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) {
      const refreshTokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of refreshTokens) {
        await ctx.db.delete(token._id);
      }
      await ctx.db.delete(session._id);
    }

    const accounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const account of accounts) {
      const codes = await ctx.db
        .query("authVerificationCodes")
        .withIndex("accountId", (q) => q.eq("accountId", account._id))
        .collect();
      for (const code of codes) {
        await ctx.db.delete(code._id);
      }
      await ctx.db.delete(account._id);
    }

    await ctx.db.delete(userId as Id<"users">);
  },
});
