import React from 'react';

/**
 * Themed confirmation modal to replace browser confirm/prompt dialogs
 */
export default function ConfirmModal({ 
  isOpen, 
  title = 'Confirm', 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  confirmColor = 'var(--text-primary)',
  isDanger = false,
  requireInput = null, // If set, user must type this to confirm
  inputValue = '',
  onInputChange,
  onConfirm, 
  onCancel 
}) {
  if (!isOpen) return null;

  const isConfirmDisabled = requireInput && inputValue !== requireInput;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10001,
        padding: '20px',
      }}
      onClick={onCancel}
    >
      <div 
        style={{
          background: 'var(--card-bg)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 600,
            color: isDanger ? '#f87171' : 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            {isDanger && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            )}
            {title}
          </h3>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          <p style={{
            margin: '0 0 20px 0',
            fontSize: '14px',
            color: 'var(--text-secondary)',
            lineHeight: 1.6
          }}>
            {message}
          </p>

          {requireInput && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                color: 'var(--text-tertiary)',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Type "{requireInput}" to confirm
              </label>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder={requireInput}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '14px',
                fontWeight: 500,
                border: '1px solid var(--border-color)',
                background: 'transparent',
                color: 'var(--text-primary)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isConfirmDisabled}
              style={{
                flex: 1,
                padding: '12px',
                fontSize: '14px',
                fontWeight: 500,
                border: isDanger ? '1px solid #f87171' : 'none',
                background: isDanger ? 'transparent' : confirmColor,
                color: isDanger ? '#f87171' : 'var(--bg-primary)',
                borderRadius: '8px',
                cursor: isConfirmDisabled ? 'not-allowed' : 'pointer',
                opacity: isConfirmDisabled ? 0.5 : 1,
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { if (!isConfirmDisabled) e.currentTarget.style.background = isDanger ? 'rgba(248, 113, 113, 0.1)' : 'var(--text-secondary)'; }}
              onMouseLeave={(e) => { if (!isConfirmDisabled) e.currentTarget.style.background = isDanger ? 'transparent' : confirmColor; }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
