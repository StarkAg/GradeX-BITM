import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function StudentDemoView() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const demoName = localStorage.getItem('demo_name') || 'Student Demo';
  const demoUserId = localStorage.getItem('demo_user_id') || 'demo_student_001';

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadAttendance();

    // Use polling as a quota-friendly alternative to Realtime
    // Poll every 3 seconds - much more quota-friendly than Realtime subscriptions
    const pollInterval = setInterval(() => {
      loadAttendance();
    }, 3000); // Check for updates every 3 seconds

    // Optional: Try Realtime subscription (more instant but uses quota)
    // Uncomment below if you want instant updates and have Pro plan / low user count
    /*
    const studentId = 's001';
    const channel = supabase
      .channel(`faculty_attendance_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'faculty_attendance',
          filter: `student_id=eq.${studentId}`
        },
        (payload) => {
          setTimeout(() => loadAttendance(), 200);
        }
      )
      .subscribe();
    */

    // Cleanup on unmount
    return () => {
      clearInterval(pollInterval);
      // Uncomment if using Realtime:
      // supabase.removeChannel(channel);
    };
  }, []);

  const loadAttendance = async () => {
    try {
      // Load attendance for demo student (using demo_student_001 as default)
      const studentId = 's001'; // Default demo student ID from DEMO_STUDENTS
      
      const { data, error } = await supabase
        .from('faculty_attendance')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(30);

      if (error) throw error;

      // Group by date
      const groupedByDate = {};
      (data || []).forEach(record => {
        const date = record.date;
        if (!groupedByDate[date]) {
          groupedByDate[date] = [];
        }
        groupedByDate[date].push({
          subject: record.subject_code,
          status: record.status,
          date: record.date
        });
      });

      // Convert to array and sort by date
      const attendanceList = Object.keys(groupedByDate)
        .map(date => ({
          date,
          records: groupedByDate[date]
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      setAttendance(attendanceList);
    } catch (err) {
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('demo_role');
    localStorage.removeItem('demo_user_id');
    localStorage.removeItem('demo_username');
    localStorage.removeItem('demo_name');
    navigate('/demo');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      padding: isMobile ? '16px' : '24px',
      paddingTop: isMobile ? 'calc(16px + env(safe-area-inset-top, 0px))' : 'calc(24px + 55px)',
      paddingBottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom, 0px) + 70px)' : 'calc(24px + 55px)',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h1 style={{
            fontSize: isMobile ? '20px' : '24px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 4px 0'
          }}>
            Student Dashboard
          </h1>
          <p style={{
            fontSize: isMobile ? '12px' : '13px',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            View your attendance records
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            padding: isMobile ? '8px 12px' : '10px 16px',
            fontSize: isMobile ? '12px' : '13px',
            fontWeight: 500,
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover-bg)';
            e.currentTarget.style.borderColor = 'var(--border-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--card-bg)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
          }}
        >
          Logout
        </button>
      </div>

      {/* Attendance List */}
      {loading ? (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '14px'
        }}>
          Loading attendance...
        </div>
      ) : attendance.length === 0 ? (
        <div style={{
          padding: '40px 20px',
          textAlign: 'center',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            📋
          </div>
          <h3 style={{
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 8px 0'
          }}>
            No Attendance Records
          </h3>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Your attendance will appear here once marked by faculty.
          </p>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '12px'
        }}>
          {attendance.map((dayRecord, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--card-bg)',
                backdropFilter: 'blur(6px)',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: isMobile ? '16px' : '20px'
              }}
            >
              <div style={{
                fontSize: isMobile ? '15px' : '16px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '12px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border-color)'
              }}>
                {formatDate(dayRecord.date)}
              </div>
              <div style={{
                display: 'grid',
                gap: '8px'
              }}>
                {dayRecord.records.map((record, recordIdx) => (
                  <div
                    key={recordIdx}
                    style={{
                      padding: isMobile ? '12px' : '14px',
                      background: record.status === 'present' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid',
                      borderColor: record.status === 'present' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: isMobile ? '14px' : '15px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        marginBottom: '2px'
                      }}>
                        {record.subject}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)'
                      }}>
                        {record.status === 'present' ? 'Present' : 'Absent'}
                      </div>
                    </div>
                    <div style={{
                      width: isMobile ? '28px' : '24px',
                      height: isMobile ? '28px' : '24px',
                      borderRadius: '6px',
                      background: record.status === 'present' ? '#34d399' : '#f87171',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {record.status === 'present' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/>
                          <line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
