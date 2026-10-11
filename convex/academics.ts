import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  DEFAULT_SUBJECTS,
  DEFAULT_TIMETABLE,
  MAX_TIMETABLE_SLOTS,
  TIMETABLE_DAYS,
  resolveBaseSubjectCode,
} from "./defaults";
import { requireIdentity, nowTs } from "./lib/auth";

function buildEmptyTimetable() {
  const timetable: Record<string, Array<{ code: string; room?: string; isLab?: boolean } | null>> = {};
  for (const day of TIMETABLE_DAYS) {
    timetable[day] = Array(MAX_TIMETABLE_SLOTS).fill(null);
  }
  return timetable;
}

function buildDailyAttendanceMap(
  records: Array<{ date: string; subjectCode: string; status: "present" | "absent" }>
) {
  const map: Record<string, Record<string, "present" | "absent">> = {};
  for (const record of records) {
    if (!map[record.date]) map[record.date] = {};
    map[record.date][record.subjectCode] = record.status;
  }
  return map;
}

function buildHolidayMap(records: Array<{ date: string; label?: string }>) {
  const map: Record<string, string> = {};
  for (const record of records) {
    map[record.date] = record.label || "Holiday";
  }
  return map;
}

function buildAttendanceTotalsMap(
  rows: Array<{ subjectCode: string; classesAttended: number; classesConducted: number }>
) {
  const map: Record<string, { attended: number; conducted: number }> = {};
  for (const row of rows) {
    map[row.subjectCode] = {
      attended: row.classesAttended,
      conducted: row.classesConducted,
    };
  }
  return map;
}

async function upsertAttendanceTotal(
  ctx: any,
  userId: string,
  subjectCode: string,
  classesAttended: number,
  classesConducted: number
) {
  const existing = await ctx.db
    .query("attendanceTotals")
    .withIndex("by_user_id_subject_code", (q: any) =>
      q.eq("userId", userId).eq("subjectCode", subjectCode)
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      classesAttended,
      classesConducted,
      updatedAt: nowTs(),
    });
    return;
  }

  await ctx.db.insert("attendanceTotals", {
    userId,
    subjectCode,
    classesAttended,
    classesConducted,
    updatedAt: nowTs(),
  });
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_SUBJECTS = 60;

function assertDateKey(date: string) {
  if (!DATE_KEY_PATTERN.test(date)) {
    throw new Error("Invalid date");
  }
}

function toCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

async function getKnownSubjectCodes(ctx: any, userId: string) {
  const subjects = await ctx.db
    .query("subjects")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .collect();
  return new Set<string>(subjects.map((subject: { code: string }) => subject.code));
}

/**
 * Moves a subject's running total by the difference one calendar mark makes.
 * The total is NOT recounted from the daily rows: it also carries whatever the
 * student entered on the Attendance page (classes held before they started
 * marking day by day), and a recount threw that away on every calendar tap.
 */
async function adjustAttendanceTotal(
  ctx: any,
  userId: string,
  baseCode: string,
  attendedDelta: number,
  conductedDelta: number
) {
  if (attendedDelta === 0 && conductedDelta === 0) return;

  const existing = await ctx.db
    .query("attendanceTotals")
    .withIndex("by_user_id_subject_code", (q: any) =>
      q.eq("userId", userId).eq("subjectCode", baseCode)
    )
    .first();

  const classesConducted = Math.max(0, (existing?.classesConducted ?? 0) + conductedDelta);
  const classesAttended = Math.min(
    classesConducted,
    Math.max(0, (existing?.classesAttended ?? 0) + attendedDelta)
  );

  await upsertAttendanceTotal(ctx, userId, baseCode, classesAttended, classesConducted);
}

export const getCurrentSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const userId = identity.subject;

    const [profile, subjectDocs, timetableDocs, dailyDocs, totalDocs, holidayDocs] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
        .first(),
      ctx.db.query("subjects").withIndex("by_user_id", (q) => q.eq("userId", userId)).collect(),
      ctx.db
        .query("timetableEntries")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("attendanceDaily")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("attendanceTotals")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .collect(),
      ctx.db
        .query("holidays")
        .withIndex("by_user_id", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    const subjects = (subjectDocs.length ? subjectDocs : DEFAULT_SUBJECTS).map((subject) => ({
      name: subject.name,
      code: subject.code,
      room: subject.room || "LH-11",
      isLab: Boolean(subject.isLab),
    }));

    const timetable = buildEmptyTimetable();
    const sourceEntries = timetableDocs.length
      ? timetableDocs
      : Object.entries(DEFAULT_TIMETABLE).flatMap(([day, slots]) =>
          slots
            .map((slot, slotIndex) =>
              slot
                ? {
                    day,
                    slotIndex,
                    subjectCode: slot.code,
                    room: slot.room || "LH-11",
                    isLab: Boolean(slot.isLab),
                  }
                : null
            )
            .filter(Boolean)
        );

    for (const entry of sourceEntries) {
      if (!entry) continue;
      // One row outside the grid must not take the whole snapshot down with it.
      const daySlots = timetable[entry.day];
      if (!daySlots || entry.slotIndex < 0 || entry.slotIndex >= MAX_TIMETABLE_SLOTS) continue;
      daySlots[entry.slotIndex] = {
        code: entry.subjectCode,
        room: entry.room,
        isLab: Boolean(entry.isLab),
      };
    }

    return {
      profile: profile
        ? {
            id: profile.clerkUserId,
            username: profile.username,
            name: profile.name,
            email: profile.email || "",
            imageUrl: profile.imageUrl || "",
          }
        : null,
      subjects,
      timetable,
      attendanceTotals: buildAttendanceTotalsMap(totalDocs),
      dailyAttendance: buildDailyAttendanceMap(dailyDocs),
      holidays: buildHolidayMap(holidayDocs),
    };
  },
});

export const saveAcademicState = mutation({
  args: {
    subjects: v.array(
      v.object({
        name: v.string(),
        code: v.string(),
        room: v.string(),
        isLab: v.optional(v.boolean()),
      })
    ),
    timetable: v.any(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const userId = identity.subject;
    const timestamp = nowTs();

    if (args.subjects.length > MAX_SUBJECTS) {
      throw new Error("Too many subjects");
    }

    // Two subjects sharing a code would share one attendance record and one
    // timetable colour, so only the first of each code is kept.
    const nextCodes = new Set<string>();
    const nextSubjects: Array<{ name: string; code: string; room: string; isLab: boolean }> = [];
    for (const subject of args.subjects) {
      const code = subject.code.trim().slice(0, 32);
      const name = subject.name.trim().slice(0, 120);
      if (!code || !name || nextCodes.has(code)) continue;
      nextCodes.add(code);
      nextSubjects.push({
        name,
        code,
        room: subject.room.trim().slice(0, 40) || "LH-11",
        isLab: Boolean(subject.isLab),
      });
    }

    const existingSubjects = await ctx.db
      .query("subjects")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    for (const row of existingSubjects) {
      await ctx.db.delete(row._id);
    }

    const existingEntries = await ctx.db
      .query("timetableEntries")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    for (const row of existingEntries) {
      await ctx.db.delete(row._id);
    }

    for (const subject of nextSubjects) {
      await ctx.db.insert("subjects", {
        userId,
        code: subject.code,
        name: subject.name,
        room: subject.room,
        isLab: subject.isLab,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    const timetable = args.timetable && typeof args.timetable === "object" ? args.timetable : {};
    for (const day of TIMETABLE_DAYS) {
      const slots = Array.isArray(timetable[day]) ? timetable[day].slice(0, MAX_TIMETABLE_SLOTS) : [];
      for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
        const slot = slots[slotIndex];
        // A cell naming a subject that is not in the list has nothing to
        // show and nowhere to record attendance, so it is not stored.
        if (!slot || typeof slot.code !== "string" || !nextCodes.has(slot.code)) continue;

        await ctx.db.insert("timetableEntries", {
          userId,
          day,
          slotIndex,
          subjectCode: slot.code,
          room: (typeof slot.room === "string" && slot.room.trim().slice(0, 40)) || "LH-11",
          isLab: Boolean(slot.isLab),
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }

    // Attendance is kept for every subject still in the list and dropped only
    // for subjects that were removed.
    const attendanceTotals = await ctx.db
      .query("attendanceTotals")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    for (const row of attendanceTotals) {
      if (!nextCodes.has(resolveBaseSubjectCode(row.subjectCode, nextCodes))) {
        await ctx.db.delete(row._id);
      }
    }

    const attendanceDaily = await ctx.db
      .query("attendanceDaily")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    for (const row of attendanceDaily) {
      if (!nextCodes.has(resolveBaseSubjectCode(row.subjectCode, nextCodes))) {
        await ctx.db.delete(row._id);
      }
    }
  },
});

export const setManualAttendanceTotal = mutation({
  args: {
    subjectCode: v.string(),
    attended: v.number(),
    conducted: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const knownCodes = await getKnownSubjectCodes(ctx, identity.subject);
    const conducted = toCount(args.conducted);
    await upsertAttendanceTotal(
      ctx,
      identity.subject,
      resolveBaseSubjectCode(args.subjectCode.trim(), knownCodes),
      Math.min(conducted, toCount(args.attended)),
      conducted
    );
  },
});

export const setDailyAttendanceStatus = mutation({
  args: {
    date: v.string(),
    subjectCode: v.string(),
    status: v.union(v.literal("present"), v.literal("absent"), v.null()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const userId = identity.subject;
    assertDateKey(args.date);
    const subjectCode = args.subjectCode.trim();
    if (!subjectCode || subjectCode.length > 48) {
      throw new Error("Invalid subject");
    }

    const existing = await ctx.db
      .query("attendanceDaily")
      .withIndex("by_user_id_date_subject", (q) =>
        q.eq("userId", userId).eq("date", args.date).eq("subjectCode", subjectCode)
      )
      .first();

    const previous = existing?.status ?? null;
    // The same mark arriving twice (a double tap, a replayed offline write)
    // changes nothing, so it must not move the total either.
    if (previous === args.status) return;

    if (args.status === null) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    } else if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        updatedAt: nowTs(),
      });
    } else {
      await ctx.db.insert("attendanceDaily", {
        userId,
        date: args.date,
        subjectCode,
        status: args.status,
        createdAt: nowTs(),
        updatedAt: nowTs(),
      });
    }

    const knownCodes = await getKnownSubjectCodes(ctx, userId);
    await adjustAttendanceTotal(
      ctx,
      userId,
      resolveBaseSubjectCode(subjectCode, knownCodes),
      (args.status === "present" ? 1 : 0) - (previous === "present" ? 1 : 0),
      (args.status === null ? 0 : 1) - (previous === null ? 0 : 1)
    );
  },
});

export const setHoliday = mutation({
  args: {
    date: v.string(),
    isHoliday: v.boolean(),
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await requireIdentity(ctx);
    const userId = identity.subject;
    assertDateKey(args.date);
    const label = args.label?.trim().slice(0, 60);
    const existing = await ctx.db
      .query("holidays")
      .withIndex("by_user_id_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .first();

    if (!args.isHoliday) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    } else if (existing) {
      await ctx.db.patch(existing._id, {
        label: label || existing.label || "Holiday",
        updatedAt: nowTs(),
      });
    } else {
      await ctx.db.insert("holidays", {
        userId,
        date: args.date,
        label: label || "Holiday",
        createdAt: nowTs(),
        updatedAt: nowTs(),
      });
    }
  },
});
