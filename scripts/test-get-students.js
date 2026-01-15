/**
 * Test script to verify students are in Supabase
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load .env.local first, then .env
config({ path: '.env.local' });
config({ path: '.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) must be set in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testGetStudents() {
  try {
    console.log('🔍 Testing students fetch from Supabase...\n');

    // First, check if Section P2 exists
    console.log('1. Checking if Section P2 exists...');
    const { data: section, error: sectionError } = await supabase
      .from('sections')
      .select('id, name')
      .eq('name', 'P2')
      .maybeSingle();

    if (sectionError) {
      console.error('❌ Error checking section:', sectionError);
      throw sectionError;
    }

    if (!section) {
      console.log('⚠️  Section P2 not found!');
      console.log('\n📋 Available sections:');
      const { data: allSections } = await supabase.from('sections').select('*');
      console.log(allSections);
      return;
    }

    console.log(`✅ Section P2 found: ${section.id}\n`);

    // Check if students table exists
    console.log('2. Checking students table...');
    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id, registration_number, name, section_id')
      .eq('section_id', section.id)
      .order('registration_number');

    if (studentsError) {
      console.error('❌ Error fetching students:', studentsError);
      if (studentsError.code === '42P01') {
        console.error('\n⚠️  The students table does not exist!');
        console.error('Please run the migration: supabase/migrations/014_add_students_table.sql');
      }
      throw studentsError;
    }

    console.log(`✅ Found ${students.length} students in Section P2\n`);

    if (students.length === 0) {
      console.log('⚠️  No students found!');
      console.log('Please run: node scripts/save-p2-students.js');
      return;
    }

    console.log('📋 First 10 students:');
    students.slice(0, 10).forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.registration_number} - ${student.name}`);
    });

    if (students.length > 10) {
      console.log(`   ... and ${students.length - 10} more`);
    }

    console.log(`\n✅ Success! Found ${students.length} students in Section P2`);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.details) {
      console.error('   Details:', error.details);
    }
    if (error.hint) {
      console.error('   Hint:', error.hint);
    }
    process.exit(1);
  }
}

testGetStudents();

