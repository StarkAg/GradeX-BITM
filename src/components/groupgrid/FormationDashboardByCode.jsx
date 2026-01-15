import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FormationDashboard from './FormationDashboard';

/**
 * Component that loads formation dashboard from URL code parameter
 * Route: /groupgrid/:code
 */
export default function FormationDashboardByCode() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [formation, setFormation] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchFormation = async () => {
      if (!code) {
        setError('Formation code is required');
        setLoading(false);
        return;
      }

      // Validate code format (8 alphanumeric characters)
      const normalizedCode = code.toUpperCase().trim();
      if (!/^[A-Z0-9]{8}$/.test(normalizedCode)) {
        // If it's not a valid 8-character code, it might be a section-subject path
        // Check if it contains hyphens (section-subject format)
        if (code.includes('-')) {
          // It's likely a section-subject path, redirect to FormationDetail
          window.location.href = `/groupgrid/${code}`;
          return;
        }
        setError('Invalid formation code format. Code must be 8 alphanumeric characters.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`/api/groupgrid?action=get-formation-by-code&code=${encodeURIComponent(normalizedCode)}`);
        const data = await response.json();

        if (data.status === 'ok') {
          setFormation(data.formation);
          setGroups(data.groups);
        } else {
          setError(data.error || 'Formation not found');
        }
      } catch (error) {
        console.error('Failed to fetch formation:', error);
        setError('Failed to load formation. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchFormation();
  }, [code]);

  const handleClose = () => {
    navigate('/groupgrid');
  };

  if (loading) {
    return (
      <div className="groupgrid-shell">
        <div className="groupgrid-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ marginBottom: '20px' }}>Loading formation...</div>
        </div>
      </div>
    );
  }

  if (error || !formation) {
    return (
      <div className="groupgrid-shell">
        <div className="groupgrid-card" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ marginBottom: '24px' }}>
            <svg 
              width="64" 
              height="64" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="var(--text-tertiary)" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ margin: '0 auto 20px' }}
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h2 style={{ 
              fontSize: '24px', 
              fontWeight: 600, 
              margin: '0 0 12px 0',
              color: 'var(--text-primary)'
            }}>
              Formation Not Found
            </h2>
            <p style={{ 
              fontSize: '16px', 
              color: 'var(--text-secondary)',
              margin: '0 0 8px 0',
              lineHeight: '1.6'
            }}>
              {error || `The formation code "${code?.toUpperCase()}" doesn't exist or may have been removed.`}
            </p>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--text-tertiary)',
              margin: 0,
              lineHeight: '1.5'
            }}>
              Please check the code and try again, or create a new formation.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="groupgrid-button" 
              onClick={handleClose}
              style={{ minWidth: '160px' }}
            >
              Back to GroupGrid
            </button>
            <button 
              className="groupgrid-secondary" 
              onClick={() => window.location.reload()}
              style={{ minWidth: '120px' }}
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <FormationDashboard formation={formation} groups={groups} onClose={handleClose} />;
}

