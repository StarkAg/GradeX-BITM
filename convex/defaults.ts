export const DEFAULT_SUBJECTS = [
  { name: "Organizational Behavior", code: "OB", room: "LH-11", isLab: false },
  { name: "Marketing Management", code: "MM", room: "LH-11", isLab: false },
  { name: "Business Economics", code: "BE", room: "LH-11", isLab: false },
  { name: "Emotional Intelligence", code: "EI", room: "LH-11", isLab: false },
  { name: "Qualitative Data Analysis", code: "QDA", room: "LH-11", isLab: false },
  { name: "Web Application of Business", code: "WAB", room: "LH-11", isLab: false },
  { name: "Public Speaking & Creative Writing", code: "PSCW", room: "LH-11", isLab: false },
] as const;

export const DEFAULT_TIMETABLE: Record<string, Array<{ code: string; room?: string; isLab?: boolean } | null>> = {
  Monday: [{ code: "OB" }, { code: "MM" }, { code: "BE" }, { code: "EI" }, { code: "QDA", room: "LH-02" }, null, null, null, null],
  Tuesday: [{ code: "WAB", room: "LAB IIIB", isLab: true }, { code: "WAB", room: "LAB IIIB", isLab: true }, { code: "BE" }, { code: "PSCW", room: "Lab", isLab: true }, { code: "PSCW", room: "LH-02", isLab: true }, null, null, null, null],
  Wednesday: [{ code: "EI" }, { code: "OB" }, { code: "BE" }, { code: "MM" }, { code: "MM", room: "LH-02" }, null, null, null, null],
  Thursday: [{ code: "QDA" }, { code: "QDA", room: "LAB IIIB", isLab: true }, { code: "PSCW" }, { code: "OB" }, null, null, null, null, null],
  Friday: [{ code: "WAB" }, { code: "MM" }, { code: "WAB" }, { code: "QDA" }, null, null, null, null, null],
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
