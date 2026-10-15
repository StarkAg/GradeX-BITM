import React from 'react';

// Dev-only side panel (see shouldTuneMoreMenuSprings in utils/homeHelpers.js)
// for live-tuning the More menu's bubble-pop spring: drag a slider, the real
// menu on screen replays immediately with those values.
const FIELDS = [
  { key: 'stiffness', label: 'Stiffness', min: 20, max: 500, step: 5 },
  { key: 'damping', label: 'Damping (friction)', min: 2, max: 60, step: 1 },
  { key: 'mass', label: 'Mass', min: 0.2, max: 3, step: 0.1 },
  { key: 'stagger', label: 'Stagger delay (ms)', min: 0, max: 200, step: 5 },
];

export default function MoreMenuSpringTuner({ params, onChange, onReplay }) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: '50%',
        right: '12px',
        transform: 'translateY(-50%)',
        zIndex: 10001,
        width: '220px',
        maxWidth: 'calc(100vw - 24px)',
        background: 'rgba(18,18,22,0.92)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '14px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        fontFamily: 'var(--gradex-font-body)',
        color: '#f2f3f5',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.6 }}>
        Spring tuner
      </div>
      {FIELDS.map((field) => (
        <label key={field.key} style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
          <span style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{field.label}</span>
            <span style={{ opacity: 0.6, fontVariantNumeric: 'tabular-nums' }}>{params[field.key]}</span>
          </span>
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={params[field.key]}
            onChange={(e) => onChange({ ...params, [field.key]: parseFloat(e.target.value) })}
            style={{ width: '100%' }}
          />
        </label>
      ))}
      <button
        type="button"
        onClick={onReplay}
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.16)',
          background: 'rgba(255,255,255,0.08)',
          color: '#f2f3f5',
          fontWeight: 600,
          fontSize: '13px',
          cursor: 'pointer',
        }}
      >
        Replay
      </button>
      <p style={{ margin: 0, fontSize: '10.5px', lineHeight: 1.5, opacity: 0.5 }}>
        Higher stiffness = snappier. Lower damping = bouncier (more overshoot).
        Stagger is per-row delay, applied bottom row first.
      </p>
    </div>
  );
}
