// Real BBA IIA (MO26) semester timetable, room LH-11 unless noted, W.E.F.
// 27/07/26 - transcribed from the printed departmental timetable (Dept. of
// Management, BIT Mesra, Lalpur Campus). Seeded onto every new student's
// account on first login.
export const DEFAULT_SUBJECTS = [
  { name: "Personality Development (PD)", code: "PD", room: "LH-11", isLab: false },
  { name: "Environment Science (ES)", code: "ES", room: "LH-32", isLab: false },
  { name: "Computerized Accounting (CA)", code: "CA", room: "Lab", isLab: true },
  { name: "Introduction to Financial Systems (IFS)", code: "IFS", room: "LH-11", isLab: false },
  { name: "Quantitative Techniques in Management (QTM)", code: "QTM", room: "LH-11", isLab: false },
  { name: "Introduction to Business Analytics (IBA)", code: "IBA", room: "LH-11", isLab: false },
  { name: "Research Methodology (RM)", code: "RM", room: "LH-11", isLab: false },
  { name: "Indian Knowledge System (IKS)", code: "IKS", room: "Online", isLab: false },
] as const;

// Slot index 0-7 maps to the printed time columns:
// 0: 8.30-9.20   1: 9.30-10.20   2: 10.30-11.20   3: 11.30-12.20
// 4: 12.30-1.20  5: 1.30-2.20    6: 2.30-3.20     7: 3.30-4.20
//
// NOTE: this is a best-effort transcription off a rotated phone photo. The
// subject list above is read with confidence (clean printed table); this
// weekly grid is the harder-to-read part and should get a quick spot-check
// against the physical timetable, especially Thursday slot 0 (PD vs
// PDTheory - printed as a distinct block, room LH-32 not LH-11) and
// Friday's exact slot 2/3 order (IFS vs QTM).
export const DEFAULT_TIMETABLE: Record<string, Array<{ code: string; room?: string; isLab?: boolean } | null>> = {
  Monday: [{ code: "PD" }, { code: "RM" }, { code: "CA", room: "Lab", isLab: true }, { code: "CA", room: "Lab", isLab: true }, { code: "ES", room: "LH-32" }, null, null, null, null],
  Tuesday: [{ code: "PD" }, { code: "IFS" }, { code: "QTM" }, { code: "CA" }, null, null, null, null, null],
  Wednesday: [{ code: "RM" }, { code: "IBA" }, { code: "CA" }, { code: "QTM" }, null, null, null, null, null],
  Thursday: [{ code: "PD", room: "LH-32" }, { code: "IFS" }, { code: "CA", room: "Lab", isLab: true }, { code: "CA", room: "Lab", isLab: true }, { code: "ES", room: "LH-32" }, null, null, null, null],
  Friday: [{ code: "RM" }, { code: "ES" }, { code: "IFS" }, { code: "QTM" }, null, null, null, { code: "IKS", room: "Online" }, null],
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
