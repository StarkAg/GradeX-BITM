/**
 * Extended color palette - each subject gets a unique color
 * EXACT COPY FROM SRM TT
 */
const colorPalette = [
  '#FFF200', // 1. Yellow
  '#F8B739', // 2. Golden Yellow
  '#92D050', // 3. Light Green
  '#C9DA2A', // 4. Yellow-Green
  '#00B050', // 5. Green
  '#52BE80', // 6. Emerald
  '#1ABC9C', // 7. Teal
  '#4ECDC4', // 8. Turquoise
  '#45B7D1', // 9. Sky Blue
  '#3498DB', // 10. Bright Blue
  '#4A86E8', // 11. Blue
  '#6FA8DC', // 12. Light Blue
  '#5DADE2', // 13. Light Blue
  '#8EA9DB', // 14. Periwinkle
  '#85C1E2', // 15. Powder Blue
  '#98D8C8', // 16. Mint
  '#C6EFCE', // 17. Light Mint
  '#F7DC6F', // 18. Light Yellow
  '#F4B183', // 19. Soft Orange
  '#F39C12', // 20. Orange
  '#E67E22', // 21. Dark Orange
  '#B7B51A', // 22. Olive
  '#BB8FCE', // 23. Lavender
  '#9B59B6', // 24. Purple
  '#FF6B6B', // 25. Coral Red
  '#EC7063', // 26. Pink
  '#E74C3C', // 27. Red
  '#16A085', // 28. Dark Teal
  '#D35400', // 29. Dark Orange
  '#4A86E8', // 30. Blue (reuse only if needed)
];

/**
 * Course name to color mapping
 * Maps normalized course names to specific colors from the palette
 */
const courseColorMap = {
  // Compiler Design
  'compiler design (theory)': '#B7B51A',
  'compiler design (lab)': '#C6EFCE',
  'compiler design': '#B7B51A',
  
  // Software Engineering and Project Management
  'software engineering and project management (theory)': '#F4B183',
  'software engineering and project management (lab)': '#C9DA2A',
  'sepm (theory)': '#F4B183',
  'sepm (lab)': '#C9DA2A',
  'software engineering and project management': '#F4B183',
  
  // Cloud courses
  'cloud product and platform engineering': '#6FA8DC',
  'cloud product & platform engineering': '#6FA8DC',
  'cloud computing': '#FFF200',
  
  // Other courses
  'data science': '#92D050',
  'water pollution and its management': '#00B050',
  'water pollution': '#00B050',
  'project (lab)': '#4A86E8',
  'project': '#4A86E8',
  'project / practical': '#4A86E8',
  'practical': '#4A86E8',
  'indian traditional knowledge': '#8EA9DB',
  'indian traditional knowledge (lab)': '#8EA9DB',
  'software engineering in artificial intelligence': '#FF6B6B', // Coral Red - UNIQUE
  'natural language processing': '#4ECDC4', // Turquoise - UNIQUE
  'fundamentals of composite materials': '#9B59B6', // Purple - more distinct from orange
  'cloud computing': '#45B7D1', // Sky Blue - UNIQUE
};

// Color assignment map - stores course names to color index in order of appearance
const courseColorAssignment = new Map();
let nextColorIndex = 0;

/**
 * Initialize color assignments from courses array in order
 * This should be called once when courses are loaded
 */
export function initializeColorAssignments(courses) {
  courseColorAssignment.clear();
  nextColorIndex = 0;
  
  // Process courses in order
  courses.forEach(course => {
    const courseName = course.courseName || course.title || '';
    const slotCode = course.slotCode || course.slot || '';
    
    // Create color key (add (LAB) for labs)
    let colorKey = courseName;
    if (slotCode && (slotCode.toUpperCase().startsWith('L') || slotCode.toUpperCase().startsWith('P'))) {
      if (!courseName.toUpperCase().includes('(LAB)')) {
        colorKey = `${courseName} (LAB)`;
      }
    }
    
    // Normalize for lookup
    const normalized = colorKey.toLowerCase().trim();
    
    // Assign color if not already assigned
    if (!courseColorAssignment.has(normalized)) {
      courseColorAssignment.set(normalized, nextColorIndex);
      nextColorIndex = (nextColorIndex + 1) % colorPalette.length;
    }
  });
}

/**
 * Gets a unique color for a course name from the standard palette
 * Labs (courses with L or P slots) are treated as different subjects and get different colors
 * Colors are assigned in ascending order based on course appearance in data
 */
export function getCourseColor(courseName, slotCode) {
  // Check if this is a lab (L or P slot) and append (LAB) to course name for color hashing
  // This ensures labs get different colors than theory courses
  let colorKey = courseName;
  if (slotCode && (slotCode.toUpperCase().startsWith('L') || slotCode.toUpperCase().startsWith('P'))) {
    if (!courseName.toUpperCase().includes('(LAB)')) {
      colorKey = `${courseName} (LAB)`;
    }
  }
  
  // Normalize course name for lookup
  const normalized = colorKey.toLowerCase().trim();
  
  // Check if color was already assigned (from initializeColorAssignments)
  if (courseColorAssignment.has(normalized)) {
    const colorIndex = courseColorAssignment.get(normalized);
    return colorPalette[colorIndex];
  }
  
  // Fallback: Assign color based on hash if not initialized
  let hash = 0;
  for (let i = 0; i < colorKey.length; i++) {
    hash = colorKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const colorIndex = Math.abs(hash) % colorPalette.length;
  return colorPalette[colorIndex];
}
