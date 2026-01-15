import React, { useState, useEffect } from 'react';
import { isMacMode, setServerMode, getServerMode, getModeDisplayName, MODE_VPS, MODE_MAC } from '../lib/mode-toggle.js';

/**
 * Mode Toggle Component
 * Allows switching between VPS mode and Mac mode
 */
export default function ModeToggle() {
  const [mode, setMode] = useState(getServerMode());
  const [isChanging, setIsChanging] = useState(false);

  // Listen for mode changes from other components
  useEffect(() => {
    const handleModeChange = (event) => {
      setMode(event.detail.mode);
    };

    window.addEventListener('serverModeChanged', handleModeChange);
    return () => {
      window.removeEventListener('serverModeChanged', handleModeChange);
    };
  }, []);

  const handleToggle = async () => {
    if (isChanging) return;

    setIsChanging(true);
    const newMode = mode === MODE_VPS ? MODE_MAC : MODE_VPS;
    
    try {
      setServerMode(newMode);
      setMode(newMode);
      
      // Show a brief confirmation
      console.log(`[Mode Toggle] Switched to ${getModeDisplayName()}`);
    } catch (error) {
      console.error('[Mode Toggle] Error changing mode:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const isMac = isMacMode();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 12px',
      background: 'var(--bg-secondary, rgba(0, 0, 0, 0.1))',
      borderRadius: '8px',
      border: `1px solid ${isMac ? 'rgba(59, 130, 246, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
      cursor: isChanging ? 'wait' : 'pointer',
      transition: 'all 0.2s ease',
      userSelect: 'none',
    }}
    onClick={handleToggle}
    title={`Click to switch to ${isMac ? 'VPS' : 'Mac'} mode`}
    >
      <div style={{
        width: '48px',
        height: '24px',
        borderRadius: '12px',
        background: isMac ? '#3b82f6' : '#22c55e',
        position: 'relative',
        transition: 'background 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        padding: '2px',
      }}>
        <div style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          background: 'white',
          transform: isMac ? 'translateX(24px)' : 'translateX(0)',
          transition: 'transform 0.2s ease',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
        }} />
      </div>
      
    </div>
  );
}

