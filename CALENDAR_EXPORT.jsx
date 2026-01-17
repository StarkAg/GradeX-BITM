/**
 * CALENDAR COMPONENT EXPORT
 * 
 * This file contains the complete AttendanceCalendar component with all dependencies.
 * To use in another project:
 * 
 * 1. Install dependencies:
 *    npm install react @supabase/supabase-js
 * 
 * 2. Set up Supabase:
 *    - Create a Supabase project
 *    - Create the following tables:
 *      * daily_attendance (user_id, date, subject_code, status)
 *      * manual_attendance (user_id, subject_code, classes_attended, classes_conducted)
 *      * user_subjects (user_id, subject_name, subject_code, room)
 * 
 * 3. Update the Supabase configuration in the supabaseClient section
 * 
 * 4. Import and use:
 *    import AttendanceCalendar from './CALENDAR_EXPORT';
 *    <AttendanceCalendar />
 * 
 * 5. Ensure CSS variables are defined:
 *    --bg-primary, --card-bg, --text-primary, --text-secondary, 
 *    --border-color, --hover-bg, --border-hover
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SUPABASE CONFIGURATION
// ============================================================================
// Replace these with your Supabase project credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================================================
// SUBJECTS UTILITIES
// ============================================================================

// Default subjects - customize as needed
export const DEFAULT_SUBJECTS = [
  { name: 'Organizational Behavior', code: 'OB', room: 'LH-11' },
  { name: 'Marketing Management', code: 'MM', room: 'LH-11' },
  { name: 'Business Economics', code: 'BE', room: 'LH-11' },
  { name: 'Emotional Intelligence', code: 'EI', room: 'LH-11' },
  { name: 'Qualitative Data Analysis', code: 'QDA', room: 'LH-11' },
  { name: 'Web Application of Business', code: 'WAB', room: 'LH-11' },
  { name: 'Public Speaking & Creative Writing', code: 'PSCW', room: 'LH-11' },
];

// Color palette - Lightened luxury palette (28 colors)
export const colorPalette = [
  '#FFF7A8', '#FFD9A0', '#CFF0C3', '#E6F2A2', '#A8E6B8', '#BFE9D5', '#BFEFE6',
  '#CFF5F2', '#CFEAF5', '#C6E2FF', '#D6E4FF', '#E3EEFF', '#D9F0FF', '#E1E8F8',
  '#E6F2FA', '#E2F4EE', '#EDF9F0', '#FFF3BF', '#FFE0C7', '#FFD8A8', '#FFCCA0',
  '#E8E6B8', '#E9DFF2', '#E1D2F0', '#FFD6D6', '#FFD0CC', '#FFBDBD', '#CFEDE6',
];

export function getSubjectColor(index) {
  return colorPalette[index % colorPalette.length];
}

export function getDayColor(index) {
  return colorPalette[index % colorPalette.length];
}

// Get subjects from localStorage
export function getSubjects() {
  const saved = localStorage.getItem('gradex_subjects');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Error parsing subjects:', e);
    }
  }
  return DEFAULT_SUBJECTS;
}

// ============================================================================
// ACTIVITY LOG UTILITIES
// ============================================================================

const MAX_LOG_ENTRIES = 100;

export function logActivity(type, details) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    id: Date.now(),
    timestamp,
    type,
    details
  };

  try {
    const existingLogs = JSON.parse(localStorage.getItem('gradex_activity_log') || '[]');
    existingLogs.unshift(logEntry);
    let trimmedLogs = existingLogs.slice(0, MAX_LOG_ENTRIES);
    
    localStorage.setItem('gradex_activity_log', JSON.stringify(trimmedLogs));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      try {
        const existingLogs = JSON.parse(localStorage.getItem('gradex_activity_log') || '[]');
        const trimmedLogs = existingLogs.slice(0, MAX_LOG_ENTRIES / 2);
        trimmedLogs.unshift(logEntry);
        localStorage.setItem('gradex_activity_log', JSON.stringify(trimmedLogs));
      } catch (e2) {
        localStorage.removeItem('gradex_activity_log');
        localStorage.setItem('gradex_activity_log', JSON.stringify([logEntry]));
      }
    }
  }
  
  return logEntry;
}

// ============================================================================
// CALENDAR COMPONENT
// ============================================================================

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

  const userId = localStorage.getItem('gradex_user_id');

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setSubjects(getSubjects());
    const saved = localStorage.getItem('gradex_timetable');
    if (saved) setTimetable(JSON.parse(saved));
    
    const handleUpdate = () => setSubjects(getSubjects());
    window.addEventListener('subjectsUpdated', handleUpdate);
    return () => window.removeEventListener('subjectsUpdated', handleUpdate);
  }, []);

  // Load daily attendance from Supabase
  const loadDailyAttendance = useCallback(async () => {
    if (!userId) return;
    try {
      const { data, error } = await supabaseClient
        .from('daily_attendance')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      const attendanceMap = {};
      (data || []).forEach(record => {
        const key = record.date;
        if (!attendanceMap[key]) attendanceMap[key] = {};
        if (record.status === 'present' || record.status === 'absent') {
          attendanceMap[key][record.subject_code] = record.status;
        }
      });
      setDailyAttendance(attendanceMap);
      localStorage.setItem('gradex_daily_attendance', JSON.stringify(attendanceMap));
    } catch (err) {
      console.error('Error loading daily attendance:', err);
      const saved = localStorage.getItem('gradex_daily_attendance');
      if (saved) {
        const parsed = JSON.parse(saved);
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
    
    const handleAttendanceUpdate = () => {
      loadDailyAttendance();
    };
    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    
    return () => {
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
    };
  }, [loadDailyAttendance]);

  // Clean up invalid data
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
      
      if (datesToDelete.length > 0 || JSON.stringify(cleaned) !== JSON.stringify(dailyAttendance)) {
        setDailyAttendance(cleaned);
        localStorage.setItem('gradex_daily_attendance', JSON.stringify(cleaned));
        
        if (datesToDelete.length > 0) {
          for (const date of datesToDelete) {
            try {
              await supabaseClient
                .from('daily_attendance')
                .delete()
                .eq('user_id', userId)
                .eq('date', date);
            } catch (err) {
              console.error(`Error cleaning date ${date} from Supabase:`, err);
            }
          }
        }
      }
    };
    
    if (Object.keys(dailyAttendance).length > 0) {
      cleanData();
    }
  }, [dailyAttendance, userId, loading]);

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

  // Get classes for a specific day of week
  const getClassesForDay = (dayOfWeek) => {
    const dayName = DAYS[dayOfWeek];
    if (!dayName || !timetable[dayName]) return [];
    
    const classes = [];
    const subjectMap = {};
    subjects.forEach(s => { subjectMap[s.code] = s; });
    
    const occurrenceCount = {};
    
    timetable[dayName].forEach((cell, idx) => {
      if (cell && cell.code && subjectMap[cell.code]) {
        const isLab = cell.isLab || false;
        const baseCode = cell.code;
        
        if (!occurrenceCount[baseCode]) {
          occurrenceCount[baseCode] = 0;
        }
        occurrenceCount[baseCode]++;
        
        let attendanceCode;
        if (isLab) {
          attendanceCode = `${baseCode}-LAB`;
        } else if (occurrenceCount[baseCode] === 1) {
          attendanceCode = baseCode;
        } else {
          attendanceCode = `${baseCode}-${occurrenceCount[baseCode]}`;
        }
        
        classes.push({
          ...subjectMap[baseCode],
          slotIndex: idx,
          room: cell.room || subjectMap[baseCode].room || 'LH-11',
          isLab: isLab,
          attendanceCode: attendanceCode
        });
      }
    });
    
    return classes;
  };

  // Toggle attendance for a class on a specific date
  const toggleAttendance = async (date, subjectCode, newStatus) => {
    const dateStr = formatDateKey(date);
    
    setDailyAttendance(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      if (!updated[dateStr]) updated[dateStr] = {};
      if (newStatus === null) {
        delete updated[dateStr][subjectCode];
        if (Object.keys(updated[dateStr]).length === 0) {
          delete updated[dateStr];
        }
      } else {
        updated[dateStr][subjectCode] = newStatus;
      }
      localStorage.setItem('gradex_daily_attendance', JSON.stringify(updated));
      return updated;
    });

    if (userId) {
      try {
        const subject = subjects.find(s => s.code === subjectCode);
        if (newStatus === null) {
          await supabaseClient
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
          await supabaseClient
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

        await updateAttendanceTotals(subjectCode);
        await loadDailyAttendance();
      } catch (err) {
        console.error('Error syncing attendance:', err);
        await loadDailyAttendance();
      }
    }
  };

  // Recalculate totals for a subject
  const updateAttendanceTotals = async (subjectCode) => {
    if (!userId) return;
    
    let baseCode = subjectCode;
    if (baseCode.endsWith('-LAB')) {
      baseCode = baseCode.replace('-LAB', '');
    } else if (baseCode.includes('-')) {
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
    
    Object.values(allDaily).forEach(dayData => {
      Object.keys(dayData).forEach(code => {
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
        
        if (codeBase === baseCode) {
          conducted++;
          if (dayData[code] === 'present') attended++;
        }
      });
    });

    try {
      await supabaseClient.from('manual_attendance').upsert({
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

    for (let i = 0; i < startPadding; i++) {
      const d = new Date(year, month, -startPadding + i + 1);
      days.push({ date: d, isCurrentMonth: false });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }

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
    
    const dayOfWeek = date.getDay();
    const scheduledClasses = getClassesForDay(dayOfWeek);
    const totalHours = scheduledClasses.length;
    
    if (totalHours === 0) return null;

    const presentHours = [];
    const absentHours = [];
    
    scheduledClasses.forEach(cls => {
      const baseCode = cls.code;
      const attendanceCode = cls.attendanceCode || baseCode;
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
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
            
            return (
              <div
                key={idx}
                onClick={() => isCurrentMonth && setSelectedDate(date)}
                onMouseEnter={() => !isMobile && isCurrentMonth && setHoveredDate(date)}
                onMouseLeave={() => !isMobile && setHoveredDate(null)}
                style={{
                  padding: isMobile ? '4px 2px' : '6px 4px',
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
                  position: 'relative'
                }}
              >
                <div style={{ fontSize: isMobile ? '10px' : '12px', fontWeight: today ? 700 : 500, color: weekend ? '#f87171' : 'var(--text-primary)', marginBottom: isMobile ? '1px' : '2px' }}>
                  {date.getDate()}
                </div>
                
                {dayStatus && dayStatus.total > 0 && (
                  <div style={{ display: 'flex', gap: '2px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '100%' }}>
                    {Array.from({ length: dayStatus.present }).map((_, idx) => (
                      <span 
                        key={`present-${idx}`}
                        style={{ 
                          width: isMobile ? '4px' : '5px', 
                          height: isMobile ? '4px' : '5px', 
                          borderRadius: '50%', 
                          background: '#4ade80',
                          flexShrink: 0
                        }} 
                        title={`${dayStatus.present} present`} 
                      />
                    ))}
                    {Array.from({ length: dayStatus.absent }).map((_, idx) => (
                      <span 
                        key={`absent-${idx}`}
                        style={{ 
                          width: isMobile ? '4px' : '5px', 
                          height: isMobile ? '4px' : '5px', 
                          borderRadius: '50%', 
                          background: '#f87171',
                          flexShrink: 0
                        }} 
                        title={`${dayStatus.absent} absent`} 
                      />
                    ))}
                    {Array.from({ length: dayStatus.total - dayStatus.present - dayStatus.absent }).map((_, idx) => (
                      <span 
                        key={`unmarked-${idx}`}
                        style={{ 
                          width: isMobile ? '4px' : '5px', 
                          height: isMobile ? '4px' : '5px', 
                          borderRadius: '50%', 
                          background: 'rgba(128, 128, 128, 0.3)',
                          flexShrink: 0
                        }} 
                        title={`Unmarked`} 
                      />
                    ))}
                  </div>
                )}

                {/* Hover Icons - Glass Overlay (Desktop only) */}
                {!isMobile && isCurrentMonth && hoveredDate && hoveredDate.getTime() === date.getTime() && (
                  <div 
                    style={{ 
                      position: 'absolute', 
                      top: 0, left: 0, right: 0, bottom: 0,
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      background: 'rgba(0, 0, 0, 0.4)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      borderRadius: '0',
                      zIndex: 10
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
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
                        padding: '12px',
                        border: '2px solid #4ade80',
                        background: 'rgba(74, 222, 128, 0.2)',
                        color: '#4ade80',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#4ade80';
                        e.currentTarget.style.color = '#000';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(74, 222, 128, 0.2)';
                        e.currentTarget.style.color = '#4ade80';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title="Mark All Present"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                    </button>
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
                        padding: '12px',
                        border: '2px solid #f87171',
                        background: 'rgba(248, 113, 113, 0.2)',
                        color: '#f87171',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f87171';
                        e.currentTarget.style.color = '#000';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(248, 113, 113, 0.2)';
                        e.currentTarget.style.color = '#f87171';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title="Mark All Absent"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDate(date);
                      }}
                      style={{
                        padding: '12px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '8px',
                        transition: 'all 0.2s',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                      title="Edit Attendance"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
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
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    const classes = getClassesForDay(selectedDate.getDay());
                    const allSubjects = classes.length > 0 ? classes : subjects;
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
            </div>

            {/* Classes List */}
            <div style={{ padding: '16px', overflowY: 'auto', maxHeight: 'calc(80vh - 100px)' }}>
              {(() => {
                const scheduledClasses = getClassesForDay(selectedDate.getDay());
                const dateStr = formatDateKey(selectedDate);
                const dayData = dailyAttendance[dateStr] || {};
                const isWeekendDay = selectedDate.getDay() === 0 || selectedDate.getDay() === 6;
                
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
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => {
                                const newStatus = status === 'present' ? null : 'present';
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
