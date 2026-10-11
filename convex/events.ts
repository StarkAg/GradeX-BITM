import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { nowTs, requireAdmin } from "./lib/auth";

export const logSocialClick = mutation({
  args: {
    platform: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    await ctx.db.insert("socialClicks", {
      userId: identity?.subject,
      platform: args.platform.trim().slice(0, 32),
      createdAt: nowTs(),
    });
  },
});

export const submitFeedback = mutation({
  args: {
    feedback: v.string(),
    registerNumber: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const feedback = args.feedback.trim().slice(0, 2000);
    if (!feedback) return;
    await ctx.db.insert("feedback", {
      userId: identity?.subject,
      registerNumber: args.registerNumber?.trim().slice(0, 32),
      feedback,
      createdAt: nowTs(),
    });
  },
});

export const getSocialClickSummary = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const rows = await ctx.db.query("socialClicks").collect();
    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.platform] = (acc[row.platform] || 0) + 1;
      return acc;
    }, {});
  },
});
