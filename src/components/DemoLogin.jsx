import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Demo credentials stored in frontend
const DEMO_CREDENTIALS = {
  faculty: {
    id: 'demo_faculty_001',
    username: 'faculty',
    password: 'faculty123',
    name: 'Dr. Faculty Demo',
    role: 'faculty'
  },
  student: {
    id: 'demo_student_001',
    username: 'student',
    password: 'student123',
    name: 'Student Demo',
    role: 'student'
  }
};

export default function DemoLogin() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    const creds = DEMO_CREDENTIALS[role];
    setFormData({ username: creds.username, password: creds.password });
    setError('');
  };

  const handleLogin = (e) => {
    e?.preventDefault();
    setError('');

    if (!selectedRole) {
      setError('Please select a role');
      return;
    }

    const creds = DEMO_CREDENTIALS[selectedRole];
    
    if (formData.username === creds.username && formData.password === creds.password) {
      // Store demo session
      localStorage.setItem('demo_role', creds.role);
      localStorage.setItem('demo_user_id', creds.id);
      localStorage.setItem('demo_username', creds.username);
      localStorage.setItem('demo_name', creds.name);
      
      // Navigate based on role
      if (creds.role === 'faculty') {
        navigate('/demo/faculty');
      } else {
        navigate('/demo/student');
      }
    } else {
      setError('Invalid credentials');
    }
  };

  const handleQuickLogin = (role) => {
    const creds = DEMO_CREDENTIALS[role];
    localStorage.setItem('demo_role', creds.role);
    localStorage.setItem('demo_user_id', creds.id);
    localStorage.setItem('demo_username', creds.username);
    localStorage.setItem('demo_name', creds.name);
    
    if (creds.role === 'faculty') {
      navigate('/demo/faculty');
    } else {
      navigate('/demo/student');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '20px' : '40px',
      position: 'relative',
      overflow: 'auto'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '450px',
        background: 'var(--card-bg-form)',
        backdropFilter: 'blur(6px)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: isMobile ? '32px 24px' : '48px 40px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: isMobile ? '24px' : '28px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 8px 0'
          }}>
            Demo Portal
          </h1>
          <p style={{
            fontSize: isMobile ? '13px' : '14px',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            Select your role to continue
          </p>
        </div>

        {!selectedRole ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <button
              onClick={() => handleRoleSelect('faculty')}
              style={{
                padding: isMobile ? '16px' : '20px',
                fontSize: isMobile ? '15px' : '16px',
                fontWeight: 500,
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.borderColor = 'var(--border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--card-bg)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              Faculty Login
            </button>
            
            <button
              onClick={() => handleRoleSelect('student')}
              style={{
                padding: isMobile ? '16px' : '20px',
                fontSize: isMobile ? '15px' : '16px',
                fontWeight: 500,
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.borderColor = 'var(--border-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--card-bg)';
                e.currentTarget.style.borderColor = 'var(--border-color)';
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Student Login
            </button>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', margin: '0 0 12px 0' }}>
                Quick Login (Auto-fill)
              </p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={() => handleQuickLogin('faculty')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: 'var(--hover-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--card-bg)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--hover-bg)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  Faculty
                </button>
                <button
                  onClick={() => handleQuickLogin('student')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: 'var(--hover-bg)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--card-bg)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--hover-bg)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  Student
                </button>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Username
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                required
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '15px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'all 0.2s ease'
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--border-hover)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                required
              />
            </div>

            {error && (
              <div style={{
                padding: '12px',
                marginBottom: '16px',
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                borderRadius: '8px',
                color: 'var(--error-color)',
                fontSize: '13px',
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedRole(null);
                  setFormData({ username: '', password: '' });
                  setError('');
                }}
                style={{
                  flex: 1,
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 500,
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--card-bg)';
                }}
              >
                Back
              </button>
              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 500,
                  background: 'var(--text-primary)',
                  border: 'none',
                  color: 'var(--bg-primary)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Login
              </button>
            </div>
          </form>
        )}

        <div style={{
          marginTop: '24px',
          padding: '12px',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>Demo Credentials:</strong><br/>
          Faculty: faculty / faculty123<br/>
          Student: student / student123
        </div>
      </div>
    </div>
  );
}
