import React, { useEffect, useMemo, useRef, useState } from 'react';

// Grade thresholds and points according to specification
const gradeScale = [
  { label: 'F', point: 0, minMarks: 0 },      // < 50
  { label: 'C', point: 5, minMarks: 50 },     // ≥ 50
  { label: 'B', point: 6, minMarks: 56 },     // ≥ 56
  { label: 'B+', point: 7, minMarks: 61 },    // ≥ 61
  { label: 'A', point: 8, minMarks: 71 },     // ≥ 71
  { label: 'A+', point: 9, minMarks: 81 },   // ≥ 81
  { label: 'O', point: 10, minMarks: 91 },    // ≥ 91
];

// Grade point values for exam calculation
const gradePointValues = {
  'O': 91,
  'A+': 81,
  'A': 71,
  'B+': 61,
  'B': 56,
  'C': 50,
};

const TOTAL_MARKS = 100;
const MAX_INTERNAL_MARKS = 60;
const MAX_EXTERNAL_MARKS_THEORY = 75;  // Theory course max external
const MAX_EXTERNAL_MARKS_PRACTICAL = 40;  // Practical course max external
const EXTERNAL_MARKS_VALUE = 40;  // External contributes 40 marks out of 100

// Get grade from marks (out of 100)
const getGrade = (marks) => {
  if (marks >= 91) return 'O';
  if (marks >= 81) return 'A+';
  if (marks >= 71) return 'A';
  if (marks >= 61) return 'B+';
  if (marks >= 56) return 'B';
  if (marks >= 50) return 'C';
  return 'F';
};

// Determine grade from scored/total (percentage-based)
const determineGrade = (scoredMarks, totalMarks) => {
  if (!Number.isFinite(scoredMarks) || !Number.isFinite(totalMarks) || totalMarks <= 0) {
    return 'F';
  }
  const percentage = (scoredMarks / totalMarks) * 100;
  return getGrade(percentage);
};

// Get grade index from grade label
const getGradeIndex = (gradeLabel) => {
  return gradeScale.findIndex(g => g.label === gradeLabel) || 0;
};

// Calculate initial grade based on course state
const calculateInitialGrade = (currentScore, maxScore, expectedInternal = 0) => {
  // Case A: Course with total < 60 (incomplete internals)
  if (maxScore < MAX_INTERNAL_MARKS) {
    const maxRemainingInternal = MAX_INTERNAL_MARKS - maxScore;
    const maxExternal = EXTERNAL_MARKS_VALUE;
    const maxPotentialScore = currentScore + maxRemainingInternal + maxExternal;
    return getGrade(Math.min(maxPotentialScore, TOTAL_MARKS));
  }
  
  // Case B: Course with total = 100 (complete)
  if (maxScore >= TOTAL_MARKS) {
    return getGrade(currentScore);
  }
  
  // Case C: Course with total > 60 but < 100 (partial marks)
  return determineGrade(currentScore, maxScore);
};

// Calculate required semester exam marks
// Formula: ((grade_points[targetGrade] - total_internal_score) / 40) × maxExternalMarks
const calculateRequiredExamMarks = (currentScore, maxScore, targetGradeLabel, expectedInternal = 0) => {
  // If course is already complete (maxScore >= 100), no exam needed
  if (maxScore >= TOTAL_MARKS) {
    return null;
  }
  
  // When maxScore = 60, currentScore is already in marks (out of 60)
  // For exam calculation, use only current score (expectedInternal is for display only)
  const currentInternalMarks = currentScore;
  
  // Get target grade point value (marks needed out of 100)
  const targetGradePoint = gradePointValues[targetGradeLabel] || 50;
  
  // Calculate required marks from exam (out of 40 marks)
  // Formula: ((grade_points[targetGrade] - current_internal_score) / 40) × maxExternalMarks
  const requiredExamMarks = targetGradePoint - currentInternalMarks;
  
  // Use Theory course max external marks (75)
  const maxExternalMarks = MAX_EXTERNAL_MARKS_THEORY;
  
  // Convert required marks (out of 40) to exam points (out of 75)
  // 40 marks = 75 points, so 1 mark = 75 / 40 points
  const requiredExamPoints = (requiredExamMarks / EXTERNAL_MARKS_VALUE) * maxExternalMarks;
  
  // Clamp to valid range
  return Math.max(0, Math.min(maxExternalMarks, Math.ceil(requiredExamPoints * 100) / 100));
};

const defaultCourses = [
  {
    id: 1,
    title: 'Discrete Mathematics',
    credit: 4,
    score: 0,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
    included: true,
  },
  {
    id: 2,
    title: 'Formal Language And Automata',
    credit: 3,
    score: 0,
    maxScore: 60,
    gradeIndex: getGradeIndex('B+'),
    included: true,
  },
  {
    id: 3,
    title: 'Computer Networks',
    credit: 4,
    score: 0,
    maxScore: 60,
    gradeIndex: getGradeIndex('A+'),
    included: true,
  },
  {
    id: 4,
    title: 'Machine Learning',
    credit: 3,
    score: 0,
    maxScore: 100,
    gradeIndex: getGradeIndex('A+'),
    included: true,
  },
  {
    id: 5,
    title: 'Professional Elective',
    credit: 3,
    score: 0,
    maxScore: 60,
    gradeIndex: getGradeIndex('A+'),
    included: true,
  },
  {
    id: 6,
    title: 'Open Elective',
    credit: 3,
    score: 0,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
    included: true,
  },
  {
    id: 7,
    title: 'Community Connect',
    credit: 1,
    score: 0,
    maxScore: 100,
    gradeIndex: getGradeIndex('A+'),
    included: true,
  },
];

const UL_PRESET = [
  {
    id: 1,
    title: 'Computer Networks',
    credit: 4,
    score: 56,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
    included: true,
  },
  {
    id: 2,
    title: 'Database Security and Privacy',
    credit: 3,
    score: 56,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
    included: true,
  },
  {
    id: 3,
    title: 'Discrete Mathematics',
    credit: 4,
    score: 45.9,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
    included: true,
  },
  {
    id: 4,
    title: 'Formal Language and Automata',
    credit: 3,
    score: 48.4,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
    included: true,
  },
  {
    id: 5,
    title: 'Machine Learning',
    credit: 3,
    score: 81.05,
    maxScore: 100,
    gradeIndex: getGradeIndex('A+'),
    included: true,
  },
  {
    id: 6,
    title: 'Environmental Impact Assessment',
    credit: 3,
    score: 55.6,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
    included: true,
  },
  {
    id: 7,
    title: 'Community Connect',
    credit: 1,
    score: 96,
    maxScore: 100,
    gradeIndex: getGradeIndex('A+'),
    included: true,
  },
  {
    id: 8,
    title: 'Indian Art Form',
    credit: 0,
    score: 90,
    maxScore: 100,
    gradeIndex: getGradeIndex('A+'),
    included: true,
  },
];

const HA_PRESET = [
  {
    id: 1,
    title: 'Discrete Mathematics',
    credit: 4,
    score: 33.5,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
    included: true,
  },
  {
    id: 2,
    title: 'Formal Language and Automata',
    credit: 3,
    score: 32.6,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
    included: true,
  },
  {
    id: 3,
    title: 'Computer Networks',
    credit: 4,
    score: 51.2,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
    included: true,
  },
  {
    id: 4,
    title: 'Machine Learning',
    credit: 3,
    score: 81.1,
    maxScore: 100,
    gradeIndex: getGradeIndex('A+'),
    included: true,
  },
  {
    id: 5,
    title: 'Community Connect',
    credit: 1,
    score: 88,
    maxScore: 100,
    gradeIndex: getGradeIndex('A+'),
    included: true,
  },
  {
    id: 6,
    title: 'Indian Art Form',
    credit: 0,
    score: 90,
    maxScore: 100,
    gradeIndex: getGradeIndex('A+'),
    included: true,
  },
  {
    id: 7,
    title: 'Serbot: Project-based Learning in Robotics',
    credit: 3,
    score: 83.2,
    maxScore: 100,
    gradeIndex: getGradeIndex('A+'),
    included: true,
  },
  {
    id: 8,
    title: 'Reverse Engineering and 3D Printing',
    credit: 3,
    score: 45.8,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
    included: true,
  },
];

const STORAGE_KEY = 'gradex-courses';

function GradeX() {
  const [courses, setCourses] = useState(defaultCourses);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [editFormData, setEditFormData] = useState({ title: '', credit: 0, score: 0 });
  const [showEWWMessage, setShowEWWMessage] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const ewwTimerRef = useRef(null);
  
  const applyPresetCourses = (preset) => {
    setCourses(preset.map((course, index) => ({ ...course, id: index + 1 })));
    setShowForm(false);
    setEditingCourseId(null);
    setEditFormData({ title: '', credit: 0, score: 0 });
  };

  const triggerEWWMessage = () => {
    if (ewwTimerRef.current) {
      clearTimeout(ewwTimerRef.current);
    }
    setShowEWWMessage(true);
    ewwTimerRef.current = setTimeout(() => {
      setShowEWWMessage(false);
      ewwTimerRef.current = null;
    }, 3000);
  };

  const applyULPreset = () => {
    applyPresetCourses(UL_PRESET);
    triggerEWWMessage();
  };

  const applyHAPreset = () => {
    applyPresetCourses(HA_PRESET);
  };
  
  const resetToDefaults = () => {
    if (confirm('Reset all courses to default? This will replace your current courses.')) {
      setCourses(defaultCourses);
      localStorage.removeItem(STORAGE_KEY);
    }
  };
  const [showForm, setShowForm] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: '',
    credit: 3,
    score: 0,
    maxScore: 60,
    gradeIndex: getGradeIndex('A'),
  });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) {
          setCourses(parsed);
        }
      } catch (error) {
        console.warn('Unable to restore GradeX data', error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }, [courses]);

  useEffect(() => () => {
    if (ewwTimerRef.current) {
      clearTimeout(ewwTimerRef.current);
    }
  }, []);

  const sgpa = useMemo(() => {
    const included = courses.filter((course) => course.included);
    const totalCredits = included.reduce((sum, course) => sum + Number(course.credit || 0), 0);
    if (totalCredits === 0) return '0.00';
    
    const earned = included.reduce((sum, course) => {
      // Calculate current grade for this course
      const currentGrade = calculateInitialGrade(
        course.score, 
        course.maxScore, 
        0
      );
      
      // For courses needing exam, use target grade; otherwise use achieved grade
      const needsExam = course.maxScore < TOTAL_MARKS;
      const displayGrade = needsExam 
        ? gradeScale[course.gradeIndex]?.label || 'F'
        : currentGrade;
      
      const gradePoint = gradeScale.find(g => g.label === displayGrade)?.point ?? 0;
      return sum + gradePoint * Number(course.credit || 0);
    }, 0);
    
    return (earned / totalCredits).toFixed(2);
  }, [courses]);

  const updateCourse = (id, field, value) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id === id) {
          const updated = {
            ...course,
            [field]: field === 'title'
              ? value
              : Number.isNaN(Number(value))
                ? value
                : Number(value),
          };
          return updated;
        }
        return course;
      }),
    );
  };

  const updateGrade = (id, gradeIndex) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id === id) {
          return { ...course, gradeIndex };
        }
        return course;
      }),
    );
  };

  const toggleIncluded = (id) => {
    setCourses((prev) => prev.map((course) => (course.id === id ? { ...course, included: !course.included } : course)));
  };

  const deleteCourse = (id) => {
    setCourses((prev) => prev.filter((course) => course.id !== id));
  };

  const startEdit = (course) => {
    setEditingCourseId(course.id);
    setEditFormData({
      title: course.title,
      credit: course.credit,
      score: course.score,
    });
  };

  const cancelEdit = () => {
    setEditingCourseId(null);
    setEditFormData({ title: '', credit: 0, score: 0 });
  };

  const saveEdit = (id) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id === id) {
          return {
            ...course,
            title: editFormData.title,
            credit: Number(editFormData.credit),
            score: Number(editFormData.score),
          };
        }
        return course;
      }),
    );
    setEditingCourseId(null);
    setEditFormData({ title: '', credit: 0, score: 0 });
  };

  const addCourse = () => {
    if (!newCourse.title.trim()) {
      alert('Please add a course title');
      return;
    }
    const course = {
      id: Date.now(),
      ...newCourse,
      included: true,
    };
    setCourses((prev) => [course, ...prev]);
    setNewCourse({ 
      title: '', 
      credit: 3, 
      score: 0, 
      maxScore: 60, 
      gradeIndex: getGradeIndex('A') 
    });
    setShowForm(false);
  };

  return (
    <>
      {showEWWMessage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            background: 'rgba(2, 2, 2, 0.9)',
            animation: 'fadeIn 0.3s ease-out',
          }}
        >
          <h1
            style={{
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: 'clamp(48px, 8vw, 120px)',
              fontWeight: 'bold',
              color: '#f5f5f5',
              letterSpacing: '0.15em',
              textAlign: 'center',
              margin: 0,
              textShadow: '0 0 30px rgba(245, 245, 245, 0.5)',
              animation: 'fadeIn 0.5s ease-out',
            }}
          >
            Welcome EWW
          </h1>
        </div>
      )}
    <div className="gradex-layout" style={{
      height: window.innerWidth <= 768 ? 'calc(100vh - 50px)' : 'calc(100vh - 60px)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="gradex-toolbar" style={{ position: 'relative' }}>
        <div>
          <h1>Semester Overview</h1>
          <p className="gradex-sub">Track grades manually, forecast SGPA instantly.</p>
          <p style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', letterSpacing: '0.05em', marginBottom: 0 }}>
            PS — came into existence on 12th Nov :) since ClassPro and Etc. were unreliable manytimes :(
          </p>
        </div>
        <button
          type="button"
          onClick={applyHAPreset}
          className="hidden-preset-btn"
          style={{
            position: 'absolute',
            top: '8px',
            right: '64px',
          }}
          aria-label="Load HA preset"
          title="HA Mode"
        >
          HA
        </button>
        <button
          type="button"
          onClick={applyULPreset}
          className="hidden-preset-btn"
          style={{
            position: 'absolute',
            top: '8px',
            right: '36px',
          }}
          aria-label="Load UL preset"
          title="UL Mode"
        >
          UL
        </button>
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '20px',
            height: '20px',
            borderRadius: '8px',
            border: '1px solid rgba(245, 245, 245, 0.2)',
            background: 'transparent',
            color: 'rgba(245, 245, 245, 0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            padding: 0,
            transition: 'all 0.2s ease',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.4)';
            e.currentTarget.style.color = 'rgba(245, 245, 245, 0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(245, 245, 245, 0.2)';
            e.currentTarget.style.color = 'rgba(245, 245, 245, 0.5)';
          }}
          title="Help"
        >
          ?
        </button>
        <div className="gradex-toolbar-actions">
          <div className="gradex-sgpa-display">
            <span className="value">{sgpa}</span>
            <span className="label">SGPA</span>
          </div>
          <div className="gradex-toolbar-buttons">
            <button type="button" onClick={resetToDefaults} className="reset-btn">
              Reset
            </button>
            <button type="button" onClick={() => setShowForm((prev) => !prev)}>
              {showForm ? 'Close' : 'Add course'}
            </button>
          </div>
        </div>
      </div>

      {showHelp && (
        <div
          style={{
            background: 'rgba(245, 245, 245, 0.03)',
            border: '1px solid rgba(245, 245, 245, 0.1)',
            borderRadius: '4px',
            padding: '12px',
            marginBottom: '12px',
            fontSize: '11px',
            lineHeight: '1.6',
            color: 'rgba(245, 245, 245, 0.7)',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <strong style={{ color: 'rgba(245, 245, 245, 0.9)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Guide</strong>
            <button
              onClick={() => setShowHelp(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(245, 245, 245, 0.5)',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 4px',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '10px' }}>
            <div>
              <strong style={{ color: 'rgba(245, 245, 245, 0.8)', display: 'block', marginBottom: '4px' }}>Adding Courses:</strong>
              Click "Add course" → Enter title, credit, score → Select status (60/100 marks) → Save
            </div>
            <div>
              <strong style={{ color: 'rgba(245, 245, 245, 0.8)', display: 'block', marginBottom: '4px' }}>Editing:</strong>
              Click "Edit" on any course card → Modify title, credit, or internals → Save changes
            </div>
            <div>
              <strong style={{ color: 'rgba(245, 245, 245, 0.8)', display: 'block', marginBottom: '4px' }}>Grade Selection:</strong>
              For incomplete courses (60 marks), select target grade → See required exam marks
            </div>
            <div>
              <strong style={{ color: 'rgba(245, 245, 245, 0.8)', display: 'block', marginBottom: '4px' }}>Complete Courses:</strong>
              Courses with 100 marks show achieved grade automatically (no exam needed)
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="gradex-form">
          <div className="gradex-form-grid">
            <label>
              Course title
              <input
                value={newCourse.title}
                onChange={(e) => setNewCourse((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Intelligent Systems"
              />
            </label>
            <label>
              Credit
              <input
                type="number"
                min={0}
                value={newCourse.credit}
                onChange={(e) => setNewCourse((prev) => ({ ...prev, credit: Number(e.target.value) }))}
              />
            </label>
            <label>
              Score obtained
              <input
                type="number"
                value={newCourse.score}
                onChange={(e) => setNewCourse((prev) => ({ ...prev, score: Number(e.target.value) }))}
              />
            </label>
            <label>
              Course status
              <select
                value={newCourse.maxScore === 100 ? 'complete' : 'incomplete'}
                onChange={(e) => {
                  const maxScore = e.target.value === 'complete' ? 100 : 60;
                  setNewCourse((prev) => ({ ...prev, maxScore }));
                }}
              >
                <option value="incomplete">Incomplete (60 marks)</option>
                <option value="complete">Complete (100 marks)</option>
              </select>
            </label>
          </div>
          <div className="gradex-form-actions">
            <button type="button" onClick={addCourse} className="primary">
              Save course
            </button>
            <button type="button" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="gradex-grid">
        {courses.map((course) => {
          // Calculate initial/achieved grade
          const achievedGradeLabel = calculateInitialGrade(
            course.score, 
            course.maxScore, 
            0
          );
          
          // Check if exam is needed (course not complete)
          const needsExam = course.maxScore < TOTAL_MARKS;
          
          // Get target grade from slider
          const targetGrade = gradeScale[course.gradeIndex] ?? gradeScale[1];
          const targetGradeLabel = targetGrade.label;
          
          // Calculate required exam marks
          const requiredExamMarks = needsExam 
            ? calculateRequiredExamMarks(
                course.score, 
                course.maxScore, 
                targetGradeLabel, 
                0
              )
            : null;
          
          // Display grade: use target if needs exam, otherwise achieved
          const displayGradeLabel = needsExam ? targetGradeLabel : achievedGradeLabel;
          const displayGrade = gradeScale.find(g => g.label === displayGradeLabel) || gradeScale[1];
          
          // Get max external marks for display (always Theory - 75)
          const maxExternalMarks = MAX_EXTERNAL_MARKS_THEORY;
          
          return (
            <article key={course.id} className={`gradex-card ${course.included ? '' : 'disabled'}`}>
              <header>
                <div style={{ flex: 1 }}>
                  {editingCourseId === course.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <input
                        type="text"
                        value={editFormData.title}
                        onChange={(e) => setEditFormData((prev) => ({ ...prev, title: e.target.value }))}
                        style={{ padding: '8px', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: '#0f172a', color: '#f1f5f9', fontSize: '18px', fontWeight: 600 }}
                        placeholder="Course title"
                      />
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <input
                          type="number"
                          value={editFormData.credit}
                          onChange={(e) => setEditFormData((prev) => ({ ...prev, credit: e.target.value }))}
                          style={{ padding: '6px', width: '60px', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.2)', background: '#0f172a', color: '#f1f5f9' }}
                          placeholder="Credit"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                  <h2>{course.title}</h2>
                  <p>Credit: {course.credit}</p>
                    </>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {editingCourseId === course.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveEdit(course.id)}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #38bdf8', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.25)', background: 'rgba(148,163,184,0.08)', color: '#e2e8f0', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => startEdit(course)}
                        style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(148,163,184,0.25)', background: 'rgba(148,163,184,0.08)', color: '#e2e8f0', fontWeight: 600, cursor: 'pointer', fontSize: '13px' }}
                      >
                        Edit
                      </button>
                <label className="gradex-toggle">
                  <input type="checkbox" checked={course.included} onChange={() => toggleIncluded(course.id)} />
                  <span>Included</span>
                </label>
                    </>
                  )}
                </div>
              </header>

              <div className="gradex-stat-row">
                <div className="gradex-stat">
                  {editingCourseId === course.id ? (
                  <input
                    type="number"
                    className="gradex-inline"
                      value={editFormData.score}
                      onChange={(e) => setEditFormData((prev) => ({ ...prev, score: e.target.value }))}
                      style={{ width: '80px' }}
                  />
                  ) : (
                    <span className="gradex-inline" style={{ color: '#f8fafc', fontWeight: 600 }}>
                      {course.score}
                    </span>
                  )}
                  <span className="gradex-stat-divider">/</span>
                  <span className="gradex-inline" style={{ color: '#94a3b8', fontWeight: 600 }}>
                    {course.maxScore}
                  </span>
                </div>
                <div className="gradex-grade-chip">{displayGradeLabel} Grade</div>
              </div>

              {needsExam && (
              <div className="gradex-slider">
                <input
                  type="range"
                    min={1}
                  max={gradeScale.length - 1}
                  value={course.gradeIndex}
                  onChange={(e) => updateGrade(course.id, Number(e.target.value))}
                />
                <div className="gradex-scale">
                    {gradeScale.filter(g => g.label !== 'F').map((gradeOption) => (
                    <span key={gradeOption.label}>{gradeOption.label}</span>
                  ))}
                </div>
              </div>
              )}

              <div className="gradex-goal">
                {needsExam && requiredExamMarks !== null ? (
                  <>
                <div>Goal for sem exam</div>
                <div className="gradex-goal-display">
                      <span className="gradex-goal-value" style={{ color: requiredExamMarks > maxExternalMarks ? '#ef4444' : '#4ade80' }}>
                        {requiredExamMarks.toFixed(2)}
                      </span>
                      <span className="gradex-goal-max">/ {maxExternalMarks}</span>
                      <span style={{ 
                        marginLeft: '12px', 
                        fontSize: '14px', 
                        color: '#94a3b8',
                        fontWeight: 500
                      }}>
                        ({((requiredExamMarks / maxExternalMarks) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>Achieved grade</div>
                    <div className="gradex-goal-display">
                      <span className="gradex-goal-value">{displayGradeLabel}</span>
                      <span className="gradex-goal-max">{course.score} / {course.maxScore}</span>
                </div>
                  </>
                )}
              </div>

              <footer>
                <button type="button" onClick={() => deleteCourse(course.id)}>
                  Remove
                </button>
              </footer>
            </article>
          );
        })}
      </div>
    </div>
    </>
  );
}

export default GradeX;


