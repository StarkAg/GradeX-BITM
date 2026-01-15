import React, { useState, useEffect } from 'react';

export default function JoinFormationModal({ currentUser, onClose, onSuccess }) {
  const [formations, setFormations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
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

  useEffect(() => {
    fetchFormations();
  }, []);

  const fetchFormations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/groupgrid?action=get-formations&status=open');
      const data = await response.json();

      if (data.status === 'ok') {
        setFormations(data.formations || []);
      } else {
        setError(data.error || 'Failed to load formations');
      }
    } catch (error) {
      console.error('Failed to fetch formations:', error);
      setError('Failed to load formations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (formationId) => {
    if (!currentUser || !currentUser.id) {
      setError('User not authenticated');
      return;
    }

    try {
      setJoining(formationId);
      setError('');

      const response = await fetch('/api/groupgrid?action=join-formation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formation_id: formationId,
          user_id: currentUser.id
        })
      });

      const data = await response.json();

      if (data.status === 'ok') {
        onSuccess();
      } else {
        setError(data.error || 'Failed to join formation');
        setJoining(null);
      }
    } catch (error) {
      console.error('Failed to join formation:', error);
      setError('Failed to join formation. Please try again.');
      setJoining(null);
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
          maxWidth: isMobile ? '100%' : '700px',
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
          <h4 style={{ fontSize: isMobile ? '16px' : '20px', margin: 0 }}>Join Group Formation</h4>
        </div>

        {/* Error Message */}
        {error && (
          <div className="groupgrid-error" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="groupgrid-empty">Loading formations...</div>
          </div>
        ) : formations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div className="groupgrid-empty">No active formations available</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {formations.map(formation => {
              const isFull = formation.filled_slots >= formation.total_slots;
              const isJoining = joining === formation.id;

              return (
                <div
                  key={formation.id}
                  className="groupgrid-card"
                  style={{
                    padding: isMobile ? '12px' : '16px',
                    border: isFull ? '1px solid var(--border-color)' : '1px solid var(--accent-blue)',
                    opacity: isFull ? 0.6 : 1,
                  }}
                >
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    gap: isMobile ? '12px' : '16px' 
                  }}>
                    <div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
                      <h4 style={{ 
                        margin: '0 0 8px 0', 
                        fontSize: isMobile ? '16px' : '18px' 
                      }}>
                        {formation.subject_name}
                      </h4>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '4px', 
                        marginBottom: isMobile ? '10px' : '12px' 
                      }}>
                        <span style={{ 
                          fontSize: isMobile ? '12px' : '14px', 
                          color: 'var(--text-secondary)' 
                        }}>
                          Section: {formation.section_name}
                        </span>
                        <span style={{ 
                          fontSize: isMobile ? '12px' : '14px', 
                          color: 'var(--text-secondary)' 
                        }}>
                          Members per team: {formation.members_per_team}
                        </span>
                        <span style={{ 
                          fontSize: isMobile ? '12px' : '14px', 
                          color: 'var(--text-secondary)' 
                        }}>
                          Slots: {formation.filled_slots} / {formation.total_slots}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: isFull 
                            ? 'rgba(239, 68, 68, 0.1)' 
                            : 'rgba(34, 197, 94, 0.1)',
                          color: isFull 
                            ? '#ef4444' 
                            : '#22c55e',
                        }}
                      >
                        {isFull ? 'Full' : 'Open'}
                      </div>
                    </div>
                    <button
                      className="groupgrid-button"
                      onClick={() => handleJoin(formation.id)}
                      disabled={isFull || isJoining || !!joining}
                      style={{
                        minWidth: isMobile ? '100%' : '120px',
                        width: isMobile ? '100%' : 'auto',
                        opacity: isFull ? 0.5 : 1,
                        cursor: isFull ? 'not-allowed' : 'pointer',
                        padding: isMobile ? '10px' : undefined,
                      }}
                    >
                      {isJoining ? 'Joining...' : isFull ? 'Full' : 'Join'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

