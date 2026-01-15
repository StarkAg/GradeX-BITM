import React from 'react';

export default function Expenza() {
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
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
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
          Expenza
        </h1>

        <p style={{
        fontSize: 'clamp(14px, 2.5vw, 18px)',
          color: 'var(--text-secondary)',
          margin: 0,
        lineHeight: '1.6',
        maxWidth: '600px'
        }}>
        Best way to manage your expenses tailored for college students
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
          We're working hard to bring you an amazing expense management experience. 
          Stay tuned for updates!
        </p>
      </div>
    </div>
  );
}
