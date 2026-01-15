import React, { useState, useEffect } from 'react';

export default function FeedbackRibbon() {
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [cachedRA, setCachedRA] = useState(null);
  const [error, setError] = useState(null);

  // Temporarily hidden per request
  return null;

  useEffect(() => {
    // Check if already submitted (hide if submitted)
    const submitted = localStorage.getItem('gradex_feedback_submitted');
    if (submitted) {
      setIsSubmitted(true);
      return;
    }

    // Get cached RA from localStorage
    try {
      const savedRA = localStorage.getItem('gradex_saved_ra');
      if (savedRA) {
        setCachedRA(savedRA.toUpperCase());
      }
    } catch (err) {
      console.warn('Failed to load RA from localStorage:', err);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/log?type=feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: feedback.trim(),
          registerNumber: cachedRA || null,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setIsSubmitted(true);
        localStorage.setItem('gradex_feedback_submitted', 'true');
        setFeedback('');
        setError(null);
      } else {
        const errorMessage = data.error || data.message || 'Failed to submit feedback';
        setError(errorMessage);
        console.error('Failed to submit feedback:', errorMessage, data);
      }
    } catch (error) {
      const errorMessage = error.message || 'Network error. Please try again.';
      setError(errorMessage);
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setIsSubmitted(true);
    localStorage.setItem('gradex_feedback_submitted', 'true');
  };

  if (isSubmitted) return null;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1400px',
        margin: '0 auto',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: 'clamp(16px, 4vw, 20px)',
        marginTop: 'clamp(20px, 5vw, 40px)',
        marginBottom: 'clamp(20px, 5vw, 40px)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontSize: 'clamp(12px, 2.5vw, 13px)',
          color: 'var(--text-secondary)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        Tell us our uniqueness!
      </span>
      {error && (
        <span
          style={{
            fontSize: '12px',
            color: '#f87171',
            fontWeight: 500,
            padding: '4px 8px',
            background: 'rgba(248, 113, 113, 0.1)',
            borderRadius: '4px',
            flex: '0 0 auto',
          }}
        >
          {error}
        </span>
      )}
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          minWidth: '200px',
          maxWidth: '100%',
        }}
      >
          <input
            type="text"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Your feedback..."
            maxLength={200}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              background: 'var(--card-bg)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'var(--border-hover)';
              e.target.style.boxShadow = '0 0 0 3px rgba(255, 255, 255, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'var(--border-color)';
              e.target.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            disabled={!feedback.trim() || isSubmitting}
            style={{
              padding: '8px 16px',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              background: feedback.trim() && !isSubmitting ? 'var(--text-primary)' : 'var(--card-bg)',
              color: feedback.trim() && !isSubmitting ? 'var(--bg-primary)' : 'var(--text-tertiary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: feedback.trim() && !isSubmitting ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (feedback.trim() && !isSubmitting) {
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = 'none';
            }}
        >
          {isSubmitting ? 'Sending...' : 'Submit'}
        </button>
      </form>
      <button
        onClick={handleDismiss}
        style={{
          padding: '6px',
          border: 'none',
          background: 'transparent',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.target.style.color = 'var(--text-primary)';
          e.target.style.background = 'var(--hover-bg)';
        }}
        onMouseLeave={(e) => {
          e.target.style.color = 'var(--text-tertiary)';
          e.target.style.background = 'transparent';
        }}
        title="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

