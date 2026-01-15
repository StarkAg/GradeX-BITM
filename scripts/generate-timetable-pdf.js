#!/usr/bin/env node

/**
 * Generate Timetable PDF from JSON
 * Uses existing slotResolver logic and pdfkit
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';
import { PDFDocument as PDFLib } from 'pdf-lib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

// Load timetable JSON
const timetableJsonPath = process.argv[2] || '/tmp/timetable_complete_final.json';
if (!fs.existsSync(timetableJsonPath)) {
  console.error(`❌ Timetable JSON not found: ${timetableJsonPath}`);
  process.exit(1);
}

const timetableData = JSON.parse(fs.readFileSync(timetableJsonPath, 'utf-8'));
const timetable = timetableData.timetable;

// Load slot mappings
const batch1SlotsPath = path.join(PROJECT_ROOT, 'dist', 'batch1_slots.json');
const batch2SlotsPath = path.join(PROJECT_ROOT, 'dist', 'batch2_slots.json');

if (!fs.existsSync(batch1SlotsPath) || !fs.existsSync(batch2SlotsPath)) {
  console.error(`❌ Slot mapping files not found`);
  process.exit(1);
}

const batch1Slots = JSON.parse(fs.readFileSync(batch1SlotsPath, 'utf-8'));
const batch2Slots = JSON.parse(fs.readFileSync(batch2SlotsPath, 'utf-8'));

// Extract student info
const studentName = timetable.studentName || 'Student';
const batchNumber = parseInt(timetable.batchNumber) || 1;
const regNumber = timetable.regNumber || '';
const academicYear = timetable.academicYear || 'AY 2025-26 EVEN';
const program = timetable.program || '';
const department = timetable.department || '';

// Convert schedule to courses array (flatten from schedule structure)
// EXACT format from Timetable.jsx - normalize slots and add (LAB) suffix
const courses = [];
for (const daySchedule of timetable.schedule || []) {
  for (const course of daySchedule.table || []) {
    const slotCode = normalizeSlotCode(course.slot || '');
    if (!slotCode) {
      console.warn(`⚠ Skipping course ${course.code || 'Unknown'}: no valid slot code`);
      continue;
    }
    
    let courseName = course.name || '';
    let room = course.roomNo || course.room || '';
    
    // Add (LAB) suffix to lab courses (slots starting with P or L) - matches Timetable.jsx logic
    if ((slotCode.startsWith('P') || slotCode.startsWith('L')) && !courseName.includes('(LAB)')) {
      courseName = courseName + ' (LAB)';
    }
    
    // Check if course is "Indian Traditional Knowledge" and mark as Online
    if (courseName.toLowerCase().includes('indian traditional knowledge') || 
        courseName.toLowerCase().includes('indian traditional')) {
      room = 'Online';
    }
    
    courses.push({
      courseCode: course.code,
      courseName: courseName,
      slotCode: slotCode,
      room: room,
    });
  }
}

// Normalize slot code (EXACT COPY from Timetable.jsx)
function normalizeSlotCode(slotCode) {
  if (!slotCode) return '';
  // Remove all whitespace and convert to uppercase
  let normalized = slotCode.replace(/\s+/g, '').toUpperCase();
  // Remove any trailing dashes FIRST (SRM Academia often has "P23-P24-" with trailing dash)
  normalized = normalized.replace(/[-]+$/, '');
  // Normalize hyphenated slots (P1-P2, L1-L2, etc.) - ensure single hyphen
  normalized = normalized.replace(/([PL]\d{1,2})\s*[-]+\s*([PL]\d{1,2})/g, '$1-$2');
  // Remove any remaining trailing dashes or spaces
  normalized = normalized.replace(/[\s-]+$/, '');
  return normalized;
}

// Resolve slots to timetable matrix (same logic as slotResolver.js)
function resolveSlotsToTimetable(courses, batch, batch1Slots, batch2Slots) {
  const timetable = Array(5).fill(null).map(() => Array(12).fill(null));
  const slotMapping = batch === 1 ? batch1Slots : batch2Slots;

  if (!slotMapping) {
    console.error(`Slot mapping not loaded for batch ${batch}`);
    return timetable;
  }

  for (const course of courses) {
    const slotCode = normalizeSlotCode(course.slotCode);
    let timeSlots = slotMapping[slotCode];

    // Fallback: If slot not found, try to find similar slot (e.g., P39-P40 might map to P9-P10 pattern)
    if (!timeSlots) {
      // Try to find a similar slot (e.g., P23-P24 might be similar to P11-P12)
      // For now, skip unknown slots and log warning
      console.warn(`⚠ Unknown slot code: "${slotCode}" for batch ${batch} - course "${course.courseName}"`);
      console.warn(`   Available P slots: ${Object.keys(slotMapping).filter(k => k.startsWith('P')).join(', ')}`);
      continue;
    }

    for (const timeSlot of timeSlots) {
      const dayIndex = timeSlot.day - 1;
      const periodIndex = timeSlot.period - 1;

      if (timetable[dayIndex][periodIndex] === null) {
        timetable[dayIndex][periodIndex] = {
          courseCode: course.courseCode,
          courseName: course.courseName,
          slotCode: course.slotCode,
          room: course.room,
        };
      } else {
        const existing = timetable[dayIndex][periodIndex];
        if (Array.isArray(existing)) {
          existing.push({
            courseCode: course.courseCode,
            courseName: course.courseName,
            slotCode: course.slotCode,
            room: course.room,
          });
        } else {
          timetable[dayIndex][periodIndex] = [existing, {
            courseCode: course.courseCode,
            courseName: course.courseName,
            slotCode: course.slotCode,
            room: course.room,
          }];
        }
        console.warn(`Conflict at Day ${timeSlot.day}, Period ${timeSlot.period}`);
      }
    }
  }

  return timetable;
}

// Generate timetable matrix
const timetableMatrix = resolveSlotsToTimetable(courses, batchNumber, batch1Slots, batch2Slots);

// Day names (EXACT from Timetable.jsx)
const DAYS = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'];
const TIME_SLOTS = [
  { period: 1, time: '8:00 AM - 8:50 AM' },
  { period: 2, time: '8:50 AM - 9:40 AM' },
  { period: 3, time: '9:45 AM - 10:35 AM' },
  { period: 4, time: '10:40 AM - 11:30 AM' },
  { period: 5, time: '11:35 AM - 12:25 PM' },
  { period: 6, time: '12:30 PM - 1:20 PM' },
  { period: 7, time: '1:25 PM - 2:15 PM' },
  { period: 8, time: '2:20 PM - 3:10 PM' },
  { period: 9, time: '3:10 PM - 4:00 PM' },
  { period: 10, time: '4:00 PM - 4:50 PM' },
  { period: 11, time: '4:50 PM - 5:30 PM' },
  { period: 12, time: '5:30 PM - 6:10 PM' },
];

// Generate PDF - single page only
const outputPath = process.argv[3] || path.join(PROJECT_ROOT, 'timetable.pdf');
const doc = new PDFDocument({
  size: 'A3',
  layout: 'landscape',
  margin: 20,
});

// Track pages to ensure we only keep the first page
let pageCount = 0;
doc.on('pageAdded', () => {
  pageCount++;
});

// Create write stream
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Container background (#f8f9fa) - draw full page background first
doc.rect(0, 0, doc.page.width, doc.page.height)
   .fillColor('#f8f9fa')
   .fill();

// Table dimensions constants (define early for logo positioning)
const tablePadding = 20; // 1rem = ~16pt, using 20pt for PDF

// Logo header (matching HTML: timetable-header-logos)
// Logos in left and right corners, title/subtitle centered between them
const logoHeaderY = 15;
const gradexLogoPath = path.join(PROJECT_ROOT, 'public', 'GradeX.png');
const harshLogoPath = path.join(PROJECT_ROOT, 'public', 'Harsh.png');

// Load logos in left and right corners
const logoContainerPadding = 4; // 0.5rem = ~4pt
const gradexLogoHeight = 33.75; // 45px in points
const harshLogoHeight = 18.75; // 25px in points

// GradeX logo: LEFT corner
if (fs.existsSync(gradexLogoPath)) {
  try {
    const gradexLogoX = tablePadding + logoContainerPadding;
    doc.image(gradexLogoPath, gradexLogoX, logoHeaderY, {
      fit: [250, gradexLogoHeight], // Max width 250pt, maintain aspect ratio
      align: 'left'
    });
  } catch (err) {
    console.warn('⚠ Could not load GradeX logo:', err.message);
  }
} else {
  console.warn(`⚠ GradeX logo not found at: ${gradexLogoPath}`);
}

// Harsh logo: RIGHT corner
if (fs.existsSync(harshLogoPath)) {
  try {
    // Calculate width based on aspect ratio: 96x50 original -> for height 18.75pt, width = 96/50 * 18.75 = 36pt
    const harshLogoWidth = (96 / 50) * harshLogoHeight; // ~36pt based on original aspect ratio
    const harshLogoX = doc.page.width - tablePadding - logoContainerPadding - harshLogoWidth; // Right side with padding
    doc.image(harshLogoPath, harshLogoX, logoHeaderY, {
      fit: [harshLogoWidth, harshLogoHeight], // width, height - maintain aspect ratio
      align: 'left'
    });
  } catch (err) {
    console.warn('⚠ Could not load Harsh logo:', err.message);
  }
} else {
  console.warn(`⚠ Harsh logo not found at: ${harshLogoPath}`);
}

// Title and Subtitle: CENTER aligned horizontally (between logos)
// Title: "Time Table" (font-size: 1.4rem = ~21pt, color: #2c3e50, weight: 700)
// CSS: text-align: center, margin-bottom: 0.4rem
// Position below logos (logo area height + margin-bottom: 1rem) - MOVED BIT BELOW
const titleY = logoHeaderY + Math.max(gradexLogoHeight, harshLogoHeight) + 35; // Below logos with more margin (was 20, now 35)
doc.fontSize(21)
   .font('Helvetica-Bold')
   .fillColor('#2c3e50')
   .text('Class Schedule', {
     align: 'center',
     width: doc.page.width - (tablePadding * 2),
     x: tablePadding,
     y: titleY
   });

// Subtitle (font-size: 0.8rem = ~10pt, color: #6c757d)
// CSS: text-align: center, margin-bottom: 1rem, line-height: 1.1
// Center aligned horizontally, positioned below title - MOVED BIT BELOW
const subtitleY = titleY + 32; // More spacing from title (was 24, now 32)
doc.fontSize(10)
   .font('Helvetica')
   .fillColor('#6c757d')
   .text(`${academicYear} | Batch ${batchNumber} | ${studentName}`, {
     align: 'center',
     width: doc.page.width - (tablePadding * 2),
     x: tablePadding,
     y: subtitleY
   });

// Table dimensions (A3 landscape: ~1150x790 points = 420mm x 297mm)
// Grid: 80px day column + 12 equal columns
// Adjust table start position to ensure everything fits on one page
const tableStartY = subtitleY + 20; // margin-bottom: 1rem = ~16pt, reduced slightly to fit single page
const availableWidth = doc.page.width - (tablePadding * 2);
const dayColumnWidth = 80; // Fixed 80px as per CSS: grid-template-columns: 80px repeat(12, ...)
const periodColumnWidth = (availableWidth - dayColumnWidth) / 12;
const headerHeight = 30; // Approximate based on padding: 8px = ~6pt, with content ~30pt
const cellHeight = 80; // min-height: 80px from CSS
const totalTableHeight = headerHeight + (5 * cellHeight);
const tableWidth = dayColumnWidth + (12 * periodColumnWidth);

// Calculate total content height and ensure it fits on single A3 landscape page
// A3 landscape: ~1150x790 points (width x height)
const totalContentHeight = tableStartY + totalTableHeight + 40; // Table + footer space
const pageHeight = doc.page.height; // ~790 points for A3 landscape
if (totalContentHeight > pageHeight - 40) {
  console.warn(`⚠ Content height (${totalContentHeight}pt) may exceed page height (${pageHeight}pt). Adjusting...`);
  // Reduce cell height if needed to fit on single page
  // This is a fallback - content should normally fit
}

// Grid border: 2px solid black (from CSS: border: 2px solid #000000)
const gridX = tablePadding;
const gridY = tableStartY;

// Header row: "Time" cell (day column header)
doc.rect(gridX, gridY, dayColumnWidth, headerHeight)
   .fillColor('#495057')
   .fill()
   .strokeColor('#000000')
   .lineWidth(1)
   .rect(gridX, gridY, dayColumnWidth, headerHeight)
   .stroke();

doc.fillColor('white')
   .fontSize(10)
   .font('Helvetica-Bold')
   .text('Time', gridX, gridY + headerHeight / 2 - 5, { 
     width: dayColumnWidth, 
     align: 'center',
     height: headerHeight
   });

// Header cells for each period (12 columns)
let periodX = gridX + dayColumnWidth;
for (let i = 0; i < TIME_SLOTS.length; i++) {
  const slot = TIME_SLOTS[i];
  
  // Header cell background and border
  doc.rect(periodX, gridY, periodColumnWidth, headerHeight)
     .fillColor('#495057')
     .fill()
     .strokeColor('#000000')
     .lineWidth(1)
     .rect(periodX, gridY, periodColumnWidth, headerHeight)
     .stroke();
  
  // Period number (font-size: 0.75rem = ~9pt, font-weight: 700)
  doc.fillColor('white')
     .fontSize(9)
     .font('Helvetica-Bold')
     .text(`Slot ${slot.period}`, periodX, gridY + 6, { 
       width: periodColumnWidth, 
       align: 'center' 
     });
  
  // Time range (font-size: 0.55rem = ~6.6pt, opacity: 0.9, font-weight: 400)
  doc.fontSize(6.6)
     .font('Helvetica')
     .fillColor('rgba(255, 255, 255, 0.9)')
     .text(slot.time, periodX, gridY + 18, { 
       width: periodColumnWidth, 
       align: 'center' 
     });
  
  periodX += periodColumnWidth;
}

doc.fillColor('black');

// Day rows (start after header)
const dayStartY = gridY + headerHeight;

for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
  const dayName = DAYS[dayIndex];
  const dayY = dayStartY + (dayIndex * cellHeight);

  // Day label (yellow background: #FFFF00, black text, padding: 12px 8px)
  doc.rect(gridX, dayY, dayColumnWidth, cellHeight)
     .fillColor('#FFFF00')
     .fill()
     .strokeColor('#000000')
     .lineWidth(1)
     .rect(gridX, dayY, dayColumnWidth, cellHeight)
     .stroke();

  // Day label text (font-size: 0.8rem = ~10pt, font-weight: 700, color: #000000)
  doc.fillColor('#000000')
     .fontSize(10)
     .font('Helvetica-Bold')
     .text(dayName, gridX, dayY + cellHeight / 2 - 5, { 
       width: dayColumnWidth, 
       align: 'center',
       height: cellHeight
     });

  // Period cells for this day
  let periodX = gridX + dayColumnWidth;
  for (let periodIndex = 0; periodIndex < 12; periodIndex++) {
    const cell = timetableMatrix[dayIndex][periodIndex];
    const isEmpty = cell === null || cell === undefined;
    const isConflict = Array.isArray(cell);
    const displayCell = isConflict ? cell[0] : cell;

    // Cell border (1px solid black) and background
    const cellBgColor = isEmpty ? '#f8f9fa' : '#ffffff';
    doc.rect(periodX, dayY, periodColumnWidth, cellHeight)
       .fillColor(cellBgColor)
       .fill()
       .strokeColor('#000000')
       .lineWidth(1)
       .rect(periodX, dayY, periodColumnWidth, cellHeight)
       .stroke();

    if (!isEmpty && displayCell) {
      // Get course color (EXACT logic from timetableColors.js)
      const courseName = displayCell.courseName || '';
      const normalized = courseName.toLowerCase().trim();
      let bgColor = '#ffffff';
      
      // Color mapping (from timetableColors.js)
      const courseColorMap = {
        'compiler design (lab)': '#C6EFCE',
        'compiler design': '#B7B51A',
        'software engineering and project management (lab)': '#C9DA2A',
        'software engineering and project management': '#F4B183',
        'cloud product and platform engineering': '#6FA8DC',
        'cloud computing': '#FFF200',
        'data science': '#92D050',
        'water pollution and its management': '#00B050',
        'project (lab)': '#4A86E8',
        'project': '#4A86E8',
        'indian traditional knowledge': '#8EA9DB',
      };
      
      // Check exact match first
      if (courseColorMap[normalized]) {
        bgColor = courseColorMap[normalized];
      } else {
        // Pattern matching
        if (normalized.includes('compiler design')) {
          bgColor = normalized.includes('lab') ? '#C6EFCE' : '#B7B51A';
        } else if (normalized.includes('software engineering') || normalized.includes('sepm')) {
          bgColor = normalized.includes('lab') ? '#C9DA2A' : '#F4B183';
        } else if (normalized.includes('cloud product')) {
          bgColor = '#6FA8DC';
        } else if (normalized.includes('cloud computing')) {
          bgColor = '#45B7D1';
        } else if (normalized.includes('data science')) {
          bgColor = '#92D050';
        } else if (normalized.includes('water pollution')) {
          bgColor = '#00B050';
        } else if (normalized.includes('project') || normalized.includes('practical')) {
          bgColor = '#4A86E8';
        } else if (normalized.includes('indian traditional')) {
          bgColor = '#8EA9DB';
        } else {
          // Fallback: hash-based color from palette
          const colorPalette = ['#FFF200', '#92D050', '#00B050', '#F4B183', '#C9DA2A', '#C6EFCE', '#B7B51A', '#6FA8DC', '#8EA9DB', '#4A86E8'];
          let hash = 0;
          for (let i = 0; i < courseName.length; i++) {
            hash = courseName.charCodeAt(i) + ((hash << 5) - hash);
          }
          bgColor = colorPalette[Math.abs(hash) % colorPalette.length];
        }
      }
      
      // Conflict cells: yellow background (#fff3cd) as per CSS
      const finalBgColor = isConflict ? '#fff3cd' : bgColor;
      
      // Background color for filled cells (padding: 6px 4px = ~4.5pt 3pt)
      doc.rect(periodX, dayY, periodColumnWidth, cellHeight)
         .fillColor(finalBgColor)
         .fill();

      // Handle conflicts - show multiple courses (EXACT logic from Timetable.jsx)
      if (isConflict) {
        const conflictCells = cell;
        const hasOnline = conflictCells.some(c => c.room && c.room.toLowerCase().includes('online'));
        const hasProject = conflictCells.some(c => 
          c.courseName.toLowerCase().includes('project') || 
          c.courseName.toLowerCase().includes('practical')
        );
        
        let conflictTextY = dayY + 4.5;
        
        // Special case: Online + Project (display as combined)
        if (hasOnline && hasProject && conflictCells.length === 2) {
          const onlineCourse = conflictCells.find(c => c.room && c.room.toLowerCase().includes('online'));
          const projectCourse = conflictCells.find(c => 
            c.courseName.toLowerCase().includes('project') || 
            c.courseName.toLowerCase().includes('practical')
          );
          const onlineName = (onlineCourse?.courseName || '').replace(/\s*\(LAB\)\s*/gi, '').trim();
          const projectName = (projectCourse?.courseName || '').replace(/\s*\(LAB\)\s*/gi, '').trim();
          
          const combinedText = `${onlineName} (Online)/${projectName} (Practical)`;
          doc.fontSize(6.5)
             .font('Helvetica-Bold')
             .fillColor('#212529')
             .text(combinedText, periodX + 3, conflictTextY, {
               width: periodColumnWidth - 6,
               align: 'left',
               lineGap: 1.1
             });
        } else {
          // Display all conflicting courses (EXACT from Timetable.jsx)
          conflictCells.forEach((c, idx) => {
            const room = (c.courseName.toLowerCase().includes('indian traditional') && 
                         !c.room?.toLowerCase().includes('online'))
              ? 'Online'
              : c.room;
            
            const courseNameY = conflictTextY + (idx * 12); // 12pt spacing between courses
            
            // Course name
            doc.fontSize(6.5)
               .font('Helvetica-Bold')
               .fillColor('#212529')
               .text(c.courseName, periodX + 3, courseNameY, {
                 width: periodColumnWidth - 6,
                 align: 'left',
                 lineGap: 1.1
               });
            
            // Room number (if exists)
            if (room) {
              doc.fontSize(5.5)
                 .font('Helvetica')
                 .fillColor('#495057')
                 .text(room, periodX + 3, courseNameY + 8, {
                   width: periodColumnWidth - 6,
                   align: 'left'
                 });
            }
            
            // Draw separator line between courses (except last)
            if (idx < conflictCells.length - 1) {
              const separatorY = courseNameY + (room ? 14 : 10);
              doc.moveTo(periodX + 3, separatorY)
                 .lineTo(periodX + periodColumnWidth - 3, separatorY)
                 .strokeColor('rgba(0, 0, 0, 0.2)')
                 .lineWidth(0.5)
                 .stroke();
            }
          });
        }
      } else {
        // Single course (no conflict)
        // Course name (font-size: 0.6rem = ~7.2pt, font-weight: 600, color: #212529, line-height: 1.1, margin-bottom: 2px)
        const courseNameY = dayY + 4.5; // padding top
        doc.fontSize(7.2)
           .font('Helvetica-Bold')
           .fillColor('#212529')
           .text(courseName, periodX + 3, courseNameY, {
             width: periodColumnWidth - 6,
             align: 'left',
             lineGap: 1.1
           });

        // Room number (font-size: 0.55rem = ~6.6pt, color: #495057, font-weight: 500, margin-top: auto, padding-top: 2px, border-top: 1px solid rgba(0,0,0,0.1))
        if (displayCell.room) {
          const roomText = (normalized.includes('indian traditional') && 
                           !displayCell.room.toLowerCase().includes('online'))
            ? 'Online'
            : displayCell.room;
          
          // Draw top border for room number (1px = ~0.75pt)
          const roomBorderY = dayY + cellHeight - 12; // Approximate position
          doc.moveTo(periodX + 3, roomBorderY)
             .lineTo(periodX + periodColumnWidth - 3, roomBorderY)
             .strokeColor('rgba(0, 0, 0, 0.1)')
             .lineWidth(0.75)
             .stroke();
          
          doc.fontSize(6.6)
             .font('Helvetica')
             .fillColor('#495057')
             .text(roomText, periodX + 3, roomBorderY + 2, {
               width: periodColumnWidth - 6,
               align: 'left'
             });
        }
      }

      doc.fillColor('black');
    }

    periodX += periodColumnWidth;
  }
}

// Footer (outside the grid, at bottom of page) - ensure it fits on first page
// Calculate if footer fits on current page, otherwise adjust
const footerY = Math.min(doc.page.height - 30, gridY + totalTableHeight + 25); // Below table or page bottom
doc.fontSize(10)
   .font('Helvetica')
   .fillColor('#666666')
   .text(`Registration Number: ${regNumber}`, tablePadding, footerY, { align: 'left' })
   .text(`Generated by GradeX`, doc.page.width - tablePadding - 140, footerY, { align: 'right' });

// Prevent automatic page creation by ensuring we don't exceed page bounds
// PDFKit automatically creates new pages if content exceeds current page
// To keep single page, ensure all content fits within doc.page.height
doc.end();

stream.on('finish', async () => {
  console.log(`✅ PDF generated successfully: ${outputPath}`);
  console.log(`   Student: ${studentName}`);
  console.log(`   Batch: ${batchNumber}`);
  console.log(`   Courses: ${courses.length}`);
  console.log(`   Format: A3 Landscape`);
  
  // Extract only the first page using pdf-lib
  try {
    const existingPdfBytes = fs.readFileSync(outputPath);
    const pdfDoc = await PDFLib.load(existingPdfBytes);
    const totalPages = pdfDoc.getPageCount();
    
    if (totalPages > 1) {
      console.log(`   ⚠ PDF has ${totalPages} pages. Extracting first page only...`);
      
      // Create new PDF with only first page
      const newPdf = await PDFLib.create();
      const [firstPage] = await newPdf.copyPages(pdfDoc, [0]);
      newPdf.addPage(firstPage);
      
      // Save the single-page PDF
      const singlePageBytes = await newPdf.save();
      fs.writeFileSync(outputPath, singlePageBytes);
      
      console.log(`   ✅ Extracted first page only (removed ${totalPages - 1} additional pages)`);
    } else {
      console.log(`   ✅ Single page PDF (as required)`);
    }
  } catch (err) {
    console.warn(`   ⚠ Could not extract first page: ${err.message}`);
    console.log(`   📄 Original PDF saved: ${outputPath}`);
  }
});

stream.on('error', (err) => {
  console.error('❌ Error generating PDF:', err);
  process.exit(1);
});

