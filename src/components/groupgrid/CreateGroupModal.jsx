import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../../lib/supabase';

export default function CreateGroupModal({ formation, editingGroup, existingGroupsCount, existingGroupNumbers = [], onClose, onSuccess }) {
  const [groupNumber, setGroupNumber] = useState(editingGroup ? null : (existingGroupsCount || 0) + 1);
  const [title, setTitle] = useState(editingGroup?.title || '');
  const [members, setMembers] = useState([]); // Array of { registration_number, name }
  const [memberInput, setMemberInput] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [showMemberDropdown, setShowMemberDropdown] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch students from the formation's section
  useEffect(() => {
    const fetchStudents = async () => {
      // Use formation section_name, or fallback to P2
      const sectionName = formation?.section_name || 'P2';
      
      if (!formation) {
        console.warn('Formation not available, using P2 as fallback');
      }

      try {
        setLoadingStudents(true);
        console.log('Fetching students for section:', sectionName);
        const response = await fetch(`/api/groupgrid?action=get-students&section_name=${encodeURIComponent(sectionName)}`);
        const data = await response.json();
        
        console.log('Students API response:', data);
        
        if (data.status === 'ok') {
          setStudents(data.students || []);
          console.log(`Loaded ${data.students?.length || 0} students`);
        } else {
          console.error('Failed to fetch students:', data.error);
          setError(`Failed to load students: ${data.error}`);
        }
      } catch (error) {
        console.error('Failed to fetch students:', error);
        setError(`Failed to load students: ${error.message}`);
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [formation]);

  // Load editing group data when editingGroup changes
  useEffect(() => {
    if (editingGroup && editingGroup.student_members) {
      // Use group_number and title separately (not extracted from title)
      setGroupNumber(editingGroup.group_number || null);
      setTitle(editingGroup.title || ''); // Title is already just the custom part
      setMembers(editingGroup.student_members.map(m => ({
        registration_number: m.registration_number,
        name: m.name
      })));
    } else if (!editingGroup) {
      // Reset form when not editing
      setGroupNumber((existingGroupsCount || 0) + 1);
      setTitle('');
      setMembers([]);
    }
  }, [editingGroup, existingGroupsCount]);

  // Filter students based on search (by registration number or name)
  const filteredStudents = students.filter(student => {
    if (!memberSearch.trim()) return true;
    const searchLower = memberSearch.toLowerCase();
    const regMatch = student.registration_number.toLowerCase().includes(searchLower);
    const nameMatch = student.name.toLowerCase().includes(searchLower);
    return regMatch || nameMatch;
  }).filter(student => {
    // Exclude already added members
    return !members.some(m => m.registration_number === student.registration_number);
  });

  const handleSelectStudent = (student) => {
    // Check if already added
    if (members.some(m => m.registration_number === student.registration_number)) {
      setError('Student already added');
      setTimeout(() => setError(''), 2000);
      return;
    }

    // Check member limit
    const maxMembers = formation?.members_per_team || 3;
    if (members.length >= maxMembers) {
      setError(`Maximum ${maxMembers} members allowed per group`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    setMembers([...members, {
      registration_number: student.registration_number,
      name: student.name
    }]);
    setMemberSearch('');
    setShowMemberDropdown(false);
    setError('');
  };

  const handleRemoveMember = (index) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleGroupNumberChange = (delta) => {
    let newValue = (groupNumber || 1) + delta;
    
    // Skip existing group numbers
    if (delta > 0) {
      // Incrementing: find next available number
      while (existingGroupNumbers.includes(newValue) && newValue < 1000) {
        newValue++;
      }
    } else {
      // Decrementing: find previous available number
      while (existingGroupNumbers.includes(newValue) && newValue > 1) {
        newValue--;
      }
    }
    
    if (newValue >= 1) {
      setGroupNumber(newValue);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && filteredStudents.length > 0) {
      e.preventDefault();
      // Select first filtered student
      const maxMembers = formation?.members_per_team || 3;
      if (members.length >= maxMembers) {
        setError(`Maximum ${maxMembers} members allowed per group`);
        setTimeout(() => setError(''), 3000);
        return;
      }
      handleSelectStudent(filteredStudents[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!groupNumber || groupNumber < 1) {
      setError('Please enter a valid group number');
      return;
    }

    // Check if group number already exists (skip if editing the same group)
    if (!editingGroup && existingGroupNumbers.includes(groupNumber)) {
      setError(`Group ${groupNumber} already exists. Please choose a different number.`);
      return;
    }
    
    // If editing, check if the new number conflicts with another group
    if (editingGroup) {
      // Use group_number directly (not extracted from title)
      const currentGroupNumber = editingGroup.group_number || null;
      
      if (currentGroupNumber !== groupNumber && existingGroupNumbers.includes(groupNumber)) {
        setError(`Group ${groupNumber} already exists. Please choose a different number.`);
        return;
      }
    }

    if (members.length === 0) {
      setError('Please add at least one member');
      return;
    }

    try {
      setLoading(true);
      const currentUser = await getCurrentUser();

      // Create or update the group
      const url = editingGroup 
        ? '/api/groupgrid?action=update-group'
        : '/api/groupgrid?action=create-group';
      
      // Send group_number and title separately (not combined)
      // title should only contain the custom title, not "Group X" prefix
      const customTitle = title.trim() || null;

      const body = editingGroup
        ? {
            group_id: editingGroup.id,
            group_number: groupNumber || null,
            title: customTitle,
            members: members
          }
        : {
            formation_id: formation.id,
            group_number: groupNumber || null,
            title: customTitle,
            creator_id: currentUser?.id || null, // Optional - will generate anonymous ID if null
            members: members
          };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.status === 'ok') {
        onSuccess();
        onClose();
      } else {
        setError(data.error || (editingGroup ? 'Failed to update group' : 'Failed to create group'));
      }
    } catch (error) {
      console.error(`Failed to ${editingGroup ? 'update' : 'create'} group:`, error);
      setError(`Failed to ${editingGroup ? 'update' : 'create'} group. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(5px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px 8px 80px 8px' : '20px',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
      onClick={onClose}
    >
      <div
        className="groupgrid-card"
        style={{
          maxWidth: isMobile ? '100%' : '500px',
          width: '100%',
          maxHeight: isMobile ? 'calc(100vh - 60px)' : '90vh',
          marginTop: isMobile ? '0' : 0,
          marginBottom: isMobile ? '10px' : 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
          padding: isMobile ? '12px' : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button in corner */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: isMobile ? '8px' : '16px',
            right: isMobile ? '8px' : '16px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '50%',
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isMobile ? '20px' : '24px',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '0',
            lineHeight: 1,
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          &times;
        </button>
        <div className="groupgrid-card-header" style={{ 
          marginBottom: isMobile ? '12px' : '20px',
          paddingRight: isMobile ? '36px' : '40px',
        }}>
          <h4 style={{ fontSize: isMobile ? '16px' : '20px', margin: 0 }}>{editingGroup ? 'Edit Group' : 'Create a New Group'}</h4>
        </div>

        <form className="groupgrid-form" onSubmit={handleSubmit}>
          <label className="groupgrid-field">
            <span>Group Number *</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handleGroupNumberChange(-1)}
                disabled={!groupNumber || groupNumber <= 1}
                style={{
                  background: 'var(--hover-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (!groupNumber || groupNumber <= 1) ? 'not-allowed' : 'pointer',
                  opacity: (!groupNumber || groupNumber <= 1) ? 0.5 : 1,
                  color: 'var(--text-primary)',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                ←
              </button>
              <input
                type="number"
                className="groupgrid-input"
                value={groupNumber || ''}
                readOnly
                onKeyDown={(e) => {
                  // Prevent typing - only allow arrow keys, tab, and enter
                  if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown' && e.key !== 'Tab' && e.key !== 'Enter') {
                    e.preventDefault();
                  }
                }}
                placeholder="Use arrows to change"
                min="1"
                required
                style={{ flex: 1, textAlign: 'center', cursor: 'default' }}
              />
              <button
                type="button"
                onClick={() => handleGroupNumberChange(1)}
                style={{
                  background: 'var(--hover-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '18px',
                  fontWeight: 'bold'
                }}
              >
                →
              </button>
            </div>
          </label>

          <label className="groupgrid-field" style={{ marginTop: '20px' }}>
            <span>Group Title (Optional)</span>
            <input
              type="text"
              className="groupgrid-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter custom title (e.g., Team Alpha)"
            />
          </label>

          <label className="groupgrid-field" style={{ marginTop: '20px', position: 'relative' }}>
            <span>Add Members (Max: {formation?.members_per_team || 3})</span>
            <div style={{ position: 'relative', marginTop: '8px' }}>
              <input
                type="text"
                className="groupgrid-input"
                value={memberSearch}
                onChange={(e) => {
                  const value = e.target.value;
                  setMemberSearch(value);
                  setShowMemberDropdown(true);
                }}
                onFocus={() => {
                  if (!loadingStudents) {
                    setShowMemberDropdown(true);
                  }
                }}
                onBlur={() => setTimeout(() => setShowMemberDropdown(false), 200)}
                onKeyPress={handleKeyPress}
                placeholder={loadingStudents ? 'Loading students...' : 'Type RA number or name to search...'}
                style={{ width: '100%' }}
                disabled={loadingStudents}
              />
              {showMemberDropdown && filteredStudents.length > 0 && !loadingStudents && members.length < (formation?.members_per_team || 3) && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    opacity: 1
                  }}
                >
                  {filteredStudents.map(student => {
                    // Check if the CURRENT student is "Harsh Agarwal" (case-insensitive)
                    const isHarshAgarwal = student.name && student.name.toLowerCase().includes('harsh agarwal');
                    
                    return (
                    <div
                      key={student.id}
                      onClick={() => handleSelectStudent(student)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        border: isHarshAgarwal ? '1px solid #998100' : 'none',
                        borderBottom: isHarshAgarwal ? '1px solid #998100' : '1px solid var(--border-color)',
                        borderRadius: isHarshAgarwal ? '4px' : '0',
                        margin: isHarshAgarwal ? '2px 4px' : '0',
                        color: 'var(--text-primary)',
                        transition: 'background 0.2s ease',
                        background: 'var(--bg-primary)',
                        opacity: 1
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--hover-bg)';
                        e.currentTarget.style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--bg-primary)';
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      <div style={{ fontWeight: '500' }}>{student.registration_number}</div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: 'var(--text-secondary)', 
                        marginTop: '2px'
                      }}>
                        {student.name}
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
              {showMemberDropdown && filteredStudents.length === 0 && memberSearch.trim() && !loadingStudents && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    zIndex: 1000,
                    color: 'var(--text-secondary)',
                    fontSize: '14px'
                  }}
                >
                  {students.length === 0 ? 'No students loaded. Check console for errors.' : 'No matching students found'}
                </div>
              )}
              {loadingStudents && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    zIndex: 1000,
                    color: 'var(--text-secondary)',
                    fontSize: '14px'
                  }}
                >
                  Loading students...
                </div>
              )}
            </div>
            {members.length >= (formation?.members_per_team || 3) && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '6px',
                  color: '#ef4444',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>Maximum {formation?.members_per_team || 3} members reached. Remove a member to add another.</span>
              </div>
            )}
          </label>

          {members.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ 
                fontSize: '14px', 
                color: 'var(--text-secondary)',
                marginBottom: '8px'
              }}>
                Members ({members.length}):
              </div>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px',
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {members.map((member, index) => {
                  // Check if the CURRENT member is "Harsh Agarwal" (case-insensitive)
                  const isHarshAgarwal = member.name && member.name.toLowerCase().includes('harsh agarwal');
                  const borderColor = isHarshAgarwal ? '#998100' : 'var(--border-color)';
                  
                  return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--hover-bg)',
                      borderRadius: '6px',
                      border: `1px solid ${borderColor}`
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '500' }}>{member.registration_number}</div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'var(--text-secondary)', 
                        marginTop: '2px'
                      }}>
                        {member.name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        fontSize: '18px',
                        lineHeight: 1
                      }}
                    >
                      &times;
                    </button>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div 
              className="groupgrid-error" 
              style={{ 
                marginTop: '12px',
                padding: '12px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="groupgrid-form-actions" style={{ 
            marginTop: isMobile ? '16px' : '20px',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '10px' : undefined,
          }}>
            <button
              type="button"
              className="groupgrid-secondary"
              onClick={onClose}
              disabled={loading}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: isMobile ? '12px' : undefined,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="groupgrid-button"
              disabled={loading || members.length === 0 || members.length > (formation?.members_per_team || 3)}
            >
              {loading ? (editingGroup ? 'Updating...' : 'Creating...') : (editingGroup ? 'Update Group' : 'Create Group')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

