import React, { useState, useEffect } from 'react';

export default function CreateFormationModal({ currentUser, onClose, onSuccess }) {
  const [sections, setSections] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
  
  // Search states
  const [sectionSearch, setSectionSearch] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');
  const [showSectionDropdown, setShowSectionDropdown] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    section_id: '',
    section_name: '',
    subject_id: '',
    subject_name: '',
    members_per_team: 3,
    include_title: true,
    include_group_titles: true,
    include_contact_number: false,
    include_email: false
  });

  // Fetch subjects (optionally filtered by section if provided)
  const fetchSubjects = async (sectionId = null) => {
    try {
      setLoading(true);
      const url = sectionId 
        ? `/api/groupgrid?action=get-subjects&section_id=${sectionId}`
        : '/api/groupgrid?action=get-subjects';
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'ok') {
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
      setError('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  // Fetch sections on mount
  useEffect(() => {
    fetchSections();
  }, []);

  // Fetch all subjects on mount (no section dependency)
  useEffect(() => {
    fetchSubjects();
  }, []);

  // Filter sections based on search
  const filteredSections = sections.filter(section =>
    section.name.toLowerCase().includes(sectionSearch.toLowerCase())
  );

  // Filter subjects based on search
  const filteredSubjects = subjects.filter(subject =>
    subject.name.toLowerCase().includes(subjectSearch.toLowerCase())
  );

  const fetchSections = async () => {
    try {
      const response = await fetch('/api/groupgrid?action=get-sections');
      const data = await response.json();
      
      if (data.status === 'ok') {
        setSections(data.sections || []);
      }
    } catch (error) {
      console.error('Failed to fetch sections:', error);
      setError('Failed to load sections');
    }
  };


  const handleMembersChange = (delta) => {
    setFormData(prev => {
      const newValue = prev.members_per_team + delta;
      if (newValue >= 2 && newValue <= 8) {
        return { ...prev, members_per_team: newValue };
      }
      return prev;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation - section_name and subject_name are required (can be custom typed or selected)
    if (!formData.section_id && !formData.section_name) {
      setError('Please select or enter section');
      return;
    }
    
    if (!formData.subject_name) {
      setError('Please enter or select subject');
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch('/api/groupgrid?action=create-formation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: formData.section_id || null,
          section_name: formData.section_name || null,
          subject_id: formData.subject_id || null,
          subject_name: formData.subject_name || null,
          members_per_team: formData.members_per_team,
          include_title: formData.include_title,
          created_by: currentUser?.id || null // Optional - will generate anonymous ID if null
        })
      });

      const data = await response.json();

      if (data.status === 'ok') {
        // Show success message with formation code
        if (data.formation && data.formation.formation_code) {
          alert(`Formation created successfully!\n\nFormation Code: ${data.formation.formation_code}\n\nShare this code with students to join the formation.`);
        }
        onSuccess();
      } else {
        setError(data.error || 'Failed to create formation');
      }
    } catch (error) {
      console.error('Failed to create formation:', error);
      setError('Failed to create formation. Please try again.');
    } finally {
      setSubmitting(false);
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
          <h4 style={{ fontSize: isMobile ? '16px' : '20px', margin: 0 }}>Create Group Formation</h4>
        </div>

        <form className="groupgrid-form" onSubmit={handleSubmit}>
          {/* Section Searchable Dropdown */}
          <label className="groupgrid-field" style={{ position: 'relative', marginBottom: isMobile ? '12px' : undefined }}>
            <span style={{ fontSize: isMobile ? '13px' : undefined }}>Section *</span>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="groupgrid-select"
                placeholder="Type to search section..."
                value={formData.section_id && !sectionSearch ? formData.section_name : (sectionSearch || formData.section_name || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  setSectionSearch(value);
                  setShowSectionDropdown(true);
                  // Allow custom typing - update section_name directly
                  setFormData(prev => ({ 
                    ...prev, 
                    section_id: '', // Clear ID when typing custom
                    section_name: value 
                  }));
                }}
                onFocus={() => {
                  setShowSectionDropdown(true);
                  // Clear the search when focusing if something is selected from database
                  if (formData.section_id) {
                    setSectionSearch('');
                  }
                }}
                onBlur={() => setTimeout(() => setShowSectionDropdown(false), 200)}
                onKeyDown={(e) => {
                  // Allow backspace to work properly
                  if (e.key === 'Backspace' && formData.section_id && !sectionSearch) {
                    setFormData(prev => ({ ...prev, section_id: '', section_name: '' }));
                    setSectionSearch('');
                  }
                  // Allow Enter to accept custom typed value
                  if (e.key === 'Enter' && sectionSearch && !formData.section_id) {
                    e.preventDefault();
                    setFormData(prev => ({ ...prev, section_name: sectionSearch }));
                    setShowSectionDropdown(false);
                  }
                }}
                required
                style={{ width: '100%' }}
              />
              {showSectionDropdown && filteredSections.length > 0 && (
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
                    maxHeight: isMobile ? '150px' : '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    opacity: 1
                  }}
                >
                  {filteredSections.map(section => (
                    <div
                      key={section.id}
                      onClick={() => {
                        setFormData(prev => ({ 
                          ...prev, 
                          section_id: section.id, 
                          section_name: section.name
                        }));
                        setSectionSearch('');
                        setShowSectionDropdown(false);
                      }}
                      style={{
                        padding: isMobile ? '10px 12px' : '12px 16px',
                        fontSize: isMobile ? '13px' : undefined,
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)',
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
                      {section.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </label>

          {/* Subject Searchable Dropdown */}
          <label className="groupgrid-field" style={{ position: 'relative' }}>
            <span>Subject *</span>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="groupgrid-select"
                placeholder={loading ? 'Loading...' : 'Type to search subject...'}
                value={formData.subject_id && !subjectSearch ? formData.subject_name : (subjectSearch || formData.subject_name || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  setSubjectSearch(value);
                  setShowSubjectDropdown(true);
                  // Allow custom typing - update subject_name directly
                  setFormData(prev => ({ 
                    ...prev, 
                    subject_id: '', // Clear ID when typing custom
                    subject_name: value 
                  }));
                }}
                onFocus={() => {
                  if (!loading) {
                    setShowSubjectDropdown(true);
                    // Clear the search when focusing if something is selected
                    if (formData.subject_id) {
                      setSubjectSearch('');
                    }
                  }
                }}
                onBlur={() => setTimeout(() => setShowSubjectDropdown(false), 200)}
                onKeyDown={(e) => {
                  // Allow backspace to work properly
                  if (e.key === 'Backspace' && formData.subject_id && !subjectSearch) {
                    setFormData(prev => ({ ...prev, subject_id: '', subject_name: '' }));
                    setSubjectSearch('');
                  }
                  // Allow Enter to accept custom typed value
                  if (e.key === 'Enter' && subjectSearch && !formData.subject_id) {
                    e.preventDefault();
                    setFormData(prev => ({ ...prev, subject_name: subjectSearch }));
                    setShowSubjectDropdown(false);
                  }
                }}
                required
                disabled={loading}
                style={{ width: '100%' }}
              />
              {showSubjectDropdown && filteredSubjects.length > 0 && !loading && (
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
                  {filteredSubjects.map(subject => (
                    <div
                      key={subject.id}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, subject_id: subject.id, subject_name: subject.name }));
                        setSubjectSearch(subject.name);
                        setShowSubjectDropdown(false);
                      }}
                      style={{
                        padding: isMobile ? '10px 12px' : '12px 16px',
                        fontSize: isMobile ? '13px' : undefined,
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--border-color)',
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
                      {subject.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </label>

          {/* Members per Team */}
          <label className="groupgrid-field" style={{ marginBottom: isMobile ? '12px' : undefined }}>
            <span style={{ fontSize: isMobile ? '13px' : undefined, marginBottom: isMobile ? '6px' : undefined, display: 'block' }}>Members per Team</span>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? '8px' : '12px',
              width: '100%',
            }}>
              <button
                type="button"
                className="groupgrid-secondary"
                onClick={() => handleMembersChange(-1)}
                disabled={formData.members_per_team <= 2}
                style={{ 
                  padding: isMobile ? '10px 12px' : '8px 16px', 
                  minWidth: isMobile ? '44px' : '50px',
                  width: isMobile ? '44px' : 'auto',
                  fontSize: isMobile ? '18px' : '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ←
              </button>
              <div
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: isMobile ? '20px' : '24px',
                  fontWeight: 700,
                  padding: isMobile ? '10px 8px' : '12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  minWidth: isMobile ? '50px' : 'auto',
                }}
              >
                {formData.members_per_team}
              </div>
              <button
                type="button"
                className="groupgrid-secondary"
                onClick={() => handleMembersChange(1)}
                disabled={formData.members_per_team >= 8}
                style={{ 
                  padding: isMobile ? '10px 12px' : '8px 16px', 
                  minWidth: isMobile ? '44px' : '50px',
                  width: isMobile ? '44px' : 'auto',
                  fontSize: isMobile ? '18px' : '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                →
              </button>
            </div>
          </label>

          {/* Options Section */}
          <div className="groupgrid-field">
            <span style={{ 
              marginBottom: isMobile ? '8px' : '12px', 
              display: 'block', 
              fontWeight: 500,
              fontSize: isMobile ? '13px' : undefined,
            }}>Options</span>
            
            <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
              <input
                type="checkbox"
                checked={formData.include_group_titles}
                onChange={(e) => setFormData(prev => ({ ...prev, include_group_titles: e.target.checked }))}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>Group Titles</span>
            </label>

            <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '12px' }}>
              <input
                type="checkbox"
                checked={formData.include_contact_number}
                onChange={(e) => setFormData(prev => ({ ...prev, include_contact_number: e.target.checked }))}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>Contact Number</span>
            </label>

            <label style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.include_email}
                onChange={(e) => setFormData(prev => ({ ...prev, include_email: e.target.checked }))}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <span>Email</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="groupgrid-error">{error}</div>
          )}

          {/* Form Actions */}
          <div className="groupgrid-form-actions" style={{
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '10px' : undefined,
          }}>
            <button
              type="button"
              className="groupgrid-secondary"
              onClick={onClose}
              disabled={submitting}
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
              disabled={submitting || (!formData.section_id && !formData.section_name) || !formData.subject_name}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: isMobile ? '12px' : undefined,
              }}
            >
              {submitting ? 'Creating...' : 'Create Formation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

