import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Link } from 'react-router-dom';
import { useAcademicSnapshot, useCurrentProfile } from '../lib/academic-data';
import { DEFAULT_TIMETABLE, getSubjectColor, getDayColor } from '../lib/subjects';
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

// Today's weekday if it's Mon-Fri, else Monday - so opening the day view
// on a Tuesday shows Tuesday, not an empty Saturday.
function getDefaultDayIndex() {
  const jsDay = new Date().getDay(); // 0=Sun ... 6=Sat
  const index = jsDay - 1; // Monday=0 ... Friday=4
  return index >= 0 && index <= 4 ? index : 0;
}

export default function Timetable() {
  const snapshot = useAcademicSnapshot();
  const profile = useCurrentProfile();
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState(DEFAULT_TIMETABLE);
  const [isMobile, setIsMobile] = useState(false);
  const [loading, setLoading] = useState(false);
  const timetableRef = useRef(null);

  // Mobile view: 'grid' = whole week at once (scrolls sideways), 'day' = one
  // day of stacked period cards at a time.
  const [mobileView, setMobileView] = useState(() => {
    if (typeof window === 'undefined') return 'grid';
    try {
      return localStorage.getItem('bitm_timetable_mobile_view') === 'day' ? 'day' : 'grid';
    } catch (_) {
      return 'grid';
    }
  });
  const [selectedDayIndex, setSelectedDayIndex] = useState(getDefaultDayIndex);

  useEffect(() => {
    if (!snapshot) return;
    setSubjects(snapshot.subjects || []);
    setTimetable({
      ...DEFAULT_TIMETABLE,
      ...(snapshot.timetable || {}),
    });
  }, [snapshot]);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      link.download = `TimeTable_${profile?.name || profile?.username || 'BBA_IIA'}.jpg`;
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
          {/* View toggle: whole-week grid <-> one day at a time */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px', flexShrink: 0 }}>
            <button
              type="button"
              aria-label={mobileView === 'grid' ? 'Show one day at a time' : 'Show the whole week'}
              onClick={() => {
                const next = mobileView === 'grid' ? 'day' : 'grid';
                setMobileView(next);
                try { localStorage.setItem('bitm_timetable_mobile_view', next); } catch (_) {}
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                border: '1px solid var(--border-color)',
                background: mobileView === 'grid' ? 'var(--hover-bg)' : 'var(--card-bg)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {mobileView === 'grid' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              )}
            </button>
          </div>

          {/* Whole-week grid - ported from GradeX's compact grid design: trims
              trailing all-free columns, dashed empty cells, left-accent-border
              filled cells. Headers are real weekdays (Mon-Fri), not GradeX's
              "D1..D5" day-order labels - BITM has no day-order concept, every
              week is just Monday-Friday. */}
          {mobileView === 'grid' && (() => {
            const subjectMap = {};
            subjects.forEach((s, idx) => { subjectMap[s.code] = { ...s, colorIndex: idx }; });

            let lastUsedSlot = -1;
            for (let p = TIME_SLOTS.length - 1; p >= 0; p--) {
              const used = DAYS.some((day) => timetable[day]?.[p]);
              if (used) { lastUsedSlot = p; break; }
            }
            const visibleSlots = TIME_SLOTS.slice(0, lastUsedSlot + 1);
            if (visibleSlots.length === 0) return null;

            return (
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '38px repeat(5, minmax(0, 1fr))', gap: '3px' }}>
                  {/* Header: weekday labels */}
                  <div />
                  {DAYS.map((day) => (
                    <div
                      key={`h-${day}`}
                      style={{
                        textAlign: 'center',
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '5px 0',
                        borderRadius: '4px',
                        background: 'var(--card-bg)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      {day.slice(0, 3).toUpperCase()}
                    </div>
                  ))}

                  {/* One row per time slot */}
                  {visibleSlots.map((slot, periodIndex) => (
                    <React.Fragment key={`r-${slot.period}`}>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '9px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {slot.time.split(' - ')[0]}
                      </div>

                      {DAYS.map((day) => {
                        const cell = timetable[day]?.[periodIndex];
                        const subject = cell ? subjectMap[cell.code] : null;

                        if (!cell || !subject) {
                          return (
                            <div
                              key={`c-${day}-${slot.period}`}
                              style={{ minHeight: '42px', borderRadius: '4px', border: '1px dashed var(--border-color)' }}
                            />
                          );
                        }

                        const courseColor = getSubjectColor(subject.colorIndex);

                        return (
                          <div
                            key={`c-${day}-${slot.period}`}
                            title={`${subject.name}${cell.room ? ` · ${cell.room}` : ''}`}
                            style={{
                              minHeight: '42px',
                              borderRadius: '4px',
                              background: courseColor,
                              border: '1px solid rgba(0,0,0,0.25)',
                              borderLeft: `3px solid ${courseColor}`,
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '1px',
                              padding: '3px 2px',
                              overflow: 'hidden',
                            }}
                          >
                            <span style={{
                              fontSize: '10px', fontWeight: 700, lineHeight: 1.2, textAlign: 'center',
                              letterSpacing: '-0.01em', color: '#212529', overflow: 'hidden',
                              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', maxWidth: '100%',
                            }}>
                              {cell.code}{cell.isLab ? ' (LAB)' : ''}
                            </span>
                            {(cell.room || subject.room) && (
                              <span style={{
                                fontSize: '9px', fontWeight: 600, lineHeight: 1.1, textAlign: 'center',
                                color: '#212529', opacity: 0.72, overflow: 'hidden', textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap', maxWidth: '100%',
                              }}>
                                {cell.room || subject.room}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* One day at a time - ported from GradeX's day-view cards (border,
              padding, gap, NOW badge). Left out on purpose, since none of it
              exists in BITM's data model: conflict-cell arrays (overlapping
              batches), compensatory-class styling, the optional/cancelled-hour
              toggle and its diagonal strike, and the flip transition between
              days - all SRM-specific machinery this schedule doesn't have. The
              NOW badge here is genuinely computed from TIME_SLOTS' own time
              ranges against the real clock, not ported from anywhere. */}
          {mobileView === 'day' && (() => {
            const subjectMap = {};
            subjects.forEach((s, idx) => { subjectMap[s.code] = { ...s, colorIndex: idx }; });
            const dayName = DAYS[selectedDayIndex];
            const dayCells = timetable[dayName] || [];

            const now = new Date();
            const isViewingToday = getDefaultDayIndex() === selectedDayIndex && now.getDay() >= 1 && now.getDay() <= 5;
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            // "8:30 - 9:20" -> [510, 560]. TIME_SLOTS writes 24hr-ambiguous
            // labels with no AM/PM suffix, but every hour that appears is
            // fixed and known ahead of time: 8-11 are always the morning
            // slots, 12 is already correct as noon, and 1-7 only ever appear
            // in afternoon slots (there is no 1am-7am period on this sheet).
            const parseSlotMinutes = (rangeLabel) => {
              const toMinutes = (t) => {
                let [h, m] = t.split(':').map(Number);
                if (h >= 1 && h <= 7) h += 12;
                return h * 60 + m;
              };
              const [startRaw, endRaw] = rangeLabel.split(' - ');
              return [toMinutes(startRaw), toMinutes(endRaw)];
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                {/* Day switcher - yellow chip + arrows, matching GradeX exactly */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '10px', flexShrink: 0 }}>
                  <button
                    type="button"
                    aria-label="Previous day"
                    onClick={() => setSelectedDayIndex((i) => (i - 1 + DAYS.length) % DAYS.length)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  </button>

                  <div style={{
                    fontSize: '13px', fontWeight: 700, background: '#FFFF00', color: '#000000',
                    padding: '6px 12px', borderRadius: '4px', border: '1.5px solid var(--text-primary)',
                    minWidth: '75px', textAlign: 'center',
                  }}>
                    {dayName}
                  </div>

                  <button
                    type="button"
                    aria-label="Next day"
                    onClick={() => setSelectedDayIndex((i) => (i + 1) % DAYS.length)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  </button>
                </div>

                {/* Stacked period cards */}
                <div style={{ flex: 1, overflow: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: '3px', paddingBottom: '4px' }}>
                  {TIME_SLOTS.map((slot) => {
                    const cell = dayCells[slot.period - 1];
                    const subject = cell ? subjectMap[cell.code] : null;
                    const isEmpty = !cell || !subject;

                    const [startMin, endMin] = parseSlotMinutes(slot.time);
                    const isCurrentClass = !isEmpty && isViewingToday && nowMinutes >= startMin && nowMinutes < endMin;

                    const backgroundColor = isEmpty ? 'var(--hover-bg)' : getSubjectColor(subject.colorIndex);
                    const borderColor = isEmpty ? 'var(--border-color)' : 'var(--text-primary)';

                    return (
                      <div
                        key={slot.period}
                        style={{
                          background: backgroundColor,
                          border: `1px solid ${borderColor}`,
                          borderRadius: '4px',
                          padding: isEmpty ? '4px 7px' : (isCurrentClass ? '7px 7px' : '5px 7px'),
                          display: 'flex',
                          flexDirection: 'column',
                          gap: isEmpty ? '1px' : '2px',
                          flexShrink: 0,
                          minHeight: isEmpty ? 'auto' : (isCurrentClass ? '60px' : '52px'),
                          justifyContent: isEmpty ? 'flex-start' : 'space-between',
                          position: 'relative',
                          boxShadow: isCurrentClass ? `0 0 0 2px ${borderColor}40, 0 2px 8px ${borderColor}30` : undefined,
                        }}
                      >
                        {isCurrentClass && (
                          <div style={{ position: 'absolute', right: '8px', top: '8px', zIndex: 2 }}>
                            <div style={{
                              padding: '2px 6px', borderRadius: '4px', background: 'var(--card-bg)',
                              border: '1px solid var(--border-color)', color: 'var(--text-primary)',
                              fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1,
                              textTransform: 'uppercase', boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                            }}>
                              NOW
                            </div>
                          </div>
                        )}

                        <div style={{ marginBottom: isEmpty ? '0px' : '2px' }}>
                          <div style={{
                            fontSize: isEmpty ? '9px' : '11px',
                            fontWeight: isEmpty ? 500 : 700,
                            color: isEmpty ? 'var(--text-tertiary)' : '#212529',
                            lineHeight: isEmpty ? '1.1' : '1.2',
                            letterSpacing: isEmpty ? 'normal' : '0.3px',
                          }}>
                            {slot.time}
                          </div>
                        </div>

                        {isEmpty ? (
                          <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-tertiary)', fontStyle: 'italic', lineHeight: '1.15' }}>
                            Free Hour
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: '12px', fontWeight: 600, color: '#212529', marginBottom: '2px', lineHeight: '1.15' }}>
                              {subject.name}{cell.isLab ? ' (LAB)' : ''}
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(0,0,0,0.6)', fontWeight: 500, lineHeight: '1.1' }}>
                              {cell.code} &bull; {cell.room || subject.room || 'LH-11'}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
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
