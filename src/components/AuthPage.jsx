import React, { useState, useRef, useEffect } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import {
  getClerkErrorMessage,
  syncClerkUserToLocalStorage,
} from '../lib/clerk';

// const SOCIAL_PROVIDERS = [
//   { id: 'oauth_google', label: 'Google', compact: false },
//   { id: 'oauth_github', label: 'GitHub', compact: true },
//   { id: 'oauth_apple', label: 'Apple', compact: true },
// ];

function SocialIcon({ providerId }) {
  if (providerId === 'oauth_google') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 3.6 14.5 2.7 12 2.7A9.3 9.3 0 0 0 2.7 12 9.3 9.3 0 0 0 12 21.3c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.1-1.6H12Z" />
        <path fill="#4285F4" d="M3.8 7.6 7 10c.9-2.5 2.7-4 5-4 1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 3.6 14.5 2.7 12 2.7c-3.6 0-6.8 2.1-8.2 4.9Z" />
        <path fill="#FBBC05" d="M2.7 12c0 1.5.4 2.9 1.1 4.2L7.4 13c-.2-.5-.3-1-.3-1.5s.1-1 .3-1.5L3.8 7.6A9.1 9.1 0 0 0 2.7 12Z" />
        <path fill="#34A853" d="M12 21.3c2.4 0 4.5-.8 6-2.3l-2.9-2.2c-.8.6-1.8 1.1-3.1 1.1-2.3 0-4.2-1.5-4.9-3.7l-3.5 2.7c1.4 2.9 4.4 4.8 8.4 4.8Z" />
      </svg>
    );
  }

  if (providerId === 'oauth_apple') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.7 12.8c0-2.1 1.7-3.1 1.8-3.2-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.5.8-3.2.8s-1.7-.8-2.8-.8c-1.4 0-2.8.8-3.5 2-.8 1.4-1 4 .7 6.6.8 1.2 1.8 2.5 3.1 2.5s1.7-.8 3.1-.8 1.8.8 3.1.8 2.2-1.2 3-2.4c.9-1.3 1.3-2.6 1.3-2.7 0 0-2.5-1-2.5-3.1Zm-2.1-6.2c.6-.8 1-1.8.9-2.8-.9 0-2 .6-2.7 1.4-.6.7-1.1 1.8-1 2.8 1 .1 2-.5 2.8-1.4Z" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.6.5.5 5.7.5 12.2c0 5.2 3.4 9.6 8.1 11.1.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.8-1.3-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.9 1.3 1.9 1.3 1.1 1.9 2.9 1.3 3.6 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.4-5.5-6.1 0-1.3.5-2.4 1.2-3.3-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.4 1.2 1-.3 2-.4 3-.4s2.1.1 3 .4c2.3-1.6 3.4-1.2 3.4-1.2.7 1.7.2 2.9.1 3.2.8.9 1.2 2 1.2 3.3 0 4.8-2.9 5.8-5.6 6.1.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.7-1.6 8.1-6 8.1-11.1C23.5 5.7 18.4.5 12 .5Z" />
    </svg>
  );
}

/**
 * AuthPage - Username/Password authentication
 * Shows login form with option to create account
 */

export default function AuthPage({ onAuthSuccess }) {
  const { isLoaded: signInLoaded, signIn, setActive: setSignInActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp, setActive: setSignUpActive } = useSignUp();
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
  const [socialLoading, setSocialLoading] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [needsClientTrust, setNeedsClientTrust] = useState(false);
  const [verificationMode, setVerificationMode] = useState('signIn');
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

  const activateSession = async (attempt, fallbackIdentifier) => {
    const sessionId = attempt?.createdSessionId || signIn?.createdSessionId || fallbackIdentifier;

    if (setSignInActive && sessionId) {
      await setSignInActive({ session: sessionId });
      return;
    }

    if (attempt?.finalize) {
      await attempt.finalize({
        navigate: ({ decorateUrl }) => {
          const url = decorateUrl('/');
          window.location.href = url;
        },
      });
      return;
    }

    window.location.href = '/';
  };

  const isValidEmail = (value) => /\S+@\S+\.\S+/.test((value || '').trim());

  const startEmailSignUp = async (email, password) => {
    if (!signUpLoaded || !signUp) {
      throw new Error('Sign up is still loading. Please try again.');
    }

    const sanitizedEmail = email.toLowerCase().trim();
    const result = await signUp.create({
      emailAddress: sanitizedEmail,
      password,
    });

    if (result.status === 'complete' && result.createdSessionId) {
      await setSignUpActive({ session: result.createdSessionId });
      const bridgeUser = syncClerkUserToLocalStorage({
        id: result.createdUserId || sanitizedEmail,
        username: sanitizedEmail,
        unsafeMetadata: {},
      });
      onAuthSuccess(bridgeUser);
      return 'complete';
    }

    if (typeof signUp.prepareEmailAddressVerification === 'function') {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setVerificationMode('signUp');
      setNeedsClientTrust(true);
      return 'pending';
    }

    throw new Error('Email verification is not enabled for sign-up in Clerk Dashboard.');
  };

  const prepareEmailSecondFactor = async (attempt) => {
    const supportsEmailCode = attempt?.supportedSecondFactors?.some(
      (factor) => factor.strategy === 'email_code'
    );

    if (!supportsEmailCode) {
      throw new Error('Clerk requires additional verification for this device, but no email verification factor is available for this account.');
    }

    if (attempt?.prepareSecondFactor) {
      await attempt.prepareSecondFactor({ strategy: 'email_code' });
      return;
    }

    if (attempt?.mfa?.sendEmailCode) {
      await attempt.mfa.sendEmailCode();
      return;
    }

    throw new Error('This Clerk configuration does not expose an email verification flow for second-factor sign-in.');
  };

  const verifyEmailSecondFactor = async (attempt, code) => {
    if (attempt?.attemptSecondFactor) {
      return attempt.attemptSecondFactor({
        strategy: 'email_code',
        code,
      });
    }

    if (attempt?.mfa?.verifyEmailCode) {
      await attempt.mfa.verifyEmailCode({ code });
      return attempt;
    }

    throw new Error('This Clerk configuration does not expose email code verification for second-factor sign-in.');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setNeedsClientTrust(false);

    try {
      if (!signInLoaded || !signIn) {
        throw new Error('Sign in is still loading. Please try again.');
      }

      const identifier = formData.username.toLowerCase().trim();
      const signInAttempt = await signIn.create({
        identifier,
        password: formData.password,
      });

      const activeAttempt = signInAttempt || signIn;

      if (activeAttempt?.status === 'complete') {
        await activateSession(activeAttempt, identifier);

        const bridgeUser = syncClerkUserToLocalStorage({
          id: activeAttempt?.createdSessionId || identifier,
          username: identifier,
          unsafeMetadata: {},
        });
        onAuthSuccess(bridgeUser);
        return;
      }

      if (
        activeAttempt?.status === 'needs_client_trust' ||
        activeAttempt?.status === 'needs_second_factor'
      ) {
        await prepareEmailSecondFactor(activeAttempt);
        setVerificationMode('signIn');
        setNeedsClientTrust(true);
        return;
      }

      setError(`Sign-in attempt not complete: ${activeAttempt?.status || 'unknown_status'}`);
    } catch (err) {
      console.error('Login error:', err);
      const message = getClerkErrorMessage(err, 'Login failed. Please try again.');

      if (message === "Couldn't find your account.") {
        if (!isValidEmail(formData.username)) {
          setError('Use a valid email address to create a new account.');
        } else {
          try {
            const signUpState = await startEmailSignUp(formData.username, formData.password);
            if (signUpState === 'pending') {
              setError('');
            }
          } catch (signUpError) {
            setError(getClerkErrorMessage(signUpError, 'Could not start sign-up. Please try again.'));
          }
        }
      } else if (message === 'Identifier is invalid.') {
        setError('Enter a valid email address.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClientTrust = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!signInLoaded || !signIn) {
        throw new Error('Verification is still loading. Please try again.');
      }

      if (verificationMode === 'signUp') {
        const verifiedSignUp = await signUp.attemptEmailAddressVerification({
          code: verificationCode.trim(),
        });

        if (verifiedSignUp?.status !== 'complete' || !verifiedSignUp.createdSessionId) {
          setError(`Verification did not complete sign-up: ${verifiedSignUp?.status || 'unknown_status'}`);
          return;
        }

        await setSignUpActive({ session: verifiedSignUp.createdSessionId });

        const normalizedEmail = formData.username.toLowerCase().trim();
        const bridgeUser = syncClerkUserToLocalStorage({
          id: verifiedSignUp.createdUserId || normalizedEmail,
          username: normalizedEmail,
          unsafeMetadata: {},
        });
        onAuthSuccess(bridgeUser);
        return;
      }

      const verifiedAttempt = await verifyEmailSecondFactor(signIn, verificationCode.trim());
      const activeAttempt = verifiedAttempt || signIn;

      if (activeAttempt?.status !== 'complete') {
        setError(`Verification did not complete sign-in: ${activeAttempt?.status || 'unknown_status'}`);
        return;
      }

      await activateSession(activeAttempt, formData.username.toLowerCase().trim());

      const normalizedUsername = formData.username.toLowerCase().trim();
      const bridgeUser = syncClerkUserToLocalStorage({
        id: activeAttempt?.createdSessionId || normalizedUsername,
        username: normalizedUsername,
        unsafeMetadata: {},
      });
      onAuthSuccess(bridgeUser);
    } catch (err) {
      console.error('Client trust verification error:', err);
      setError(getClerkErrorMessage(err, 'Verification failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    if (!needsClientTrust && !showLoginPassword) {
      e.preventDefault();
      advanceLoginStep();
      return;
    }

    await handleLogin(e);
  };

  const handleSocialAuth = async (strategy) => {
    setError('');
    setSocialLoading(strategy);

    try {
      if (!signInLoaded || !signIn) {
        throw new Error('Social sign-in is still loading. Please try again.');
      }

      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/auth/callback',
        redirectUrlComplete: '/',
      });
    } catch (err) {
      console.error('Social auth error:', err);
      setError(getClerkErrorMessage(err, 'Unable to start social sign-in.'));
      setSocialLoading('');
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
            Sign in or create your account
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

          {needsClientTrust ? (
            <form onSubmit={handleVerifyClientTrust}>
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 12px 0' }}>
                  {verificationMode === 'signUp'
                    ? 'Enter the verification code sent to your email to create your account.'
                    : 'Enter the verification code sent to your email to finish signing in.'}
                </p>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter verification code"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !verificationCode.trim()}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'var(--text-primary)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading || !verificationCode.trim() ? 'not-allowed' : 'pointer',
                  opacity: loading || !verificationCode.trim() ? 0.6 : 1
                }}
              >
                {loading ? 'Verifying...' : 'Verify and Continue'}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setError('');
                  try {
                    if (verificationMode === 'signUp') {
                      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
                    } else {
                      await prepareEmailSecondFactor(signIn);
                    }
                  } catch (err) {
                    setError(getClerkErrorMessage(err, 'Failed to resend verification code.'));
                  }
                }}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '12px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Resend Code
              </button>
            </form>
          ) : (
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
                  type="text"
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
                  minLength={6}
                  autoComplete="current-password"
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
              disabled={loading || !!socialLoading}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                background: 'var(--text-primary)',
                color: 'var(--bg-primary)',
                borderRadius: '8px',
                cursor: loading || socialLoading ? 'wait' : 'pointer',
                opacity: loading || socialLoading ? 0.7 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => !loading && !socialLoading && (e.target.style.opacity = '0.9')}
              onMouseLeave={(e) => !loading && !socialLoading && (e.target.style.opacity = '1')}
            >
              {loading ? 'Please wait...' : (showLoginPassword ? 'Continue' : 'Continue')}
            </button>
          </form>
          )}

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
