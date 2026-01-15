/**
 * Script to check Supabase schema state
 * Run with: node scripts/check-supabase-schema.js
 * 
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗ MISSING');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗ MISSING');
  console.error('\nPlease set these in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

console.log('🔍 Checking Supabase Schema...\n');

async function checkSchema() {
  try {
    // Check 1: Verify tables exist
    console.log('1️⃣  Checking tables...');
    const tables = ['sections', 'subjects', 'group_formations', 'groups', 'group_members', 'group_student_members', 'students'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          if (error.code === '42P01' || error.message?.includes('does not exist')) {
            console.log(`   ✗ ${table} - MISSING`);
          } else {
            console.log(`   ⚠️  ${table} - ERROR: ${error.message}`);
          }
        } else {
          console.log(`   ✓ ${table} - EXISTS (${count || 0} records)`);
        }
      } catch (err) {
        console.log(`   ✗ ${table} - ERROR: ${err.message}`);
      }
    }

    // Check 2: Test relationship query
    console.log('\n2️⃣  Testing groups -> group_members relationship...');
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, group_members(id)')
        .limit(1);

      if (error) {
        if (error.message?.includes('relationship') || error.message?.includes('Could not find')) {
          console.log('   ✗ Relationship MISSING - Run migration 018_fix_groups_group_members_relationship.sql');
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`   ⚠️  Query error: ${error.message}`);
        }
      } else {
        console.log('   ✓ Relationship EXISTS and working');
        if (data && data.length > 0) {
          console.log(`   Sample: ${JSON.stringify(data[0])}`);
        }
      }
    } catch (err) {
      console.log(`   ✗ Relationship test failed: ${err.message}`);
    }

    // Check 3: Test reverse relationship
    console.log('\n3️⃣  Testing group_members -> groups relationship...');
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('id, groups(id, title)')
        .limit(1);

      if (error) {
        console.log(`   ⚠️  Query error: ${error.message}`);
      } else {
        console.log('   ✓ Reverse relationship EXISTS and working');
        if (data && data.length > 0) {
          console.log(`   Sample: ${JSON.stringify(data[0])}`);
        }
      }
    } catch (err) {
      console.log(`   ✗ Reverse relationship test failed: ${err.message}`);
    }

    // Check 4: Verify foreign key constraint
    console.log('\n4️⃣  Checking foreign key constraint...');
    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        query: `
          SELECT 
            tc.constraint_name, 
            tc.table_name, 
            kcu.column_name,
            ccu.table_name AS foreign_table_name
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'group_members'
            AND ccu.table_name = 'groups';
        `
      });

      if (error) {
        // RPC might not exist, that's okay
        console.log('   ℹ️  Cannot check constraint via RPC (this is normal)');
        console.log('   Run the SQL diagnostic script in Supabase SQL Editor instead');
      } else if (data && data.length > 0) {
        console.log('   ✓ Foreign key constraint EXISTS');
        console.log(`   Constraint: ${data[0].constraint_name}`);
      } else {
        console.log('   ✗ Foreign key constraint MISSING');
      }
    } catch (err) {
      console.log('   ℹ️  Cannot check constraint (this is normal)');
    }

    console.log('\n✅ Schema check complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. If relationship is missing, run: supabase/migrations/018_fix_groups_group_members_relationship.sql');
    console.log('   2. For detailed diagnostics, run: supabase/migrations/019_diagnose_schema.sql in SQL Editor');

  } catch (error) {
    console.error('\n❌ Error checking schema:', error);
    process.exit(1);
  }
}

checkSchema();

