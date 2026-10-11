// Attendance is recorded per class hour, so two hours of one subject on the
// same day need two different keys. Home and the Calendar both mark attendance
// and must agree on those keys, which is why they are built in one place.
//
//   first theory hour   "PD"          later theory hours  "PD-2", "PD-3"
//   first lab hour      "CA-LAB"      later lab hours     "CA-LAB-2"
//
// Mirrors stripSlotSuffix / resolveBaseSubjectCode in convex/defaults.ts, which
// turn these keys back into the subject they belong to.

export function buildDayClasses(subjects, timetable, dayName) {
  const subjectMap = {};
  (subjects || []).forEach((subject, idx) => {
    if (!(subject.code in subjectMap)) {
      subjectMap[subject.code] = { ...subject, colorIndex: idx };
    }
  });

  const hoursSeen = {};
  const labHoursSeen = {};
  const classes = [];

  (timetable?.[dayName] || []).forEach((cell, slotIndex) => {
    const subject = cell?.code ? subjectMap[cell.code] : null;
    if (!subject) return;

    const baseCode = cell.code;
    const isLab = Boolean(cell.isLab);
    hoursSeen[baseCode] = (hoursSeen[baseCode] || 0) + 1;

    let attendanceCode;
    if (isLab) {
      // Two lab hours in a row used to share "CA-LAB": marking one marked
      // both, and the pair counted as a single class.
      labHoursSeen[baseCode] = (labHoursSeen[baseCode] || 0) + 1;
      attendanceCode = labHoursSeen[baseCode] === 1
        ? `${baseCode}-LAB`
        : `${baseCode}-LAB-${labHoursSeen[baseCode]}`;
    } else {
      attendanceCode = hoursSeen[baseCode] === 1
        ? baseCode
        : `${baseCode}-${hoursSeen[baseCode]}`;
    }

    classes.push({
      ...subject,
      slotIndex,
      room: cell.room || subject.room || 'LH-11',
      isLab,
      attendanceCode,
    });
  });

  return classes;
}

function stripSlotSuffix(code) {
  if (code.endsWith('-LAB')) return code.slice(0, -4);
  const parts = code.split('-');
  if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) {
    return parts.slice(0, -1).join('-');
  }
  return code;
}

function suffixAncestors(code) {
  const ancestors = [];
  let current = code;
  for (let i = 0; i < 3; i += 1) {
    const next = stripSlotSuffix(current);
    if (next === current) break;
    ancestors.push(next);
    current = next;
  }
  return ancestors;
}

// A new subject code is unusable when it is already taken, or when it could be
// mistaken for another subject's hour key ("CS-2" next to "CS").
export function findConflictingSubjectCode(code, existingCodes) {
  const existing = new Set(existingCodes);
  if (existing.has(code)) return code;

  const shadowed = suffixAncestors(code).find((ancestor) => existing.has(ancestor));
  if (shadowed) return shadowed;

  return [...existing].find((other) => suffixAncestors(other).includes(code)) || null;
}
