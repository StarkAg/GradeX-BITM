/**
 * Timetable Fetcher - Gets timetable data from SRM Academia
 * 
 * Fetches timetable data from https://academia.srmist.edu.in/#My_Time_Table_Attendance
 * via VPS proxy service (which handles cookie retrieval and SRM authentication)
 * 
 * IMPORTANT: Frontend NEVER queries sensitive columns (encrypted_cookies, password, etc.)
 * All sensitive operations are handled by VPS service using service_role key
 */

import { supabase } from './supabase';
import { isMacMode, getServerMode } from './mode-toggle.js';

/**
 * Fetches timetable data from SRM Academia via VPS proxy
 * 
 * @param {string} userId - User ID (optional, used to verify user exists)
 * @param {string} email - User email (required, used by VPS to fetch cookies)
 * @returns {Promise<Object>} Timetable data with studentInfo and courses
 */
export async function fetchTimetableFromSRM(userId, email) {
  // Mac mode is now supported - it will use local timetable fetcher via proxy

  try {
    // Step 1: Verify user exists (only query non-sensitive columns)
    if (userId) {
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('id, email') // ✅ Only non-sensitive columns
        .eq('id', userId)
        .maybeSingle();

      if (fetchError || !userData) {
        throw new Error('User not found or not authenticated');
      }

      // Use email from database if not provided
      if (!email) {
        email = userData.email;
      }
    }

    if (!email) {
      throw new Error('Email is required to fetch timetable');
    }

    // Step 2: Check connection status from localStorage (don't query cookies - RLS blocks it)
    const srmConnected = localStorage.getItem('gradex_srm_connected') === 'true';
    if (!srmConnected) {
      throw new Error('SRM connection not established. Please login to connect your SRM account first.');
    }

    // Step 3: Fetch timetable via VPS proxy (handles cookie retrieval server-side)
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const timetableUrl = isHttps 
      ? '/api/vps-proxy?action=timetable'  // Use proxy on HTTPS (combined endpoint)
      : 'http://65.20.84.46:5000/timetable'; // Direct on HTTP (not recommended)
    
    const response = await fetch(timetableUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Server-Mode': getServerMode(), // Pass mode to server
        ...(isHttps ? {} : {
          'X-API-KEY': '32631058927400e8e13cd7a7c35cf3381ffc2af66b926a3d79c2b28403769f73',
        }),
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch timetable`);
    }

    const result = await response.json();
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'No timetable data received');
    }

    return result.data; // Contains studentInfo and courses
  } catch (error) {
    console.error('Error fetching timetable:', error);
    throw error;
  }
}

/**
 * Extracts JSON data from SRM Academia HTML
 * The timetable data might be in a script tag or fetched via API
 */
export function extractTimetableJSON(html) {
  try {
    // Try to find JSON in script tags
    const scriptPatterns = [
      /<script[^>]*>[\s\S]*?var\s+timetableData\s*=\s*({[\s\S]*?});[\s\S]*?<\/script>/gi,
      /<script[^>]*>[\s\S]*?const\s+timetableData\s*=\s*({[\s\S]*?});[\s\S]*?<\/script>/gi,
      /<script[^>]*>[\s\S]*?let\s+timetableData\s*=\s*({[\s\S]*?});[\s\S]*?<\/script>/gi,
      /<script[^>]*>[\s\S]*?window\.timetableData\s*=\s*({[\s\S]*?});[\s\S]*?<\/script>/gi,
      /<script[^>]*>[\s\S]*?timetable\s*:\s*(\[[\s\S]*?\])[\s\S]*?<\/script>/gi,
    ];

    for (const pattern of scriptPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          const jsonData = JSON.parse(match[1]);
          return jsonData;
        } catch (e) {
          console.warn('Failed to parse JSON from script tag:', e);
        }
      }
    }

    // Try to find JSON in data attributes or inline data
    const dataPatterns = [
      /data-timetable\s*=\s*["']({[\s\S]*?})["']/gi,
      /data-timetable\s*=\s*["'](\[[\s\S]*?\])["']/gi,
    ];

    for (const pattern of dataPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        try {
          // Unescape HTML entities
          const unescaped = match[1]
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&amp;/g, '&');
          const jsonData = JSON.parse(unescaped);
          return jsonData;
        } catch (e) {
          console.warn('Failed to parse JSON from data attribute:', e);
        }
      }
    }

    // Try to parse as direct JSON response
    try {
      const jsonData = JSON.parse(html);
      return jsonData;
    } catch (e) {
      // Not JSON, continue to table parsing
    }

    return null;
  } catch (error) {
    console.error('Error extracting timetable JSON:', error);
    return null;
  }
}

/**
 * Parses timetable HTML table to extract course data
 */
export function parseTimetableTable(html) {
  const courses = [];
  
  try {
    // Find timetable table
    const tablePatterns = [
      /<table[^>]*class="[^"]*timetable[^"]*"[^>]*>(.*?)<\/table>/gis,
      /<table[^>]*id="[^"]*timetable[^"]*"[^>]*>(.*?)<\/table>/gis,
      /<table[^>]*>(.*?)<\/table>/gis,
    ];

    let tableContent = null;
    for (const pattern of tablePatterns) {
      const match = html.match(pattern);
      if (match) {
        tableContent = match[1];
        break;
      }
    }

    if (!tableContent) {
      console.warn('No timetable table found');
      return courses;
    }

    // Extract rows
    const rowPattern = /<tr[^>]*>(.*?)<\/tr>/gis;
    const rows = [];
    let rowMatch;
    while ((rowMatch = rowPattern.exec(tableContent)) !== null) {
      rows.push(rowMatch[1]);
    }

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Extract cells
      const cellPattern = /<td[^>]*>(.*?)<\/td>/gis;
      const cells = [];
      let cellMatch;
      
      while ((cellMatch = cellPattern.exec(row)) !== null) {
        // Remove HTML tags and clean text
        const text = cellMatch[1]
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .trim();
        cells.push(text);
      }

      // Expected format: Course Code, Course Name, Type, Faculty, Venue, Slot
      if (cells.length >= 6) {
        const courseCode = cells[0];
        const courseName = cells[1];
        const courseType = cells[2];
        const faculty = cells[3];
        const venue = cells[4];
        const slot = cells[5];

        if (courseCode && courseName) {
          courses.push({
            courseCode,
            courseName,
            courseType,
            faculty,
            venue,
            slot: slot.toUpperCase().trim(),
          });
        }
      }
    }
  } catch (error) {
    console.error('Error parsing timetable table:', error);
  }

  return courses;
}

