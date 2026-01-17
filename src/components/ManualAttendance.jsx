import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSubjects, getSubjectColor } from '../lib/subjects';
import { logActivity, getActivityLog, formatTimestamp } from '../lib/activity-log';
import { isViewOnlyMode } from '../lib/view-only';

export default function ManualAttendance() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showControls, setShowControls] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [viewOnly, setViewOnly] = useState(false);

  useEffect(() => {
    setViewOnly(isViewOnlyMode());
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem('gradex_user_id');
    const username = localStorage.getItem('gradex_username');
    if (userId) setUser({ id: userId, username });
    setLoading(false);
  }, []);

  useEffect(() => {
    setSubjects(getSubjects());
    const handleUpdate = () => setSubjects(getSubjects());
    window.addEventListener('subjectsUpdated', handleUpdate);
    return () => window.removeEventListener('subjectsUpdated', handleUpdate);
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('manual_attendance')
        .select('subject_code, classes_attended, classes_conducted')
        .eq('user_id', user.id);
      if (error) throw error;
      const attendanceMap = {};
      (data || []).forEach(record => {
        attendanceMap[record.subject_code] = {
          attended: record.classes_attended || 0,
          conducted: record.classes_conducted || 0
        };
      });
      setAttendanceData(attendanceMap);
    } catch (err) {
      console.error('Error loading attendance:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) loadAttendance();
  }, [user?.id, loadAttendance]);

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

  const formatDateKey = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const updateAttendance = async (subjectCode, attendedDelta, conductedDelta) => {
    if (!user?.id || viewOnly) return; // Prevent edits in view-only mode
    const current = attendanceData[subjectCode] || { attended: 0, conducted: 0 };
    const newAttended = Math.max(0, current.attended + attendedDelta);
    const newConducted = Math.max(0, current.conducted + conductedDelta);

    setAttendanceData(prev => ({
      ...prev,
      [subjectCode]: { attended: newAttended, conducted: newConducted }
    }));

    try {
      // Only update manual_attendance totals - do NOT sync to daily_attendance
      // This prevents dots from appearing in calendar when using preset attendance
      await supabase.from('manual_attendance').upsert({
        user_id: user.id,
        subject_code: subjectCode,
        classes_attended: newAttended,
        classes_conducted: newConducted
      }, { onConflict: 'user_id,subject_code' });
      
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
      await loadAttendance();
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

  if (!user && !loading) {
    return (
      <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Attendance Tracker</h1>
        <div style={{ padding: '40px', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Sign in to track your attendance</p>
          <button onClick={() => window.location.href = '/user'} style={{ padding: '10px 24px', background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Sign In</button>
        </div>
      </div>
    );
  }

  if (loading) {
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
              <h1 style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: '1.2' }}>Attendance Tracker</h1>
              <span style={{ fontSize: isMobile ? '11px' : '12px', color: 'var(--text-secondary)', fontWeight: 400 }}>• Mark Attendance In Calendar Section</span>
              <button
                onClick={() => navigate('/calendar')}
                style={{
                  padding: isMobile ? '4px 8px' : '6px 10px',
                  fontSize: isMobile ? '10px' : '11px',
                  fontWeight: 500,
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-primary)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s ease',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.borderColor = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--card-bg)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
                title="Go to Calendar"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {isMobile ? 'Calendar' : 'Calendar'}
              </button>
            </div>
          )}
          {!isMobile && (
            <p style={{ fontSize: isMobile ? '10px' : '11px', color: 'var(--text-secondary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subjects.length} subjects • BIT Mesra, Lalpur</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: isMobile ? '4px' : '6px', alignItems: 'center', flexShrink: 0, width: isMobile ? '100%' : 'auto', order: isMobile ? 1 : 2 }}>
          <button
            onClick={() => {
              setActivityLog(getActivityLog());
              setShowActivityLog(true);
            }}
            style={{
              padding: isMobile ? '6px 4px' : '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-secondary)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              flex: isMobile ? 1 : 'none',
              fontSize: isMobile ? '9px' : undefined,
              fontWeight: isMobile ? 500 : undefined
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover-bg)';
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.borderColor = 'var(--border-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--card-bg)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
            title="Activity Log"
          >
            {isMobile ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ marginLeft: '3px' }}>Logs</span>
              </>
            ) : (
              <svg width={isMobile ? '14' : '16'} height={isMobile ? '14' : '16'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            )}
          </button>
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
          <Link to="/subjects" style={{ 
            padding: isMobile ? '6px 4px' : '8px 12px', 
            fontSize: isMobile ? '9px' : '11px', 
            fontWeight: 500, 
            border: '1px solid var(--border-color)', 
            background: 'var(--card-bg)', 
            color: 'var(--text-primary)', 
            borderRadius: '6px', 
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: isMobile ? '2px' : '3px', 
            whiteSpace: 'nowrap',
            flex: isMobile ? 1 : 'none'
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            {isMobile ? 'Subjects' : 'Subjects'}
          </Link>
        </div>
      </div>

      {isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', flexWrap: 'nowrap' }}>
          <h1 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, lineHeight: '1.2', whiteSpace: 'nowrap' }}>Attendance Tracker</h1>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 400, whiteSpace: 'nowrap' }}>• Mark In Calendar</span>
          <button
            onClick={() => navigate('/calendar')}
            style={{
              padding: '4px 6px',
              fontSize: '9px',
              fontWeight: 500,
              border: '1px solid var(--border-color)',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover-bg)';
              e.currentTarget.style.borderColor = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--card-bg)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
            title="Go to Calendar"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Calendar
          </button>
        </div>
      )}

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

      {/* Activity Log Modal */}
      {showActivityLog && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowActivityLog(false);
          }}
          style={{
            position: 'fixed',
            top: isMobile ? `calc(50px + env(safe-area-inset-top, 0px))` : 0,
            left: 0,
            right: 0,
            bottom: isMobile ? `calc(70px + env(safe-area-inset-bottom, 0px))` : 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: isMobile ? '16px' : '24px'
          }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid var(--border-color)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            {/* Header */}
            <div style={{
              padding: isMobile ? '16px' : '20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-primary)' }}>
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '20px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Activity Log
                </h2>
              </div>
              <button
                onClick={() => setShowActivityLog(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Log Content */}
            <div style={{
              padding: isMobile ? '12px' : '16px',
              overflowY: 'auto',
              flex: 1
            }}>
              {activityLog.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-secondary)'
                }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <p style={{ margin: 0, fontSize: '14px' }}>No activity logged yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activityLog.map((entry) => {
                    const getActivityIcon = () => {
                      switch (entry.type) {
                        case 'attendance_updated':
                          return (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 11l3 3L22 4"/>
                              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                            </svg>
                          );
                        case 'subject_added':
                          return (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="12" y1="5" x2="12" y2="19"/>
                              <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          );
                        case 'subject_removed':
                          return (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          );
                        case 'subject_updated':
                          return (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          );
                        default:
                          return (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                            </svg>
                          );
                      }
                    };

                    const getActivityMessage = () => {
                      switch (entry.type) {
                        case 'attendance_updated':
                          const attended = entry.details.attended !== undefined ? entry.details.attended : 'N/A';
                          const conducted = entry.details.conducted !== undefined ? entry.details.conducted : 'N/A';
                          return `${entry.details.action === 'increased' ? 'Increased' : 'Decreased'} attendance for ${entry.details.subject} (${attended}/${conducted})`;
                        case 'subject_added':
                          return `Added subject: ${entry.details.name} (${entry.details.code})`;
                        case 'subject_removed':
                          return `Removed subject: ${entry.details.name} (${entry.details.code})`;
                        case 'subject_updated':
                          return `Updated subject: ${entry.details.name} (${entry.details.code})`;
                        default:
                          return entry.details.message || 'Activity logged';
                      }
                    };

                    return (
                      <div
                        key={entry.id}
                        style={{
                          padding: isMobile ? '10px' : '12px',
                          background: 'var(--hover-bg)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'flex-start'
                        }}
                      >
                        <div style={{
                          padding: '6px',
                          background: 'var(--card-bg)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {getActivityIcon()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: isMobile ? '13px' : '14px',
                            color: 'var(--text-primary)',
                            fontWeight: 500,
                            marginBottom: '4px'
                          }}>
                            {getActivityMessage()}
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"/>
                              <polyline points="12 6 12 12 16 14"/>
                            </svg>
                            {formatTimestamp(entry.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
