import { describe, expect, it } from 'vitest';
import { buildDayClasses, findConflictingSubjectCode } from '../src/lib/attendance-codes';
import { DEFAULT_SUBJECTS, DEFAULT_TIMETABLE } from '../src/lib/subjects';

const codes = (day, subjects = DEFAULT_SUBJECTS, timetable = DEFAULT_TIMETABLE) =>
  buildDayClasses(subjects, timetable, day).map((cls) => cls.attendanceCode);

describe('buildDayClasses', () => {
  it('gives every hour of the default week its own code', () => {
    for (const day of Object.keys(DEFAULT_TIMETABLE)) {
      const dayCodes = codes(day);
      expect(new Set(dayCodes).size).toBe(dayCodes.length);
    }
  });

  it('numbers repeated theory hours', () => {
    expect(codes('Monday')).toEqual(['PD', 'PD-2', 'RM', 'CA', 'ES', 'IKS', 'IKS-2']);
  });

  it('keeps two lab hours of one subject apart', () => {
    expect(codes('Thursday')).toEqual(['IFS', 'IBA', 'CA-LAB', 'CA-LAB-2']);
  });

  it('skips cells whose subject no longer exists', () => {
    const timetable = { Monday: [{ code: 'GONE' }, { code: 'PD' }] };
    expect(codes('Monday', DEFAULT_SUBJECTS, timetable)).toEqual(['PD']);
  });

  it('carries the cell room and lab flag, not the subject default', () => {
    const [, , lab] = buildDayClasses(DEFAULT_SUBJECTS, DEFAULT_TIMETABLE, 'Thursday');
    expect(lab).toMatchObject({ code: 'CA', isLab: true, room: 'Lab', slotIndex: 2 });
    const monday = buildDayClasses(DEFAULT_SUBJECTS, DEFAULT_TIMETABLE, 'Monday');
    expect(monday.find((cls) => cls.code === 'CA')).toMatchObject({ isLab: false });
  });
});

describe('findConflictingSubjectCode', () => {
  it('rejects a code already in use', () => {
    expect(findConflictingSubjectCode('PD', ['PD', 'RM'])).toBe('PD');
  });

  it('rejects a code that reads as another subject\'s hour', () => {
    expect(findConflictingSubjectCode('PD-2', ['PD'])).toBe('PD');
    expect(findConflictingSubjectCode('CA-LAB', ['CA'])).toBe('CA');
    expect(findConflictingSubjectCode('CS', ['CS-101'])).toBe('CS-101');
  });

  it('allows hyphenated codes that clash with nothing', () => {
    expect(findConflictingSubjectCode('CS-101', ['PD', 'RM'])).toBeNull();
    expect(findConflictingSubjectCode('MA', ['PD', 'RM'])).toBeNull();
  });
});
