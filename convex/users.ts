import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { DEFAULT_SUBJECTS, buildDefaultTimetableEntries } from "./defaults";
import { requireIdentity, nowTs } from "./lib/auth";

async function ensureDefaultAcademicState(ctx: Parameters<typeof mutation>[0]["handler"] extends never ? never : any, userId: string) {
  const existingSubject = await ctx.db
    .query("subjects")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
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

export const syncCurrentUser = mutation({
  args: {
    username: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const timestamp = nowTs();

    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        username: args.username,
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
        firstName: args.firstName,
        lastName: args.lastName,
        updatedAt: timestamp,
      });
    } else {
      await ctx.db.insert("users", {
        clerkUserId: identity.subject,
        username: args.username,
        name: args.name,
        email: args.email,
        imageUrl: args.imageUrl,
        firstName: args.firstName,
        lastName: args.lastName,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    await ensureDefaultAcademicState(ctx, identity.subject);

    return {
      id: identity.subject,
      username: args.username,
      name: args.name,
      email: args.email,
    };
  },
});

export const getCurrentProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!user) {
      return null;
    }

    return {
      id: user.clerkUserId,
      username: user.username,
      name: user.name,
      email: user.email || "",
      imageUrl: user.imageUrl || "",
      firstName: user.firstName || "",
      lastName: user.lastName || "",
    };
  },
});

export const updateCurrentProfile = mutation({
  args: {
    name: v.string(),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .first();

    if (!existing) {
      throw new Error("User profile not found");
    }

    await ctx.db.patch(existing._id, {
      name: args.name,
      username: args.username || existing.username,
      firstName: args.firstName,
      lastName: args.lastName,
      imageUrl: args.imageUrl,
      email: args.email,
      updatedAt: nowTs(),
    });
  },
});

export const deleteCurrentUserData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const userId = identity.subject;

    const deleteMany = async (tableName: any, indexName: any, field: any) => {
      const rows = await ctx.db
        .query(tableName)
        .withIndex(indexName, (q: any) => q.eq(field, userId))
        .collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    };

    await deleteMany("subjects", "by_user_id", "userId");
    await deleteMany("timetableEntries", "by_user_id", "userId");
    await deleteMany("attendanceDaily", "by_user_id", "userId");
    await deleteMany("attendanceTotals", "by_user_id", "userId");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();
    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});
