import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { DEFAULT_SUBJECTS, DEFAULT_TIMETABLE, TIMETABLE_DAYS, normalizeBaseSubjectCode } from "./defaults";
import { requireIdentity, nowTs } from "./lib/auth";

function buildEmptyTimetable() {
  const timetable: Record<string, Array<{ code: string; room?: string; isLab?: boolean } | null>> = {};
  for (const day of TIMETABLE_DAYS) {
    timetable[day] = Array(9).fill(null);
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

async function recalculateAttendanceTotal(ctx: any, userId: string, subjectCode: string) {
  const baseCode = normalizeBaseSubjectCode(subjectCode);
  const dailyRows = await ctx.db
    .query("attendanceDaily")
    .withIndex("by_user_id", (q: any) => q.eq("userId", userId))
    .collect();

  let classesAttended = 0;
  let classesConducted = 0;
  for (const row of dailyRows) {
    if (normalizeBaseSubjectCode(row.subjectCode) !== baseCode) continue;
    classesConducted += 1;
    if (row.status === "present") {
      classesAttended += 1;
    }
  }

  await upsertAttendanceTotal(ctx, userId, baseCode, classesAttended, classesConducted);
}

export const getCurrentSnapshot = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const userId = identity.subject;

    const [profile, subjectDocs, timetableDocs, dailyDocs, totalDocs] = await Promise.all([
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
      timetable[entry.day][entry.slotIndex] = {
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
    const nextCodes = new Set(args.subjects.map((subject) => subject.code));

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

    for (const subject of args.subjects) {
      await ctx.db.insert("subjects", {
        userId,
        code: subject.code,
        name: subject.name,
        room: subject.room || "LH-11",
        isLab: Boolean(subject.isLab),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }

    for (const day of Object.keys(args.timetable || {})) {
      const slots = Array.isArray(args.timetable[day]) ? args.timetable[day] : [];
      for (let slotIndex = 0; slotIndex < slots.length; slotIndex += 1) {
        const slot = slots[slotIndex];
        if (!slot?.code) continue;

        await ctx.db.insert("timetableEntries", {
          userId,
          day,
          slotIndex,
          subjectCode: slot.code,
          room: slot.room || "LH-11",
          isLab: Boolean(slot.isLab),
          createdAt: timestamp,
          updatedAt: timestamp,
        });
      }
    }

    const attendanceTotals = await ctx.db
      .query("attendanceTotals")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    for (const row of attendanceTotals) {
      if (!nextCodes.has(normalizeBaseSubjectCode(row.subjectCode))) {
        await ctx.db.delete(row._id);
      }
    }

    const attendanceDaily = await ctx.db
      .query("attendanceDaily")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .collect();
    for (const row of attendanceDaily) {
      if (!nextCodes.has(normalizeBaseSubjectCode(row.subjectCode))) {
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
    await upsertAttendanceTotal(
      ctx,
      identity.subject,
      normalizeBaseSubjectCode(args.subjectCode),
      Math.max(0, args.attended),
      Math.max(0, args.conducted)
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
    const existing = await ctx.db
      .query("attendanceDaily")
      .withIndex("by_user_id_date_subject", (q) =>
        q.eq("userId", userId).eq("date", args.date).eq("subjectCode", args.subjectCode)
      )
      .first();

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
        subjectCode: args.subjectCode,
        status: args.status,
        createdAt: nowTs(),
        updatedAt: nowTs(),
      });
    }

    await recalculateAttendanceTotal(ctx, userId, args.subjectCode);
  },
});
