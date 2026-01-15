import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function CodeEntryModal({ onClose, onCodeSubmit }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [formations, setFormations] = useState([]);
  const [loadingFormations, setLoadingFormations] = useState(true);
  const [showList, setShowList] = useState(true);
  const [clickCounts, setClickCounts] = useState({}); // Track clicks per formation
  const [isMobile, setIsMobile] = useState(false);
  const [deleting, setDeleting] = useState(null);

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
      setLoadingFormations(true);
      const response = await fetch('/api/groupgrid?action=get-formations');
      const data = await response.json();

      if (data.status === 'ok') {
        setFormations(data.formations || []);
      }
    } catch (error) {
      console.error('Failed to fetch formations:', error);
    } finally {
      setLoadingFormations(false);
    }
  };

  const handleFormationClick = (e, formation) => {
    // Don't navigate if clicking on delete button area
    if (e.target.closest('button')) {
      return;
    }
    
    const groupsCount = formation.groups_count || 0;
    
    // Prefill method for formations with 3 or fewer groups
    if (groupsCount <= 3) {
      // Switch to code entry view and prefill the code
      setShowList(false);
      setError('');
      setCode(formation.formation_code || '');
      return;
    }
    
    // Easter egg: require 7 clicks for formations with > 3 groups
    const formationId = formation.id;
    const currentCount = clickCounts[formationId] || 0;
    const newCount = currentCount + 1;
    
    // Update click count
    setClickCounts(prev => ({
      ...prev,
      [formationId]: newCount
    }));
    
    if (newCount >= 7) {
      // Reset counter and navigate with celebration effect
      setClickCounts(prev => {
        const updated = { ...prev };
        delete updated[formationId];
        return updated;
      });
      
      // Add a final celebration animation
      const element = e.currentTarget;
      element.style.transform = 'scale(1.1)';
      element.style.boxShadow = '0 0 30px rgba(255, 215, 0, 0.8)';
      element.style.transition = 'all 0.3s ease';
      
      setTimeout(() => {
        navigate(`/groupgrid/${formation.formation_code}`);
      }, 300);
    } else {
      // Progressive visual effects - no hints, just beautiful animations
      const element = e.currentTarget;
      
      // Pulse animation
      element.style.transform = 'scale(0.98)';
      element.style.transition = 'all 0.15s ease';
      
      setTimeout(() => {
        element.style.transform = 'scale(1)';
      }, 150);
      
      // Progressive gold glow intensity based on clicks
      const glowIntensity = (newCount / 7) * 0.6;
      const goldGlow = `0 0 ${10 + newCount * 3}px rgba(255, 215, 0, ${glowIntensity})`;
      element.style.boxShadow = goldGlow;
    }
  };

  const handleDelete = async (e, formationId) => {
    e.stopPropagation(); // Prevent triggering the formation click
    
    if (!confirm('Are you sure you want to delete this formation? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(formationId);
      setError('');

      const response = await fetch('/api/groupgrid?action=delete-formation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formation_id: formationId })
      });

      const data = await response.json();

      if (data.status === 'ok') {
        // Remove the formation from the list
        setFormations(prev => prev.filter(f => f.id !== formationId));
      } else {
        setError(data.error || 'Failed to delete formation');
      }
    } catch (error) {
      console.error('Failed to delete formation:', error);
      setError('Failed to delete formation. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!code.trim()) {
      setError('Please enter a formation code');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/groupgrid?action=get-formation-by-code&code=${encodeURIComponent(code.trim().toUpperCase())}`);
      const data = await response.json();

      if (data.status === 'ok') {
        // Navigate to the dashboard page with the code
        navigate(`/groupgrid/${code.trim().toUpperCase()}`);
        onClose(); // Close the modal
      } else {
        setError(data.error || 'Invalid formation code');
      }
    } catch (error) {
      console.error('Failed to fetch formation:', error);
      setError('Failed to verify code. Please try again.');
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
            borderRadius: '8px',
            width: isMobile ? '28px' : '32px',
            height: isMobile ? '28px' : '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            margin: 0,
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            transition: 'all 0.2s ease',
            zIndex: 10,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            lineHeight: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--hover-bg)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--card-bg)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            fontSize: isMobile ? '20px' : '24px',
            margin: 0,
            padding: 0,
            height: '100%',
            width: '100%',
          }}>&times;</span>
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

        {/* Toggle between list and code entry */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          gap: isMobile ? '10px' : '14px', 
          marginBottom: isMobile ? '16px' : '20px', 
          borderBottom: '1px solid var(--border-color)', 
          paddingBottom: isMobile ? '10px' : '12px',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => {
              setShowList(true);
              setError(''); // Clear error when switching tabs
            }}
            style={{
              padding: isMobile ? '10px 12px' : '8px 16px',
              background: showList ? 'var(--text-primary)' : 'transparent',
              color: showList ? 'var(--bg-primary)' : 'var(--text-primary)',
              border: `1px solid ${showList ? 'var(--text-primary)' : 'var(--border-color)'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: showList ? '600' : '400',
              flex: isMobile ? 1 : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Browse Formations
          </button>
          <button
            type="button"
            onClick={() => {
              setShowList(false);
              setError(''); // Clear error when switching tabs
            }}
            style={{
              padding: isMobile ? '10px 12px' : '8px 16px',
              background: !showList ? 'var(--text-primary)' : 'transparent',
              color: !showList ? 'var(--bg-primary)' : 'var(--text-primary)',
              border: `1px solid ${!showList ? 'var(--text-primary)' : 'var(--border-color)'}`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: !showList ? '600' : '400',
              flex: isMobile ? 1 : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Enter Code
          </button>
        </div>

        {/* Formations List */}
        {showList && (
          <div style={{ marginBottom: '20px' }}>
            {loadingFormations ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="groupgrid-empty">Loading formations...</div>
              </div>
            ) : formations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div className="groupgrid-empty">No formations available</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {formations.map(formation => {
                  const groupsCount = formation.groups_count || 0;
                  const clickCount = clickCounts[formation.id] || 0;
                  const progress = clickCount / 7; // 0 to 1
                  const isActive = clickCount > 0;
                  const hasEasterEgg = groupsCount > 3; // Only formations with > 3 groups have easter egg
                  
                  // Progressive gold border intensity (only for easter egg formations)
                  const goldOpacity = hasEasterEgg && isActive ? Math.min(progress * 0.8 + 0.2, 1) : 0;
                  const goldWidth = hasEasterEgg && progress > 0 ? Math.max(2, progress * 3) : 1;
                  
                  // Animated gradient background (subtle gold shimmer) - only for easter egg
                  const goldGradient = hasEasterEgg && isActive
                    ? `linear-gradient(135deg, 
                        rgba(255, 215, 0, ${progress * 0.05}) 0%, 
                        rgba(255, 223, 0, ${progress * 0.03}) 50%, 
                        rgba(255, 215, 0, ${progress * 0.05}) 100%)`
                    : 'var(--card-bg)';
                  
                  return (
                    <div
                      key={formation.id}
                      onClick={(e) => handleFormationClick(e, formation)}
                      style={{
                        padding: isMobile ? '12px' : '16px',
                        border: hasEasterEgg && isActive 
                          ? `${goldWidth}px solid rgba(255, 215, 0, ${goldOpacity})`
                          : '1px solid var(--border-color)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: goldGradient,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        transform: 'scale(1)',
                        boxShadow: hasEasterEgg && isActive
                          ? `0 0 ${10 + clickCount * 2}px rgba(255, 215, 0, ${progress * 0.4}), 
                             0 4px 6px rgba(0, 0, 0, 0.1)`
                          : '0 2px 4px rgba(0, 0, 0, 0.05)',
                        overflow: 'hidden',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        MozUserSelect: 'none',
                        msUserSelect: 'none',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive || !hasEasterEgg) {
                          e.currentTarget.style.background = 'var(--hover-bg)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                        } else {
                          e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive || !hasEasterEgg) {
                          e.currentTarget.style.background = 'var(--card-bg)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
                        } else {
                          e.currentTarget.style.transform = 'scale(1)';
                        }
                      }}
                    >
                      {/* Animated gold shimmer effect - only for easter egg formations */}
                      {hasEasterEgg && isActive && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: '-100%',
                          width: '100%',
                          height: '100%',
                          background: `linear-gradient(90deg, 
                            transparent 0%, 
                            rgba(255, 215, 0, ${progress * 0.3}) 50%, 
                            transparent 100%)`,
                          animation: 'shimmer 2s infinite',
                          pointerEvents: 'none',
                        }} />
                      )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
                      <div style={{ flex: 1, userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>
                        <h4 style={{ 
                          margin: '0 0 8px 0', 
                          fontSize: isMobile ? '14px' : '16px', 
                          fontWeight: '600',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                        }}>
                          {formation.section_name || 'Section'} - {formation.subject_name || 'Subject'}
                        </h4>
                        <div style={{ 
                          display: 'flex', 
                          gap: isMobile ? '12px' : '16px', 
                          fontSize: isMobile ? '12px' : '13px', 
                          color: 'var(--text-secondary)',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          MozUserSelect: 'none',
                          msUserSelect: 'none',
                        }}>
                          <span style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>Groups: <strong style={{ userSelect: 'none', WebkitUserSelect: 'none', MozUserSelect: 'none', msUserSelect: 'none' }}>{formation.groups_count || 0}</strong></span>
                          {/* Show formation code if groups < 3 */}
                          {(formation.groups_count || 0) < 3 && formation.formation_code && (
                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              fontSize: isMobile ? '11px' : '12px',
                              fontWeight: '600',
                              fontFamily: 'monospace',
                              background: 'var(--hover-bg)',
                              color: 'var(--text-primary)',
                              border: '1px solid var(--border-color)',
                              letterSpacing: '0.05em',
                              userSelect: 'none',
                              WebkitUserSelect: 'none',
                              MozUserSelect: 'none',
                              msUserSelect: 'none',
                            }}>
                              Code: {formation.formation_code}
                            </span>
                          )}
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: isMobile ? '11px' : '12px',
                            fontWeight: '600',
                            background: formation.status === 'open' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            color: formation.status === 'open' ? '#22c55e' : '#ef4444',
                            userSelect: 'none',
                            WebkitUserSelect: 'none',
                            MozUserSelect: 'none',
                            msUserSelect: 'none',
                          }}>
                            {formation.status === 'open' ? 'Open' : 'Closed'}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        {/* Show delete icon only if formation has 0 groups */}
                        {(formation.groups_count || 0) === 0 && (
                          <button
                            onClick={(e) => handleDelete(e, formation.id)}
                            disabled={deleting === formation.id}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '4px',
                              cursor: deleting === formation.id ? 'wait' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ef4444',
                              opacity: deleting === formation.id ? 0.5 : 1,
                              transition: 'opacity 0.2s',
                            }}
                            title="Delete formation"
                          >
                            <svg 
                              width="18" 
                              height="18" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                            >
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                          </button>
                        )}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}>
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </div>
                  </div>
                  );
                })}
                </div>
              )}
          </div>
        )}

        {/* Code Entry Form */}
        {!showList && (
        <form className="groupgrid-form" onSubmit={handleSubmit}>
          <label className="groupgrid-field">
            <input
              type="text"
              className="groupgrid-input"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                setError('');
              }}
              placeholder="Enter 8-character code"
              maxLength={8}
              required
              autoFocus
              style={{ 
                width: '100%',
                textAlign: 'center',
                fontSize: isMobile ? '20px' : '24px',
                letterSpacing: '0.2em',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                padding: isMobile ? '12px' : '10px',
              }}
            />
          </label>

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
              disabled={loading || !code.trim()}
              style={{
                width: isMobile ? '100%' : 'auto',
                padding: isMobile ? '12px' : undefined,
              }}
            >
              {loading ? 'Verifying...' : 'Join Formation'}
            </button>
          </div>
        </form>
        )}
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
    </div>
  );
}

