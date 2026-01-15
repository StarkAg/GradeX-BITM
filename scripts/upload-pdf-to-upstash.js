/**
 * Script to parse PDF seating arrangement and upload to Upstash Redis cache
 * Usage: node scripts/upload-pdf-to-upstash.js
 * 
 * This script:
 * 1. Parses the PDF file (22.11.25%20FN%20(TP1).pdf)
 * 2. Converts the data to the format expected by the cache system
 * 3. Uploads to Upstash Redis with 1-day expiry (86400 seconds)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment variables from .env.local if it exists (for local testing)
try {
  const dotenv = await import('dotenv');
  const envLocalPath = path.join(__dirname, '..', '.env.local');
  const envDevPath = path.join(__dirname, '..', '.env.development.local');
  
  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
    console.log('✓ Loaded environment variables from .env.local');
  }
  if (fs.existsSync(envDevPath)) {
    dotenv.config({ path: envDevPath, override: false }); // Don't override existing vars
    console.log('✓ Loaded environment variables from .env.development.local');
  }
} catch (error) {
  // dotenv not installed or file doesn't exist - use process.env directly (Vercel runtime)
  // This is fine - Vercel provides env vars at runtime
}

// PDF file to parse
const PDF_FILE = path.join(__dirname, '..', 'public', 'Sheets', '22.11.25%20FN%20(TP1).pdf');

// Date from filename: 22.11.25 = 22/11/2025
const PDF_DATE = '22/11/2025';
const PDF_SESSION = 'Forenoon'; // FN = Forenoon
const PDF_CAMPUS = 'Tech Park'; // TP1 = Tech Park

/**
 * Normalize RA number (remove spaces, uppercase)
 */
function normalizeRA(ra) {
  if (!ra) return null;
  const normalized = ra.toString().replace(/\s+/g, '').toUpperCase();
  return normalized.startsWith('RA') ? normalized : `RA${normalized}`;
}

/**
 * Extract RA numbers and seating info from PDF text
 */
function extractSeatingData(pdfText, defaultDate = PDF_DATE, defaultSession = PDF_SESSION) {
  const students = [];
  const lines = pdfText.split('\n');
  
  // Pattern to match RA numbers (RA followed by digits)
  const raPattern = /RA\s*\d{13}/gi;
  
  // Pattern to match room/hall (e.g., TP-401, UB604, VPT-028, H301F, CLS1019, S1019)
  const roomPattern = /(?:TP-?|UB|VPT-?|H|CLS|S)\d+[A-Z]?/gi;
  
  // Pattern to match subject codes (e.g., 21MEO102T, 21CSC301T)
  const subjectCodePattern = /\b\d{2}[A-Z]{3}\d{3}[A-Z]\b/gi;
  
  // Pattern to match departments (e.g., CSE, ECE, MECH)
  const deptPattern = /\b(CSE|ECE|EEE|MECH|CIVIL|AERO|AUTO|BME|BT|CHEM|IT|MCT|MDS|PHARM|ARCH)\b/gi;
  
  let currentContext = {
    room: null,
    building: null,
    subjectCode: null,
    department: null,
    session: defaultSession,
    date: defaultDate
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
          currentContext.building = 'Tech Park';
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
    let raMatches = line.match(raPattern);
    
    // If no matches, try to find RAs that might be formatted differently
    if (!raMatches || raMatches.length === 0) {
      const flexibleMatch = line.match(/R\s*A\s*(\d{13})/i);
      if (flexibleMatch) {
        raMatches = [`RA${flexibleMatch[1]}`];
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
          room: currentContext.room || null,
          building: currentContext.building || PDF_CAMPUS,
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
 * Convert PDF student data to cache format (Map<RA, Array<matches>>)
 */
function convertToCacheFormat(students) {
  const raMatchesMap = new Map();
  
  for (const student of students) {
    const ra = normalizeRA(student.registerNumber);
    if (!ra) continue;
    
    if (!raMatchesMap.has(ra)) {
      raMatchesMap.set(ra, []);
    }
    
    // Build URL for this match (using Tech Park endpoint as base)
    const dateParam = student.date || PDF_DATE;
    const formattedDate = dateParam.replace(/-/g, '/');
    const sessionParam = student.session === 'Forenoon' ? 'FN' : (student.session === 'Afternoon' ? 'AN' : 'FN');
    const url = `https://examcell.srmist.edu.in/tp/seating/bench/fetch_data.php?dated=${encodeURIComponent(formattedDate)}&session=${sessionParam}`;
    
    // Create match object in the same format as fetchAllCampusData
    raMatchesMap.get(ra).push({
      ra: ra,
      session: student.session || PDF_SESSION,
      hall: student.room || 'N/A',
      bench: student.bench || 'N/A',
      department: student.department || 'N/A',
      subjectCode: student.subcode || null,
      context: `${student.department || ''} ${student.subcode || ''} ${student.registerNumber}`.trim(),
      matched: true,
      dateMatched: true,
      campus: student.building || PDF_CAMPUS,
      url: url
    });
      }
  
  return raMatchesMap;
}

/**
 * Upload data to Upstash Redis
 */
async function uploadToUpstash(dataMap, cacheKey) {
  try {
    // Get Upstash Redis credentials
    const redisUrl = process.env.UPSTASH_REDIS__KV_REST_API_URL || 
                     process.env.UPSTASH_REDIS_REST_URL || 
                     process.env.REDIS_REST_URL || 
                     process.env.KV_REST_API_URL;
    const redisToken = process.env.UPSTASH_REDIS__KV_REST_API_TOKEN || 
                       process.env.UPSTASH_REDIS_REST_TOKEN || 
                       process.env.REDIS_REST_TOKEN || 
                       process.env.KV_REST_API_TOKEN;
    
    if (!redisUrl || !redisToken) {
      throw new Error('Upstash Redis credentials not found in environment variables. Please set UPSTASH_REDIS__KV_REST_API_URL and UPSTASH_REDIS__KV_REST_API_TOKEN');
    }
    
    console.log('🔌 Connecting to Upstash Redis...');
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    
    // Convert Map to plain object for JSON storage
    const dataObject = {};
    for (const [ra, matches] of dataMap.entries()) {
      dataObject[ra] = matches;
    }
    
    const timestamp = Date.now();
    const redisKey = `campus_cache:${cacheKey}`;
    
    // Store with 1-day expiry (86400 seconds)
    console.log(`💾 Uploading ${dataMap.size} unique RAs to Upstash Redis...`);
    await redis.set(redisKey, {
      timestamp,
      data: dataObject,
    }, { ex: 86400 }); // 1 day = 86400 seconds
    
    console.log(`✅ Successfully uploaded to Upstash Redis!`);
    console.log(`   Key: ${redisKey}`);
    console.log(`   RAs: ${dataMap.size}`);
    console.log(`   Expiry: 1 day (86400 seconds)`);
    console.log(`   Timestamp: ${new Date(timestamp).toISOString()}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error uploading to Upstash Redis:', error.message);
    throw error;
  }
}

/**
 * Parse PDF and upload to Upstash
 */
async function main() {
  try {
    console.log('🚀 Starting PDF to Upstash upload process...\n');
    console.log(`📄 PDF File: ${path.basename(PDF_FILE)}`);
    console.log(`📅 Date: ${PDF_DATE}`);
    console.log(`🕐 Session: ${PDF_SESSION}`);
    console.log(`🏛️  Campus: ${PDF_CAMPUS}\n`);
    
    // Check if PDF exists
    if (!fs.existsSync(PDF_FILE)) {
      console.error(`❌ PDF file not found: ${PDF_FILE}`);
      process.exit(1);
    }
    
    // Parse PDF
    console.log('📖 Parsing PDF...');
    const dataBuffer = fs.readFileSync(PDF_FILE);
    const uint8Array = new Uint8Array(dataBuffer);
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
    
    // Extract seating data
    console.log('🔍 Extracting seating data...');
    const students = extractSeatingData(fullText, PDF_DATE, PDF_SESSION);
    console.log(`✓ Extracted ${students.length} student records`);
    
    // Remove duplicates
    const uniqueStudents = [];
    const seen = new Set();
    for (const student of students) {
      if (!seen.has(student.registerNumber)) {
        seen.add(student.registerNumber);
        uniqueStudents.push(student);
    }
    }
    console.log(`✓ ${uniqueStudents.length} unique students after deduplication`);
    
    // Convert to cache format
    console.log('🔄 Converting to cache format...');
    const dataMap = convertToCacheFormat(uniqueStudents);
    console.log(`✓ Converted to Map with ${dataMap.size} unique RAs`);
    
    // Show sample
    if (dataMap.size > 0) {
      console.log('\n📋 Sample records:');
      let count = 0;
      for (const [ra, matches] of dataMap.entries()) {
        if (count >= 3) break;
        const match = matches[0];
        console.log(`  ${count + 1}. ${ra} - Room: ${match.hall}, Seat: ${match.bench}, Dept: ${match.department}`);
        count++;
      }
    }
    
    // Upload to Upstash with multiple date formats (to match API cache key variants)
    console.log('\n' + '='.repeat(50));
    // Upload with DD/MM/YYYY format (e.g., 22/11/2025)
    const cacheKey1 = PDF_DATE; // DD/MM/YYYY format
    await uploadToUpstash(dataMap, cacheKey1);
    console.log('\n--- Uploading with alternative date format ---');
    // Also upload with DD-MM-YYYY format (e.g., 22-11-2025) for API compatibility
    const cacheKey2 = PDF_DATE.replace(/\//g, '-'); // DD-MM-YYYY format
    await uploadToUpstash(dataMap, cacheKey2);
    console.log('='.repeat(50));
    
    console.log('\n✅ Upload complete!');
    console.log(`\n💡 The cache will be available for 1 day (until ${new Date(Date.now() + 86400000).toISOString()})`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
