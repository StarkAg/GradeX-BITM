import React, { useState, useRef, useEffect } from 'react';
import { useAuthActions } from '@convex-dev/auth/react';
import { getAuthErrorMessage } from '../lib/session';

/**
 * AuthPage - email and password, signing in or creating an account.
 * The account itself lives in Convex (convex/auth.ts).
 */

export default function AuthPage({ onAuthSuccess }) {
  const { signIn } = useAuthActions();
  // 'signIn' or 'signUp' - also the name of the flow the server is asked for.
  const [mode, setMode] = useState('signIn');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showLandingPopup, setShowLandingPopup] = useState(false);
  const audioRef = useRef(null);

  const identifierLabel = 'Email';
  const identifierPlaceholder = 'Enter email';

  // Show landing popup on mount
  useEffect(() => {
    const timer = setTimeout(() => setShowLandingPopup(true), 600);
    return () => clearTimeout(timer);
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (err) {
      console.warn('Audio playback failed:', err);
    }
  };

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test((value || '').trim());

  const advanceLoginStep = () => {
    const identifier = formData.username.trim();
    if (!identifier) {
      setError('Enter your email first.');
      return;
    }

    if (!isValidEmail(identifier)) {
      setError('Enter a valid email address.');
      return;
    }

    setError('');
    setShowLoginPassword(true);
  };

  const switchMode = () => {
    setError('');
    setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (!showLoginPassword) {
      advanceLoginStep();
      return;
    }

    const email = formData.username.trim().toLowerCase();
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (mode === 'signUp' && formData.password.length < 8) {
      setError('Use a password of at least 8 characters.');
      return;
    }
    // Signing in needs the server; without a connection the request would
    // just sit there.
    if (navigator.onLine === false) {
      setError('You are offline. Connect to the internet and try again.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const result = await signIn('password', { email, password: formData.password, flow: mode });
      if (!result?.signingIn) {
        throw new Error('Sign-in did not complete');
      }
      onAuthSuccess();
    } catch (err) {
      console.error('Sign-in error:', err);
      setError(getAuthErrorMessage(
        err,
        mode === 'signIn'
          ? 'Wrong email or password. If you have not made an account here yet, choose Create account.'
          : 'Could not create the account. If this email already has one, choose Sign in.'
      ));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '20px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '380px'
      }}>
        {/* Logo/Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginBottom: '8px'
          }}>
            <img 
              src="/arc-reactor.png" 
              alt="Arc Reactor" 
              onClick={togglePlay}
              style={{ 
                width: '44px', 
                height: '44px',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease, transform 0.2s ease',
                display: 'block',
                flexShrink: 0,
                marginTop: '-5px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Click to play music"
            />
            <span style={{
              fontSize: '42px',
              fontWeight: 400,
              color: 'var(--text-primary)',
              margin: 0,
              padding: 0,
              fontFamily: "'AmericanCaptain', 'Bebas Neue', sans-serif",
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
              height: '44px'
            }}>
              GradeX - BITM
            </span>
          </div>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary)',
            margin: 0
          }}>
            {mode === 'signIn' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        {/* Form Card */}
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '28px'
        }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px',
            }}
          >
            <div style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />
            <span
              style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Use email
            </span>
            <div style={{ height: '1px', flex: 1, background: 'var(--border-color)' }} />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              background: 'rgba(248, 113, 113, 0.1)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              borderRadius: '8px',
              color: '#f87171',
              fontSize: '13px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {identifierLabel}
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch' }}>
                <input
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder={identifierPlaceholder}
                  required
                  autoComplete="username"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontSize: '15px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--text-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
                {!showLoginPassword && (
                  <button
                    type="button"
                    onClick={advanceLoginStep}
                    style={{
                      width: '46px',
                      minWidth: '46px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Continue to password"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"></path>
                      <path d="m12 5 7 7-7 7"></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Password */}
            {showLoginPassword && (
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  minLength={mode === 'signUp' ? 8 : undefined}
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 14px',
                    fontSize: '15px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--text-primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'none'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                background: 'var(--text-primary)',
                color: 'var(--bg-primary)',
                borderRadius: '8px',
                cursor: loading ? 'wait' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => !loading && (e.target.style.opacity = '0.9')}
              onMouseLeave={(e) => !loading && (e.target.style.opacity = '1')}
            >
              {loading ? 'Please wait...' : (!showLoginPassword ? 'Continue' : (mode === 'signIn' ? 'Sign in' : 'Create account'))}
            </button>

            <button
              type="button"
              onClick={switchMode}
              disabled={loading}
              style={{
                width: '100%',
                marginTop: '12px',
                padding: '10px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-secondary)',
                borderRadius: '8px',
                cursor: loading ? 'wait' : 'pointer'
              }}
            >
              {mode === 'signIn' ? 'New here? Create account' : 'Have an account? Sign in'}
            </button>

            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.5, textAlign: 'center', margin: '14px 0 0 0' }}>
              Used GradeX BITM before 12 October? Create your account again with the same email. Your attendance is kept.
            </p>
          </form>

        </div>

        {/* Footer */}
        <p style={{
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-tertiary)',
          marginTop: '24px'
        }}>
          Made for BIT Mesra, Lalpur
        </p>
      </div>

      {/* Audio element for Back in Black */}
      <audio
        ref={audioRef}
        src="/back-in-black.mp3"
        preload="none"
        onEnded={() => setIsPlaying(false)}
      />

      {/* Landing Popup */}
      {showLandingPopup && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10001,
            padding: '20px',
            animation: 'fadeIn 0.3s ease'
          }}
          onClick={() => setShowLandingPopup(false)}
        >
          <div 
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '40px 32px',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: 'popIn 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Emoji with bounce */}
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
              animation: 'bounce 2s infinite'
            }}>
              👋
            </div>

            {/* Main text */}
            <h2 style={{
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: '0 0 12px 0',
              lineHeight: 1.3
            }}>
              Hello Peeps of BIT Mesra!
            </h2>

            <p style={{
              fontSize: '15px',
              color: 'var(--text-secondary)',
              margin: '0 0 28px 0',
              lineHeight: 1.6
            }}>
              Create an account to join the best academic management platform for Lalpur Campus 🚀
            </p>

            {/* CTA Button */}
            <button
              onClick={() => setShowLandingPopup(false)}
              style={{
                padding: '14px 32px',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                background: 'var(--text-primary)',
                color: 'var(--bg-primary)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              Get Started
            </button>

            <p style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              marginTop: '16px'
            }}>
              Click anywhere to dismiss
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-10px); }
          60% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
