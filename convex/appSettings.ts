import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nowTs } from "./lib/auth";

const FORCE_UPDATE_KEY = "force_update_version";

/**
 * The version every client must be running, e.g. "1.2.0" (a leading "v" is
 * tolerated - the client strips it before comparing). Returns null when no
 * forced update is set, which is the normal state.
 *
 * Deliberately unauthenticated: the app checks this before/independently of
 * sign-in, so gating it behind auth would mean a client
 * stuck on a broken build could never be told to update.
 */
export const getForceUpdateVersion = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", FORCE_UPDATE_KEY))
      .first();

    return setting?.value || null;
  },
});

/**
 * Set (or clear, by passing an empty string) the required version. Every
 * client on an older version shows the "Updating GradeX BITM to vX..." splash
 * and hard-refreshes once, so treat this as a broadcast reload for all users.
 *
 * Internal on purpose: as a public mutation any signed-in student could reload
 * everyone's app. Run it from the CLI:
 *   npx convex run appSettings:setForceUpdateVersion '{"version":"1.3.0"}' --prod
 */
export const setForceUpdateVersion = internalMutation({
  args: { version: v.string() },
  handler: async (ctx, args) => {

    const value = args.version.trim();
    const now = nowTs();

    const existing = await ctx.db
      .query("appSettings")
      .withIndex("by_key", (q) => q.eq("key", FORCE_UPDATE_KEY))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: now });
      return { key: FORCE_UPDATE_KEY, value, updated: true };
    }

    await ctx.db.insert("appSettings", {
      key: FORCE_UPDATE_KEY,
      value,
      updatedAt: now,
      createdAt: now,
    });

    return { key: FORCE_UPDATE_KEY, value, created: true };
  },
});
