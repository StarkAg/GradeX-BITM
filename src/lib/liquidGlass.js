/**
 * Picks which glass tier the device can actually render and stamps it on
 * <html data-glass="...">. liquid-glass.css keys every rule off that attribute,
 * so nothing has to feature-detect in CSS.
 *
 *   refract - desktop Chromium: real feDisplacementMap edge refraction + blur.
 *   blur    - WebKit/Firefox/native WebViews, and every handheld regardless of
 *             engine: blur + saturate + the specular chrome. Reads as glass,
 *             just without the lensing. See isHandheld() for why phones are
 *             excluded from refract even when their engine supports it.
 *   off     - reduced-transparency, or no backdrop-filter at all: opaque bars.
 *
 * localStorage 'gradex-glass' force-overrides the pick, which is what
 * setGlassMode() below is for — handy for eyeballing the tiers side by side.
 */

const STORAGE_KEY = 'gradex-glass';
export const GLASS_MODES = ['refract', 'blur', 'off'];
export const GLASS_CHANGE_EVENT = 'gradexGlassChanged';

const supportsBackdrop = () => {
  if (typeof CSS === 'undefined' || !CSS.supports) return false;
  return CSS.supports('backdrop-filter', 'blur(1px)') || CSS.supports('-webkit-backdrop-filter', 'blur(1px)');
};

// WebKit parses `backdrop-filter: url(...)` but silently drops the SVG filter,
// which leaves the bar unblurred and see-through. Safari and every iOS WebView
// (Capacitor included) are pinned to blur for that reason.
const isWebKitOnly = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua);
};

// CSS.supports('backdrop-filter', 'url(#x)') only checks that the *syntax*
// parses -- Chromium accepts that grammatically even in builds/configs where
// actually assigning the value doesn't stick. Write it to a real element and
// read the computed inline value back instead: the technique this is ported
// from (github.com/nikdelvin/liquid-glass) uses exactly this test because
// CSS.supports produced false positives for them too.
const supportsBackdropFilterUrl = () => {
  if (typeof document === 'undefined') return false;
  const testEl = document.createElement('div');
  testEl.style.cssText = 'backdrop-filter: url(#gx-glass-bar)';
  return (
    testEl.style.backdropFilter === 'url(#gx-glass-bar)' ||
    testEl.style.backdropFilter === 'url("#gx-glass-bar")'
  );
};

// The capacity half of the tier decision. `refract` puts three
// feDisplacementMap passes (one per RGB channel, for chromatic aberration)
// plus blur and saturate into a backdrop-filter on the nav bar AND the icon
// rail -- and a backdrop-filter re-runs that whole filter graph every time
// anything behind it scrolls. A desktop GPU absorbs it; a phone does not.
//
// This matters specifically because the check below is Chromium-vs-WebKit:
// Android WebView is Chromium, so it was falling straight through to the most
// expensive tier, while every iOS device was already pinned to plain blur.
// That asymmetry is why the rail janked on Android and not on iPhone. The
// tier logic only ever asked "can this engine do it?" -- this adds "should
// this device do it?".
export const isHandheld = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  // The packaged Capacitor apps, whatever their UA claims.
  if (window.Capacitor?.isNativePlatform?.()) return true;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')) return true;
  // Touch-first device with a small viewport: a tablet or a phone in a browser
  // whose UA doesn't say so.
  if (!window.matchMedia) return false;
  return window.matchMedia('(pointer: coarse)').matches && window.matchMedia('(max-width: 1024px)').matches;
};

const prefersLessTransparency = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
};

export const detectGlassMode = () => {
  if (!supportsBackdrop()) return 'off';
  if (prefersLessTransparency()) return 'off';
  if (isWebKitOnly()) return 'blur';
  if (isHandheld()) return 'blur';
  if (supportsBackdropFilterUrl()) return 'refract';
  return 'blur';
};

export const getGlassMode = () => document.documentElement.getAttribute('data-glass') || 'off';

const applyGlassMode = (mode) => {
  document.documentElement.setAttribute('data-glass', mode);
  window.dispatchEvent(new CustomEvent(GLASS_CHANGE_EVENT, { detail: { mode } }));
};

export const setGlassMode = (mode) => {
  if (!GLASS_MODES.includes(mode)) return;
  try { localStorage.setItem(STORAGE_KEY, mode); } catch (_) {}
  applyGlassMode(mode);
};

export const clearGlassOverride = () => {
  try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
  applyGlassMode(detectGlassMode());
};

export function initLiquidGlass() {
  if (typeof document === 'undefined') return;

  let override = null;
  try { override = localStorage.getItem(STORAGE_KEY); } catch (_) {}

  applyGlassMode(GLASS_MODES.includes(override) ? override : detectGlassMode());

  // Re-evaluate if the OS transparency setting flips mid-session, but never
  // stomp an explicit override.
  if (window.matchMedia) {
    const query = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const onChange = () => {
      let current = null;
      try { current = localStorage.getItem(STORAGE_KEY); } catch (_) {}
      if (GLASS_MODES.includes(current)) return;
      applyGlassMode(detectGlassMode());
    };
    if (query.addEventListener) query.addEventListener('change', onChange);
    else if (query.addListener) query.addListener(onChange);
  }

  // Console escape hatch while tuning: __gradexGlass('blur')
  window.__gradexGlass = setGlassMode;
  window.__gradexGlassReset = clearGlassOverride;
}
