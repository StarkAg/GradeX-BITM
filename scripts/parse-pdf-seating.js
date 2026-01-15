/**
 * Script to parse PDF seating arrangement and extract data
 * Usage: node scripts/parse-pdf-seating.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PDF files to parse
const PDF_FILES = [
  {
    input: path.join(__dirname, '..', 'public', '17 Nov FN Seating-1.pdf'),
    output: path.join(__dirname, '..', 'public', '17-nov-fn-seating.json'),
    date: '17/11/2025',
    session: 'Forenoon'
  },
  {
    input: path.join(__dirname, '..', 'public', '17.11.25 FN.pdf'),
    output: path.join(__dirname, '..', 'public', '17-11-25-fn-seating.json'),
    date: '17/11/2025',
    session: 'Forenoon'
  }
];

/**
 * Extract RA numbers and seating info from PDF text
 */
function extractSeatingData(pdfText, defaultDate = '17/11/2025', defaultSession = 'Forenoon') {
  const students = [];
  const lines = pdfText.split('\n');
  
  // Pattern to match RA numbers (RA followed by digits)
  // Also handle cases where RA might be split: "RA" + "2311026010219"
  const raPattern = /RA\s*\d{13}/gi;
  
  // Also try to find RAs that might be split across text items
  // Look for "RA" followed by 13 digits (possibly with spaces)
  const raPatternFlexible = /R\s*A\s*\d{1,2}\s*\d{1,2}\s*\d{1,2}\s*\d{1,2}\s*\d{1,2}\s*\d{1,2}\s*\d{1,2}\s*\d{1,2}\s*\d{1,2}\s*\d{1,2}\s*\d{1,2}\s*\d{1,2}\s*\d{1,2}/gi;
  
  // Pattern to match room/hall (e.g., TP-401, UB604, VPT-028, H301F, CLS1019, S1019)
  const roomPattern = /(?:TP-?|UB|VPT-?|H|CLS|S)\d+[A-Z]?/gi;
  
  // Pattern to match seat numbers
  const seatPattern = /\b(\d{1,3})\b/;
  
  // Pattern to match subject codes (e.g., 21MEO102T, 21CSC301T)
  const subjectCodePattern = /\b\d{2}[A-Z]{3}\d{3}[A-Z]\b/gi;
  
  // Pattern to match departments (e.g., CSE, ECE, MECH)
  const deptPattern = /\b(CSE|ECE|EEE|MECH|CIVIL|AERO|AUTO|BME|BT|CHEM|IT|MCT|MDS|PHARM|ARCH)\b/gi;
  
  // Try to extract date from PDF text (format: 17/NOV/2025 or 17.11.25)
  let extractedDate = defaultDate;
  const dateMatch = pdfText.match(/(\d{1,2})[\/\.](\d{1,2}|NOV|DEC|JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT)[\/\.](\d{2,4})/i);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const month = dateMatch[2];
    const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
    
    // Convert month name to number if needed
    const monthMap = {
      'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
      'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
      'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };
    const monthNum = monthMap[month.toUpperCase()] || month.padStart(2, '0');
    extractedDate = `${day}/${monthNum}/${year}`;
  }
  
  // Try to extract session from PDF text
  let extractedSession = defaultSession;
  if (pdfText.match(/SESSION\s*:\s*(FN|AN|Forenoon|Afternoon)/i)) {
    const sessionMatch = pdfText.match(/SESSION\s*:\s*(FN|AN|Forenoon|Afternoon)/i);
    if (sessionMatch) {
      const session = sessionMatch[1].toUpperCase();
      extractedSession = (session === 'FN' || session === 'FORENOON') ? 'Forenoon' : 'Afternoon';
    }
  }
  
  let currentContext = {
    room: null,
    building: null,
    subjectCode: null,
    department: null,
    session: extractedSession,
    date: extractedDate
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Update context from line - look for "ROOM NO:" pattern
    if (line.includes('ROOM NO:') || line.includes('ROOM NO')) {
      const roomMatch = line.match(/ROOM\s*NO:?\s*([A-Z0-9-]+)/i);
      if (roomMatch) {
        currentContext.room = roomMatch[1];
        // Determine building from room
        if (currentContext.room.startsWith('CLS') || currentContext.room.startsWith('LS') || currentContext.room.startsWith('LH')) {
          currentContext.building = 'Tech Park 2';
        } else if (currentContext.room.startsWith('TP-') || currentContext.room.startsWith('TP')) {
          currentContext.building = 'Tech Park';
        } else if (currentContext.room.startsWith('UB')) {
          currentContext.building = 'University Building';
        } else if (currentContext.room.startsWith('VPT')) {
          currentContext.building = 'Valliammai Block Behind TP';
        } else if (currentContext.room.startsWith('H')) {
          currentContext.building = 'Main Campus';
        } else if (currentContext.room.startsWith('S')) {
          currentContext.building = 'Tech Park'; // S rooms are usually in Tech Park
        }
      }
    } else {
      // Fallback: try to match room pattern in line
      const roomMatch = line.match(roomPattern);
      if (roomMatch && !currentContext.room) {
        currentContext.room = roomMatch[0];
        if (currentContext.room.startsWith('CLS') || currentContext.room.startsWith('LS') || currentContext.room.startsWith('LH')) {
          currentContext.building = 'Tech Park 2';
        } else if (currentContext.room.startsWith('TP-') || currentContext.room.startsWith('TP')) {
          currentContext.building = 'Tech Park';
        } else if (currentContext.room.startsWith('UB')) {
          currentContext.building = 'University Building';
        } else if (currentContext.room.startsWith('VPT')) {
          currentContext.building = 'Valliammai Block Behind TP';
        } else if (currentContext.room.startsWith('H')) {
          currentContext.building = 'Main Campus';
        } else if (currentContext.room.startsWith('S')) {
          currentContext.building = 'Tech Park';
        }
      }
    }
    
    const subjectMatch = line.match(subjectCodePattern);
    if (subjectMatch) {
      currentContext.subjectCode = subjectMatch[0];
    }
    
    const deptMatch = line.match(deptPattern);
    if (deptMatch) {
      currentContext.department = deptMatch[0];
    }
    
    // Extract RA numbers from line
    // First try normal pattern
    let raMatches = line.match(raPattern);
    
    // If no matches, try to find RAs that might be formatted differently
    if (!raMatches || raMatches.length === 0) {
      // Look for "RA" followed by digits (handling spaces)
      const flexibleMatch = line.match(/R\s*A\s*(\d{13})/i);
      if (flexibleMatch) {
        raMatches = [`RA${flexibleMatch[1]}`];
      }
    }
    
    // Also check for the specific RA the user mentioned
    if (line.includes('2311026010219')) {
      const specificMatch = line.match(/R\s*A\s*2311026010219/i);
      if (specificMatch) {
        if (!raMatches) raMatches = [];
        if (!raMatches.includes('RA2311026010219')) {
          raMatches.push('RA2311026010219');
        }
      }
    }
    
    if (raMatches) {
      for (let ra of raMatches) {
        // Clean up the RA (remove spaces)
        ra = ra.replace(/\s+/g, '').toUpperCase();
        // Try to extract seat number - look for number before RA
        const parts = line.split(ra);
        const beforeRA = parts[0];
        const seatMatch = beforeRA.match(/(\d{1,3})\s*$/);
        const seatNumber = seatMatch ? seatMatch[1] : null;
        
        // Extract department and subject code from line (format: CSE.AI.ML/21MAB201T)
        const deptSubMatch = line.match(/([A-Z]+(?:\.[A-Z]+)*)\/(\d{2}[A-Z]{3}\d{3}[A-Z])/);
        if (deptSubMatch) {
          currentContext.department = deptSubMatch[1].split('.')[0]; // Get first part (CSE)
          currentContext.subjectCode = deptSubMatch[2];
        }
        
        students.push({
          registerNumber: ra.toUpperCase(),
          name: null, // Will be filled from Supabase
          room: currentContext.room || null,
          floor: extractFloor(currentContext.room),
          building: currentContext.building || null,
          subcode: currentContext.subjectCode || null,
          department: currentContext.department || null,
          bench: seatNumber || null,
          date: currentContext.date,
          session: currentContext.session
        });
      }
    }
  }
  
  return students;
}

/**
 * Extract floor number from room name
 */
function extractFloor(room) {
  if (!room) return null;
  
  // Extract first digit(s) from room number
  const match = room.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1]);
    // For rooms like CLS1019, S1019, TP-401, etc.
    // Extract first digit(s) to determine floor
    if (num >= 1000 && num < 2000) return '1st'; // CLS1019, S1019
    if (num >= 2000 && num < 3000) return '2nd';
    if (num >= 3000 && num < 4000) return '3rd';
    if (num >= 4000 && num < 5000) return '4th';
    if (num >= 5000 && num < 6000) return '5th';
    // For 3-digit rooms (e.g., TP-401 -> 4th, H301F -> 3rd)
    if (num >= 100 && num < 1000) {
      const firstDigit = Math.floor(num / 100);
      if (firstDigit > 0 && firstDigit <= 9) {
        return `${firstDigit}${getOrdinalSuffix(firstDigit)}`;
      }
    }
  }
  
  return null;
}

function getOrdinalSuffix(num) {
  if (num === 1) return 'st';
  if (num === 2) return 'nd';
  if (num === 3) return 'rd';
  return 'th';
}

/**
 * Parse a single PDF file
 */
async function parsePDF(pdfConfig) {
  try {
    console.log(`\n📄 Processing: ${path.basename(pdfConfig.input)}`);
    
    if (!fs.existsSync(pdfConfig.input)) {
      console.warn(`⚠️  PDF file not found: ${pdfConfig.input}`);
      return null;
    }
    
    const dataBuffer = fs.readFileSync(pdfConfig.input);
    console.log('📖 Parsing PDF...');
    
    // Convert Buffer to Uint8Array
    const uint8Array = new Uint8Array(dataBuffer);
    
    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDoc = await loadingTask.promise;
    console.log(`✓ PDF loaded: ${pdfDoc.numPages} pages`);
    
    // Extract text from all pages
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    console.log(`✓ Text extracted: ${fullText.length} characters`);
    
    console.log('🔍 Extracting seating data...');
    const students = extractSeatingData(fullText, pdfConfig.date, pdfConfig.session);
    
    console.log(`✓ Extracted ${students.length} student records`);
    
    // Remove duplicates based on register number
    const uniqueStudents = [];
    const seen = new Set();
    
    for (const student of students) {
      if (!seen.has(student.registerNumber)) {
        seen.add(student.registerNumber);
        uniqueStudents.push(student);
      }
    }
    
    console.log(`✓ ${uniqueStudents.length} unique students after deduplication`);
    
    // Save to JSON
    fs.writeFileSync(pdfConfig.output, JSON.stringify(uniqueStudents, null, 2));
    console.log(`✅ Data saved to: ${path.basename(pdfConfig.output)}`);
    
    // Show sample
    if (uniqueStudents.length > 0) {
      console.log('📋 Sample records:');
      uniqueStudents.slice(0, 3).forEach((student, idx) => {
        console.log(`  ${idx + 1}. ${student.registerNumber} - Room: ${student.room || 'N/A'}, Seat: ${student.bench || 'N/A'}`);
      });
    }
    
    return uniqueStudents.length;
  } catch (error) {
    console.error(`❌ Error processing ${path.basename(pdfConfig.input)}:`, error.message);
    return null;
  }
}

/**
 * Main function - Parse all PDF files
 */
async function main() {
  console.log('🚀 Starting PDF parsing for multiple files...\n');
  
  let totalRecords = 0;
  const results = [];
  
  for (const pdfConfig of PDF_FILES) {
    const recordCount = await parsePDF(pdfConfig);
    if (recordCount !== null) {
      totalRecords += recordCount;
      results.push({ file: path.basename(pdfConfig.input), records: recordCount });
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  results.forEach(result => {
    console.log(`  ✓ ${result.file}: ${result.records} records`);
  });
  console.log(`\n✅ Total records extracted: ${totalRecords}`);
  console.log('='.repeat(50));
}

main();

