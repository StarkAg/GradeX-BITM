// Operator-only maintenance utilities, run via `npx convex run --prod`.
// Internal on purpose: these must never be callable from the client bundle (a
// public function here would let anyone reset anyone's data or password).
import { modifyAccountCredentials } from "@convex-dev/auth/server";
import { internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { DEFAULT_SUBJECTS, buildDefaultTimetableEntries } from "./defaults";

/**
 * Wipe a user's subjects + timetableEntries and reseed from the current
 * DEFAULT_SUBJECTS/DEFAULT_TIMETABLE. `ensureDefaultAcademicState` in users.ts
 * only ever seeds once per account (it no-ops if a subjects row already
 * exists), so an account created before a defaults.ts update is stuck with
 * whatever was seeded at signup time - this forces a fresh reseed for a
 * specific account without touching their attendance history or user record.
 *
 *   npx convex run maintenance:resetAcademicDefaults '{"userId":"<users _id>"}' --prod
 */
export const resetAcademicDefaults = internalMutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const deleteAllForUser = async (tableName: "subjects" | "timetableEntries") => {
      const rows = await ctx.db
        .query(tableName)
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      return rows.length;
    };

    const removedSubjects = await deleteAllForUser("subjects");
    const removedEntries = await deleteAllForUser("timetableEntries");

    const timestamp = Date.now();
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

    return {
      removedSubjects,
      removedEntries,
      insertedSubjects: DEFAULT_SUBJECTS.length,
      insertedEntries: buildDefaultTimetableEntries().length,
    };
  },
});

/**
 * Sets a new password for the account with this email. There is no "forgot
 * password" email (that needs an email service), so this is how a student who
 * has forgotten theirs gets back in: set one here and tell them.
 *
 *   npx convex run maintenance:setUserPassword '{"email":"a@b.com","password":"new-password"}' --prod
 */
export const setUserPassword = internalAction({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (args.password.length < 8) {
      throw new Error("Use a password of at least 8 characters.");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: { id: email, secret: args.password },
    });

    return { email, updated: true };
  },
});
