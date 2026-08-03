// Mirrors convex/defaults.ts exactly - same BBA III A subjects, same 10 slots.
// These two MUST stay in sync: this file is what every page renders during the
// ~1s before the Convex snapshot arrives (and what buildLocalSnapshot serves
// offline), while convex/defaults.ts is what actually gets seeded server-side.
// When they drifted, the schedule painted a 9-column BBA II A timetable for a
// second and then snapped to the real 10-column one - a visible layout jump -
// and "Reset to default" in Subjects.jsx wrote the wrong timetable to Convex.
export const DEFAULT_SUBJECTS = [
  { name: 'Personality Development (PD)', code: 'PD', room: 'LH-11', isLab: false },
  { name: 'Personality Development - Theory', code: 'PDTheory', room: 'LH-11', isLab: false },
  { name: 'Environmental Science (ES)', code: 'ES', room: 'LH-32', isLab: false },
  { name: 'Computerized Accounting (CA)', code: 'CA', room: 'Lab', isLab: true },
  { name: 'Introduction to Financial System (IFS)', code: 'IFS', room: 'LH-11', isLab: false },
  { name: 'Introduction to Business Analytics (IBA)', code: 'IBA', room: 'LH-11', isLab: false },
  { name: 'Quantitative Techniques in Management (QTM)', code: 'QTM', room: 'LH-11', isLab: false },
  { name: 'Research Methodology (RM)', code: 'RM', room: 'LH-11', isLab: false },
  { name: 'Indian Knowledge System (IKS)', code: 'IKS', room: 'LH-11', isLab: false },
];

// Slot index 0-9 maps to the printed time columns:
// 0: 8:30-9:20   1: 9:30-10:20   2: 10:30-11:20   3: 11:30-12:20
// 4: 12:30-1:20  5: 1:30-2:20    6: 2:30-3:20     7: 3:30-4:20
// 8: 4:30-5:30   9: 5:30-6:30 (IKS runs both, tracked as two sessions)
export const DEFAULT_TIMETABLE = {
  Monday: [{ code: 'PD' }, { code: 'PD' }, { code: 'RM' }, { code: 'CA' }, { code: 'ES', room: 'LH-32' }, null, null, null, { code: 'IKS' }, { code: 'IKS' }],
  Tuesday: [{ code: 'RM' }, { code: 'IFS' }, { code: 'QTM' }, { code: 'CA' }, null, null, null, null, null, null],
  Wednesday: [{ code: 'PDTheory' }, { code: 'ES', room: 'LH-32' }, { code: 'QTM' }, { code: 'IBA' }, null, null, null, null, null, null],
  Thursday: [{ code: 'IFS' }, { code: 'IBA' }, { code: 'CA', room: 'Lab', isLab: true }, { code: 'CA', room: 'Lab', isLab: true }, null, null, null, null, null, null],
  Friday: [{ code: 'RM' }, { code: 'IBA' }, { code: 'IFS' }, { code: 'QTM' }, { code: 'PDTheory', room: 'LH-32' }, null, null, null, null, null],
  Saturday: Array(10).fill(null),
  Sunday: Array(10).fill(null),
};

// Color palette - Lightened luxury palette (28 colors, safe to cycle, low visual fatigue)
export const colorPalette = [
  '#FFF7A8', // Soft Lemon
  '#FFD9A0', // Champagne Peach
  '#CFF0C3', // Pastel Green
  '#E6F2A2', // Light Lime
  '#A8E6B8', // Fresh Mint Green
  '#BFE9D5', // Soft Teal Green
  '#BFEFE6', // Pale Turquoise
  '#CFF5F2', // Ice Turquoise
  '#CFEAF5', // Soft Sky Blue
  '#C6E2FF', // Powder Blue
  '#D6E4FF', // Mist Blue
  '#E3EEFF', // Cloud Blue
  '#D9F0FF', // Light Cyan
  '#E1E8F8', // Soft Periwinkle
  '#E6F2FA', // Frost Blue
  '#E2F4EE', // Mint Cream
  '#EDF9F0', // Pale Sage
  '#FFF3BF', // Vanilla Yellow
  '#FFE0C7', // Soft Peach
  '#FFD8A8', // Light Amber
  '#FFCCA0', // Muted Orange
  '#E8E6B8', // Soft Olive
  '#E9DFF2', // Lavender Mist
  '#E1D2F0', // Light Purple
  '#FFD6D6', // Blush Coral
  '#FFD0CC', // Soft Salmon
  '#FFBDBD', // Muted Red
  '#CFEDE6', // Light Teal
];

export function getSubjectColor(index) {
  return colorPalette[index % colorPalette.length];
}

// Get day color from palette
export function getDayColor(dayIndex) {
  return colorPalette[dayIndex % colorPalette.length];
}
