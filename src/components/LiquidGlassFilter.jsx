import React from 'react';

/**
 * Apple "Liquid Glass" backdrop filter — the real displacement-map recipe, not
 * just a blur. Ported from the design reference's `zepLiquidGlassFilter`,
 * which in turn comes from github.com/nikdelvin/liquid-glass (MIT).
 *
 * How it works: a generated SVG image is used as a displacement map. Its red
 * channel ramps 0 -> 255 left-to-right and its blue channel ramps 0 -> 255
 * top-to-bottom, so every pixel encodes an (x, y) offset. A neutral #808080
 * rounded rect is painted over the middle and blurred, which pins the centre to
 * "no displacement" and leaves a soft ramp only near the edges. Feed that to
 * feDisplacementMap and the backdrop bends outward at the rim exactly the way
 * light bends through the edge of a real pane of glass — the part a plain
 * blur() can never fake.
 *
 * The filter is referenced from CSS as `backdrop-filter: url(#gx-glass-bar)`,
 * which only Chromium honours. Everything else falls back to the blur tier in
 * liquid-glass.css; see src/lib/liquidGlass.js for the tier selection.
 */

// Sizes are the map's own resolution, not the element's — feImage stretches the
// map over the filter region with preserveAspectRatio="none", so a bar of any
// width reuses the same map. Only the aspect ratio needs to roughly match, which
// is why the horizontal bar and the vertical rail get separate maps.
const buildDisplacementMap = ({ width, height, radius, feather }) => {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    '<defs>',
    '<linearGradient id="x" x1="0" y1="0" x2="1" y2="0">',
    '<stop offset="0" stop-color="#000000"/><stop offset="1" stop-color="#ff0000"/>',
    '</linearGradient>',
    '<linearGradient id="y" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#000000"/><stop offset="1" stop-color="#0000ff"/>',
    '</linearGradient>',
    '</defs>',
    `<rect width="${width}" height="${height}" fill="#000000"/>`,
    `<rect width="${width}" height="${height}" fill="url(#x)" style="mix-blend-mode:screen"/>`,
    `<rect width="${width}" height="${height}" fill="url(#y)" style="mix-blend-mode:screen"/>`,
    `<rect x="${feather}" y="${feather}" width="${width - feather * 2}" height="${height - feather * 2}" rx="${radius}" fill="#808080" style="filter:blur(${feather}px)"/>`,
    '</svg>',
  ].join('');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

// Horizontal bars (app header, mobile footer): the lens ramp lands on the long
// top/bottom edges, so the map is wide and short.
const BAR_MAP = buildDisplacementMap({ width: 320, height: 72, radius: 14, feather: 12 });
// Vertical rail (desktop sidebar): same recipe, rotated.
const RAIL_MAP = buildDisplacementMap({ width: 96, height: 420, radius: 14, feather: 14 });

// scale is in CSS px of backdrop offset at the very edge of the ramp. Past ~40
// the bend reads as a smear rather than glass, and the cost of the displacement
// pass climbs with it.
const BAR_SCALE = 28;
const RAIL_SCALE = 22;

// True colour displacement (chromatic aberration), not just spatial warp:
// ported from the same reference's getDisplacementFilter, which runs three
// separate feDisplacementMap passes -- one per RGB channel, each at a
// slightly different scale -- then screens them back together. Real glass
// bends red/green/blue by very slightly different amounts at a curved edge;
// a single feDisplacementMap pass (the previous version here) can only shove
// all three channels together, which reads as pure blur-and-warp with no
// colour fringing at all.
const CHROMATIC_ABERRATION = 6;

function ChannelDisplacement({ scale, resultId }) {
  return (
    <>
      <feDisplacementMap
        in="SourceGraphic"
        in2="map"
        scale={scale}
        xChannelSelector="R"
        yChannelSelector="B"
        result={`${resultId}Full`}
      />
      <feColorMatrix
        in={`${resultId}Full`}
        type="matrix"
        values={
          resultId === 'r'
            ? '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'
            : resultId === 'g'
              ? '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'
              : '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'
        }
        result={resultId}
      />
    </>
  );
}

function GlassFilter({ id, map, scale }) {
  return (
    <filter id={id} colorInterpolationFilters="sRGB" x="0" y="0" width="1" height="1">
      <feImage href={map} xlinkHref={map} preserveAspectRatio="none" result="rawMap" />
      {/* If feImage ever fails to decode, the map comes through transparent and
          every channel reads 0 — which is a hard -scale/2 shove of the whole
          backdrop, not a no-op. Compositing over an opaque neutral flood makes
          that failure degrade to zero displacement instead. */}
      <feFlood floodColor="#808080" floodOpacity="1" result="neutral" />
      <feComposite in="rawMap" in2="neutral" operator="over" result="map" />
      <ChannelDisplacement scale={scale + CHROMATIC_ABERRATION * 2} resultId="r" />
      <ChannelDisplacement scale={scale + CHROMATIC_ABERRATION} resultId="g" />
      <ChannelDisplacement scale={scale} resultId="b" />
      <feBlend in="r" in2="g" mode="screen" result="rg" />
      <feBlend in="rg" in2="b" mode="screen" />
    </filter>
  );
}

const LiquidGlassFilter = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    // Not display:none — a filter inside a fully hidden subtree stops resolving
    // in some engines. Collapse it to zero pixels instead.
    style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
  >
    <defs>
      {/* colorInterpolationFilters must stay sRGB. In the default linearRGB the
          #808080 neutral no longer decodes to 128, and the "no displacement"
          centre drifts into a visible shove. */}
      <GlassFilter id="gx-glass-bar" map={BAR_MAP} scale={BAR_SCALE} />
      <GlassFilter id="gx-glass-rail" map={RAIL_MAP} scale={RAIL_SCALE} />
    </defs>
  </svg>
);

export default LiquidGlassFilter;
