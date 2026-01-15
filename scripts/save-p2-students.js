/**
 * Script to save Section P2 students to Supabase
 * 
 * Usage:
 *   node scripts/save-p2-students.js
 * 
 * Edit the STUDENTS_DATA array below with your student data
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

// ============================================================================
// EDIT THIS ARRAY WITH YOUR STUDENT DATA
// Format: { registration_number: 'RA2311003012184', name: 'UPASANA SINGH' }
// ============================================================================
const STUDENTS_DATA = [
  { registration_number: 'RA2311003012184', name: 'UPASANA SINGH' },
  { registration_number: 'RA2311003012185', name: 'ARPIT SINGH BAIS' },
  { registration_number: 'RA2311003012186', name: 'MRINAL YASH' },
  { registration_number: 'RA2311003012187', name: 'DEINOL MASCARENHAS' },
  { registration_number: 'RA2311003012188', name: 'BALAJI G' },
  { registration_number: 'RA2311003012189', name: 'DWARAMPUDI KANAKA SATYA PRIYANKKA' },
  { registration_number: 'RA2311003012190', name: 'AKSHAT SRIVASTAVA' },
  { registration_number: 'RA2311003012191', name: 'SHAKSHI TIWARY' },
  { registration_number: 'RA2311003012192', name: 'DIVYANSHU KUMAR' },
  { registration_number: 'RA2311003012193', name: 'BABY AFSHEEN' },
  { registration_number: 'RA2311003012194', name: 'SIDDHARTH MALIK' },
  { registration_number: 'RA2311003012195', name: 'ASHISH KUMAR' },
  { registration_number: 'RA2311003012196', name: 'ADITYA NIKHORIA' },
  { registration_number: 'RA2311003012197', name: 'SHAIK MOHAMMED SAIF' },
  { registration_number: 'RA2311003012198', name: 'DEBOSMITA PAUL' },
  { registration_number: 'RA2311003012199', name: 'HARI KRISHNAN' },
  { registration_number: 'RA2311003012200', name: 'RISHU KUMAR DASOUNDHI' },
  { registration_number: 'RA2311003012201', name: 'RISHAB SRIPATHY' },
  { registration_number: 'RA2311003012202', name: 'PALLANTLA SAISAHITH' },
  { registration_number: 'RA2311003012203', name: 'ARPITA MISHRA' },
  { registration_number: 'RA2311003012204', name: 'ABHI KHAREL' },
  { registration_number: 'RA2311003012205', name: 'AAYUSHA BHATTARAI' },
  { registration_number: 'RA2311003012206', name: 'GAUTAM PRASAD UPADHYAY' },
  { registration_number: 'RA2311003012208', name: 'HEMANG DUBEY' },
  { registration_number: 'RA2311003012209', name: 'TELAPROLU RADHA KRISHNA MURTHY' },
  { registration_number: 'RA2311003012210', name: 'HEET JAIN' },
  { registration_number: 'RA2311003012211', name: 'VISHVA SHAH' },
  { registration_number: 'RA2311003012212', name: 'SRIANSU PATRA' },
  { registration_number: 'RA2311003012213', name: 'NAVYA ASTHANA' },
  { registration_number: 'RA2311003012214', name: 'VATSAL BISHT' },
  { registration_number: 'RA2311003012215', name: 'ARK SARAF' },
  { registration_number: 'RA2311003012216', name: 'KARTIK GAWADE' },
  { registration_number: 'RA2311003012217', name: 'N V S S RISHI BODA' },
  { registration_number: 'RA2311003012219', name: 'SIDDHESH SUDHIR BIJWE' },
  { registration_number: 'RA2311003012220', name: 'MARNI ABHI SAI' },
  { registration_number: 'RA2311003012221', name: 'JANVI' },
  { registration_number: 'RA2311003012222', name: 'ADITI AJITKUMAR CHOUGALE' },
  { registration_number: 'RA2311003012223', name: 'GAUTAM SONI' },
  { registration_number: 'RA2311003012224', name: 'B TEJASHWIN' },
  { registration_number: 'RA2311003012225', name: 'ARIIN DATTATRAYA PATIL' },
  { registration_number: 'RA2311003012226', name: 'VENKATA SAI HARISH DHARMAVARAPU' },
  { registration_number: 'RA2311003012227', name: 'JOVINSHA MARY FILA J' },
  { registration_number: 'RA2311003012228', name: 'MOHAMMED AZHAN AABDIN' },
  { registration_number: 'RA2311003012229', name: 'VISHAL M' },
  { registration_number: 'RA2311003012230', name: 'ANANYA SINGH' },
  { registration_number: 'RA2311003012231', name: 'REDDI VARUN KUMAR' },
  { registration_number: 'RA2311003012232', name: 'AVIRAL PAL' },
  { registration_number: 'RA2311003012233', name: 'USHIKA LUNAWAT' },
  { registration_number: 'RA2311003012234', name: 'SURADA VAISHNAVI' },
  { registration_number: 'RA2311003012235', name: 'PRAKHAR GOYAL' },
  { registration_number: 'RA2311003012236', name: 'SRIVISHWAK R' },
  { registration_number: 'RA2311003012237', name: 'DHARSHAN S' },
  { registration_number: 'RA2311003012238', name: 'LINGESHWARAN RAMACHANDRAN' },
  { registration_number: 'RA2311003012240', name: 'SANJAI KUMAR R' },
  { registration_number: 'RA2311003012242', name: 'BHUVANESH K R' },
  { registration_number: 'RA2311003012243', name: 'LAGADAPATI DHATHRI CHOWDARY' },
  { registration_number: 'RA2311003012244', name: 'WADIWALA RIMSHA ALTAF' },
  { registration_number: 'RA2311003012245', name: 'MALA PRAJEETH' },
  { registration_number: 'RA2311003012246', name: 'HARSH AGARWAL' }
];

// ============================================================================
// MAIN FUNCTION
// ============================================================================
async function saveStudents() {
  try {
    console.log('📝 Saving students to Section P2...\n');

    if (STUDENTS_DATA.length === 0) {
      console.error('❌ No students data provided. Please edit STUDENTS_DATA array in the script.');
      process.exit(1);
    }

    console.log(`📊 Found ${STUDENTS_DATA.length} students to save\n`);

    // First, ensure Section P2 exists
    console.log('🔍 Checking if Section P2 exists...');
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
      console.log('⚠️  Section P2 not found. Creating it...');
      const { data: newSection, error: createError } = await supabase
        .from('sections')
        .insert({ name: 'P2' })
        .select()
        .single();

      if (createError) throw createError;
      console.log('✅ Section P2 created\n');
    } else {
      console.log('✅ Section P2 found\n');
    }

    // Get section ID
    const sectionId = section?.id || (await supabase.from('sections').select('id').eq('name', 'P2').single()).data.id;

    // Prepare student inserts
    const studentInserts = STUDENTS_DATA.map(student => ({
      registration_number: student.registration_number.trim(),
      name: student.name.trim(),
      section_id: sectionId
    }));

    console.log('💾 Inserting students...\n');

    // Insert students (upsert to handle duplicates)
    const { data: insertedStudents, error: insertError } = await supabase
      .from('students')
      .upsert(studentInserts, {
        onConflict: 'registration_number,section_id',
        ignoreDuplicates: false
      })
      .select();

    if (insertError) {
      console.error('❌ Error inserting students:', insertError);
      throw insertError;
    }

    console.log('✅ Successfully saved students!\n');
    console.log(`📊 Summary:`);
    console.log(`   - Section: P2`);
    console.log(`   - Students saved: ${insertedStudents.length}`);
    console.log(`   - Total provided: ${STUDENTS_DATA.length}\n`);

    if (insertedStudents.length < STUDENTS_DATA.length) {
      console.log('⚠️  Note: Some students may have been skipped due to duplicates or errors.\n');
    }

    console.log('📋 Saved students:');
    insertedStudents.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.registration_number} - ${student.name}`);
    });

    console.log('\n✅ Done!');
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

// Run the script
saveStudents();

