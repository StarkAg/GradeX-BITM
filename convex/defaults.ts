// Real BBA IIA (MO26) semester timetable, room LH-11 unless noted, W.E.F.
// 27/07/26 - transcribed from the printed departmental timetable (Dept. of
// Management, BIT Mesra, Lalpur Campus). Seeded onto every new student's
// account on first login.
//
// PD (theory, Wed/Fri) and PDS (Poddar's practical/session component, Mon x2)
// are the same MN25201 course but distinct trackable sessions - the printed
// sheet lists them with different faculty, so they are kept as separate codes
// rather than collapsed into one, matching how attendance is actually taken.
export const DEFAULT_SUBJECTS = [
  { name: "Personality Development - Theory (PD)", code: "PD", room: "LH-11", isLab: false },
  { name: "Personality Development - Session (PDS)", code: "PDS", room: "LH-11", isLab: false },
  { name: "Environmental Science (ES)", code: "ES", room: "LH-32", isLab: false },
  { name: "Computerized Accounting (CA)", code: "CA", room: "Lab", isLab: true },
  { name: "Introduction to Financial System (IFS)", code: "IFS", room: "LH-11", isLab: false },
  { name: "Introduction to Business Analytics (IBA)", code: "IBA", room: "LH-11", isLab: false },
  { name: "Quantitative Techniques in Management (QTM)", code: "QTM", room: "LH-11", isLab: false },
  { name: "Research Methodology (RM)", code: "RM", room: "LH-11", isLab: false },
  { name: "Indian Knowledge System (IKS)", code: "IKS", room: "LH-11", isLab: false },
] as const;

// Slot index 0-8 maps to the printed time columns (uneven lengths, real
// class-period boundaries, not a flat hourly grid):
// 0: 08:30-09:20   1: 09:20-10:10   2: 10:20-11:10   3: 11:20-12:10
// 4: 12:20-13:20   5: 13:20-14:20   6: 14:30-15:20   7: 15:30-16:20
// 8: 16:30-17:20
export const DEFAULT_TIMETABLE: Record<string, Array<{ code: string; room?: string; isLab?: boolean } | null>> = {
  Monday: [{ code: "PDS" }, null, { code: "PDS" }, { code: "RM" }, { code: "CA" }, { code: "ES", room: "LH-32" }, null, null, { code: "IKS" }],
  Tuesday: [{ code: "RM" }, null, { code: "IFS" }, { code: "QTM" }, { code: "CA" }, null, null, null, null],
  Wednesday: [{ code: "PD" }, null, { code: "ES", room: "LH-32" }, { code: "QTM" }, { code: "IBA" }, null, null, null, null],
  Thursday: [{ code: "IFS" }, null, { code: "IBA" }, { code: "CA", room: "Lab", isLab: true }, { code: "CA", room: "Lab", isLab: true }, null, null, null, null],
  Friday: [{ code: "RM" }, null, { code: "IBA" }, { code: "IFS" }, { code: "QTM" }, { code: "PD", room: "LH-32" }, null, null, null],
};

export const TIMETABLE_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export function normalizeBaseSubjectCode(subjectCode: string) {
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
