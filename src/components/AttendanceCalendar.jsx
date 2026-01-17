import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { getSubjects, getSubjectColor } from '../lib/subjects';
import { logActivity } from '../lib/activity-log';
import { isViewOnlyMode } from '../lib/view-only';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function AttendanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState({});
  const [dailyAttendance, setDailyAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [hoveredDate, setHoveredDate] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);

  const userId = localStorage.getItem('gradex_user_id');

  useEffect(() => {
    setViewOnly(isViewOnlyMode());
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load schedule from Supabase cache on mount
  const loadSchedule = useCallback(async () => {
    if (!userId) return;
    
    try {
      const { data: cacheData, error: cacheError } = await supabase
        .from('timetable_cache')
        .select('*')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!cacheError && cacheData && cacheData.raw_data && cacheData.raw_data.schedule) {
        // Schedule data found in cache
        const scheduleData = cacheData.raw_data.schedule;
        if (scheduleData && typeof scheduleData === 'object') {
          // Update timetable if schedule data is available
          setTimetable(scheduleData);
          localStorage.setItem('gradex_timetable', JSON.stringify(scheduleData));
        }
      }
    } catch (err) {
      console.log('[Calendar] Could not load schedule from cache:', err);
    }
  }, [userId]);

  useEffect(() => {
    setSubjects(getSubjects());
    const saved = localStorage.getItem('gradex_timetable');
    if (saved) setTimetable(JSON.parse(saved));
    
    // Attempt to load schedule from Supabase cache
    loadSchedule();
    
    const handleUpdate = () => setSubjects(getSubjects());
    window.addEventListener('subjectsUpdated', handleUpdate);
    return () => window.removeEventListener('subjectsUpdated', handleUpdate);
  }, [loadSchedule]);

  // Load daily attendance from Supabase
  const loadDailyAttendance = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('daily_attendance')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      const attendanceMap = {};
      (data || []).forEach(record => {
        const key = record.date;
        if (!attendanceMap[key]) attendanceMap[key] = {};
        // Only add valid statuses
        if (record.status === 'present' || record.status === 'absent') {
          attendanceMap[key][record.subject_code] = record.status;
        }
      });
      setDailyAttendance(attendanceMap);
      // Sync to localStorage
      localStorage.setItem('gradex_daily_attendance', JSON.stringify(attendanceMap));
    } catch (err) {
      console.error('Error loading daily attendance:', err);
      // Load from localStorage as fallback
      const saved = localStorage.getItem('gradex_daily_attendance');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clean up any invalid entries
        const cleaned = {};
        Object.keys(parsed).forEach(date => {
          const dayData = parsed[date];
          const validEntries = {};
          Object.keys(dayData).forEach(subjectCode => {
            const status = dayData[subjectCode];
            if (status === 'present' || status === 'absent') {
              validEntries[subjectCode] = status;
            }
          });
          if (Object.keys(validEntries).length > 0) {
            cleaned[date] = validEntries;
          }
        });
        setDailyAttendance(cleaned);
        localStorage.setItem('gradex_daily_attendance', JSON.stringify(cleaned));
      }
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadDailyAttendance();
    
    // Listen for attendance updates from other pages
    const handleAttendanceUpdate = () => {
      loadDailyAttendance();
    };
    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    
    return () => {
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
    };
  }, [loadDailyAttendance]);

  // Specifically check and clean today's date on mount
  useEffect(() => {
    if (!userId || loading) return;
    
    const todayStr = formatDateKey(new Date());
    const todayData = dailyAttendance[todayStr];
    
    if (todayData) {
      const validEntries = {};
      let hasInvalid = false;
      
      Object.keys(todayData).forEach(subjectCode => {
        const status = todayData[subjectCode];
        if (status === 'present' || status === 'absent') {
          validEntries[subjectCode] = status;
        } else {
          hasInvalid = true;
        }
      });
      
      // If we found invalid data for today, clean it
      if (hasInvalid || Object.keys(validEntries).length !== Object.keys(todayData).length) {
        const updated = { ...dailyAttendance };
        if (Object.keys(validEntries).length > 0) {
          updated[todayStr] = validEntries;
        } else {
          delete updated[todayStr];
        }
        setDailyAttendance(updated);
        localStorage.setItem('gradex_daily_attendance', JSON.stringify(updated));
        
        // Clean Supabase
        if (hasInvalid) {
          supabase
            .from('daily_attendance')
            .delete()
            .eq('user_id', userId)
            .eq('date', todayStr)
            .then(() => {
              // Reload to ensure sync
              loadDailyAttendance();
            })
            .catch(err => console.error('Error cleaning today from Supabase:', err));
        }
      }
    }
  }, [userId, loading, dailyAttendance, loadDailyAttendance]);

  // Clean up invalid data and ensure Supabase is in sync
  useEffect(() => {
    if (!userId || loading) return;
    
    const cleanData = async () => {
      const cleaned = {};
      const datesToDelete = [];
      
      Object.keys(dailyAttendance).forEach(date => {
        const dayData = dailyAttendance[date];
        const validEntries = {};
        let hasInvalid = false;
        
        Object.keys(dayData).forEach(subjectCode => {
          const status = dayData[subjectCode];
          // Only accept 'present' or 'absent', nothing else
          if (status === 'present' || status === 'absent') {
            validEntries[subjectCode] = status;
          } else {
            hasInvalid = true;
          }
        });
        
        if (Object.keys(validEntries).length > 0) {
          cleaned[date] = validEntries;
        } else if (Object.keys(dayData).length > 0) {
          hasInvalid = true;
          datesToDelete.push(date);
        }
      });
      
      // If we found invalid data, clean it up
      if (datesToDelete.length > 0 || JSON.stringify(cleaned) !== JSON.stringify(dailyAttendance)) {
        // Update state
        setDailyAttendance(cleaned);
        localStorage.setItem('gradex_daily_attendance', JSON.stringify(cleaned));
        
        // Clean up Supabase - delete invalid entries
        if (datesToDelete.length > 0) {
          for (const date of datesToDelete) {
            try {
              await supabase
                .from('daily_attendance')
                .delete()
                .eq('user_id', userId)
                .eq('date', date);
            } catch (err) {
              console.error(`Error cleaning date ${date} from Supabase:`, err);
            }
          }
        }
        
        // Also check for any invalid statuses in Supabase and delete them
        try {
          const { data: allRecords } = await supabase
            .from('daily_attendance')
            .select('*')
            .eq('user_id', userId);
          
          if (allRecords) {
            const invalidRecords = allRecords.filter(r => 
              r.status !== 'present' && r.status !== 'absent'
            );
            
            if (invalidRecords.length > 0) {
              for (const record of invalidRecords) {
                await supabase
                  .from('daily_attendance')
                  .delete()
                  .eq('id', record.id);
              }
            }
          }
        } catch (err) {
          console.error('Error checking Supabase for invalid records:', err);
        }
      }
    };
    
    // Only run cleanup if we have data
    if (Object.keys(dailyAttendance).length > 0) {
      cleanData();
    }
  }, [dailyAttendance, userId, loading]);

  // Disable scroll on this page
  // Lock scroll on Calendar page (mobile and desktop)
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyHeight = document.body.style.height;
    const originalBodyPosition = document.body.style.position;
    const originalBodyWidth = document.body.style.width;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlHeight = document.documentElement.style.height;
    
    document.body.style.overflow = 'hidden';
    document.body.style.height = isMobile ? '100dvh' : '100vh';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.height = isMobile ? '100dvh' : '100vh';
    
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.height = originalBodyHeight;
      document.body.style.position = originalBodyPosition;
      document.body.style.width = originalBodyWidth;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.height = originalHtmlHeight;
    };
  }, [isMobile]);

  // Get classes for a specific day of week - returns ALL occurrences (including duplicates)
  // Each occurrence gets a unique attendance code so they count as separate hours
  const getClassesForDay = (dayOfWeek) => {
    const dayName = DAYS[dayOfWeek]; // Sun=0, Sat=6
    if (!dayName || !timetable[dayName]) return [];
    
    const classes = [];
    const subjectMap = {};
    subjects.forEach(s => { subjectMap[s.code] = s; });
    
    // Track occurrences to create unique codes for duplicates
    const occurrenceCount = {};
    
    timetable[dayName].forEach((cell, idx) => {
      if (cell && cell.code && subjectMap[cell.code]) {
        const isLab = cell.isLab || false;
        const baseCode = cell.code;
        
        // Count occurrences of this subject code on this day
        if (!occurrenceCount[baseCode]) {
          occurrenceCount[baseCode] = 0;
        }
        occurrenceCount[baseCode]++;
        
        // Create unique attendance code for each occurrence
        // First occurrence: just the code (e.g., "MM")
        // Second occurrence: code with index (e.g., "MM-2")
        // Lab classes: code with -LAB (e.g., "QDA-LAB")
        let attendanceCode;
        if (isLab) {
          attendanceCode = `${baseCode}-LAB`;
        } else if (occurrenceCount[baseCode] === 1) {
          attendanceCode = baseCode;
        } else {
          attendanceCode = `${baseCode}-${occurrenceCount[baseCode]}`;
        }
        
        // Add ALL occurrences, even duplicates - each tracked separately
        classes.push({
          ...subjectMap[baseCode],
          slotIndex: idx,
          room: cell.room || subjectMap[baseCode].room || 'LH-11',
          isLab: isLab,
          // Unique attendance code for each occurrence (so they count as separate hours)
          attendanceCode: attendanceCode
        });
      }
    });
    
    return classes;
  };

  // Toggle attendance for a class on a specific date
  const toggleAttendance = async (date, subjectCode, newStatus) => {
    if (viewOnly) return; // Prevent edits in view-only mode
    const dateStr = formatDateKey(date);
    
    // Update local state immediately for instant UI feedback
    setDailyAttendance(prev => {
      const updated = JSON.parse(JSON.stringify(prev)); // Deep clone to ensure React detects change
      if (!updated[dateStr]) updated[dateStr] = {};
      if (newStatus === null) {
        delete updated[dateStr][subjectCode];
        // Remove the date entry if it's now empty
        if (Object.keys(updated[dateStr]).length === 0) {
          delete updated[dateStr];
        }
      } else {
        updated[dateStr][subjectCode] = newStatus;
      }
      // Save to localStorage
      localStorage.setItem('gradex_daily_attendance', JSON.stringify(updated));
      return updated;
    });

    // Sync to Supabase
    if (userId) {
      try {
        const subject = subjects.find(s => s.code === subjectCode);
        if (newStatus === null) {
          await supabase
            .from('daily_attendance')
            .delete()
            .eq('user_id', userId)
            .eq('date', dateStr)
            .eq('subject_code', subjectCode);
          logActivity('attendance_updated', {
            subject: subject?.name || subjectCode,
            subjectCode,
            action: 'removed',
            date: dateStr,
            method: 'calendar'
          });
        } else {
          await supabase
            .from('daily_attendance')
            .upsert({
              user_id: userId,
              date: dateStr,
              subject_code: subjectCode,
              status: newStatus
            }, { onConflict: 'user_id,date,subject_code' });
          logActivity('attendance_updated', {
            subject: subject?.name || subjectCode,
            subjectCode,
            action: 'marked',
            status: newStatus,
            date: dateStr,
            method: 'calendar'
          });
        }

        // Update manual_attendance totals
        await updateAttendanceTotals(subjectCode);
        
        // Reload attendance to ensure consistency
        await loadDailyAttendance();
      } catch (err) {
        console.error('Error syncing attendance:', err);
        // Reload anyway to sync state
        await loadDailyAttendance();
      }
    }
  };

  // Recalculate totals for a subject based on daily records
  // Handles all variations: base code, -LAB, and numbered duplicates (e.g., MM, MM-2, QDA-LAB)
  const updateAttendanceTotals = async (subjectCode) => {
    if (!userId) return;
    
    // Extract base code (remove -LAB suffix or numbered suffix like -2, -3, etc.)
    let baseCode = subjectCode;
    if (baseCode.endsWith('-LAB')) {
      baseCode = baseCode.replace('-LAB', '');
    } else if (baseCode.includes('-')) {
      // Remove numbered suffix (e.g., "MM-2" -> "MM")
      const parts = baseCode.split('-');
      const lastPart = parts[parts.length - 1];
      if (!isNaN(lastPart)) {
        baseCode = parts.slice(0, -1).join('-');
      }
    }
    
    const saved = localStorage.getItem('gradex_daily_attendance');
    const allDaily = saved ? JSON.parse(saved) : dailyAttendance;
    
    let attended = 0;
    let conducted = 0;
    
    // Count all variations of this subject (base code, lab, and numbered duplicates)
    Object.values(allDaily).forEach(dayData => {
      Object.keys(dayData).forEach(code => {
        // Check if this code belongs to the base subject
        let codeBase = code;
        if (codeBase.endsWith('-LAB')) {
          codeBase = codeBase.replace('-LAB', '');
        } else if (codeBase.includes('-')) {
          const parts = codeBase.split('-');
          const lastPart = parts[parts.length - 1];
          if (!isNaN(lastPart)) {
            codeBase = parts.slice(0, -1).join('-');
          }
        }
        
        // If this code belongs to our base subject, count it
        if (codeBase === baseCode) {
          conducted++;
          if (dayData[code] === 'present') attended++;
        }
      });
    });

    try {
      // Update totals for the base subject code (includes all variations)
      await supabase.from('manual_attendance').upsert({
        user_id: userId,
        subject_code: baseCode,
        classes_attended: attended,
        classes_conducted: conducted
      }, { onConflict: 'user_id,subject_code' });
    } catch (err) {
      console.error('Error updating totals:', err);
    }
  };

  const formatDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Get calendar days for current month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days = [];

    // Previous month padding
    for (let i = 0; i < startPadding; i++) {
      const d = new Date(year, month, -startPadding + i + 1);
      days.push({ date: d, isCurrentMonth: false });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return days;
  };

  // Get attendance status for a day
  const getDayStatus = (date) => {
    const dateStr = formatDateKey(date);
    const dayData = dailyAttendance[dateStr] || {};
    
    // Get number of classes scheduled for this day
    const dayOfWeek = date.getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    const scheduledClasses = getClassesForDay(dayOfWeek);
    const totalHours = scheduledClasses.length;
    
    if (totalHours === 0) return null;

    // Count present and absent for each scheduled class
    const attendanceByCode = {};
    Object.entries(dayData).forEach(([code, status]) => {
      if (status === 'present' || status === 'absent') {
        // Handle both base codes and attendance codes (e.g., "MM" and "MM-2", "QDA-LAB")
        const baseCode = code.split('-')[0];
        if (!attendanceByCode[baseCode]) {
          attendanceByCode[baseCode] = [];
        }
        attendanceByCode[baseCode].push(status);
      }
    });

    // Match scheduled classes with attendance data
    const presentHours = [];
    const absentHours = [];
    
    scheduledClasses.forEach(cls => {
      const baseCode = cls.code;
      const attendanceCode = cls.attendanceCode || baseCode;
      
      // Check if we have attendance for this specific class
      const status = dayData[attendanceCode] || dayData[baseCode];
      
      if (status === 'present') {
        presentHours.push(attendanceCode);
      } else if (status === 'absent') {
        absentHours.push(attendanceCode);
      }
    });

    return { 
      total: totalHours, 
      present: presentHours.length, 
      absent: absentHours.length,
      presentHours,
      absentHours
    };
  };

  const navigateMonth = (delta) => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`
          @keyframes spin { 
            to { transform: rotate(360deg); } 
          }
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', 
      margin: '0 auto', 
      height: isMobile ? 'calc(100dvh - 50px - 70px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' : 'calc(100vh - 55px)',
      paddingBottom: isMobile ? `calc(20px + env(safe-area-inset-bottom, 0px))` : '20px',
      overflow: 'hidden', 
      display: 'flex', 
      flexDirection: 'column' 
    }}>

        {/* Month Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isMobile ? '4px' : '6px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: isMobile ? '4px 8px' : '6px 10px', flexShrink: 0 }}>
          <button onClick={() => navigateMonth(-1)} style={{ padding: '4px 6px', border: '1px solid var(--border-color)', background: 'transparent', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h2 style={{ fontSize: isMobile ? '12px' : '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <button onClick={() => navigateMonth(1)} style={{ padding: '4px 6px', border: '1px solid var(--border-color)', background: 'transparent', borderRadius: '4px', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Note */}
        <div style={{ padding: isMobile ? '6px 10px' : '8px 12px', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: isMobile ? '4px' : '6px', fontSize: isMobile ? '9px' : '10px', color: 'var(--text-secondary)', textAlign: 'center', flexShrink: 0 }}>
          Mark your attendance in this calendar by day
        </div>

      {/* Calendar Grid */}
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, padding: isMobile ? '0' : '0 12px 16px 12px' }}>
        {/* Day Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
          {DAY_NAMES.map((day, idx) => (
            <div key={day} style={{ padding: isMobile ? '4px 2px' : '6px 3px', textAlign: 'center', fontSize: isMobile ? '9px' : '11px', fontWeight: 600, color: (idx === 0 || idx === 6) ? '#f87171' : 'var(--text-secondary)', textTransform: 'uppercase' }}>
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', flex: 1, minHeight: 0 }}>
          {getCalendarDays().map(({ date, isCurrentMonth }, idx) => {
            const dayStatus = getDayStatus(date);
            const today = isToday(date);
            const weekend = isWeekend(date);
            const dayClasses = getClassesForDay(date.getDay());
            const hasClasses = dayClasses.length > 0;
            
            return (
              <div
                key={idx}
                onClick={() => isCurrentMonth && setSelectedDate(date)}
                onMouseEnter={() => !isMobile && isCurrentMonth && setHoveredDate(date)}
                onMouseLeave={() => !isMobile && setHoveredDate(null)}
                style={{
                  padding: isMobile ? '4px 2px' : '8px 6px',
                  borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border-color)' : 'none',
                  borderBottom: idx < 35 ? '1px solid var(--border-color)' : 'none',
                  background: today ? (weekend ? 'rgba(74, 222, 128, 0.2)' : 'rgba(74, 222, 128, 0.15)') : (weekend ? 'rgba(248, 113, 113, 0.08)' : 'transparent'),
                  opacity: isCurrentMonth ? 1 : 0.3,
                  cursor: isCurrentMonth ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: isMobile ? '35px' : '50px',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ fontSize: isMobile ? '10px' : '20px', fontWeight: today ? 700 : 500, color: weekend ? '#f87171' : 'var(--text-primary)', marginBottom: isMobile ? '1px' : '2px' }}>
                  {date.getDate()}
                </div>
                
                {dayStatus && dayStatus.total > 0 && (
                  <div style={{ display: 'flex', gap: isMobile ? '2px' : '3px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%' }}>
                    {/* Show green dots for present hours */}
                    {Array.from({ length: dayStatus.present }).map((_, idx) => (
                      <span 
                        key={`present-${idx}`}
                        style={{ 
                          width: isMobile ? '4px' : '10px', 
                          height: isMobile ? '4px' : '10px', 
                          borderRadius: '50%', 
                          background: '#4ade80',
                          flexShrink: 0
                        }} 
                        title={`${dayStatus.present} present`} 
                      />
                    ))}
                    {/* Show red dots for absent hours */}
                    {Array.from({ length: dayStatus.absent }).map((_, idx) => (
                      <span 
                        key={`absent-${idx}`}
                        style={{ 
                          width: isMobile ? '4px' : '10px', 
                          height: isMobile ? '4px' : '10px', 
                          borderRadius: '50%', 
                          background: '#f87171',
                          flexShrink: 0
                        }} 
                        title={`${dayStatus.absent} absent`} 
                      />
                    ))}
                    {/* Show gray dots for unmarked hours */}
                    {Array.from({ length: dayStatus.total - dayStatus.present - dayStatus.absent }).map((_, idx) => (
                      <span 
                        key={`unmarked-${idx}`}
                        style={{ 
                          width: isMobile ? '4px' : '10px', 
                          height: isMobile ? '4px' : '10px', 
                          borderRadius: '50%', 
                          background: 'rgba(128, 128, 128, 0.3)',
                          flexShrink: 0
                        }} 
                        title={`Unmarked`} 
                      />
                    ))}
                  </div>
                )}

                {/* Hover Icons - Enhanced Glass Overlay (Desktop only) */}
                {!isMobile && isCurrentMonth && hoveredDate && hoveredDate.getTime() === date.getTime() && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '4px',
                      background: 'rgba(0, 0, 0, 0.55)',
                      backdropFilter: 'blur(12px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                      borderRadius: '0',
                      zIndex: 10,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 8px 32px rgba(0, 0, 0, 0.3)',
                      animation: 'fadeInScale 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxSizing: 'border-box',
                      width: '100%',
                      height: '100%'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!viewOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const classes = getClassesForDay(date.getDay());
                          const allSubjects = classes.length > 0 ? classes : subjects;
                          allSubjects.forEach(cls => {
                            const attendanceCode = cls.attendanceCode || cls.code;
                            toggleAttendance(date, attendanceCode, 'present');
                          });
                        }}
                        style={{
                          padding: '8px 6px',
                          border: '2px solid rgba(74, 222, 128, 0.6)',
                          background: 'rgba(74, 222, 128, 0.15)',
                          color: '#4ade80',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          borderRadius: '8px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          boxShadow: '0 2px 8px rgba(74, 222, 128, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                          flex: 1,
                          minWidth: 0,
                          fontWeight: 500,
                          fontSize: '9px',
                          letterSpacing: '0.3px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#4ade80';
                          e.currentTarget.style.color = '#000';
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.borderColor = '#4ade80';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(74, 222, 128, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(74, 222, 128, 0.15)';
                          e.currentTarget.style.color = '#4ade80';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.borderColor = 'rgba(74, 222, 128, 0.6)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(74, 222, 128, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                        }}
                        title="Mark All Present"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5"/>
                        </svg>
                        <span style={{ fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>All</span>
                      </button>
                    )}
                    {!viewOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const classes = getClassesForDay(date.getDay());
                          const allSubjects = classes.length > 0 ? classes : subjects;
                          allSubjects.forEach(cls => {
                            const attendanceCode = cls.attendanceCode || cls.code;
                            toggleAttendance(date, attendanceCode, 'absent');
                          });
                        }}
                        style={{
                          padding: '8px 6px',
                          border: '2px solid rgba(248, 113, 113, 0.6)',
                          background: 'rgba(248, 113, 113, 0.15)',
                          color: '#f87171',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          borderRadius: '8px',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          boxShadow: '0 2px 8px rgba(248, 113, 113, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                          flex: 1,
                          minWidth: 0,
                          fontWeight: 500,
                          fontSize: '9px',
                          letterSpacing: '0.3px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f87171';
                          e.currentTarget.style.color = '#000';
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.borderColor = '#f87171';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(248, 113, 113, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(248, 113, 113, 0.15)';
                          e.currentTarget.style.color = '#f87171';
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.borderColor = 'rgba(248, 113, 113, 0.6)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(248, 113, 113, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                        }}
                        title="Mark All Absent"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                        <span style={{ fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>All</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(date);
                      }}
                      style={{
                        padding: '8px 6px',
                        border: '2px solid rgba(147, 197, 253, 0.6)',
                        background: 'rgba(147, 197, 253, 0.15)',
                        color: '#93c5fd',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        borderRadius: '8px',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        boxShadow: '0 2px 8px rgba(147, 197, 253, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                        flex: 1,
                        minWidth: 0,
                        fontWeight: 500,
                        fontSize: '9px',
                        letterSpacing: '0.3px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#93c5fd';
                        e.currentTarget.style.color = '#000';
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.borderColor = '#93c5fd';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(147, 197, 253, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(147, 197, 253, 0.15)';
                        e.currentTarget.style.color = '#93c5fd';
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.borderColor = 'rgba(147, 197, 253, 0.6)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(147, 197, 253, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                      }}
                      title="Edit Attendance"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                      <span style={{ fontSize: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.3px' }}>Edit</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


      {/* Day Detail Modal */}
      {selectedDate && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10000, padding: '20px'
          }}
          onClick={() => setSelectedDate(null)}
        >
          <div
            style={{
              background: 'var(--card-bg)', borderRadius: '16px',
              border: '1px solid var(--border-color)', width: '100%',
              maxWidth: '400px', maxHeight: '80vh', overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                    {DAYS[selectedDate.getDay()]}
                  </h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                    {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
                  </p>
                </div>
                <button onClick={() => setSelectedDate(null)} style={{ padding: '8px', border: '1px solid var(--border-color)', background: 'transparent', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {/* Full Day Buttons */}
              {!viewOnly && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      const classes = getClassesForDay(selectedDate.getDay());
                      const allSubjects = classes.length > 0 ? classes : subjects;
                      // Use attendanceCode for tracking (same for lab and normal)
                      allSubjects.forEach(cls => {
                        const attendanceCode = cls.attendanceCode || cls.code;
                        toggleAttendance(selectedDate, attendanceCode, 'present');
                      });
                    }}
                    style={{ flex: 1, padding: isMobile ? '8px' : '10px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', fontWeight: 600, fontSize: isMobile ? '11px' : '13px', border: '1px solid #4ade80', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    ✓ {isMobile ? 'All Present' : 'Mark All Present'}
                  </button>
                  <button
                    onClick={() => {
                      const classes = getClassesForDay(selectedDate.getDay());
                      const allSubjects = classes.length > 0 ? classes : subjects;
                      // Use attendanceCode for tracking (same for lab and normal)
                      allSubjects.forEach(cls => {
                        const attendanceCode = cls.attendanceCode || cls.code;
                        toggleAttendance(selectedDate, attendanceCode, 'absent');
                      });
                    }}
                    style={{ flex: 1, padding: isMobile ? '8px' : '10px', borderRadius: '8px', cursor: 'pointer', background: 'rgba(248, 113, 113, 0.15)', color: '#f87171', fontWeight: 600, fontSize: isMobile ? '11px' : '13px', border: '1px solid #f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                  >
                    ✗ {isMobile ? 'All Absent' : 'Mark All Absent'}
                  </button>
                </div>
              )}
            </div>

            {/* Classes List */}
            <div style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(80vh - 100px)' }}>
              {(() => {
                const scheduledClasses = getClassesForDay(selectedDate.getDay());
                const dateStr = formatDateKey(selectedDate);
                const dayData = dailyAttendance[dateStr] || {};
                const isWeekendDay = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
                
                // On weekends with no scheduled classes, show all subjects for extra class marking
                const classes = scheduledClasses.length > 0 ? scheduledClasses : 
                  (isWeekendDay ? subjects.map(s => ({ ...s, room: s.room || 'LH-11' })) : []);

                if (classes.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-secondary)' }}>
                      No classes scheduled for this day
                    </div>
                  );
                }
                
                const showExtraClassNote = isWeekendDay && scheduledClasses.length === 0;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {showExtraClassNote && (
                      <div style={{ padding: '10px 12px', background: 'rgba(248, 113, 113, 0.1)', borderRadius: '8px', fontSize: '12px', color: '#f87171', marginBottom: '4px' }}>
                        Extra class? Mark attendance for any subject below.
                      </div>
                    )}
                    {classes.map((cls, idx) => {
                      // Use attendanceCode (different for lab vs normal) for separate tracking
                      const attendanceCode = cls.attendanceCode || cls.code;
                      const status = dayData[attendanceCode];
                      const subjectIndex = subjects.findIndex(s => s.code === cls.code);
                      return (
                        <div key={`${cls.code}-${cls.slotIndex}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'var(--hover-bg)', borderRadius: '10px', borderLeft: `4px solid ${getSubjectColor(subjectIndex >= 0 ? subjectIndex : 0)}` }}>
                          <div style={{ flex: 1 }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>
                              {cls.name}
                              {cls.isLab && <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '6px', fontStyle: 'italic' }}>(Lab)</span>}
                            </h4>
                            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{cls.code} • {cls.room}</p>
                          </div>
                          {!viewOnly && (
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                onClick={() => {
                                  const newStatus = status === 'present' ? null : 'present';
                                  // Use attendanceCode - lab and normal are tracked separately (2 different hours)
                                  toggleAttendance(selectedDate, attendanceCode, newStatus);
                                }}
                                style={{
                                  padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
                                  background: status === 'present' ? '#4ade80' : 'var(--card-bg)',
                                  color: status === 'present' ? '#000' : 'var(--text-secondary)',
                                  fontWeight: 600, fontSize: '12px',
                                  border: status === 'present' ? 'none' : '1px solid var(--border-color)'
                                }}
                              >
                                ✓
                              </button>
                              <button
                                onClick={() => {
                                  const newStatus = status === 'absent' ? null : 'absent';
                                  // Use attendanceCode - lab and normal are tracked separately (2 different hours)
                                  toggleAttendance(selectedDate, attendanceCode, newStatus);
                                }}
                                style={{
                                  padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
                                  background: status === 'absent' ? '#f87171' : 'var(--card-bg)',
                                  color: status === 'absent' ? '#000' : 'var(--text-secondary)',
                                  fontWeight: 600, fontSize: '12px',
                                  border: status === 'absent' ? 'none' : '1px solid var(--border-color)'
                                }}
                              >
                                ✗
                              </button>
                            </div>
                          )}
                          {viewOnly && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}>
                              {status === 'present' && (
                                <span style={{ color: '#4ade80', fontWeight: 600, fontSize: '12px' }}>✓ Present</span>
                              )}
                              {status === 'absent' && (
                                <span style={{ color: '#f87171', fontWeight: 600, fontSize: '12px' }}>✗ Absent</span>
                              )}
                              {!status && (
                                <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Unmarked</span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
