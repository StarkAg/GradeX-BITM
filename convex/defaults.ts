// Real BBA III A (MO26) semester timetable, room LH-11 unless noted, W.E.F.
// 27/07/26 - transcribed from the printed departmental timetable (Dept. of
// Management, BIT Mesra, Lalpur Campus). Seeded onto every new student's
// account on first login.
//
// PD (Poddar's practical/session component, Mon x2) and PDTheory (Wed, Fri)
// are the same MN25201 course but distinct trackable sessions, printed as
// separate labels on the sheet - kept as separate codes rather than collapsed
// into one, matching how attendance is actually taken.
export const DEFAULT_SUBJECTS = [
  { name: "Personality Development (PD)", code: "PD", room: "LH-11", isLab: false },
  { name: "Personality Development - Theory", code: "PDTheory", room: "LH-11", isLab: false },
  { name: "Environmental Science (ES)", code: "ES", room: "LH-32", isLab: false },
  { name: "Computerized Accounting (CA)", code: "CA", room: "Lab", isLab: true },
  { name: "Introduction to Financial System (IFS)", code: "IFS", room: "LH-11", isLab: false },
  { name: "Introduction to Business Analytics (IBA)", code: "IBA", room: "LH-11", isLab: false },
  { name: "Quantitative Techniques in Management (QTM)", code: "QTM", room: "LH-11", isLab: false },
  { name: "Research Methodology (RM)", code: "RM", room: "LH-11", isLab: false },
  { name: "Indian Knowledge System (IKS)", code: "IKS", room: "LH-11", isLab: false },
] as const;

// Slot index 0-9 maps to the printed time columns:
// 0: 8:30-9:20   1: 9:30-10:20   2: 10:30-11:20   3: 11:30-12:20
// 4: 12:30-1:20  5: 1:30-2:20    6: 2:30-3:20     7: 3:30-4:20
// 8: 4:30-5:30   9: 5:30-6:30 (IKS runs both, tracked as two sessions)
export const DEFAULT_TIMETABLE: Record<string, Array<{ code: string; room?: string; isLab?: boolean } | null>> = {
  Monday: [{ code: "PD" }, { code: "PD" }, { code: "RM" }, { code: "CA" }, { code: "ES", room: "LH-32" }, null, null, null, { code: "IKS" }, { code: "IKS" }],
  Tuesday: [{ code: "RM" }, { code: "IFS" }, { code: "QTM" }, { code: "CA" }, null, null, null, null, null, null],
  Wednesday: [{ code: "PDTheory" }, { code: "ES", room: "LH-32" }, { code: "QTM" }, { code: "IBA" }, null, null, null, null, null, null],
  Thursday: [{ code: "IFS" }, { code: "IBA" }, { code: "CA", room: "Lab", isLab: true }, { code: "CA", room: "Lab", isLab: true }, null, null, null, null, null, null],
  Friday: [{ code: "RM" }, { code: "IBA" }, { code: "IFS" }, { code: "QTM" }, { code: "PDTheory", room: "LH-32" }, null, null, null, null, null],
};

export const TIMETABLE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

// Attendance rows are keyed by a per-slot code so that two hours of the same
// subject on one day count separately: "PD", "PD-2", "CA-LAB", "CA-LAB-2".
// Strips one such suffix; returns the input unchanged when there is none.
function stripSlotSuffix(subjectCode: string) {
  if (subjectCode.endsWith("-LAB")) {
    return subjectCode.slice(0, -4);
  }

  const parts = subjectCode.split("-");
  const lastPart = parts[parts.length - 1];
  if (parts.length > 1 && /^\d+$/.test(lastPart)) {
    return parts.slice(0, -1).join("-");
  }

  return subjectCode;
}

export function normalizeBaseSubjectCode(subjectCode: string) {
  let current = subjectCode;
  for (let i = 0; i < 3; i += 1) {
    const next = stripSlotSuffix(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

/**
 * Which subject an attendance row belongs to. A subject's own code can itself
 * look like a slot suffix ("CS-101"), so the user's real codes win: the longest
 * prefix of the row code that is a known subject is the owner. Falls back to
 * plain suffix stripping when nothing matches (subject since deleted).
 */
export function resolveBaseSubjectCode(subjectCode: string, knownCodes: Set<string>) {
  let current = subjectCode;
  for (let i = 0; i < 4; i += 1) {
    if (knownCodes.has(current)) return current;
    const next = stripSlotSuffix(current);
    if (next === current) break;
    current = next;
  }
  return normalizeBaseSubjectCode(subjectCode);
}

export const MAX_TIMETABLE_SLOTS = 10;

export function buildDefaultTimetableEntries() {
  const entries: Array<{
    day: string;
    slotIndex: number;
    subjectCode: string;
    room: string;
    isLab: boolean;
  }> = [];

  for (const [day, slots] of Object.entries(DEFAULT_TIMETABLE)) {
    slots.forEach((cell, slotIndex) => {
      if (!cell?.code) return;
      entries.push({
        day,
        slotIndex,
        subjectCode: cell.code,
        room: cell.room || "LH-11",
        isLab: Boolean(cell.isLab),
      });
    });
  }

  return entries;
}
