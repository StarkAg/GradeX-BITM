import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const today = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[today.getDay()];
  
  const dateOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  const formattedDate = today.toLocaleDateString('en-US', dateOptions);

  const quickActions = [
    {
      id: 'timetable',
      title: 'Schedule',
      path: '/schedule',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      )
    },
    {
      id: 'attendance',
      title: 'Attendance',
      path: '/attendance',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      )
    },
    {
      id: 'subjects',
      title: 'Subjects',
      path: '/subjects',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <line x1="8" y1="7" x2="16" y2="7"/>
          <line x1="8" y1="11" x2="16" y2="11"/>
          <line x1="8" y1="15" x2="12" y2="15"/>
        </svg>
      )
    }
  ];
  
  // Disable body scroll on Home page
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div style={{
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: isMobile ? '12px 8px' : 'clamp(20px, 4vw, 40px)',
      height: isMobile ? 'calc(100dvh - 160px)' : 'calc(100vh - 120px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      overflow: 'hidden'
    }}>
      {/* Greeting & Today's Day Section */}
      <div style={{
        textAlign: 'center',
        marginBottom: isMobile ? '20px' : '48px'
      }}>
        <p style={{
          fontSize: isMobile ? '16px' : '20px',
          color: 'var(--text-secondary)',
          margin: '0 0 16px 0'
        }}>
          Hi, <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{localStorage.getItem('gradex_user_name') || localStorage.getItem('gradex_username') || 'User'}</span>
        </p>
        <h1 style={{
          fontSize: isMobile ? '32px' : 'clamp(40px, 8vw, 56px)',
          fontWeight: 400,
          letterSpacing: '0.1em',
          margin: '0 0 8px 0',
          color: 'var(--text-primary)',
          fontFamily: "'AmericanCaptain', 'Bebas Neue', sans-serif",
          textTransform: 'uppercase'
        }}>
          {todayName}
        </h1>
        <p style={{
          fontSize: isMobile ? '14px' : '18px',
          color: 'var(--text-secondary)',
          margin: 0
        }}>
          {formattedDate}
        </p>
      </div>

      {/* Quick Actions */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: isMobile ? '10px' : '16px',
        maxWidth: '600px',
        margin: '0 auto',
        width: '100%'
      }}>
        {quickActions.map((action) => (
          <Link
            key={action.id}
            to={action.path}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isMobile ? '12px' : '16px',
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: isMobile ? '24px 16px' : '32px 24px',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--border-hover)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div style={{
              width: isMobile ? '52px' : '64px',
              height: isMobile ? '52px' : '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--hover-bg)',
              borderRadius: '12px',
              color: 'var(--text-primary)'
            }}>
                {action.icon}
            </div>
            <h3 style={{
              fontSize: isMobile ? '14px' : '18px',
              fontWeight: 600,
              margin: 0,
              color: 'var(--text-primary)'
              }}>
                {action.title}
              </h3>
          </Link>
        ))}
      </div>

      {/* Footer text */}
      <p style={{
        textAlign: 'center',
        fontSize: '12px',
        color: 'var(--text-tertiary)',
        marginTop: isMobile ? '16px' : '48px'
      }}>
        BIT Mesra, Lalpur
      </p>
    </div>
  );
}
