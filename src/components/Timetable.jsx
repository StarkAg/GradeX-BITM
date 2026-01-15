import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Link } from 'react-router-dom';
import { getSubjects, getSubjectColor } from '../lib/subjects';
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
        {DAYS.map((day) => (
          <div key={day} className="timetable-day-row">
            <div className="timetable-day-label">{day}</div>
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

  // Disable body scroll on Schedule page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

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
    <div className="timetable-page" style={{ height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Class Schedule</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>BBA II A • BIT Mesra, Lalpur</p>
        </div>
        <Link to="/subjects" style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 500, border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', borderRadius: '8px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Manage Subjects
        </Link>
      </div>

      <div ref={timetableRef} style={{ position: isMobile ? 'absolute' : 'relative', visibility: isMobile ? 'hidden' : 'visible', left: isMobile ? '-9999px' : 'auto', width: isMobile ? '900px' : 'auto', zIndex: isMobile ? '-1' : 'auto' }}>
        <TimetableGrid subjects={subjects} timetable={timetable} />
        {!isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
            <button onClick={downloadPDF} disabled={loading} style={{ padding: '14px 28px', fontSize: '16px', fontWeight: 600, borderRadius: '8px', border: 'none', background: 'var(--text-primary)', color: 'var(--bg-primary)', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {loading ? 'Generating...' : <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download Image</>}
            </button>
          </div>
        )}
      </div>

      {isMobile && (
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Download the timetable image to view on mobile.</p>
          <button onClick={downloadPDF} disabled={loading} style={{ padding: '16px 32px', fontSize: '16px', fontWeight: 600, borderRadius: '8px', background: 'var(--text-primary)', color: 'var(--bg-primary)', border: 'none', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.6 : 1 }}>{loading ? 'Generating...' : 'Download Image'}</button>
        </div>
      )}
    </div>
  );
}
