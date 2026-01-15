import React, { useState, useEffect } from 'react';
import { supabase, getCurrentUser } from '../lib/supabase';
import CreateFormationModal from './groupgrid/CreateFormationModal';
import JoinFormationModal from './groupgrid/JoinFormationModal';
import CodeEntryModal from './groupgrid/CodeEntryModal';
import FormationDashboard from './groupgrid/FormationDashboard';

// Error Boundary Component
class GroupGridErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('GroupGrid Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="groupgrid-shell">
          <div className="groupgrid-card" style={{ textAlign: 'center', padding: '40px' }}>
            <div className="groupgrid-error" style={{ marginBottom: '20px' }}>
              Something went wrong. Please refresh the page.
            </div>
            <button className="groupgrid-button" onClick={() => window.location.reload()}>
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Info Badge Component (same as legacy)
function InfoBadge({ label, value, loading, wideOnMobile = false }) {
  return (
    <div className={`groupgrid-badge ${wideOnMobile ? 'groupgrid-badge-wide' : ''}`}>
      <span>{label}</span>
      {loading ? (
        <strong style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '20px' }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              animation: 'spin 1s linear infinite',
              display: 'block',
            }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </strong>
      ) : (
        <strong>{value || '—'}</strong>
      )}
    </div>
  );
}

export default function GroupGrid() {
  const [stats, setStats] = useState({
    groupsFormed: 0,
    sectionsInvolved: 0,
    totalFormations: 0,
    activeFormations: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showCodeEntryModal, setShowCodeEntryModal] = useState(false);
  const [showFormationDashboard, setShowFormationDashboard] = useState(false);
  const [currentFormation, setCurrentFormation] = useState(null);
  const [currentGroups, setCurrentGroups] = useState([]);
  const [showCreateInfo, setShowCreateInfo] = useState(false);
  const [showJoinInfo, setShowJoinInfo] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [error, setError] = useState(null);
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

  // Get current user on mount
  useEffect(() => {
    const fetchUser = async () => {
      const user = await getCurrentUser();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      setError(null);
      const response = await fetch('/api/groupgrid?action=get-stats');
      
      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type') || '';
      let data;
      
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Try to parse as JSON anyway, but catch errors
        try {
          const text = await response.text();
          // If it starts with <, it's HTML (error page)
          if (text.trim().startsWith('<')) {
            console.error('HTML response received (likely 404 or error page):', text.substring(0, 200));
            throw new Error('API endpoint returned HTML instead of JSON. The server may not be running correctly.');
          }
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          throw new Error('Server returned invalid response. Please check if the API is running.');
        }
      }

      if (!response.ok) {
        const errorMessage = data?.error || `HTTP error! status: ${response.status}`;
        console.error('API Error:', errorMessage, data);
        throw new Error(errorMessage);
      }

      if (data.status === 'ok' && data.stats) {
        setStats(data.stats);
      } else {
        console.warn('Unexpected API response:', data);
        const errorMessage = data?.error || 'Failed to load stats';
        setError(errorMessage);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Provide more helpful error message
      if (error.message.includes('JSON') || error.message.includes('Unexpected token') || error.message.includes('HTML')) {
        setError('API endpoint not available. Please check server configuration.');
      } else {
        setError(error.message || 'Failed to load stats. Please refresh the page.');
      }
    } finally {
      setStatsLoading(false);
    }
  };

  const handleCreateSuccess = () => {
    setShowCreateModal(false);
    fetchStats(); // Refresh stats
  };

  const handleJoinSuccess = () => {
    setShowJoinModal(false);
    fetchStats(); // Refresh stats
  };

  // Error boundary - prevent page crash
  if (error && !statsLoading) {
    return (
      <div className="groupgrid-shell">
        <div className="groupgrid-card" style={{ textAlign: 'center', padding: '40px' }}>
          <div className="groupgrid-error" style={{ marginBottom: '20px' }}>{error}</div>
          <button className="groupgrid-button" onClick={() => window.location.reload()}>
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <GroupGridErrorBoundary>
      <div className="groupgrid-shell" style={{
        height: !isMobile ? 'calc(100vh - 60px)' : 'auto',
        overflowY: !isMobile ? 'hidden' : 'visible',
        overflowX: 'hidden'
      }}>
      <div className="groupgrid-hero">
        <div>
          <h2>GroupGrid</h2>
          <h3 className="groupgrid-hero-subtitle">Create and Join Group Formations</h3>
        </div>
        <div className="groupgrid-status">
          <InfoBadge 
            label="Groups Formed" 
            value={stats.groupsFormed.toLocaleString()}
            loading={statsLoading}
          />
          <InfoBadge 
            label="Sections Involved" 
            value={stats.sectionsInvolved.toLocaleString()}
            loading={statsLoading}
          />
          <InfoBadge 
            label="Total Formations" 
            value={stats.totalFormations.toLocaleString()}
            loading={statsLoading}
            wideOnMobile={true}
          />
        </div>
        <div style={{
          marginTop: 'clamp(16px, 4vw, 20px)',
          textAlign: 'center',
          fontSize: 'clamp(12px, 3vw, 13px)',
          color: 'var(--text-secondary)',
          fontStyle: 'italic',
          letterSpacing: '0.02em',
        }}>
          Organize. Collaborate. Succeed.
        </div>
      </div>

      <div style={{ 
        display: 'flex', 
        gap: '24px', 
        justifyContent: 'center',
        flexWrap: 'wrap',
        marginTop: 'clamp(20px, 5vw, 30px)',
        position: 'relative',
      }}>
        {/* Create Group Formation Button */}
        <div style={{ position: 'relative' }}>
          <button
            className="groupgrid-button"
            onClick={() => {
              setShowCreateModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '20px 32px',
              position: 'relative',
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '20px',
              letterSpacing: '0.05em'
            }}
          >
            Create Group Formation
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateInfo(!showCreateInfo);
                setShowJoinInfo(false);
              }}
              style={{
                background: showCreateInfo ? 'var(--hover-bg)' : 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'help',
                padding: 0,
                color: '#000000',
                fontSize: '14px',
                fontWeight: 'bold',
                lineHeight: 1,
                transition: 'all 0.2s ease',
                marginLeft: '4px'
              }}
              onMouseEnter={(e) => {
                if (!showCreateInfo) {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.borderColor = 'var(--border-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showCreateInfo) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }
              }}
            >
              i
            </button>
          </button>
          {showCreateInfo && !isMobile && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '8px',
                padding: '12px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
                zIndex: 1000,
                maxWidth: '300px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                whiteSpace: 'normal'
              }}
            >
              Start a new group formation for your section and subject. Set team size and let students join automatically.
            </div>
          )}
        </div>

        {/* Join Group Formation Button */}
        <div style={{ position: 'relative' }}>
          <button
            className="groupgrid-button"
            onClick={() => {
              setShowCodeEntryModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '20px 32px',
              position: 'relative',
              fontFamily: 'Bebas Neue, sans-serif',
              fontSize: '20px',
              letterSpacing: '0.05em'
            }}
          >
            Join Group Formation
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowJoinInfo(!showJoinInfo);
                setShowCreateInfo(false);
              }}
              style={{
                background: showJoinInfo ? 'var(--hover-bg)' : 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'help',
                padding: 0,
                color: '#000000',
                fontSize: '14px',
                fontWeight: 'bold',
                lineHeight: 1,
                transition: 'all 0.2s ease',
                marginLeft: '4px'
              }}
              onMouseEnter={(e) => {
                if (!showJoinInfo) {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.borderColor = 'var(--border-hover)';
                }
              }}
              onMouseLeave={(e) => {
                if (!showJoinInfo) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }
              }}
            >
              i
            </button>
          </button>
          {showJoinInfo && !isMobile && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '8px',
                padding: '12px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5',
                zIndex: 1000,
                maxWidth: '300px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                whiteSpace: 'normal'
              }}
            >
              Browse active formations and join a group. You'll be automatically assigned to the group with the least members.
            </div>
          )}
        </div>
      </div>
      
      {/* Info messages container for mobile - appears below both buttons */}
      {isMobile && (showCreateInfo || showJoinInfo) && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: '1.5',
            width: '100%',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            whiteSpace: 'normal',
            textAlign: 'left',
          }}
        >
            {showCreateInfo && 'Start a new group formation for your section and subject. Set team size and let students join automatically.'}
            {showJoinInfo && "Browse active formations and join a group. You'll be automatically assigned to the group with the least members."}
        </div>
      )}

      {/* Create Formation Modal */}
      {showCreateModal && (
        <CreateFormationModal
          currentUser={currentUser}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Code Entry Modal */}
      {showCodeEntryModal && (
        <CodeEntryModal
          onClose={() => setShowCodeEntryModal(false)}
          onCodeSubmit={(formation, groups) => {
            setCurrentFormation(formation);
            setCurrentGroups(groups);
            setShowCodeEntryModal(false);
            setShowFormationDashboard(true);
          }}
        />
      )}

      {/* Formation Dashboard */}
      {showFormationDashboard && currentFormation && (
        <FormationDashboard
          formation={currentFormation}
          groups={currentGroups}
          onClose={() => {
            setShowFormationDashboard(false);
            setCurrentFormation(null);
            setCurrentGroups([]);
          }}
        />
      )}

      {/* Join Formation Modal (kept for backward compatibility) */}
      {showJoinModal && (
        <JoinFormationModal
          currentUser={currentUser}
          onClose={() => setShowJoinModal(false)}
          onSuccess={handleJoinSuccess}
        />
      )}
      </div>
    </GroupGridErrorBoundary>
  );
}

