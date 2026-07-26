import React, { useEffect, useMemo, useState } from 'react';
import { useAcademicSnapshot, useCurrentProfile, useSetDailyAttendanceStatus } from '../lib/academic-data';
import { DEFAULT_TIMETABLE, getSubjectColor } from '../lib/subjects';
import { logActivity } from '../lib/activity-log';
import { isViewOnlyMode } from '../lib/view-only';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '8:30 - 9:20',
  '9:30 - 10:20',
  '10:30 - 11:20',
  '11:30 - 12:20',
  '12:30 - 1:20',
  '1:30 - 2:20',
  '2:30 - 3:20',
  '3:30 - 4:20',
  '5:30 - 6:20',
];

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function buildTodayClasses(subjects, timetable, dayName) {
  const subjectMap = {};
  subjects.forEach((subject, idx) => {
    subjectMap[subject.code] = { ...subject, colorIndex: idx };
  });

  const occurrenceCount = {};

  return (timetable[dayName] || [])
    .map((cell, slotIndex) => {
      if (!cell?.code) return null;

      const subject = subjectMap[cell.code] || {
        code: cell.code,
        name: cell.code,
        room: cell.room || 'LH-11',
        colorIndex: 0,
      };
      const baseCode = cell.code;
      occurrenceCount[baseCode] = (occurrenceCount[baseCode] || 0) + 1;

      let attendanceCode = baseCode;
      if (cell.isLab) {
        attendanceCode = `${baseCode}-LAB`;
      } else if (occurrenceCount[baseCode] > 1) {
        attendanceCode = `${baseCode}-${occurrenceCount[baseCode]}`;
      }

      return {
        ...subject,
        attendanceCode,
        isLab: Boolean(cell.isLab),
        room: cell.room || subject.room || 'LH-11',
        slotIndex,
        time: TIME_SLOTS[slotIndex] || `Period ${slotIndex + 1}`,
      };
    })
    .filter(Boolean);
}

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);
  const [dailyAttendance, setDailyAttendance] = useState({});
  const [savingCode, setSavingCode] = useState(null);
  const [viewOnly, setViewOnly] = useState(false);
  const snapshot = useAcademicSnapshot();
  const setDailyAttendanceStatus = useSetDailyAttendanceStatus();
  const profile = useCurrentProfile();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setViewOnly(isViewOnlyMode());
  }, []);

  // Lock scroll on Home page (mobile and desktop)
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

  const today = new Date();
  const todayName = DAYS[today.getDay()];
  const todayKey = formatDateKey(today);
  
  const dateOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  const formattedDate = today.toLocaleDateString('en-US', dateOptions);

  const subjects = snapshot?.subjects || [];
  const timetable = useMemo(() => ({
    ...DEFAULT_TIMETABLE,
    ...(snapshot?.timetable || {}),
  }), [snapshot?.timetable]);
  const todayClasses = useMemo(
    () => buildTodayClasses(subjects, timetable, todayName),
    [subjects, timetable, todayName]
  );
  const todayAttendance = dailyAttendance[todayKey] || {};
  const markedCount = todayClasses.filter((cls) => todayAttendance[cls.attendanceCode]).length;

  useEffect(() => {
    if (!snapshot) return;
    setDailyAttendance(snapshot.dailyAttendance || {});
  }, [snapshot]);

  const markAttendance = async (cls, status) => {
    if (viewOnly || savingCode) return;

    const nextStatus = todayAttendance[cls.attendanceCode] === status ? null : status;
    const previousDailyAttendance = dailyAttendance;
    setSavingCode(cls.attendanceCode);
    setDailyAttendance((prev) => {
      const updated = { ...prev, [todayKey]: { ...(prev[todayKey] || {}) } };
      if (nextStatus === null) {
        delete updated[todayKey][cls.attendanceCode];
        if (Object.keys(updated[todayKey]).length === 0) delete updated[todayKey];
      } else {
        updated[todayKey][cls.attendanceCode] = nextStatus;
      }
      return updated;
    });

    try {
      await setDailyAttendanceStatus({
        date: todayKey,
        subjectCode: cls.attendanceCode,
        status: nextStatus,
      });
      logActivity('attendance_updated', {
        subject: cls.name,
        subjectCode: cls.attendanceCode,
        action: nextStatus === null ? 'removed' : 'marked',
        status: nextStatus || undefined,
        date: todayKey,
        method: 'home',
      });
    } catch (err) {
      console.error('Error marking attendance from home:', err);
      setDailyAttendance(previousDailyAttendance);
    } finally {
      setSavingCode(null);
    }
  };
  
  return (
    <div style={{
      width: '100%',
      maxWidth: '760px',
      margin: '0 auto',
      padding: isMobile ? '12px 10px' : 'clamp(20px, 4vw, 40px)',
      paddingBottom: isMobile ? `calc(20px + env(safe-area-inset-bottom, 0px))` : '20px',
      height: isMobile ? 'calc(100dvh - 50px - 70px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' : 'calc(100vh - 55px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: isMobile ? 'flex-start' : 'center',
      overflowY: 'auto',
      overflowX: 'hidden'
    }}>
      <div style={{
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: isMobile ? '14px' : '24px',
        flexDirection: isMobile ? 'column' : 'row'
      }}>
        <div style={{ minWidth: 0 }}>
          <p style={{
            fontSize: isMobile ? '13px' : '15px',
            color: 'var(--text-secondary)',
            margin: '0 0 6px 0'
          }}>
            Hi, <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{profile?.name || profile?.username || 'User'}</span>
          </p>
          <h1 style={{
            fontSize: isMobile ? '30px' : 'clamp(38px, 6vw, 52px)',
            fontWeight: 400,
            letterSpacing: '0.08em',
            margin: 0,
            color: 'var(--text-primary)',
            fontFamily: "'AmericanCaptain', 'Bebas Neue', sans-serif",
            textTransform: 'uppercase',
            lineHeight: 0.95
          }}>
            Today's Subjects
          </h1>
          <p style={{
            fontSize: isMobile ? '12px' : '14px',
            color: 'var(--text-secondary)',
            margin: '8px 0 0 0'
          }}>
            {todayName}, {formattedDate}
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: isMobile ? '8px 10px' : '10px 14px',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          background: 'var(--card-bg)',
          width: isMobile ? '100%' : 'auto',
          justifyContent: isMobile ? 'space-between' : 'center'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500 }}>Marked</span>
          <span style={{ fontSize: isMobile ? '18px' : '20px', color: 'var(--text-primary)', fontWeight: 700 }}>
            {markedCount}/{todayClasses.length}
          </span>
        </div>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '9px' : '10px',
        width: '100%',
        minHeight: 0
        }}>
        {!snapshot ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '160px',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            background: 'var(--card-bg)'
          }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid var(--border-color)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : todayClasses.length === 0 ? (
          <div style={{
            padding: isMobile ? '28px 18px' : '40px 24px',
            textAlign: 'center',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            background: 'var(--card-bg)'
          }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '10px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)',
              margin: '0 auto 14px auto'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', margin: '0 0 6px 0' }}>No subjects today</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Your timetable has no classes scheduled for {todayName}.</p>
          </div>
        ) : (
          todayClasses.map((cls) => {
            const status = todayAttendance[cls.attendanceCode];
            const isSaving = savingCode === cls.attendanceCode;
            return (
              <div
                key={`${cls.attendanceCode}-${cls.slotIndex}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr auto' : '92px 1fr auto',
                  alignItems: 'center',
                  gap: isMobile ? '10px' : '16px',
                  background: status === 'present'
                    ? 'rgba(74, 222, 128, 0.1)'
                    : status === 'absent'
                      ? 'rgba(248, 113, 113, 0.1)'
                      : 'var(--card-bg)',
                  border: `1px solid ${status === 'present' ? 'rgba(74, 222, 128, 0.35)' : status === 'absent' ? 'rgba(248, 113, 113, 0.35)' : 'var(--border-color)'}`,
                  borderLeft: `4px solid ${getSubjectColor(cls.colorIndex || 0)}`,
                  borderRadius: '10px',
                  padding: isMobile ? '10px' : '12px 14px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  opacity: isSaving ? 0.7 : 1
                }}
              >
                {!isMobile && (
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {cls.time}
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <h3 style={{
                    fontSize: isMobile ? '14px' : '16px',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: '0 0 4px 0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {cls.name}{cls.isLab ? ' (Lab)' : ''}
                  </h3>
                  <p style={{
                    fontSize: isMobile ? '11px' : '12px',
                    color: 'var(--text-secondary)',
                    margin: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {isMobile ? `${cls.time} • ` : ''}{cls.code} • {cls.room}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  gap: isMobile ? '6px' : '8px',
                  alignItems: 'center'
                }}>
                  <button
                    type="button"
                    title={status === 'present' ? 'Clear present mark' : 'Mark present'}
                    aria-label={`${status === 'present' ? 'Clear present mark for' : 'Mark present for'} ${cls.name}`}
                    disabled={viewOnly || Boolean(savingCode)}
                    onClick={() => markAttendance(cls, 'present')}
                    style={{
                      width: isMobile ? '38px' : '42px',
                      height: isMobile ? '38px' : '42px',
                      borderRadius: '8px',
                      border: status === 'present' ? 'none' : '1px solid rgba(74, 222, 128, 0.45)',
                      background: status === 'present' ? '#4ade80' : 'rgba(74, 222, 128, 0.12)',
                      color: status === 'present' ? '#000' : '#4ade80',
                      cursor: viewOnly || savingCode ? 'not-allowed' : 'pointer',
                      opacity: viewOnly || savingCode ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5"></path>
                    </svg>
                  </button>
                  <button
                    type="button"
                    title={status === 'absent' ? 'Clear absent mark' : 'Mark absent'}
                    aria-label={`${status === 'absent' ? 'Clear absent mark for' : 'Mark absent for'} ${cls.name}`}
                    disabled={viewOnly || Boolean(savingCode)}
                    onClick={() => markAttendance(cls, 'absent')}
                    style={{
                      width: isMobile ? '38px' : '42px',
                      height: isMobile ? '38px' : '42px',
                      borderRadius: '8px',
                      border: status === 'absent' ? 'none' : '1px solid rgba(248, 113, 113, 0.45)',
                      background: status === 'absent' ? '#f87171' : 'rgba(248, 113, 113, 0.12)',
                      color: status === 'absent' ? '#000' : '#f87171',
                      cursor: viewOnly || savingCode ? 'not-allowed' : 'pointer',
                      opacity: viewOnly || savingCode ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {viewOnly && (
        <div style={{
          padding: '9px 12px',
          marginTop: '12px',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '8px',
          color: '#fbbf24',
          fontSize: '12px',
          textAlign: 'center',
          fontWeight: 500
        }}>
          View Only Mode - Editing disabled
        </div>
      )}

      <p style={{
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-tertiary)',
        marginTop: isMobile ? '14px' : '22px'
      }}>
        BIT Mesra, Lalpur
      </p>
    </div>
  );
}
