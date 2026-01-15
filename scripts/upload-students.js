/**
 * Upload student data from Excel sheet to Supabase CLEAN_RA_NAME_MERGED table.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-students.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL 
  || process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://phlggcheaajkupppozho.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ACCESS_TOKEN;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ACCESS_TOKEN) is required for uploads');
  console.error('   Get it from: Supabase Dashboard → Settings → API → service_role key');
  console.error('   Then run: SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/upload-students.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const excelPath = path.join(__dirname, '..', 'public', 'Sheets', 'CLEAN_RA_NAME_MERGED.xlsx');
if (!fs.existsSync(excelPath)) {
  console.error(`❌ CLEAN_RA_NAME_MERGED.xlsx not found at ${excelPath}`);
  process.exit(1);
}

console.log('📖 Reading Excel file...');
const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0]; // Use first sheet
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`📊 Found ${data.length} rows in sheet "${sheetName}"`);

// Detect column names (case-insensitive)
const firstRow = data[0] || {};
const columnMap = {};
Object.keys(firstRow).forEach(key => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('register') || lowerKey.includes('ra') || lowerKey.includes('reg')) {
    columnMap.register_number = key;
  }
  if (lowerKey.includes('name') || lowerKey.includes('student')) {
    columnMap.name = key;
  }
});

if (!columnMap.register_number || !columnMap.name) {
  console.error('❌ Could not detect required columns. Found columns:', Object.keys(firstRow));
  console.error('   Looking for: register_number (or RA/Register) and name (or Name/Student)');
  process.exit(1);
}

console.log(`✅ Detected columns:`);
console.log(`   Register Number: "${columnMap.register_number}"`);
console.log(`   Name: "${columnMap.name}"`);

// Process and clean data
const students = data
  .map((row, index) => {
    const registerNumber = row[columnMap.register_number];
    const name = row[columnMap.name];
    
    if (!registerNumber || !name) {
      return null; // Skip rows with missing data
    }
    
    // Clean and normalize
    const cleanRA = String(registerNumber).trim().toUpperCase();
    const cleanName = String(name).trim();
    
    // Validate RA format (should start with RA and have digits)
    if (!/^RA\d+/.test(cleanRA)) {
      console.warn(`⚠️  Row ${index + 2}: Invalid RA format "${cleanRA}", skipping`);
      return null;
    }
    
    if (cleanName.length === 0) {
      console.warn(`⚠️  Row ${index + 2}: Empty name, skipping`);
      return null;
    }
    
    return {
      register_number: cleanRA,
      name: cleanName
    };
  })
  .filter(Boolean); // Remove null entries

if (students.length === 0) {
  console.error('❌ No valid student records found to upload.');
  process.exit(1);
}

console.log(`\n📤 Preparing to upload ${students.length} students to Supabase...`);
console.log(`   Table: students`);

// Optional: Clear existing data
const clearExisting = process.env.CLEAR_EXISTING === 'true';
if (clearExisting) {
  console.log('🗑️  Clearing existing data...');
  const { error: deleteError } = await supabase
    .from('students')
    .delete()
    .neq('register_number', ''); // Delete all (using a condition that's always true)
  
  if (deleteError) {
    console.error('❌ Failed to clear existing data:', deleteError.message);
    process.exit(1);
  }
  console.log('✅ Existing data cleared');
}

// Upload in batches
const batchSize = 500;
let uploaded = 0;

for (let i = 0; i < students.length; i += batchSize) {
  const batch = students.slice(i, i + batchSize);
  const batchNum = Math.floor(i / batchSize) + 1;
  const totalBatches = Math.ceil(students.length / batchSize);
  
  process.stdout.write(`  → Batch ${batchNum}/${totalBatches} (${batch.length} records)... `);

  const { error } = await supabase
    .from('students')
    .upsert(batch, { onConflict: 'register_number' });

  if (error) {
    console.error(`\n❌ Failed batch ${batchNum}:`, error.message);
    process.exit(1);
  }

  uploaded += batch.length;
  console.log(`done (${uploaded}/${students.length})`);
}

// Verify upload
console.log('\n🔍 Verifying upload...');
const { count, error: countError } = await supabase
  .from('students')
  .select('*', { count: 'exact', head: true });

if (countError) {
  console.warn('⚠️  Uploaded but count check failed:', countError.message);
} else {
  console.log(`\n✅ Upload complete! Total students in Supabase: ${count}`);
  console.log(`   Expected: ${students.length}, Actual: ${count}`);
  
  if (count !== students.length) {
    console.warn(`⚠️  Count mismatch. This might be due to duplicates or existing records.`);
  }
}

// Show sample data
const { data: sampleData, error: sampleError } = await supabase
  .from('students')
  .select('register_number, name')
  .limit(5);

if (!sampleError && sampleData && sampleData.length > 0) {
  console.log('\n📋 Sample records:');
  sampleData.forEach((record, i) => {
    console.log(`   ${i + 1}. ${record.register_number} - ${record.name}`);
  });
}

console.log('\n✨ Done!');

