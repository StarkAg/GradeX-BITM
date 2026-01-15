/**
 * Test script to test local SRM login and cookie fetching
 * Run: node test-local-login.js <email> <password> [userId]
 * 
 * This will test:
 * 1. Login to SRM Academia
 * 2. Extract cookies
 * 3. Save cookies to Supabase (if userId provided)
 * 4. Fetch timetable using saved cookies
 * 5. Output timetable JSON
 */

import { loginToSRMLocal, saveCookiesToSupabase, fetchTimetableLocal } from './api/local-srm-login.js';
import { randomUUID } from 'crypto';
import 'dotenv/config';

const email = process.argv[2];
const password = process.argv[3];
const userId = process.argv[4] || null;

if (!email || !password) {
  console.error('❌ Usage: node test-local-login.js <email> <password> [userId]');
  console.error('\nExample:');
  console.error('  node test-local-login.js ha1487@srmist.edu.in yourpassword');
  console.error('  node test-local-login.js ha1487@srmist.edu.in yourpassword user-uuid-here');
  process.exit(1);
}

// Normalize email
let normalizedEmail = email.trim();
if (!normalizedEmail.includes('@')) {
  normalizedEmail = normalizedEmail + '@srmist.edu.in';
} else if (!normalizedEmail.endsWith('@srmist.edu.in')) {
  console.error('❌ Email must be @srmist.edu.in');
  process.exit(1);
}

console.log('🧪 Testing Local SRM Login Flow\n');
console.log(`📧 Email: ${normalizedEmail}`);
console.log(`🔒 Password: ${password ? '*'.repeat(password.length) : 'NOT PROVIDED'}`);
console.log(`👤 User ID: ${userId || 'NOT PROVIDED (cookies won\'t be saved)'}\n`);
console.log('='.repeat(60) + '\n');

async function testLogin() {
  try {
    console.log('📝 Step 1: Testing login to SRM Academia...\n');
    const loginResult = await loginToSRMLocal(normalizedEmail, password);
    
    if (!loginResult.success) {
      console.error('❌ Login failed:', loginResult.error);
      return;
    }
    
    console.log('✅ Login successful!');
    console.log(`   - Cookies found: ${loginResult.cookies?.length || 0}`);
    console.log(`   - Duration: ${loginResult.duration}ms\n`);
    
    if (loginResult.cookies && loginResult.cookies.length > 0) {
      console.log('📋 Sample cookies (first 3):');
      loginResult.cookies.slice(0, 3).forEach((cookie, i) => {
        console.log(`   ${i + 1}. ${cookie.name} = ${cookie.value.substring(0, 50)}...`);
      });
      console.log('');
      
      // Save cookies to Supabase if userId provided
      if (userId) {
        console.log('💾 Step 2: Saving cookies to Supabase...\n');
        try {
          await saveCookiesToSupabase(userId, loginResult.cookies);
          console.log('✅ Cookies saved to Supabase\n');
        } catch (saveError) {
          console.error('❌ Failed to save cookies:', saveError.message);
          console.log('⚠️  Continuing anyway...\n');
        }
      } else {
        console.log('⚠️  Skipping cookie save (no userId provided)\n');
      }
      
      // Test timetable fetching - we need cookies saved first
      console.log('📅 Step 3: Testing timetable fetch...\n');
      
      // For timetable fetch, we need cookies saved in Supabase
      // If userId provided, save cookies, otherwise generate a test UUID
      const testUserId = userId || randomUUID();
      
      if (!userId) {
        console.log(`💾 Saving cookies to test user (${testUserId}) for timetable fetch...\n`);
      } else {
        console.log(`💾 Using provided userId for cookie save...\n`);
      }
      
      try {
        await saveCookiesToSupabase(testUserId, loginResult.cookies);
        console.log('✅ Cookies saved for timetable test\n');
      } catch (saveError) {
        console.error('❌ Failed to save cookies:', saveError.message);
        console.log('⚠️  Cannot fetch timetable without saved cookies\n');
        console.log('📋 Cookies extracted (you can use these manually):\n');
        console.log(JSON.stringify(loginResult.cookies, null, 2));
        return;
      }
      
      try {
        const timetableResult = await fetchTimetableLocal(normalizedEmail);
        
        if (timetableResult.success && timetableResult.data) {
          console.log('✅ Timetable fetch successful!');
          console.log(`   - Courses found: ${timetableResult.data.courses?.length || 0}`);
          console.log(`   - Student info:`, timetableResult.data.studentInfo || 'None\n');
          
          if (timetableResult.data.courses && timetableResult.data.courses.length > 0) {
            console.log('\n📚 Sample courses (first 3):');
            timetableResult.data.courses.slice(0, 3).forEach((course, i) => {
              console.log(`   ${i + 1}. ${course.courseCode || 'N/A'} - ${course.courseName || 'N/A'}`);
            });
          }
          
          console.log('\n📦 Full timetable JSON:');
          console.log(JSON.stringify(timetableResult.data, null, 2));
        } else {
          console.error('❌ Timetable fetch failed:', timetableResult.error);
        }
      } catch (ttError) {
        console.error('❌ Timetable fetch error:', ttError.message);
        console.error('Stack:', ttError.stack);
      }
    } else {
      console.error('❌ No cookies found after login');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testLogin();

