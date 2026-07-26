import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    username: v.string(),
    name: v.string(),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerk_user_id", ["clerkUserId"]),

  subjects: defineTable({
    userId: v.string(),
    code: v.string(),
    name: v.string(),
    room: v.string(),
    isLab: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_code", ["userId", "code"]),

  timetableEntries: defineTable({
    userId: v.string(),
    day: v.string(),
    slotIndex: v.number(),
    subjectCode: v.string(),
    room: v.string(),
    isLab: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_day_slot", ["userId", "day", "slotIndex"])
    .index("by_user_id_subject_code", ["userId", "subjectCode"]),

  attendanceDaily: defineTable({
    userId: v.string(),
    date: v.string(),
    subjectCode: v.string(),
    status: v.union(v.literal("present"), v.literal("absent")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_date", ["userId", "date"])
    .index("by_user_id_date_subject", ["userId", "date", "subjectCode"])
    .index("by_user_id_subject_code", ["userId", "subjectCode"]),

  attendanceTotals: defineTable({
    userId: v.string(),
    subjectCode: v.string(),
    classesAttended: v.number(),
    classesConducted: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_id_subject_code", ["userId", "subjectCode"]),

  facultyAttendance: defineTable({
    facultyId: v.string(),
    studentId: v.string(),
    studentName: v.string(),
    date: v.string(),
    subjectCode: v.string(),
    status: v.union(v.literal("present"), v.literal("absent")),
    classroom: v.string(),
    updatedAt: v.number(),
  })
    .index("by_student_id", ["studentId"])
    .index("by_student_id_date", ["studentId", "date"])
    .index("by_faculty_id_date", ["facultyId", "date"]),

  feedback: defineTable({
    userId: v.optional(v.string()),
    registerNumber: v.optional(v.string()),
    feedback: v.string(),
    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  socialClicks: defineTable({
    userId: v.optional(v.string()),
    platform: v.string(),
    createdAt: v.number(),
  })
    .index("by_platform", ["platform"])
    .index("by_created_at", ["createdAt"]),

  enquiries: defineTable({
    registerNumber: v.optional(v.string()),
    resultFound: v.optional(v.boolean()),
    source: v.optional(v.string()),
    payload: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  featureFlags: defineTable({
    key: v.string(),
    enabled: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  groupgridVisits: defineTable({
    userId: v.optional(v.string()),
    route: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
  }).index("by_created_at", ["createdAt"]),

  sections: defineTable({
    code: v.string(),
    name: v.string(),
    semester: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_code", ["code"]),

  groupFormations: defineTable({
    sectionCode: v.string(),
    subjectCode: v.string(),
    title: v.string(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_section_code", ["sectionCode"])
    .index("by_subject_code", ["subjectCode"]),

  groups: defineTable({
    formationId: v.string(),
    name: v.string(),
    capacity: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_formation_id", ["formationId"]),

  groupMembers: defineTable({
    groupId: v.string(),
    userId: v.string(),
    role: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_group_id", ["groupId"])
    .index("by_user_id", ["userId"]),

  students: defineTable({
    studentId: v.string(),
    name: v.string(),
    registerNumber: v.optional(v.string()),
    sectionCode: v.optional(v.string()),
    email: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_student_id", ["studentId"])
    .index("by_register_number", ["registerNumber"])
    .index("by_section_code", ["sectionCode"]),

  groupStudentMembers: defineTable({
    groupId: v.string(),
    studentId: v.string(),
    createdAt: v.number(),
  })
    .index("by_group_id", ["groupId"])
    .index("by_student_id", ["studentId"]),
});
