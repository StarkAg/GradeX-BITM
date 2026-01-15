/**
 * Test Complete Data Flow (Mac Mode)
 * Tests the full flow: Login → Save Cookies → Fetch Timetable
 */

import 'dotenv/config';
import { randomUUID } from 'crypto';

const API_BASE = 'http://localhost:3000';
const TEST_EMAIL = 'ha1487@srmist.edu.in';
const TEST_PASSWORD = 'Stark@121';

// Generate a test user ID
const testUserId = randomUUID();

console.log('🧪 Testing Complete Data Flow (Mac Mode)\n');
console.log(`Test User ID: ${testUserId}\n`);

// Step 1: Test Login Flow
async function testLoginFlow() {
  console.log('📝 Step 1: Testing Login Flow');
  console.log('  → vps-service.js → /api/vps-login-proxy → loginToSRMLocal() → Cookies saved\n');

try {
    const response = await fetch(`${API_BASE}/api/vps-login-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Server-Mode': 'mac', // Mac mode
    },
    body: JSON.stringify({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        userId: testUserId, // Pass userId for cookie saving
    }),
  });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
  }

    const result = await response.json();
    
    if (result.success) {
      console.log('  ✅ Login successful!');
      console.log(`  ✅ Cookies extracted: ${result.cookies?.length || 0} cookies`);
      console.log(`  ✅ Mode: ${result.mode}`);
      console.log(`  ✅ Duration: ${result.duration}ms\n`);
      return true;
    } else {
      throw new Error(result.error || 'Login failed');
    }
  } catch (error) {
    console.error('  ❌ Login failed:', error.message);
    console.error('  ❌ Error details:', error);
    return false;
  }
}

// Step 2: Test Timetable Fetch Flow
async function testTimetableFlow() {
  console.log('📅 Step 2: Testing Timetable Fetch Flow');
  console.log('  → timetable-fetcher.js → /api/vps-timetable-proxy → fetchTimetableLocal() → Returns courses\n');
  
  try {
    const response = await fetch(`${API_BASE}/api/vps-timetable-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Server-Mode': 'mac', // Mac mode
    },
    body: JSON.stringify({
        email: TEST_EMAIL,
    }),
  });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success && result.data) {
      const courses = result.data.courses || [];
      const studentInfo = result.data.studentInfo || {};
      
      console.log('  ✅ Timetable fetch successful!');
      console.log(`  ✅ Courses extracted: ${courses.length} courses`);
      console.log(`  ✅ Student Info: ${studentInfo.Name || 'N/A'} (${studentInfo['Registration Number'] || 'N/A'})`);
      console.log(`  ✅ Mode: ${result.mode}\n`);
      
      // Show first course as sample
      if (courses.length > 0) {
        console.log('  📋 Sample Course (first):');
        console.log(`     Code: ${courses[0].courseCode}`);
        console.log(`     Title: ${courses[0].courseTitle}`);
        console.log(`     Faculty: ${courses[0].facultyName}`);
        console.log(`     Slot: ${courses[0].slot}\n`);
      }
      
      return true;
    } else {
      throw new Error(result.error || 'Timetable fetch failed');
    }
  } catch (error) {
    console.error('  ❌ Timetable fetch failed:', error.message);
    console.error('  ❌ Error details:', error);
    return false;
  }
}

// Run complete flow
async function runCompleteFlow() {
  console.log('='.repeat(60));
  console.log('COMPLETE DATA FLOW TEST (Mac Mode)');
  console.log('='.repeat(60));
  console.log('');
  
  // Test Login
  const loginSuccess = await testLoginFlow();
  
  if (!loginSuccess) {
    console.log('❌ Login failed. Stopping test.\n');
    process.exit(1);
  }
  
  // Wait a bit for cookies to be saved
  console.log('⏳ Waiting 2 seconds for cookies to be saved...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test Timetable
  const timetableSuccess = await testTimetableFlow();
  
  // Summary
  console.log('='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Login Flow:     ${loginSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Timetable Flow: ${timetableSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60));
  
  if (loginSuccess && timetableSuccess) {
    console.log('\n🎉 All tests passed! Complete flow is working.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Check errors above.\n');
    process.exit(1);
  }
}

// Run tests
runCompleteFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
