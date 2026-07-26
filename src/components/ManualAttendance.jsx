import React, { useEffect, useState } from 'react';
import { useAcademicSnapshot, useSetManualAttendanceTotal } from '../lib/academic-data';
import { getSubjectColor } from '../lib/subjects';
import { logActivity } from '../lib/activity-log';
import { isViewOnlyMode } from '../lib/view-only';

export default function ManualAttendance() {
  const snapshot = useAcademicSnapshot();
  const setManualAttendanceTotal = useSetManualAttendanceTotal();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showControls, setShowControls] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    setViewOnly(isViewOnlyMode());
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const calculatePercentage = (attended, conducted) => {
    if (conducted === 0) return 0;
    return (attended / conducted) * 100;
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 75) return '#4ade80';
    if (percentage >= 65) return '#fbbf24';
    return '#f87171';
  };

  const subjects = snapshot?.subjects || [];
  const attendanceData = snapshot?.attendanceTotals || {};

  const updateAttendance = async (subjectCode, attendedDelta, conductedDelta) => {
    if (viewOnly) return; // Prevent edits in view-only mode
    const current = attendanceData[subjectCode] || { attended: 0, conducted: 0 };
    const newAttended = Math.max(0, current.attended + attendedDelta);
    const newConducted = Math.max(0, current.conducted + conductedDelta);

    try {
      await setManualAttendanceTotal({
        subjectCode,
        attended: newAttended,
        conducted: newConducted,
      });
      
      // Log the activity
      const subject = subjects.find(s => s.code === subjectCode);
      logActivity('attendance_updated', {
        subject: subject?.name || subjectCode,
        subjectCode,
        action: attendedDelta > 0 || conductedDelta > 0 ? 'increased' : 'decreased',
        attended: newAttended,
        conducted: newConducted
      });
    } catch (err) {
      console.error('Error updating attendance:', err);
    }
  };

  const classesNeeded = (attended, conducted) => {
    if (conducted === 0) return 0;
    const current = (attended / conducted) * 100;
    if (current >= 75) return 0;
    return Math.max(0, Math.ceil((75 * conducted - 100 * attended) / 25));
  };

  const classesCanSkip = (attended, conducted) => {
    if (conducted === 0) return 0;
    const current = (attended / conducted) * 100;
    if (current < 75) return 0;
    return Math.max(0, Math.floor((100 * attended - 75 * conducted) / 75));
  };

  if (!snapshot) {
    return <div style={{ textAlign: 'center', padding: '40px' }}><div style={{ width: '40px', height: '40px', border: '3px solid var(--border-color)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto' }} /><style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style></div>;
  }

  return (
    <div style={{ 
      width: '100%', 
      height: isMobile ? 'calc(100dvh - 50px - 70px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' : 'calc(100vh - 55px)',
      paddingBottom: isMobile ? `calc(20px + env(safe-area-inset-bottom, 0px))` : '20px',
      display: 'flex', 
      flexDirection: 'column', 
      overflowY: 'auto', 
      overflowX: 'hidden' 
    }}>
      {viewOnly && (
        <div style={{
          padding: isMobile ? '8px 12px' : '10px 16px',
          marginBottom: isMobile ? '8px' : '12px',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          borderRadius: '8px',
          color: '#fbbf24',
          fontSize: isMobile ? '11px' : '12px',
          textAlign: 'center',
          fontWeight: 500
        }}>
          View Only Mode - Editing disabled (accessed via Admin Panel)
        </div>
      )}
      <div style={{ marginBottom: isMobile ? '8px' : '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? '8px' : '8px' }}>
        <div style={{ flex: isMobile ? '1 1 100%' : 1, minWidth: 0, order: isMobile ? 2 : 1 }}>
          {!isMobile && (
            <p style={{ fontSize: isMobile ? '10px' : '11px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subjects.length} subjects • BIT Mesra, Lalpur</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px', alignItems: 'center', flexShrink: 0, width: isMobile ? '100%' : 'auto', order: isMobile ? 1 : 2 }}>
          <button
            onClick={() => !viewOnly && setShowControls(!showControls)}
            disabled={viewOnly}
            style={{ 
              padding: isMobile ? '6px 4px' : '8px 12px', 
              fontSize: isMobile ? '9px' : '11px', 
              fontWeight: 500, 
              border: 'none', 
              background: viewOnly ? 'var(--hover-bg)' : (showControls ? 'var(--text-secondary)' : 'var(--text-primary)'), 
              color: viewOnly ? 'var(--text-secondary)' : (showControls ? 'var(--text-primary)' : 'var(--bg-primary)'), 
              borderRadius: '6px', 
              cursor: viewOnly ? 'not-allowed' : 'pointer',
              opacity: viewOnly ? 0.5 : 1,
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '2px' : '3px',
              whiteSpace: 'nowrap',
              flex: isMobile ? 1 : 'none'
            }}
          >
            {showControls ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                {isMobile ? 'Hide' : 'Hide'}
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                {isMobile ? 'Preset' : 'Preset'}
              </>
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: isMobile ? '6px 10px' : '8px 12px', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: isMobile ? '8px' : '10px', fontSize: isMobile ? '9px' : '10px', color: 'var(--text-secondary)', textAlign: 'center', lineHeight: isMobile ? '1.3' : '1.4' }}>
        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Calculations are as per <strong style={{ color: 'var(--text-primary)' }}>75% Minimum Requirement</strong> at BIT Mesra</div>
        <div style={{ fontSize: isMobile ? '8px' : '9px', fontStyle: 'italic', opacity: 0.7, marginTop: isMobile ? '1px' : '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Optional/Additional hours can be added using Preset Attendance option</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)', gap: isMobile ? '10px' : '16px', paddingBottom: isMobile ? '20px' : '24px' }}>
        {subjects.map((subject, idx) => {
          const attendance = attendanceData[subject.code] || { attended: 0, conducted: 0 };
          const percentage = calculatePercentage(attendance.attended, attendance.conducted);
          const statusColor = getStatusColor(percentage);
          const needed = classesNeeded(attendance.attended, attendance.conducted);
          const canSkip = classesCanSkip(attendance.attended, attendance.conducted);

          return (
            <div key={subject.code} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: isMobile ? '12px' : '16px', borderLeft: `4px solid ${getSubjectColor(idx)}`, display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>{subject.name}</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{subject.code} • {subject.room}</p>
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '10px 0', marginBottom: '10px', background: 'var(--hover-bg)', borderRadius: '6px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: statusColor, lineHeight: 1 }}>{percentage.toFixed(1)}%</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div style={{ background: 'var(--hover-bg)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Attended</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {showControls && !viewOnly && (
                      <button onClick={() => updateAttendance(subject.code, -1, 0)} disabled={attendance.attended <= 0} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: attendance.attended <= 0 ? 'not-allowed' : 'pointer', opacity: attendance.attended <= 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>−</button>
                    )}
                    <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '28px' }}>{attendance.attended}</span>
                    {showControls && !viewOnly && (
                      <button onClick={() => updateAttendance(subject.code, 1, 1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', background: '#4ade80', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }} title="Mark Present">+</button>
                    )}
                  </div>
                </div>
                <div style={{ background: 'var(--hover-bg)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Conducted</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    {showControls && !viewOnly && (
                      <button onClick={() => updateAttendance(subject.code, 0, -1)} disabled={attendance.conducted <= 0 || attendance.conducted <= attendance.attended} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: (attendance.conducted <= 0 || attendance.conducted <= attendance.attended) ? 'not-allowed' : 'pointer', opacity: (attendance.conducted <= 0 || attendance.conducted <= attendance.attended) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>−</button>
                    )}
                    <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '28px' }}>{attendance.conducted}</span>
                    {showControls && !viewOnly && (
                      <button onClick={() => updateAttendance(subject.code, 0, 1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', background: '#60a5fa', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }} title="Add Class">+</button>
                    )}
                  </div>
                </div>
              </div>

              {attendance.conducted > 0 && (
                <div style={{ 
                  fontSize: isMobile ? '11px' : '13px', 
                  padding: isMobile ? '10px' : '12px', 
                  borderRadius: '8px', 
                  background: percentage >= 75 ? 'rgba(74, 222, 128, 0.15)' : 'rgba(248, 113, 113, 0.15)', 
                  border: `2px solid ${percentage >= 75 ? '#4ade80' : '#f87171'}`,
                  color: percentage >= 75 ? '#4ade80' : '#f87171', 
                  textAlign: 'center',
                  fontWeight: 700,
                  marginTop: 'auto',
                  boxShadow: `0 2px 8px ${percentage >= 75 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(248, 113, 113, 0.2)'}`
                }}>
                  {percentage >= 75 ? (
                    <span>Margin: {canSkip} class{canSkip !== 1 ? 'es' : ''}</span>
                  ) : (
                    <span>Need: {needed} class{needed !== 1 ? 'es' : ''}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
