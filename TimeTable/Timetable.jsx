import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resolveSlotsToTimetable } from '../utils/slotResolver';
import { getCourseColor, initializeColorAssignments } from '../utils/timetableColors';
import { supabase } from '../lib/supabase';
import { isMacMode, getServerMode } from '../lib/mode-toggle.js';
import { API_ENDPOINTS } from '../lib/api-config';
import './Timetable.css';
import html2canvas from 'html2canvas';

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

/**
 * Determines slot type for color coding
 */
function getSlotType(slotCode) {
  if (slotCode && slotCode.startsWith('P')) return 'lab';
  if (slotCode && slotCode.startsWith('L')) return 'lab';
  return 'theory';
}

/**
 * Formats course name - adds (LAB) suffix for L and P slots
 */
function formatCourseName(courseName, slotCode) {
  if (!courseName) return courseName;
  // Check if slot code starts with 'L' or 'P' (case-insensitive) - both are labs
  if (slotCode && (slotCode.toUpperCase().startsWith('L') || slotCode.toUpperCase().startsWith('P'))) {
    // Only add (LAB) if it doesn't already have it
    if (!courseName.toUpperCase().includes('(LAB)')) {
      return `${courseName} (LAB)`;
    }
  }
  return courseName;
}

/**
 * Converts a string to proper case (title case)
 */
function toProperCase(str) {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function TimetableGrid({ timetable, studentInfo, selectedBatch }) {
  // Get student name and convert to proper case
  const rawName = studentInfo?.Name || studentInfo?.name || 'Student';
  const studentName = toProperCase(rawName);
  const academicYear = studentInfo?.['Academic Year'] || studentInfo?.academicYear || 'AY 2025-26 EVEN';
  
  // For display, show the actual SRM batch number (selectedBatch from backend)
  let batchNumber = '1'; // Default

  if (selectedBatch === 1 || selectedBatch === 2) {
    batchNumber = String(selectedBatch);
  } else {
    // Fallback: try to parse from studentInfo if selectedBatch is not 1 or 2
    const batchString = studentInfo?.['Combo / Batch'] || studentInfo?.['Batch'] || '';
    if (batchString) {
      const directMatch = batchString.match(/Batch\s*:\s*(\d+)/i);
      if (directMatch) {
        batchNumber = directMatch[1];
      } else {
        const match = batchString.match(/\/(\d+)/);
        if (match) {
          batchNumber = match[1];
        }
      }
    }
  }

  return (
    <div className="timetable-container">
      {/* Header with logos - matching SRM TT */}
      <div className="timetable-header-logos">
        <img src="/GradeX.png" alt="GRADEX" className="timetable-logo-left" />
        <img src="/Harsh.png" alt="BY STARK HARSH" className="timetable-logo-corner" />
      </div>
      <h2 className="timetable-title">Class Schedule</h2>
      {studentInfo && (
        <div className="timetable-subtitle">
          {academicYear} | Batch: {batchNumber} | {studentName}
        </div>
      )}
      <div className="timetable-grid">
        {/* Header row with time slots */}
        <div className="timetable-header-cell">Time</div>
        {TIME_SLOTS.map((slot) => (
          <div key={slot.period} className="timetable-header-cell">
            <div className="timetable-period-number">Slot {slot.period}</div>
            <div className="timetable-time-range">{slot.time}</div>
          </div>
        ))}

        {/* Day rows */}
        {DAYS.map((day, dayIndex) => (
          <div key={day} className="timetable-day-row">
            <div className="timetable-day-label">{day}</div>
            {TIME_SLOTS.map((slot, periodIndex) => {
              const cell = timetable[dayIndex]?.[periodIndex];
              const isEmpty = cell === null || cell === undefined;
              const isConflict = Array.isArray(cell);
              const displayCell = isConflict ? cell[0] : cell;
              const slotType = !isEmpty && displayCell ? getSlotType(displayCell.slotCode) : null;

              return (
                <div
                  key={slot.period}
                  className={`timetable-cell ${isEmpty ? 'timetable-empty-cell' : 'timetable-filled-cell'} ${
                    slotType ? `timetable-${slotType}` : ''
                  } ${isConflict ? 'timetable-conflict' : ''}`}
                  style={
                    !isEmpty && displayCell
                      ? {
                          backgroundColor: getCourseColor(displayCell.courseName, displayCell.slotCode),
                        }
                      : {}
                  }
                >
                  {!isEmpty && displayCell && (
                    <div className="timetable-cell-content">
                      {isConflict ? (() => {
                        const conflictCells = cell;
                        const hasOnline = conflictCells.some(c => c.room && c.room.toLowerCase().includes('online'));
                        const hasProject = conflictCells.some(c => 
                          c.courseName.toLowerCase().includes('project') || 
                          c.courseName.toLowerCase().includes('practical')
                        );
                        
                        if (hasOnline && hasProject && conflictCells.length === 2) {
                          const onlineCourse = conflictCells.find(c => c.room && c.room.toLowerCase().includes('online'));
                          const projectCourse = conflictCells.find(c => 
                            c.courseName.toLowerCase().includes('project') || 
                            c.courseName.toLowerCase().includes('practical')
                          );
                          const onlineName = onlineCourse?.courseName.replace(/\s*\(LAB\)\s*/gi, '').trim() || '';
                          const projectName = projectCourse?.courseName.replace(/\s*\(LAB\)\s*/gi, '').trim() || '';
                          return (
                            <div className="timetable-course-name">
                              {onlineName} (Online)/{projectName} (Practical)
                            </div>
                          );
                        } else {
                          return (
                            <>
                              {conflictCells.map((c, idx) => {
                                const room = (c.courseName.toLowerCase().includes('indian traditional') && 
                                             !c.room?.toLowerCase().includes('online'))
                                  ? 'Online'
                                  : c.room;
                                return (
                                  <div key={idx} className="timetable-conflict-course">
                                    <div className="timetable-course-name">{formatCourseName(c.courseName, c.slotCode)}</div>
                                    {room && (
                                      <div className="timetable-room-number">{room}</div>
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          );
                        }
                      })() : (
                        <>
                          <div className="timetable-course-name">{formatCourseName(displayCell.courseName, displayCell.slotCode)}</div>
                          {displayCell.room && (
                            <div className="timetable-room-number">
                              {displayCell.courseName.toLowerCase().includes('indian traditional') && 
                               !displayCell.room.toLowerCase().includes('online')
                                ? 'Online'
                                : displayCell.room}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Timetable() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedBatch, setSelectedBatch] = useState(1);
  const [courses, setCourses] = useState([]);
  const [timetable, setTimetable] = useState(null);
  const [batch1Slots, setBatch1Slots] = useState(null);
  const [batch2Slots, setBatch2Slots] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load slot mappings with cache-busting to ensure fresh data
  useEffect(() => {
    const cacheBuster = `?v=${Date.now()}`; // Cache-busting query parameter
    Promise.all([
      fetch(`/batch1_slots.json${cacheBuster}`, { cache: 'no-store' }).then(r => r.json()),
      fetch(`/batch2_slots.json${cacheBuster}`, { cache: 'no-store' }).then(r => r.json()),
    ]).then(([batch1, batch2]) => {
      setBatch1Slots(batch1);
      setBatch2Slots(batch2);
    }).catch(() => {
      // Silently fail; timetable page will show an error if mappings are missing
    });
  }, []);

  // Check login status and fetch timetable on mount
  useEffect(() => {
    checkLoginAndFetch();
    
    // Listen for storage changes (login from another tab)
    const handleStorageChange = () => {
      checkLoginAndFetch();
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Check if user is logged in and fetch timetable
  async function checkLoginAndFetch() {
    const userEmail = localStorage.getItem('gradex_user_email');
    const userId = localStorage.getItem('gradex_user_id');

    if (!userEmail || !userId) {
      setNeedsLogin(true);
      return;
    }

    // Always try to fetch fresh data from Go backend first to get latest batch number
    // Cache might have stale batch number, so we fetch fresh and update
    setFetching(true);
    
    // Try to fetch from Go backend first (this will update cache with correct batch number)
    // Backend will validate the session and return requiresLogin if session expired
    setFetching(false);
            setNeedsLogin(false);
    setError(null);
            fetchTimetableFromSRM();
  }

  /**
   * Fetches timetable data from Go backend and renders HTML table
   */
  async function fetchTimetableFromSRM() {
    const userEmail = localStorage.getItem('gradex_user_email');
    const userId = localStorage.getItem('gradex_user_id');
    
    if (!userEmail || !userId) {
      setError('Please log in to view your timetable');
      setNeedsLogin(true);
      return;
    }

    setFetching(true);
    setError(null);
    setNeedsLogin(false);

    try {
      // Fetch timetable JSON from Go backend
      const timetableUrl = API_ENDPOINTS.timetable(userId);
      
      const timetableResponse = await fetch(timetableUrl, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
      });

      if (!timetableResponse.ok) {
        const errorData = await timetableResponse.json().catch(() => ({}));
        if (errorData.requiresLogin) {
          // Go backend not connected - try Supabase cache first
          const userId = localStorage.getItem('gradex_user_id');
          if (userId) {
            try {
              const { data: cacheData, error: cacheError } = await supabase
                .from('timetable_cache')
                .select('*')
                .eq('user_id', userId)
                .gt('expires_at', new Date().toISOString())
                .maybeSingle();

              if (!cacheError && cacheData && cacheData.raw_data) {
                // Cache found - use cached data instead of showing login required
                const cachedTimetable = cacheData.raw_data;
                
                // Extract student info from cached timetable
                const rawStudentName = cachedTimetable.studentName || '';
                const studentInfo = {
                  Name: rawStudentName,
                  'Academic Year': cachedTimetable.academicYear || '',
                  'Combo / Batch': cachedTimetable.batch || '',
                  'Batch': cachedTimetable.batch || '', // Also store as 'Batch' for direct format
                  'RegNumber': cachedTimetable.regNumber || '',
                };
                setStudentInfo(studentInfo);
                
                // Convert courses from cached data
                const coursesArray = cachedTimetable.courses || cachedTimetable.Courses || [];
                if (Array.isArray(coursesArray) && coursesArray.length > 0) {
                  const formattedCourses = coursesArray.map(course => ({
                    courseCode: course.code || course.Code || '',
                    courseName: course.title || course.Title || '',
                    slotCode: course.slot || course.Slot || '',
                    room: course.room || course.Room || '',
                    category: course.category || course.Category || '',
                    faculty: course.faculty || course.Faculty || '',
                  }));
                  setCourses(formattedCourses);
                  initializeColorAssignments(formattedCourses);
                  
                  const batchNum = parseInt(cachedTimetable.batchNumber || cachedTimetable.batch_number || '1', 10);
                  setSelectedBatch(batchNum);
                  
                  // Store in localStorage
                  if (studentInfo && Object.keys(studentInfo).length > 0) {
                    localStorage.setItem('timetable_student_info', JSON.stringify(studentInfo));
                  }
                }
                
                setNeedsLogin(false);
                setError(null);
                setFetching(false);
                return; // Exit early - using cached data
              }
            } catch (cacheErr) {
              // Ignore cache errors and fall back to login required
            }
          }
          
          // No cache - show login required
          setNeedsLogin(true);
          setError('Session expired. Please login again.');
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(errorData.error || `HTTP ${timetableResponse.status}: Failed to fetch timetable`);
      }

      const timetableData = await timetableResponse.json();
      
      if (!timetableData.success || !timetableData.timetable) {
        throw new Error('No timetable data found. Please check your SRM account.');
      }

      const timetable = timetableData.timetable;

      // Extract student info from timetable data
      // Ensure we use the actual student name from timetable, not email or user ID
      const rawStudentName = timetable.studentName || '';
      const studentInfo = {
        Name: rawStudentName, // Store raw name, will be converted to proper case when displayed
        'Academic Year': timetable.academicYear || '',
        'Combo / Batch': timetable.batch || '',
        'RegNumber': timetable.regNumber || '', // Store registration number from timetable
      };
      setStudentInfo(studentInfo);

      // Convert courses from Go backend format to frontend format
      // Try both lowercase and uppercase field names (JSON should be lowercase, but check both)
      const coursesArray = timetable.courses || timetable.Courses;
      
      if (Array.isArray(coursesArray) && coursesArray.length > 0) {
        const formattedCourses = coursesArray.map(course => ({
          courseCode: course.code || course.Code || '',
          courseName: course.title || course.Title || '',
          slotCode: course.slot || course.Slot || '',
          room: course.room || course.Room || '',
          category: course.category || course.Category || '',
          faculty: course.faculty || course.Faculty || '',
        }));

        setCourses(formattedCourses);

        // Initialize color assignments in order of courses appearing in data
        initializeColorAssignments(formattedCourses);

        // Extract batch number for slot resolution
        // Try multiple field names to find batch number (backend returns batchNumber in camelCase)
        const batchValue = timetable.batchNumber || timetable.batch_number || null;
        
        // Parse batch number - handle both string and number
        let batchNum = 1; // Default fallback
        if (batchValue !== null && batchValue !== undefined && batchValue !== '') {
          if (typeof batchValue === 'string') {
            const parsed = parseInt(batchValue, 10);
            if (!isNaN(parsed) && parsed > 0) {
              batchNum = parsed;
            }
          } else if (typeof batchValue === 'number' && batchValue > 0) {
            batchNum = batchValue;
          }
        }
        
        setSelectedBatch(batchNum);
      } else {
        console.error('[Timetable] ERROR: No courses found in timetable data.');
        console.error('[Timetable] Full timetable object:', timetable);
        console.error('[Timetable] coursesArray:', coursesArray);
        console.error('[Timetable] coursesArray type:', typeof coursesArray);
        console.error('[Timetable] coursesArray is array?', Array.isArray(coursesArray));
        
        // More detailed error message
        let errorMsg = 'No courses found in timetable data. ';
        if (!coursesArray) {
          errorMsg += 'The courses field is missing from the response. ';
          errorMsg += 'Please rebuild and restart the Go backend to include the courses array.';
        } else if (Array.isArray(coursesArray) && coursesArray.length === 0) {
          errorMsg += 'The courses array is empty. ';
          errorMsg += 'This might mean your SRM account has no timetable data, or the parsing failed.';
        } else {
          errorMsg += 'The courses field is not in the expected format.';
        }
        throw new Error(errorMsg);
      }
      
      // Store in localStorage
      if (studentInfo && Object.keys(studentInfo).length > 0) {
        localStorage.setItem('timetable_student_info', JSON.stringify(studentInfo));
        window.dispatchEvent(new Event('timetableDataLoaded'));
      }

      // Update user's name in Supabase users table if we have a student name
      if (rawStudentName && userId) {
        try {
          await supabase
            .from('users')
            .update({ name: rawStudentName })
            .eq('id', userId);
        } catch (err) {
          // Ignore name update errors in UI
        }
      }
      
      setFetching(false);
    } catch (err) {
      console.error('Error fetching timetable:', err);
      setFetching(false);
      
      // Check if it's a session/auth error
      if (err.message.includes('login first') || 
          err.message.includes('requiresLogin') || 
          err.message.includes('Session expired') ||
          err.message.includes('No valid session')) {
        setNeedsLogin(true);
        setError(err.message || 'Session expired. Please login again.');
      } else {
        // Other errors - show error but don't force login
        setError(err.message || 'Failed to fetch timetable. Please try again or check your connection.');
        setNeedsLogin(false); // Allow retry without forcing login
      }
    }
  }

  // Redirect to login page if needed
  const handleGoToLogin = () => {
    navigate('/srm-login?showForm=true&redirect=/schedule');
  };

  /**
   * Downloads timetable as high-quality JPG image
   * Maintains exact same layout and size (1076px width, square cells)
   */
  async function downloadPDF() {
    if (!timetable) {
      alert('No timetable to download');
      return;
    }

    setLoading(true);

    try {
      // Find the timetable container - it should be inside the hidden wrapper on mobile
      let timetableElement = document.querySelector('.timetable-container');
      let wrapperElement = timetableElement?.parentElement;
      
      if (!timetableElement) {
        throw new Error('Timetable element not found');
      }

      // Store original styles to restore later
      const originalTimetableStyles = {
        width: timetableElement.style.width,
        maxWidth: timetableElement.style.maxWidth,
        padding: timetableElement.style.padding,
        minHeight: timetableElement.style.minHeight
      };
      
      const originalWrapperStyles = wrapperElement ? {
        visibility: wrapperElement.style.visibility,
        position: wrapperElement.style.position,
        left: wrapperElement.style.left,
        top: wrapperElement.style.top,
        zIndex: wrapperElement.style.zIndex
      } : null;

      // On mobile, temporarily make wrapper visible and position it for capture
      if (isMobile && wrapperElement) {
        wrapperElement.style.visibility = 'visible';
        wrapperElement.style.position = 'fixed';
        wrapperElement.style.left = '0';
        wrapperElement.style.top = '0';
        wrapperElement.style.zIndex = '-1000';
      }

      // Force desktop dimensions for PDF capture (prevent mobile responsive squeeze)
      // Calculate width to make cells square: day column (80px) + 12 period columns (80px each) + padding + borders
      // Day column: 80px
      // 12 period columns: 12 × 80px = 960px
      // Grid total: 80 + 960 = 1040px
      // Grid border: 2px on each side = 4px
      // Container padding: 1rem (16px) on each side = 32px
      // Total: 1040 + 4 + 32 = 1076px
      const desktopWidth = 1076; // Width that makes cells square (80px × 80px)
      timetableElement.style.width = `${desktopWidth}px`;
      timetableElement.style.maxWidth = `${desktopWidth}px`;
      timetableElement.style.padding = '1rem';
      timetableElement.style.minHeight = 'auto';

      // Also force desktop styles on the grid
      const gridElement = timetableElement.querySelector('.timetable-grid');
      const originalGridWidth = gridElement ? gridElement.style.width : null;
      
      if (gridElement) {
        gridElement.style.width = '100%';
        gridElement.style.maxWidth = '100%';
      }
      
      // Wait a moment for styles to apply
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use html2canvas with high scale for maximum quality/clarity
      // Increased scale for better image quality (4x for crisp text and details)
      const canvas = await html2canvas(timetableElement, {
        scale: 4, // Increased from 2 to 4 for maximum quality/clarity
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        letterRendering: true,
        allowTaint: false,
        width: desktopWidth,
        windowWidth: desktopWidth,
        windowHeight: timetableElement.scrollHeight,
        onclone: (clonedDoc) => {
          // Force desktop dimensions in cloned document
          const clonedContainer = clonedDoc.querySelector('.timetable-container');
          if (clonedContainer) {
            clonedContainer.style.width = `${desktopWidth}px`;
            clonedContainer.style.maxWidth = `${desktopWidth}px`;
            clonedContainer.style.padding = '1rem';
            clonedContainer.style.minHeight = 'auto';
          }
          
          const clonedGrid = clonedDoc.querySelector('.timetable-grid');
          if (clonedGrid) {
            clonedGrid.style.width = '100%';
            clonedGrid.style.maxWidth = '100%';
          }
          
          // Ensure all images are loaded in cloned document
          const images = clonedDoc.querySelectorAll('img');
          images.forEach(img => {
            if (!img.complete) {
              img.src = img.src; // Trigger reload
            }
          });
        }
      });

      // Restore original grid styles
      if (gridElement && originalGridWidth) {
        gridElement.style.width = originalGridWidth;
      }

      // Restore original styles
      timetableElement.style.width = originalTimetableStyles.width || '';
      timetableElement.style.maxWidth = originalTimetableStyles.maxWidth || '';
      timetableElement.style.padding = originalTimetableStyles.padding || '';
      timetableElement.style.minHeight = originalTimetableStyles.minHeight || '';
      
      // Restore wrapper styles on mobile
      if (isMobile && wrapperElement && originalWrapperStyles) {
        wrapperElement.style.visibility = originalWrapperStyles.visibility || 'hidden';
        wrapperElement.style.position = originalWrapperStyles.position || 'absolute';
        wrapperElement.style.left = originalWrapperStyles.left || '-9999px';
        wrapperElement.style.top = originalWrapperStyles.top || '-9999px';
        wrapperElement.style.zIndex = originalWrapperStyles.zIndex || '-1';
      }

      // Generate filename with student name (proper case, replace spaces with underscores)
      const studentName = studentInfo?.Name || studentInfo?.name || 'Unknown';
      const properCaseName = toProperCase(studentName);
      const filename = `TimeTable_${properCaseName.replace(/\s+/g, '_')}.jpg`;
      
      // Convert canvas to high-quality JPG (quality 0.98 for maximum clarity)
      // Keep exact same dimensions as canvas (1076px width, maintains aspect ratio)
      const imgData = canvas.toDataURL('image/jpeg', 0.98); // High quality JPG
      
      // iOS Safari doesn't support download attribute, use different approach
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      if (isIOS) {
        // iOS: Use blob URL for more reliable download (prevents crashes)
        // Convert data URL to blob for better iOS compatibility
        const response = await fetch(imgData);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        
        // Trigger download (iOS Safari may prompt user)
        try {
          link.click();
        } catch (e) {
          console.warn('iOS download failed, opening in new tab:', e);
          // Fallback: open in new tab
          const newWindow = window.open(url, '_blank');
          if (newWindow) {
            setTimeout(() => {
              alert('Image opened. Long press the image and select "Save to Photos".');
            }, 500);
          }
        }
        
        // Clean up after delay (longer for iOS to prevent crashes)
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link);
          }
          URL.revokeObjectURL(url);
        }, 2000);
      } else {
        // Android/Desktop: Use blob download with explicit filename
        // Convert data URL to blob
        const response = await fetch(imgData);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename; // Set the filename explicitly
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL after a short delay
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 100);
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Update timetable when courses or batch changes (EXACT LOGIC FROM SRM TT)
  // CRITICAL: Batch 1 and Batch 2 have different slot mappings, so different timetables
  // studentInfo is stored separately and available for SRM TT logic to handle
  useEffect(() => {
    if (courses.length > 0 && batch1Slots && batch2Slots) {
      // Use the actual SRM batch number from backend for slot mapping (no inversion)
      const slotMappingBatch = (selectedBatch === 1 || selectedBatch === 2) ? selectedBatch : 1;
      console.log(`Resolving timetable for Batch ${slotMappingBatch} with ${courses.length} courses`);
      if (studentInfo) {
        console.log(`  Student Info available:`, studentInfo);
      }
      const resolved = resolveSlotsToTimetable(courses, slotMappingBatch, batch1Slots, batch2Slots);
      setTimetable(resolved);
      console.log(`✓ Timetable resolved for Batch ${slotMappingBatch}`);
      // studentInfo is now stored in state and available for any SRM TT logic that needs it
    } else if (courses.length > 0) {
      console.warn('Batch slots not loaded yet, waiting...', { batch1Loaded: !!batch1Slots, batch2Loaded: !!batch2Slots });
    }
  }, [courses, selectedBatch, batch1Slots, batch2Slots, studentInfo]);

  const handleBatchChange = (batch) => {
    setSelectedBatch(batch);
    // Timetable will update automatically via useEffect
  };

  return (
    <div className="timetable-page">

      {/* Show Coming Soon message only if not fetching and needs login */}
      {!fetching && needsLogin && (
        <div style={{
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          padding: 'clamp(40px, 8vw, 80px) clamp(20px, 4vw, 40px)',
          minHeight: 'calc(100vh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
        }}>
          <div style={{
            marginBottom: '32px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <svg 
              width="80" 
              height="80" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{
                color: '#f87171',
                opacity: 0.8
              }}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>

          <div style={{
            marginBottom: '16px',
            fontSize: 'clamp(11px, 2vw, 13px)',
            fontWeight: 600,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)'
          }}>
            Login Required
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 6vw, 48px)',
            fontWeight: 400,
            letterSpacing: '0.1em',
            margin: '0 0 24px 0',
            padding: 0,
            color: 'var(--text-primary)',
            fontFamily: "'AmericanCaptain', 'Bebas Neue', sans-serif",
            textTransform: 'uppercase'
          }}>
            Schedule
          </h1>

          <p style={{
            fontSize: 'clamp(14px, 2.5vw, 18px)',
            color: 'var(--text-secondary)',
            margin: '0 0 16px 0',
            lineHeight: '1.6',
            maxWidth: '600px'
          }}>
            Please login to view your schedule.
          </p>

          <button
            onClick={handleGoToLogin}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid var(--text-primary)',
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '16px'
            }}
          >
            Go to Login
          </button>
        </div>
      )}

      {/* Error message - Aesthetic */}
      {error && !needsLogin && (
        <div style={{ 
          width: '100%',
          maxWidth: '600px',
          margin: '40px auto',
          padding: '24px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)', 
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          color: '#ef4444',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 16px rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{
            fontSize: '32px',
            opacity: 0.8
          }}>⚠️</div>
          <div style={{
            fontSize: 'clamp(14px, 2vw, 16px)',
            textAlign: 'center',
            lineHeight: '1.6'
          }}>
            {error}
          </div>
          <button
            onClick={fetchTimetableFromSRM}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            Retry
          </button>
        </div>
      )}

      {/* Loading state - Aesthetic */}
      {fetching && !error && !needsLogin && (
        <div style={{ 
          width: '100%',
          maxWidth: '800px',
          margin: '0 auto',
          padding: 'clamp(60px, 10vw, 120px) clamp(20px, 4vw, 40px)',
          minHeight: 'calc(100vh - 60px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
          {/* Animated Spinner */}
          <div style={{
            position: 'relative',
            width: '64px',
            height: '64px',
            marginBottom: '32px'
          }}>
            {/* Outer rotating ring */}
            <div style={{
              position: 'absolute',
              width: '64px',
              height: '64px',
              border: '3px solid var(--border-color)',
              borderTop: '3px solid var(--text-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              opacity: 0.6
            }}></div>
            {/* Inner pulsing dot */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '12px',
              height: '12px',
              background: 'var(--text-primary)',
              borderRadius: '50%',
              animation: 'pulse 1.5s ease-in-out infinite',
              boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)'
            }}></div>
          </div>
          
          {/* Loading text with animation */}
          <div style={{
            fontSize: 'clamp(14px, 2.5vw, 18px)',
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: '8px',
            letterSpacing: '0.05em'
          }}>
            Fetching Schedule
          </div>
          <div style={{
            fontSize: 'clamp(12px, 2vw, 14px)',
            color: 'var(--text-secondary)',
            opacity: 0.7,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            fontWeight: 400
          }}>
            From SRM Academia
          </div>
          
          {/* Progress dots */}
          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '24px',
            justifyContent: 'center'
          }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--text-primary)',
                  opacity: 0.4,
                  animation: `pulse 1.4s ease-in-out infinite ${i * 0.2}s`
                }}
              ></div>
            ))}
          </div>
        </div>
      )}

      {/* Timetable grid - always rendered but hidden on mobile (needed for download function) */}
      {timetable && !needsLogin && !fetching && (
        <div style={{ 
          position: isMobile ? 'absolute' : 'relative',
          display: 'block',
          visibility: isMobile ? 'hidden' : 'visible',
          left: isMobile ? '-9999px' : 'auto',
          top: isMobile ? '-9999px' : 'auto',
          width: isMobile ? '1076px' : 'auto',
          zIndex: isMobile ? '-1' : 'auto'
        }}>
          <TimetableGrid timetable={timetable} studentInfo={studentInfo} selectedBatch={selectedBatch} />
          
          {/* Download PDF button - positioned below the table (desktop only) */}
          {!isMobile && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginTop: '20px',
              padding: '0 20px'
            }}>
          <button 
            onClick={downloadPDF} 
            disabled={loading}
            style={{
              padding: '14px 28px',
              fontSize: '16px',
              fontWeight: 600,
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--text-primary)',
              color: 'var(--bg-primary)',
              cursor: loading ? 'wait' : 'pointer',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
              }
            }}
          >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite', marginRight: '8px' }}>
                      <line x1="12" y1="2" x2="12" y2="6"></line>
                      <line x1="12" y1="18" x2="12" y2="22"></line>
                      <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                      <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                      <line x1="2" y1="12" x2="6" y2="12"></line>
                      <line x1="18" y1="12" x2="22" y2="12"></line>
                      <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                      <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                    </svg>
                    Generating Image...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Image
                  </>
                )}
          </button>
            </div>
          )}
        </div>
      )}

      {/* Mobile message and download button - shown when timetable is loaded but on mobile */}
      {timetable && !needsLogin && !fetching && isMobile && (
        <div style={{ 
          width: '100%',
          maxWidth: '600px',
          margin: '0 auto',
          padding: '40px 20px',
          textAlign: 'center',
          minHeight: 'auto',
          boxSizing: 'border-box'
        }}>
          <div style={{
            fontSize: 'clamp(16px, 4vw, 20px)',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '12px'
          }}>
            Schedule Preview
          </div>
          <div style={{
            fontSize: 'clamp(14px, 3vw, 16px)',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            marginBottom: '32px'
          }}>
            The schedule preview is optimized for desktop viewing. Please use a desktop or tablet device to view your full timetable, or download it as an image.
          </div>
          
          {/* Download button for mobile - fixed position and styling */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '0 20px',
            marginBottom: '20px'
          }}>
          <button
              onClick={downloadPDF} 
              disabled={loading}
            style={{
                padding: '16px 32px',
              fontSize: '16px',
              fontWeight: 600,
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: 'var(--text-primary)',
                color: 'var(--bg-primary)',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.6 : 1,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                width: '100%',
                maxWidth: '320px',
              display: 'flex',
              alignItems: 'center',
                justifyContent: 'center',
              gap: '8px'
            }}
              onTouchStart={(e) => {
                if (!loading) {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'scale(0.98)';
                }
              }}
              onTouchEnd={(e) => {
                if (!loading) {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {loading ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                    <line x1="12" y1="2" x2="12" y2="6"></line>
                    <line x1="12" y1="18" x2="12" y2="22"></line>
                    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                    <line x1="2" y1="12" x2="6" y2="12"></line>
                    <line x1="18" y1="12" x2="22" y2="12"></line>
                    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                  </svg>
                  Generating Image...
              </>
            ) : (
              <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Download Image
              </>
            )}
          </button>
          </div>
        </div>
      )}
      
    </div>
  );
}
