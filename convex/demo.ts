import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { DEFAULT_SUBJECTS } from "./defaults";
import { nowTs } from "./lib/auth";

export const listSubjectCatalog = query({
  args: {},
  handler: async (ctx) => {
    const subjects = await ctx.db.query("subjects").collect();
    if (!subjects.length) {
      return DEFAULT_SUBJECTS;
    }

    const unique = new Map<string, { name: string; code: string; room: string; isLab: boolean }>();
    for (const subject of subjects) {
      if (!unique.has(subject.code)) {
        unique.set(subject.code, {
          name: subject.name,
          code: subject.code,
          room: subject.room || "LH-11",
          isLab: Boolean(subject.isLab),
        });
      }
    }

    return Array.from(unique.values());
  },
});

export const setFacultyAttendance = mutation({
  args: {
    facultyId: v.string(),
    studentId: v.string(),
    studentName: v.string(),
    date: v.string(),
    subjectCode: v.string(),
    classroom: v.string(),
    status: v.union(v.literal("present"), v.literal("absent"), v.null()),
  },
  handler: async (ctx, args) => {
    const existingRows = await ctx.db
      .query("facultyAttendance")
      .withIndex("by_student_id_date", (q) =>
        q.eq("studentId", args.studentId).eq("date", args.date)
      )
      .collect();

    const existing = existingRows.find(
      (row) => row.facultyId === args.facultyId && row.subjectCode === args.subjectCode
    );

    if (args.status === null) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        studentName: args.studentName,
        status: args.status,
        classroom: args.classroom,
        updatedAt: nowTs(),
      });
      return;
    }

    await ctx.db.insert("facultyAttendance", {
      facultyId: args.facultyId,
      studentId: args.studentId,
      studentName: args.studentName,
      date: args.date,
      subjectCode: args.subjectCode,
      status: args.status,
      classroom: args.classroom,
      updatedAt: nowTs(),
    });
  },
});

export const getStudentFacultyAttendance = query({
  args: {
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("facultyAttendance")
      .withIndex("by_student_id", (q) => q.eq("studentId", args.studentId))
      .collect();

    return rows.sort((a, b) => b.date.localeCompare(a.date));
  },
});
