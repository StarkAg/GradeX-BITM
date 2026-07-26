// Default BBA II A subjects
export const DEFAULT_SUBJECTS = [
  { name: 'Organizational Behavior', code: 'OB', room: 'LH-11', isLab: false },
  { name: 'Marketing Management', code: 'MM', room: 'LH-11', isLab: false },
  { name: 'Business Economics', code: 'BE', room: 'LH-11', isLab: false },
  { name: 'Emotional Intelligence', code: 'EI', room: 'LH-11', isLab: false },
  { name: 'Qualitative Data Analysis', code: 'QDA', room: 'LH-11', isLab: false },
  { name: 'Web Application of Business', code: 'WAB', room: 'LH-11', isLab: false },
  { name: 'Public Speaking & Creative Writing', code: 'PSCW', room: 'LH-11', isLab: false },
];

export const DEFAULT_TIMETABLE = {
  Monday: [{ code: 'OB' }, { code: 'MM' }, { code: 'BE' }, { code: 'EI' }, { code: 'QDA', room: 'LH-02' }, null, null, null, null],
  Tuesday: [{ code: 'WAB', room: 'LAB IIIB', isLab: true }, { code: 'WAB', room: 'LAB IIIB', isLab: true }, { code: 'BE' }, { code: 'PSCW', room: 'Lab', isLab: true }, { code: 'PSCW', room: 'LH-02', isLab: true }, null, null, null, null],
  Wednesday: [{ code: 'EI' }, { code: 'OB' }, { code: 'BE' }, { code: 'MM' }, { code: 'MM', room: 'LH-02' }, null, null, null, null],
  Thursday: [{ code: 'QDA' }, { code: 'QDA', room: 'LAB IIIB', isLab: true }, { code: 'PSCW' }, { code: 'OB' }, null, null, null, null, null],
  Friday: [{ code: 'WAB' }, { code: 'MM' }, { code: 'WAB' }, { code: 'QDA' }, null, null, null, null, null],
  Saturday: Array(9).fill(null),
  Sunday: Array(9).fill(null),
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
