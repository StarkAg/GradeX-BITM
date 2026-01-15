import React from 'react';

export default function MessMenu() {
  return (
    <div style={{
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: 'clamp(40px, 8vw, 80px) clamp(20px, 4vw, 40px)',
      minHeight: 'calc(100vh - 60px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <div style={{
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <svg 
          width="80" 
          height="80" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ 
            color: 'var(--text-primary)',
            opacity: 0.6
          }}
        >
          <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
          <path d="M7 2v20"></path>
          <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v0"></path>
        </svg>
      </div>

      <div style={{
        marginBottom: '16px',
        fontSize: 'clamp(11px, 2vw, 13px)',
        fontWeight: 600,
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'var(--text-secondary)'
      }}>
        Coming Soon
      </div>

      <h1 style={{
        fontSize: 'clamp(32px, 6vw, 48px)',
        fontWeight: 400,
        letterSpacing: '0.1em',
        margin: '0 0 24px 0',
        padding: 0,
        color: 'var(--text-primary)',
        fontFamily: "'AmericanCaptain', 'Bebas Neue', sans-serif",
        textTransform: 'uppercase'
      }}>
        Mess Menu
      </h1>

      <p style={{
        fontSize: 'clamp(14px, 2.5vw, 18px)',
        color: 'var(--text-secondary)',
        margin: 0,
        lineHeight: '1.6',
        maxWidth: '600px'
      }}>
        Daily dining schedules and weekly menus at your fingertips
      </p>

      <div style={{
        marginTop: '48px',
        padding: '20px 32px',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        fontSize: '14px',
        color: 'var(--text-tertiary)',
        maxWidth: '500px'
      }}>
        <p style={{ margin: 0, lineHeight: '1.6' }}>
          We’re prepping tasty interfaces for breakfast, lunch and dinner rotations. Stay tuned!
        </p>
      </div>
    </div>
  );
}

