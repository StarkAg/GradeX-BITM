import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getSubjects, getSubjectColor } from '../lib/subjects';

export default function ManualAttendance() {
  const [user, setUser] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);

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

  const calculatePercentage = (attended, conducted) => {
    if (conducted === 0) return 0;
    return (attended / conducted) * 100;
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 75) return '#4ade80';
    if (percentage >= 65) return '#fbbf24';
    return '#f87171';
  };

  const updateAttendance = async (subjectCode, attendedDelta, conductedDelta) => {
    if (!user?.id) return;
    const current = attendanceData[subjectCode] || { attended: 0, conducted: 0 };
    const newAttended = Math.max(0, current.attended + attendedDelta);
    const newConducted = Math.max(0, current.conducted + conductedDelta);

    setAttendanceData(prev => ({
      ...prev,
      [subjectCode]: { attended: newAttended, conducted: newConducted }
    }));

    try {
      await supabase.from('manual_attendance').upsert({
        user_id: user.id,
        subject_code: subjectCode,
        classes_attended: newAttended,
        classes_conducted: newConducted
      }, { onConflict: 'user_id,subject_code' });
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
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Attendance Tracker</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>{subjects.length} subjects • BIT Mesra, Lalpur</p>
        </div>
        <Link to="/subjects" style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 500, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Manage Subjects
        </Link>
      </div>

      <div style={{ padding: '10px 16px', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
        Calculations are as per <strong style={{ color: 'var(--text-primary)' }}>75% Minimum Requirement</strong> at BIT Mesra
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
        {subjects.map((subject, idx) => {
          const attendance = attendanceData[subject.code] || { attended: 0, conducted: 0 };
          const percentage = calculatePercentage(attendance.attended, attendance.conducted);
          const statusColor = getStatusColor(percentage);
          const needed = classesNeeded(attendance.attended, attendance.conducted);
          const canSkip = classesCanSkip(attendance.attended, attendance.conducted);

          return (
            <div key={subject.code} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '14px', borderLeft: `4px solid ${getSubjectColor(idx)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0' }}>{subject.name}</h3>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>{subject.code} • {subject.room}</p>
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '10px 0', marginBottom: '10px', background: 'var(--hover-bg)', borderRadius: '6px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: statusColor, lineHeight: 1 }}>{percentage.toFixed(1)}%</div>
                <div style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Target: 75%</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
                <div style={{ background: 'var(--hover-bg)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Attended</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <button onClick={() => updateAttendance(subject.code, -1, 0)} disabled={attendance.attended <= 0} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: attendance.attended <= 0 ? 'not-allowed' : 'pointer', opacity: attendance.attended <= 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>−</button>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '28px' }}>{attendance.attended}</span>
                    <button onClick={() => updateAttendance(subject.code, 1, 1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', background: '#4ade80', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }} title="Mark Present">+</button>
                  </div>
                </div>
                <div style={{ background: 'var(--hover-bg)', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Conducted</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <button onClick={() => updateAttendance(subject.code, 0, -1)} disabled={attendance.conducted <= 0 || attendance.conducted <= attendance.attended} style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: (attendance.conducted <= 0 || attendance.conducted <= attendance.attended) ? 'not-allowed' : 'pointer', opacity: (attendance.conducted <= 0 || attendance.conducted <= attendance.attended) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>−</button>
                    <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', minWidth: '28px' }}>{attendance.conducted}</span>
                    <button onClick={() => updateAttendance(subject.code, 0, 1)} style={{ width: '24px', height: '24px', borderRadius: '4px', border: 'none', background: '#f87171', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }} title="Mark Absent">+</button>
                  </div>
                </div>
              </div>

              {attendance.conducted > 0 && (
                <div style={{ fontSize: '10px', padding: '6px', borderRadius: '4px', background: percentage >= 75 ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)', color: percentage >= 75 ? '#4ade80' : '#f87171', textAlign: 'center' }}>
                  {percentage >= 75 ? (
                    <span style={{ fontWeight: 600 }}>Margin: {canSkip} class{canSkip !== 1 ? 'es' : ''}</span>
                  ) : (
                    <span style={{ fontWeight: 600 }}>Need: {needed} class{needed !== 1 ? 'es' : ''}</span>
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
