import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { DEFAULT_SUBJECTS } from '../lib/subjects';

// Demo students data
const DEMO_STUDENTS = [
  { id: 's001', name: 'Rahul Sharma', roll: 'BBA/2024/001' },
  { id: 's002', name: 'Priya Patel', roll: 'BBA/2024/002' },
  { id: 's003', name: 'Amit Kumar', roll: 'BBA/2024/003' },
  { id: 's004', name: 'Sneha Singh', roll: 'BBA/2024/004' },
  { id: 's005', name: 'Vikram Reddy', roll: 'BBA/2024/005' },
  { id: 's006', name: 'Ananya Das', roll: 'BBA/2024/006' },
  { id: 's007', name: 'Karan Mehta', roll: 'BBA/2024/007' },
  { id: 's008', name: 'Divya Nair', roll: 'BBA/2024/008' },
  { id: 's009', name: 'Rohit Gupta', roll: 'BBA/2024/009' },
  { id: 's010', name: 'Neha Joshi', roll: 'BBA/2024/010' },
  { id: 's011', name: 'Siddharth Rao', roll: 'BBA/2024/011' },
  { id: 's012', name: 'Kavya Iyer', roll: 'BBA/2024/012' },
  { id: 's013', name: 'Arjun Malhotra', roll: 'BBA/2024/013' },
  { id: 's014', name: 'Meera Choudhary', roll: 'BBA/2024/014' },
  { id: 's015', name: 'Aditya Banerjee', roll: 'BBA/2024/015' },
];

const DEMO_CLASSROOMS = [
  { id: 'lh11', name: 'LH-11', capacity: 60 },
  { id: 'lh02', name: 'LH-02', capacity: 80 },
  { id: 'lh03', name: 'LH-03', capacity: 60 },
  { id: 'lab3b', name: 'LAB IIIB', capacity: 30 },
];

export default function FacultyAttendancePanel() {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [selectedClassroom, setSelectedClassroom] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({});
  const [showStudentList, setShowStudentList] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [savingStates, setSavingStates] = useState({}); // Track saving state for each student
  const [saveToast, setSaveToast] = useState(null); // Toast notification

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    setLoading(true);
    try {
      // Try to load subjects from Supabase (from any user's subjects)
      const { data, error } = await supabase
        .from('user_subjects')
        .select('subject_name, subject_code, room')
        .order('created_at', { ascending: true })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        const uniqueSubjects = [];
        const seen = new Set();
        data.forEach(s => {
          const key = s.subject_code;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueSubjects.push({
              name: s.subject_name,
              code: s.subject_code,
              room: s.room || 'LH-11'
            });
          }
        });
        setSubjects(uniqueSubjects);
      } else {
        // Use default subjects if no data in Supabase
        setSubjects(DEFAULT_SUBJECTS);
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
      // Fallback to default subjects
      setSubjects(DEFAULT_SUBJECTS);
    } finally {
      setLoading(false);
    }
  };

  const handleClassroomSelect = (classroom) => {
    setSelectedClassroom(classroom);
    setSelectedSubject(null);
    setShowStudentList(false);
  };

  const handleSubjectSelect = (subject) => {
    if (!selectedClassroom) return;
    setSelectedSubject(subject);
    setShowStudentList(true);
    // Initialize attendance for today if not exists
    const dateKey = currentDate;
    if (!attendance[dateKey]) {
      const initialAttendance = {};
      DEMO_STUDENTS.forEach(s => {
        initialAttendance[s.id] = null; // null = unmarked, true = present, false = absent
      });
      setAttendance({ ...attendance, [dateKey]: initialAttendance });
    }
  };

  const saveAttendanceToSupabase = async (studentId, status, date, subjectCode) => {
    if (!subjectCode) return;
    
    const saveKey = `${date}-${studentId}`;
    setSavingStates(prev => ({ ...prev, [saveKey]: true }));

    try {
      const facultyId = localStorage.getItem('demo_user_id') || 'demo_faculty_001';
      const student = DEMO_STUDENTS.find(s => s.id === studentId);
      
      if (status === null) {
        // Remove attendance record (unmark)
        await supabase
          .from('faculty_attendance')
          .delete()
          .eq('faculty_id', facultyId)
          .eq('student_id', studentId)
          .eq('date', date)
          .eq('subject_code', subjectCode);
      } else {
        // Upsert attendance record
        const statusText = status === true ? 'present' : 'absent';
        const { error } = await supabase
          .from('faculty_attendance')
          .upsert({
            faculty_id: facultyId,
            student_id: studentId,
            student_name: student?.name || '',
            date: date,
            subject_code: subjectCode,
            status: statusText,
            classroom: selectedClassroom?.name || ''
          }, {
            onConflict: 'faculty_id,student_id,date,subject_code'
          });

        if (error) throw error;
      }

      // Ensure immediate sync by waiting for the operation to complete
      // The database will update immediately, triggering real-time subscriptions
      
      // Show success toast
      setSaveToast({
        message: `Attendance ${status === true ? 'marked as Present' : status === false ? 'marked as Absent' : 'removed'}`,
        type: 'success'
      });
      setTimeout(() => setSaveToast(null), 3000);

    } catch (err) {
      console.error('Error saving attendance:', err);
      setSaveToast({
        message: 'Failed to save attendance',
        type: 'error'
      });
      setTimeout(() => setSaveToast(null), 3000);
    } finally {
      setSavingStates(prev => ({ ...prev, [saveKey]: false }));
    }
  };

  const toggleAttendance = async (studentId) => {
    if (!selectedSubject) return;
    
    const dateKey = currentDate;
    const current = attendance[dateKey] || {};
    const currentStatus = current[studentId];
    
    // Cycle: null -> true -> false -> null
    let newStatus;
    if (currentStatus === null || currentStatus === false) {
      newStatus = true; // Mark present
    } else {
      newStatus = false; // Mark absent
    }

    // Update local state immediately for instant feedback
    setAttendance({
      ...attendance,
      [dateKey]: {
        ...current,
        [studentId]: newStatus
      }
    });

    // Save to Supabase asynchronously
    await saveAttendanceToSupabase(studentId, newStatus, dateKey, selectedSubject.code);
  };

  const getAttendanceStats = () => {
    const dateKey = currentDate;
    const current = attendance[dateKey] || {};
    const total = DEMO_STUDENTS.length;
    const present = Object.values(current).filter(v => v === true).length;
    const absent = Object.values(current).filter(v => v === false).length;
    const unmarked = total - present - absent;
    return { total, present, absent, unmarked };
  };

  const handleLogout = () => {
    localStorage.removeItem('demo_role');
    localStorage.removeItem('demo_user_id');
    localStorage.removeItem('demo_username');
    localStorage.removeItem('demo_name');
    navigate('/demo');
  };

  const stats = getAttendanceStats();

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
        marginBottom: isMobile ? '20px' : '24px',
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
            Faculty Attendance Panel
          </h1>
          <p style={{
            fontSize: isMobile ? '12px' : '13px',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Mark student attendance for classes
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

      {/* Date Selector */}
      <div style={{
        marginBottom: '20px',
        padding: '16px',
        background: 'var(--card-bg)',
        backdropFilter: 'blur(6px)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px'
      }}>
        <label style={{
          display: 'block',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-primary)',
          marginBottom: '8px'
        }}>
          Date
        </label>
        <input
          type="date"
          value={currentDate}
          onChange={(e) => setCurrentDate(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            fontSize: '14px',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        />
      </div>

      {/* Classroom Selection */}
      {!selectedClassroom && (
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{
            fontSize: isMobile ? '16px' : '18px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 12px 0'
          }}>
            Select Classroom
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '12px'
          }}>
            {DEMO_CLASSROOMS.map(classroom => (
              <button
                key={classroom.id}
                onClick={() => handleClassroomSelect(classroom)}
                style={{
                  padding: '16px',
                  background: 'var(--card-bg)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left'
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
                <div style={{
                  fontSize: isMobile ? '16px' : '18px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBottom: '4px'
                }}>
                  {classroom.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)'
                }}>
                  Capacity: {classroom.capacity}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Subject Selection */}
      {selectedClassroom && !selectedSubject && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <h2 style={{
              fontSize: isMobile ? '16px' : '18px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0
            }}>
              Select Subject ({selectedClassroom.name})
            </h2>
            <button
              onClick={() => {
                setSelectedClassroom(null);
                setSelectedSubject(null);
                setShowStudentList(false);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                background: 'var(--hover-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--card-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Change Classroom
            </button>
          </div>
          {loading ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: '14px'
            }}>
              Loading subjects...
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {subjects.map((subject, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSubjectSelect(subject)}
                  style={{
                    padding: '16px',
                    background: 'var(--card-bg)',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
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
                  <div style={{
                    fontSize: isMobile ? '14px' : '15px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '4px'
                  }}>
                    {subject.name}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)',
                    marginBottom: '2px'
                  }}>
                    Code: {subject.code}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-secondary)'
                  }}>
                    Room: {subject.room}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Student List */}
      {showStudentList && selectedSubject && (
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div>
              <h2 style={{
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 4px 0'
              }}>
                {selectedSubject.name}
              </h2>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                margin: 0
              }}>
                {selectedClassroom.name} • {currentDate}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedSubject(null);
                setShowStudentList(false);
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 500,
                background: 'var(--hover-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--card-bg)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Change Subject
            </button>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <div style={{
              padding: '12px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBottom: '2px'
              }}>
                {stats.total}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                Total
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: 600,
                color: '#34d399',
                marginBottom: '2px'
              }}>
                {stats.present}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                Present
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: 600,
                color: '#f87171',
                marginBottom: '2px'
              }}>
                {stats.absent}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                Absent
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: 'var(--stat-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '2px'
              }}>
                {stats.unmarked}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--text-secondary)'
              }}>
                Unmarked
              </div>
            </div>
          </div>

          {/* Quick Actions for Mobile */}
          {isMobile && showStudentList && (
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={async () => {
                  const dateKey = currentDate;
                  const current = attendance[dateKey] || {};
                  const updates = {};
                  
                  DEMO_STUDENTS.forEach(student => {
                    if (current[student.id] !== true) {
                      updates[student.id] = true;
                    }
                  });

                  // Update all at once
                  setAttendance(prev => ({
                    ...prev,
                    [dateKey]: { ...current, ...updates }
                  }));

                  // Save to Supabase
                  await Promise.all(
                    Object.keys(updates).map(studentId =>
                      saveAttendanceToSupabase(studentId, true, dateKey, selectedSubject.code)
                    )
                  );
                }}
                style={{
                  flex: 1,
                  minWidth: 'calc(50% - 4px)',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: 'rgba(34, 197, 94, 0.12)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  color: '#34d399',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(34, 197, 94, 0.12)';
                }}
              >
                ✓ Mark All Present
              </button>
              <button
                onClick={async () => {
                  const dateKey = currentDate;
                  const current = attendance[dateKey] || {};
                  const updates = {};
                  
                  DEMO_STUDENTS.forEach(student => {
                    if (current[student.id] !== false) {
                      updates[student.id] = false;
                    }
                  });

                  // Update all at once
                  setAttendance(prev => ({
                    ...prev,
                    [dateKey]: { ...current, ...updates }
                  }));

                  // Save to Supabase
                  await Promise.all(
                    Object.keys(updates).map(studentId =>
                      saveAttendanceToSupabase(studentId, false, dateKey, selectedSubject.code)
                    )
                  );
                }}
                style={{
                  flex: 1,
                  minWidth: 'calc(50% - 4px)',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                }}
              >
                ✗ Mark All Absent
              </button>
            </div>
          )}

          {/* Student List */}
          <div style={{
            background: 'var(--card-bg)',
            backdropFilter: 'blur(6px)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: isMobile ? '12px' : '16px'
          }}>
            <div style={{
              display: 'grid',
              gap: isMobile ? '10px' : '8px'
            }}>
              {DEMO_STUDENTS.map((student, idx) => {
                const dateKey = currentDate;
                const current = attendance[dateKey] || {};
                const status = current[student.id];
                const isPresent = status === true;
                const isAbsent = status === false;
                const saveKey = `${dateKey}-${student.id}`;
                const isSaving = savingStates[saveKey];

                return (
                  <div
                    key={student.id}
                    onClick={() => !isSaving && toggleAttendance(student.id)}
                    style={{
                      padding: isMobile ? '16px' : '14px',
                      minHeight: isMobile ? '64px' : 'auto',
                      background: status === null ? 'var(--stat-bg)' : (isPresent ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)'),
                      border: '1px solid',
                      borderColor: status === null ? 'var(--border-color)' : (isPresent ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'),
                      borderRadius: '8px',
                      cursor: isSaving ? 'wait' : 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: isMobile ? '16px' : '12px',
                      opacity: isSaving ? 0.6 : 1,
                      position: 'relative',
                      WebkitTapHighlightColor: 'transparent',
                      touchAction: 'manipulation'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSaving) e.currentTarget.style.opacity = '0.8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = isSaving ? 0.6 : 1;
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: isMobile ? '14px' : '15px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        marginBottom: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {student.name}
                        {isSaving && (
                          <svg 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="var(--text-secondary)" 
                            strokeWidth="2"
                            style={{
                              animation: 'spin 1s linear infinite'
                            }}
                          >
                            <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="31.416" opacity="0.3"/>
                            <circle cx="12" cy="12" r="10" strokeDasharray="31.416" strokeDashoffset="15.708"/>
                          </svg>
                        )}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)'
                      }}>
                        {student.roll}
                      </div>
                    </div>
                    <div style={{
                      width: isMobile ? '32px' : '24px',
                      height: isMobile ? '32px' : '24px',
                      borderRadius: '8px',
                      border: '2px solid',
                      borderColor: status === null ? 'var(--border-color)' : (isPresent ? '#34d399' : '#f87171'),
                      background: status === null ? 'transparent' : (isPresent ? '#34d399' : '#f87171'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      minWidth: isMobile ? '32px' : '24px'
                    }}>
                      {isSaving ? (
                        <div style={{
                          width: '12px',
                          height: '12px',
                          border: '2px solid',
                          borderColor: status === null ? 'var(--text-secondary)' : 'white',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }} />
                      ) : (
                        <>
                          {isPresent && (
                            <svg width={isMobile ? "18" : "14"} height={isMobile ? "18" : "14"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                          {isAbsent && (
                            <svg width={isMobile ? "18" : "14"} height={isMobile ? "18" : "14"} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/>
                              <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {saveToast && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? 'calc(20px + env(safe-area-inset-bottom, 0px) + 70px)' : '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 20px',
          background: saveToast.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${saveToast.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          borderRadius: '8px',
          color: saveToast.type === 'success' ? '#34d399' : '#f87171',
          fontSize: '14px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 10000,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          animation: 'slideUp 0.3s ease',
          maxWidth: '90%'
        }}>
          {saveToast.type === 'success' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
          {saveToast.message}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
