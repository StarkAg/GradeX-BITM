import React, { useState, useEffect } from 'react';
import { getSubjects, addSubject, removeSubject, saveSubjects, getSubjectColor, DEFAULT_SUBJECTS } from '../lib/subjects';
import ConfirmModal from './ConfirmModal';

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

// Default timetable
const DEFAULT_TIMETABLE = {
  'Monday': [{ code: 'OB' }, { code: 'MM' }, { code: 'BE' }, { code: 'EI' }, { code: 'QDA', room: 'LH-02' }, null, null, null, null],
  'Tuesday': [{ code: 'WAB', room: 'LAB IIIB', isLab: true }, { code: 'WAB', room: 'LAB IIIB', isLab: true }, { code: 'BE' }, { code: 'PSCW', room: 'Lab', isLab: true }, { code: 'PSCW', room: 'LH-02', isLab: true }, null, null, null, null],
  'Wednesday': [{ code: 'EI' }, { code: 'OB' }, { code: 'BE' }, { code: 'MM' }, { code: 'MM', room: 'LH-02' }, null, null, null, null],
  'Thursday': [{ code: 'QDA' }, { code: 'QDA', room: 'LAB IIIB', isLab: true }, { code: 'PSCW' }, { code: 'OB' }, null, null, null, null, null],
  'Friday': [{ code: 'WAB' }, { code: 'MM' }, { code: 'WAB' }, { code: 'QDA' }, null, null, null, null, null],
};

export default function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [timetable, setTimetable] = useState(() => {
    const saved = localStorage.getItem('gradex_timetable');
    return saved ? JSON.parse(saved) : DEFAULT_TIMETABLE;
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', code: '', room: 'LH-11', isLab: false, schedule: {} });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, code: null });
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    setSubjects(getSubjects());
    const handleUpdate = () => setSubjects(getSubjects());
    window.addEventListener('subjectsUpdated', handleUpdate);
    return () => window.removeEventListener('subjectsUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    localStorage.setItem('gradex_timetable', JSON.stringify(timetable));
  }, [timetable]);

  const toggleScheduleSlot = (day, slotIndex) => {
    setNewSubject(prev => {
      const schedule = { ...prev.schedule };
      const key = `${day}-${slotIndex}`;
      if (schedule[key]) delete schedule[key];
      else schedule[key] = true;
      return { ...prev, schedule };
    });
  };

  const handleAddSubject = () => {
    if (!newSubject.name.trim()) return;
    const code = newSubject.code.trim() || newSubject.name.split(' ').map(w => w[0]).join('').toUpperCase();
    
    addSubject({ name: newSubject.name.trim(), code, room: newSubject.room || 'LH-11' });
    
    // Add to timetable
    const newTimetable = { ...timetable };
    Object.keys(newSubject.schedule).forEach(key => {
      const [day, slotIndex] = key.split('-');
      if (!newTimetable[day]) newTimetable[day] = Array(9).fill(null);
      newTimetable[day][parseInt(slotIndex)] = { code, room: newSubject.room || 'LH-11', isLab: newSubject.isLab };
    });
    setTimetable(newTimetable);
    
    setNewSubject({ name: '', code: '', room: 'LH-11', isLab: false, schedule: {} });
    setShowAddModal(false);
  };

  const handleDeleteSubject = (code) => {
    setDeleteConfirm({ open: true, code });
  };

  const confirmDelete = () => {
    if (deleteConfirm.code) {
      removeSubject(deleteConfirm.code);
      const newTimetable = { ...timetable };
      DAYS.forEach(day => {
        if (newTimetable[day]) {
          newTimetable[day] = newTimetable[day].map(cell => cell?.code === deleteConfirm.code ? null : cell);
        }
      });
      setTimetable(newTimetable);
    }
    setDeleteConfirm({ open: false, code: null });
  };

  const handleReset = () => {
    setResetConfirm(true);
  };

  const confirmReset = () => {
    saveSubjects([...DEFAULT_SUBJECTS]);
    setTimetable(DEFAULT_TIMETABLE);
    localStorage.setItem('gradex_timetable', JSON.stringify(DEFAULT_TIMETABLE));
    setResetConfirm(false);
  };

  return (
    <div style={{ width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Subject Management</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>{subjects.length} subjects • Shared across Timetable & Attendance</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={handleReset} style={{ padding: '10px 16px', fontSize: '13px', fontWeight: 500, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer' }}>Reset</button>
          <button onClick={() => setShowAddModal(true)} style={{ padding: '10px 20px', fontSize: '13px', fontWeight: 500, border: 'none', background: 'var(--text-primary)', color: 'var(--bg-primary)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Subject
          </button>
        </div>
      </div>

      <div style={{ padding: '12px 16px', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        Subjects added here appear in both <strong style={{ color: 'var(--text-primary)' }}>Schedule</strong> and <strong style={{ color: 'var(--text-primary)' }}>Attendance</strong>.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {subjects.map((subject, idx) => (
          <div key={subject.code} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: getSubjectColor(idx), display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', color: '#000', flexShrink: 0 }}>{subject.code}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subject.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>{subject.room}</p>
            </div>
            <button onClick={() => handleDeleteSubject(subject.code)} style={{ padding: '8px', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }} title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        ))}
      </div>

      {subjects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>No Subjects</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>Add subjects to manage your timetable and attendance.</p>
          <button onClick={() => setShowAddModal(true)} style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 500, border: 'none', background: 'var(--text-primary)', color: 'var(--bg-primary)', borderRadius: '8px', cursor: 'pointer' }}>Add Your First Subject</button>
        </div>
      )}

      {/* Add Subject Modal with Schedule */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', overflowY: 'auto' }} onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '700px', border: '1px solid var(--border-color)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 20px 0' }}>Add New Subject</h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Subject Name *</label>
                <input type="text" value={newSubject.name} onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g., Data Structures" style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Code</label>
                <input type="text" value={newSubject.code} onChange={(e) => setNewSubject(prev => ({ ...prev, code: e.target.value.toUpperCase() }))} placeholder="e.g., DS" style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 480 ? '1fr' : '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Room</label>
                <input type="text" value={newSubject.room} onChange={(e) => setNewSubject(prev => ({ ...prev, room: e.target.value }))} placeholder="e.g., LH-11" style={{ width: '100%', padding: '10px 12px', fontSize: '14px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%', boxSizing: 'border-box' }}>
                  <input type="checkbox" checked={newSubject.isLab} onChange={(e) => setNewSubject(prev => ({ ...prev, isLab: e.target.checked }))} style={{ width: '16px', height: '16px' }} />
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Lab Session</span>
                </label>
              </div>
            </div>

            {/* Schedule Grid */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>Select Days & Time Slots</label>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '6px', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', fontWeight: 600, minWidth: '60px' }}>Day</th>
                      {TIME_SLOTS.map(slot => (
                        <th key={slot.period} style={{ padding: '6px 4px', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', fontWeight: 500, fontSize: '9px', minWidth: '55px' }}>{slot.time}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map(day => (
                      <tr key={day}>
                        <td style={{ padding: '6px', background: 'var(--hover-bg)', border: '1px solid var(--border-color)', fontWeight: 600, fontSize: '10px' }}>{day}</td>
                        {TIME_SLOTS.map((slot, slotIndex) => {
                          const isSelected = newSubject.schedule[`${day}-${slotIndex}`];
                          const existingCell = timetable[day]?.[slotIndex];
                          const isOccupied = existingCell && existingCell.code;
                          return (
                            <td key={slot.period} style={{ padding: '2px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                              <button onClick={() => !isOccupied && toggleScheduleSlot(day, slotIndex)} disabled={isOccupied} style={{ width: '100%', padding: '6px 2px', border: 'none', borderRadius: '3px', cursor: isOccupied ? 'not-allowed' : 'pointer', background: isSelected ? '#4ade80' : isOccupied ? 'var(--hover-bg)' : 'transparent', color: isSelected ? '#000' : isOccupied ? 'var(--text-tertiary)' : 'var(--text-secondary)', fontSize: '9px', transition: 'all 0.2s' }}>
                                {isOccupied ? existingCell.code : isSelected ? '✓' : '—'}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>Click empty slots to assign. Gray = occupied.</p>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px', padding: '10px', background: 'var(--hover-bg)', borderRadius: '6px' }}>Subject will be added to both Timetable and Attendance tracker.</p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '10px', fontSize: '14px', fontWeight: 500, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddSubject} disabled={!newSubject.name.trim()} style={{ flex: 1, padding: '10px', fontSize: '14px', fontWeight: 500, border: 'none', background: 'var(--text-primary)', color: 'var(--bg-primary)', borderRadius: '8px', cursor: !newSubject.name.trim() ? 'not-allowed' : 'pointer', opacity: !newSubject.name.trim() ? 0.5 : 1 }}>Add Subject</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm.open}
        title="Delete Subject"
        message="This will remove the subject from both Timetable and Attendance. This action cannot be undone."
        confirmText="Delete"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, code: null })}
      />

      <ConfirmModal
        isOpen={resetConfirm}
        title="Reset to Defaults"
        message="This will replace all your subjects and timetable with the default BBA II A schedule. Your current data will be lost."
        confirmText="Reset"
        isDanger={true}
        onConfirm={confirmReset}
        onCancel={() => setResetConfirm(false)}
      />
    </div>
  );
}
