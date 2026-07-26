// Operator-only maintenance utilities, run via `npx convex run --prod`.
// internalMutation on purpose: these must never be callable from the client
// bundle (a public `mutation` here would let anyone reset anyone's academic
// data by guessing a clerkUserId).
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { DEFAULT_SUBJECTS, buildDefaultTimetableEntries } from "./defaults";

/**
 * Wipe a user's subjects + timetableEntries and reseed from the current
 * DEFAULT_SUBJECTS/DEFAULT_TIMETABLE. `ensureDefaultAcademicState` in users.ts
 * only ever seeds once per account (it no-ops if a subjects row already
 * exists), so an account created before a defaults.ts update is stuck with
 * whatever was seeded at signup time - this forces a fresh reseed for a
 * specific account without touching their attendance history or user record.
 */
export const resetAcademicDefaults = internalMutation({
  args: { clerkUserId: v.string() },
  handler: async (ctx, { clerkUserId }) => {
    const deleteAllForUser = async (tableName: "subjects" | "timetableEntries") => {
      const rows = await ctx.db
        .query(tableName)
        .withIndex("by_user_id", (q) => q.eq("userId", clerkUserId))
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
        userId: clerkUserId,
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
        userId: clerkUserId,
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
