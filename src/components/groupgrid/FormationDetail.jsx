import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, getCurrentUser } from '../../lib/supabase';

export default function FormationDetail() {
  const { path } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formation, setFormation] = useState(null);
  const [groups, setGroups] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);

  // Extract section and subject from URL path
  // URL format: /groupgrid/(Section)-(Subject)
  // Example: /groupgrid/Computer-Science-Machine-Learning
  // We split by the last hyphen to separate section and subject
  const getSectionAndSubject = () => {
    if (!path) return { section: '', subject: '' };
    
    const decoded = decodeURIComponent(path);
    // Find the last hyphen that separates section and subject
    // Format: (Section)-(Subject) where both can contain hyphens
    // We'll split by looking for a pattern or use the last hyphen
    const lastHyphenIndex = decoded.lastIndexOf('-');
    
    if (lastHyphenIndex === -1) {
      // No hyphen found, treat entire path as section
      return { section: decoded, subject: '' };
    }
    
    // Split at the last hyphen
    const sectionPart = decoded.substring(0, lastHyphenIndex).replace(/-/g, ' ');
    const subjectPart = decoded.substring(lastHyphenIndex + 1).replace(/-/g, ' ');
    
    return {
      section: sectionPart,
      subject: subjectPart
    };
  };

  const { section: sectionName, subject: subjectName } = getSectionAndSubject();

  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (sectionName && subjectName) {
      fetchFormationData();
    }
  }, [sectionName, subjectName]);

  const fetchFormationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get section and subject IDs
      const sectionsRes = await fetch('/api/groupgrid?action=get-sections');
      const sectionsData = await sectionsRes.json();
      const sectionObj = sectionsData.sections?.find(s => 
        s.name.toLowerCase() === sectionName.toLowerCase()
      );

      if (!sectionObj) {
        setError(`Section "${sectionName}" not found`);
        setLoading(false);
        return;
      }

      // Get subjects (all subjects, then filter)
      const subjectsRes = await fetch('/api/groupgrid?action=get-subjects');
      const subjectsData = await subjectsRes.json();
      const subjectObj = subjectsData.subjects?.find(s => 
        s.name.toLowerCase() === subjectName.toLowerCase() &&
        (s.section_id === sectionObj.id || !s.section_id) // Match section or allow subjects without section
      );

      if (!subjectObj) {
        // If subject not found in DB, it might be a custom subject
        // We'll search for formations with this custom subject name
        const formationsRes = await fetch('/api/groupgrid?action=get-formations');
        const formationsData = await formationsRes.json();
        
        if (formationsData.status === 'ok') {
          const matchingFormation = formationsData.formations?.find(f => 
            f.section_id === sectionObj.id && 
            f.subject_name?.toLowerCase() === subjectName.toLowerCase()
          );
          
          if (matchingFormation) {
            setFormation(matchingFormation);
            fetchGroups(matchingFormation.id);
            setLoading(false);
            return;
          }
        }
        
        setError(`Subject "${subjectName}" not found for section "${sectionName}"`);
        setLoading(false);
        return;
      }

      // Find formation by section_id and subject_id
      const formationsRes = await fetch('/api/groupgrid?action=get-formations');
      const formationsData = await formationsRes.json();
      
      if (formationsData.status === 'ok') {
        const matchingFormation = formationsData.formations?.find(f => 
          f.section_id === sectionObj.id && 
          (f.subject_id === subjectObj.id || f.subject_name?.toLowerCase() === subjectName.toLowerCase())
        );
        
        if (matchingFormation) {
          setFormation(matchingFormation);
          fetchGroups(matchingFormation.id);
        } else {
          setError(`No formation found for ${sectionName} - ${subjectName}`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch formation data:', error);
      setError('Failed to load formation data');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async (formationId) => {
    try {
      // This would need to be implemented in the API
      // For now, we'll show a placeholder
      setGroups([]);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  };

  if (loading) {
    return (
      <div className="groupgrid-shell">
        <div className="groupgrid-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '16px', color: 'var(--text-secondary)' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="groupgrid-shell">
        <div className="groupgrid-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="groupgrid-error" style={{ marginBottom: '20px' }}>{error}</div>
          <button className="groupgrid-button" onClick={() => navigate('/groupgrid')}>
            Back to GroupGrid
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="groupgrid-shell">
      <div className="groupgrid-hero">
        <div>
          <h2>{sectionName} - {subjectName}</h2>
          <h3 className="groupgrid-hero-subtitle">Group Formation Details</h3>
        </div>
        <button
          className="groupgrid-secondary"
          onClick={() => navigate('/groupgrid')}
          style={{ marginTop: '20px' }}
        >
          ← Back to GroupGrid
        </button>
      </div>

      {formation && (
        <div className="groupgrid-card" style={{ marginTop: '20px' }}>
          <div className="groupgrid-card-header">
            <h4>Formation Information</h4>
          </div>
          <div style={{ padding: '20px' }}>
            <p><strong>Section:</strong> {sectionName}</p>
            <p><strong>Subject:</strong> {subjectName}</p>
            <p><strong>Members per Team:</strong> {formation.members_per_team}</p>
            <p><strong>Status:</strong> {formation.status}</p>
          </div>
        </div>
      )}

      <div className="groupgrid-card" style={{ marginTop: '20px' }}>
        <div className="groupgrid-card-header">
          <h4>Groups</h4>
        </div>
        <div style={{ padding: '20px' }}>
          {groups.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>No groups formed yet.</p>
          ) : (
            <div>
              {/* Groups list will be displayed here */}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

