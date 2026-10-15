import React from 'react';

// SDF edge-lens implementation adapted from LeonardSEO/liquid-glass-react
// (MIT). This filter is shared by the identically shaped More-menu pills.
const LENS_ID = 'gx-more-liquid-lens';
const MAP_SRC = '/gx-more-liquid-lens.png';

const supportsChromiumLens = () => {
  if (typeof navigator === 'undefined') return false;
  return /(?:Chrome|Chromium|Edg|OPR)\//.test(navigator.userAgent) && !/Firefox|FxiOS/.test(navigator.userAgent);
};

export function AppleLiquidGlassFilter() {
  return (
    <svg aria-hidden="true" focusable="false" width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
      <defs>
        <filter id={LENS_ID} colorInterpolationFilters="sRGB" x="0%" y="0%" width="100%" height="100%">
          <feImage href={MAP_SRC} preserveAspectRatio="none" x="0" y="0" width="100%" height="100%" result="map" />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="-38" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

export default function LiquidGlass({
  as: Component = 'div',
  children,
  className = '',
  style = {},
  light = false,
  ...props
}) {
  const textClass = `gx-apple-glass-${React.useId().replace(/:/g, '')}`;
  const {
    background: _background,
    border: _border,
    boxShadow: _boxShadow,
    backdropFilter: _backdropFilter,
    WebkitBackdropFilter: _webkitBackdropFilter,
    width,
    height,
    minHeight,
    borderRadius,
    ...contentStyle
  } = style;
  const resolvedHeight = height || minHeight;
  const foreground = light ? '#1e293b' : '#f4f6fa';
  const fallback = 'blur(12px) saturate(100%) brightness(1.04)';
  const refractive = `blur(4px) url(#${LENS_ID}) saturate(100%) brightness(1.06)`;
  const material = supportsChromiumLens() ? refractive : fallback;

  return (
    <Component
      className={`${className} ${textClass}`.trim()}
      style={{
        ...contentStyle,
        position: style.position || 'relative',
        zIndex: style.zIndex,
        alignSelf: 'flex-end',
        flexShrink: style.flexShrink,
        display: style.display || 'flex',
        width: width || 'fit-content',
        height: resolvedHeight,
        minHeight,
        borderRadius,
        boxSizing: 'border-box',
        overflow: 'hidden',
        isolation: 'isolate',
        background: light ? 'rgba(220,220,224,0.62)' : 'rgba(42,42,46,0.68)',
        backdropFilter: material,
        WebkitBackdropFilter: material,
        border: light ? '1px solid rgba(255,255,255,0.82)' : '1px solid rgba(255,255,255,0.24)',
        boxShadow: light
          ? '0 10px 26px rgba(45,45,50,0.16), inset 0 1.5px 0.5px rgba(255,255,255,0.82), inset 0 -1px 1px rgba(55,55,60,0.16)'
          : '0 10px 26px rgba(0,0,0,0.3), inset 0 1.5px 0.5px rgba(255,255,255,0.26), inset 0 -1px 1px rgba(0,0,0,0.28)',
        color: foreground,
      }}
      {...props}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: -1,
          pointerEvents: 'none',
          borderRadius: 'inherit',
          background: light
            ? 'linear-gradient(to bottom, rgba(255,255,255,0.3), transparent 38%, rgba(90,90,96,0.1))'
            : 'linear-gradient(to bottom, rgba(255,255,255,0.13), transparent 38%, rgba(0,0,0,0.12))',
        }}
      />
      {light && <style>{`.${textClass}, .${textClass} * { color: ${foreground} !important; }`}</style>}
      {children}
    </Component>
  );
}
