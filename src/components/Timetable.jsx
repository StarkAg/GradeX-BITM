import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Link } from 'react-router-dom';
import { getSubjects, getSubjectColor, getDayColor } from '../lib/subjects';
import './Timetable.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = [
  { period: 1, time: '8:30 - 9:20' },
  { period: 2, time: '9:30 - 10:20' },
  { period: 3, time: '10:30 - 11:20' },
  { period: 4, time: '11:30 - 12:20' },
  { period: 5, time: '12:30 - 1:20' },
  { period: 6, time: '1:30 - 2:20' },
  { period: 7, time: '2:30 - 3:20' },
  { period: 8, time: '3:30 - 4:20' },
  { period: 9, time: '5:30 - 6:20' },
];

// Default timetable structure (9 slots per day)
const DEFAULT_TIMETABLE = {
  'Monday': [
    { code: 'OB' }, { code: 'MM' }, { code: 'BE' }, { code: 'EI' }, { code: 'QDA', room: 'LH-02' }, null, null, null, null
  ],
  'Tuesday': [
    { code: 'WAB', room: 'LAB IIIB', isLab: true }, { code: 'WAB', room: 'LAB IIIB', isLab: true },
    { code: 'BE' }, { code: 'PSCW', room: 'Lab', isLab: true }, { code: 'PSCW', room: 'LH-02', isLab: true }, null, null, null, null
  ],
  'Wednesday': [
    { code: 'EI' }, { code: 'OB' }, { code: 'BE' }, { code: 'MM' }, { code: 'MM', room: 'LH-02' }, null, null, null, null
  ],
  'Thursday': [
    { code: 'QDA' }, { code: 'QDA', room: 'LAB IIIB', isLab: true }, { code: 'PSCW' }, { code: 'OB' }, null, null, null, null, null
  ],
  'Friday': [
    { code: 'WAB' }, { code: 'MM' }, { code: 'WAB' }, { code: 'QDA' }, null, null, null, null, null
  ],
};

function TimetableGrid({ subjects, timetable }) {
  const subjectMap = {};
  subjects.forEach((s, idx) => { subjectMap[s.code] = { ...s, colorIndex: idx }; });

  return (
    <div className="timetable-container">
      <div className="timetable-header-logos">
        <img src="/GradeX.png" alt="GRADEX" className="timetable-logo-left" />
        <img src="/Harsh.png" alt="BY STARK HARSH" className="timetable-logo-corner" />
      </div>
      <h2 className="timetable-title">Class Schedule</h2>
      <div className="timetable-subtitle">W.E.F. 08/01/26 | BBA II A | BIT Mesra, Lalpur | LH-11</div>
      <div className="timetable-grid">
        <div className="timetable-header-cell">Time</div>
        {TIME_SLOTS.map((slot) => (
          <div key={slot.period} className="timetable-header-cell">
            <div className="timetable-time-range" style={{ fontSize: '0.55rem' }}>{slot.time}</div>
          </div>
        ))}
        {DAYS.map((day, dayIdx) => (
          <div key={day} className="timetable-day-row">
            <div className="timetable-day-label" style={{ backgroundColor: getDayColor(dayIdx) }}>{day}</div>
            {TIME_SLOTS.map((slot, periodIndex) => {
              const cell = timetable[day]?.[periodIndex];
              const isEmpty = !cell;
              const subject = !isEmpty ? subjectMap[cell.code] : null;
              const bgColor = subject ? getSubjectColor(subject.colorIndex) : null;
              const displayName = subject ? (cell.isLab ? `${subject.name} (LAB)` : subject.name) : '';
              const room = cell?.room || subject?.room || 'LH-11';
              return (
                <div key={slot.period} className={`timetable-cell ${isEmpty ? 'timetable-empty-cell' : 'timetable-filled-cell'}`} style={!isEmpty && subject ? { backgroundColor: bgColor } : {}}>
                  {!isEmpty && subject && (
                    <div className="timetable-cell-content">
                      <div className="timetable-course-name">{displayName}</div>
                                      <div className="timetable-room-number">{room}</div>
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
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState(() => {
    const saved = localStorage.getItem('gradex_timetable');
    return saved ? JSON.parse(saved) : DEFAULT_TIMETABLE;
  });
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(false);
  const timetableRef = useRef(null);

  useEffect(() => {
    setSubjects(getSubjects());
    const handleUpdate = () => setSubjects(getSubjects());
    window.addEventListener('subjectsUpdated', handleUpdate);
    return () => window.removeEventListener('subjectsUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    localStorage.setItem('gradex_timetable', JSON.stringify(timetable));
  }, [timetable]);

  // Lock scroll on Schedule page (mobile and desktop)
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

  async function downloadPDF() {
    setLoading(true);
    try {
      let timetableElement = document.querySelector('.timetable-container');
      if (!timetableElement) throw new Error('Timetable not found');
      
      const desktopWidth = 900;

      // Save original styles
      const origStyles = {
        width: timetableElement.style.width,
        maxWidth: timetableElement.style.maxWidth,
        position: timetableElement.style.position,
        visibility: timetableElement.style.visibility,
        left: timetableElement.style.left,
        zIndex: timetableElement.style.zIndex
      };

      // Make visible and set size for capture
      timetableElement.style.position = 'absolute';
      timetableElement.style.visibility = 'visible';
      timetableElement.style.left = '0';
      timetableElement.style.zIndex = '9999';
      timetableElement.style.width = `${desktopWidth}px`;
      timetableElement.style.maxWidth = `${desktopWidth}px`;

      await new Promise(r => setTimeout(r, 200));
      
      const canvas = await html2canvas(timetableElement, {
        scale: 3, 
        backgroundColor: '#f8f9fa', 
        width: desktopWidth,
        useCORS: true,
        logging: false,
        windowWidth: desktopWidth
      });

      // Restore original styles
      Object.keys(origStyles).forEach(key => {
        timetableElement.style[key] = origStyles[key] || '';
      });

      const blob = await (await fetch(canvas.toDataURL('image/jpeg', 0.95))).blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
      link.download = `TimeTable_${localStorage.getItem('gradex_user_name') || 'BBA_IIA'}.jpg`;
        link.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to generate image');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="timetable-page" style={{ 
      height: isMobile ? 'calc(100dvh - 50px - 70px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))' : 'calc(100vh - 55px)',
      paddingBottom: isMobile ? `calc(20px + env(safe-area-inset-bottom, 0px))` : '20px',
      overflow: 'hidden',
          display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Class Schedule</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>BBA II A • BIT Mesra, Lalpur</p>
          </div>

      {/* Note about Managing Schedule */}
          <div style={{
        padding: isMobile ? '8px 12px' : '10px 16px', 
        background: 'var(--hover-bg)', 
        border: '1px solid var(--border-color)', 
        borderRadius: '8px', 
        marginBottom: isMobile ? '12px' : '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}>
          <p style={{
          fontSize: isMobile ? '11px' : '12px', 
            color: 'var(--text-secondary)',
          margin: 0,
          flex: 1,
          lineHeight: 1.4
        }}>
          Schedule can be changed using <strong style={{ color: 'var(--text-primary)' }}>Manage Subjects</strong> section
        </p>
        <Link 
          to="/subjects" 
            style={{
            padding: isMobile ? '6px 12px' : '8px 16px', 
            fontSize: isMobile ? '11px' : '12px', 
            fontWeight: 500, 
            border: '1px solid var(--border-color)', 
            background: 'var(--card-bg)', 
            color: 'var(--text-primary)', 
            borderRadius: '6px', 
            textDecoration: 'none', 
              display: 'flex',
              alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
            flexShrink: 0
            }}
            onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--text-primary)';
            e.currentTarget.style.color = 'var(--bg-primary)';
            e.currentTarget.style.borderColor = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--card-bg)';
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          {isMobile ? 'Manage' : 'Manage Subjects'}
        </Link>
      </div>

      <div ref={timetableRef} style={{ position: isMobile ? 'absolute' : 'relative', visibility: isMobile ? 'hidden' : 'visible', left: isMobile ? '-9999px' : 'auto', width: isMobile ? '900px' : 'auto', zIndex: isMobile ? '-1' : 'auto' }}>
        <TimetableGrid subjects={subjects} timetable={timetable} />
          </div>

      {!isMobile && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
          <Link to="/subjects" style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 500, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Manage Subjects
          </Link>
          <button onClick={downloadPDF} disabled={loading} style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 600, borderRadius: '8px', border: 'none', background: 'var(--text-primary)', color: 'var(--bg-primary)', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loading ? 'Generating...' : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download Image</>}
          </button>
        </div>
      )}

      {isMobile && (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 240px)', overflow: 'hidden', paddingBottom: '80px' }}>
          {/* Mobile Timetable Grid */}
          <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: '600px', padding: '8px', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {/* Header Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '55px repeat(9, 1fr)', borderBottom: '2px solid var(--border-color)' }}>
                <div style={{ padding: '8px 4px', background: 'rgba(128,128,128,0.15)', fontSize: '9px', fontWeight: 700, textAlign: 'center', color: 'var(--text-secondary)', borderRight: '1px solid var(--border-color)' }}>Day</div>
                {TIME_SLOTS.map((slot, idx) => (
                  <div key={slot.period} style={{ padding: '6px 2px', background: 'rgba(128,128,128,0.15)', fontSize: '7px', fontWeight: 600, textAlign: 'center', color: 'var(--text-secondary)', lineHeight: 1.3, borderRight: idx < TIME_SLOTS.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    {slot.time.split(' - ')[0]}<br/><span style={{ opacity: 0.6, fontSize: '6px' }}>{slot.time.split(' - ')[1]}</span>
          </div>
            ))}
          </div>
              {/* Day Rows */}
              {DAYS.map((day, dayIdx) => {
                const subjectMap = {};
                subjects.forEach((s, idx) => { subjectMap[s.code] = { ...s, colorIndex: idx }; });
                return (
                  <div key={day} style={{ display: 'grid', gridTemplateColumns: '55px repeat(9, 1fr)', borderBottom: dayIdx < DAYS.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <div style={{ padding: '8px 4px', background: getDayColor(dayIdx), fontSize: '9px', fontWeight: 700, textAlign: 'center', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '2px solid rgba(0, 0, 0, 0.2)', width: '55px', minWidth: '55px', maxWidth: '55px', whiteSpace: 'nowrap', overflow: 'hidden', boxShadow: '2px 0 2px rgba(0, 0, 0, 0.05)' }}>
                      {day.slice(0, 3)}
        </div>
                    {TIME_SLOTS.map((slot, idx) => {
                      const cell = timetable[day]?.[idx];
                      const subject = cell ? subjectMap[cell.code] : null;
                      const bgColor = subject ? getSubjectColor(subject.colorIndex) : 'transparent';
                      return (
                        <div key={slot.period} style={{ padding: '4px 2px', background: bgColor, minHeight: '38px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: idx < TIME_SLOTS.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                          {cell && subject && (
                  <>
                              <div style={{ fontSize: '9px', fontWeight: 700, color: '#000', textAlign: 'center', lineHeight: 1.1 }}>{cell.code}</div>
                              <div style={{ fontSize: '6px', color: 'rgba(0,0,0,0.7)', textAlign: 'center', marginTop: '2px' }}>{cell.room || subject.room || 'LH-11'}</div>
                  </>
                )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Buttons */}
      {isMobile && (
        <div style={{ position: 'fixed', bottom: `calc(70px + env(safe-area-inset-bottom, 0px) + 8px)`, left: 0, right: 0, padding: '10px 16px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '10px', zIndex: 100 }}>
          <Link to="/subjects" style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 500, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Manage
          </Link>
          <button onClick={downloadPDF} disabled={loading} style={{ flex: 1, padding: '10px', fontSize: '12px', fontWeight: 600, borderRadius: '8px', background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            {loading ? '...' : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download</>}
          </button>
        </div>
      )}
    </div>
  );
}
