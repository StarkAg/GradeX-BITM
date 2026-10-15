import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import UserSection from './UserSection';
import { areNativeHapticsEnabled, setNativeHapticsEnabled, HAPTICS_CHANGE_EVENT } from '../lib/nativeHaptics.js';
import { shouldPreviewMoreMenu, shouldTuneMoreMenuSprings } from '../utils/homeHelpers';
import { animateSpring } from '../utils/springPhysics';
import MoreMenuSpringTuner from './MoreMenuSpringTuner';
import LiquidGlass, { AppleLiquidGlassFilter } from './LiquidGlass';
import NavLens from './NavLens';

// Hook to detect mobile devices
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

// Theme for AI logo: dark → white icon, light → black icon (updates on theme toggle)
const useTheme = () => {
  const [theme, setTheme] = useState(() => document.documentElement.getAttribute('data-theme') || 'dark');
  useEffect(() => {
    const update = (e) => {
      const next = e?.detail?.theme || document.documentElement.getAttribute('data-theme') || 'dark';
      setTheme(next);
    };
    window.addEventListener('themeChanged', update);
    return () => window.removeEventListener('themeChanged', update);
  }, []);
  return theme;
};

const Icon = ({ children, size = 20 }) => (
  <span style={{ width: `${size}px`, height: `${size}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
    {children}
  </span>
);

const getNavIcon = (itemId) => {
  if (itemId === 'realdac') return icons.realdac;
  const icon = icons[itemId];
  return icon === null ? null : (icon || icons.groupgrid);
};

const FOOTER_STORAGE_KEY = 'gradex_footer_ids';
const DEFAULT_FOOTER_IDS = ['home', 'timetable', 'attendance', 'calendar', 'subjects'];
const EXAM_MODE_FOOTER_IDS = ['home', 'gradex', 'subdeck', 'marks', 'calendar'];
const EXAM_MODE_FOOTER_EXCLUDED_IDS = new Set(['timetable', 'attendance']);
const MIN_FOOTER_SLOTS = 1;
const MAX_FOOTER_SLOTS = 24;
const FOOTER_SCROLL_THRESHOLD = 8;
const EDIT_FOOTER_BOX_SIZE = 76;
const FADED_NAV_OPACITY = 0.38;
const UNAVAILABLE_NAV_IDS = new Set(['ai', 'thermal-print', 'expenza', 'mart']);
const ACTIVE_NAV_IDS = new Set([]);
const LOGIN_REQUIRED_NAV_IDS = new Set();
// Daily class-time flow — kept visually grouped at the top of the side panel, separated
// from everything else by a gap (not opacity) so the frequent items stay easy to scan.
const PRIMARY_NAV_IDS = new Set(['home', 'timetable', 'attendance', 'calendar', 'subjects']);

const icons = {
  home: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  ),
  groupgrid: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"></rect>
      <rect x="14" y="3" width="7" height="7"></rect>
      <rect x="14" y="14" width="7" height="7"></rect>
      <rect x="3" y="14" width="7" height="7"></rect>
    </svg>
  ),
  compensatory: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
      <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
    </svg>
  ),
  'step-class': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16"></path>
      <path d="M7 3h10v8a5 5 0 0 1-10 0V3z"></path>
      <path d="M9 21h6"></path>
      <path d="M12 16v5"></path>
      <path d="M9 10h6"></path>
    </svg>
  ),
  paste: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
    </svg>
  ),
  seatfinder: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h16v10H4z"></path>
      <path d="M4 9V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"></path>
      <path d="M8 19v2"></path>
      <path d="M16 19v2"></path>
      <path d="M12 9v10"></path>
    </svg>
  ),
  subdeck: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  ),
  feedfill: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  ),
  gradex: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  ),
  timetable: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect>
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="8" y1="9" x2="8" y2="20"></line>
      <line x1="8" y1="14" x2="21" y2="14"></line>
    </svg>
  ),
  expenza: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  ),
  attendance: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  ),
  'attendance-tracker': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18"></path>
      <path d="M7 14l3-3 3 2 4-5"></path>
      <circle cx="17" cy="8" r="1.5"></circle>
    </svg>
  ),
  srmlogin: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  ),
  user: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  ),
  marks: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="2" x2="12" y2="6"></line>
      <line x1="12" y1="18" x2="12" y2="22"></line>
      <line x1="2" y1="12" x2="6" y2="12"></line>
      <line x1="18" y1="12" x2="22" y2="12"></line>
    </svg>
  ),
  subjects: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  ),
  courses: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="16" y1="2" x2="16" y2="6"></line>
      <line x1="8" y1="2" x2="8" y2="6"></line>
      <line x1="3" y1="10" x2="21" y2="10"></line>
    </svg>
  ),
  'thermal-print': (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V3h12v6"></path>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v5a2 2 0 0 1-2 2h-2"></path>
      <rect x="6" y="14" width="12" height="7"></rect>
      <line x1="8" y1="17" x2="16" y2="17"></line>
    </svg>
  ),
  food: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 010 8h-1"></path>
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"></path>
      <line x1="6" y1="1" x2="6" y2="4"></line>
      <line x1="10" y1="1" x2="10" y2="4"></line>
      <line x1="14" y1="1" x2="14" y2="4"></line>
    </svg>
  ),
  laundry: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="2" width="18" height="20" rx="2"></rect>
      <circle cx="12" cy="13" r="5"></circle>
      <circle cx="12" cy="13" r="2"></circle>
      <line x1="6" y1="5" x2="6.01" y2="5"></line>
      <line x1="9" y1="5" x2="9.01" y2="5"></line>
    </svg>
  ),
  confera: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  messmenu: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path>
      <path d="M7 2v20"></path>
      <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3v0"></path>
    </svg>
  ),
  faculty: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  realdac: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
    </svg>
  ),
  ai: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74z" />
    </svg>
  ),
};

// AI logo: black/white PNG per theme (dark → white, light → black)
const AI_LOGO_BLACK = '/ai-logo-black.png';
const AI_LOGO_WHITE = '/ai-logo-white.png';
const GradeXBotIcon = ({ size = 28, theme = 'dark' }) => (
  <img
    src={theme === 'light' || theme === 'warm' ? AI_LOGO_BLACK : AI_LOGO_WHITE}
    alt="AI"
    width={size}
    height={size}
    style={{ display: 'block', objectFit: 'contain' }}
  />
);

export default function Navigation({ onToggle, isCollapsed, navItems, isConnected, onLogout, isExamMode = false }) {
  const location = useLocation();
  const [isHovered, setIsHovered] = React.useState(false);
  const [showMoreMenu, setShowMoreMenu] = React.useState(() => shouldPreviewMoreMenu() || shouldTuneMoreMenuSprings());
  const [isMoreMenuClosing, setIsMoreMenuClosing] = React.useState(false);
  const [moreMenuRightInset, setMoreMenuRightInset] = React.useState(16);
  const [moreMenuBottomInset, setMoreMenuBottomInset] = React.useState(84);
  const [editingFooter, setEditingFooter] = React.useState(false);
  const tuneMoreMenuSprings = React.useMemo(() => shouldTuneMoreMenuSprings(), []);
  // Inside the desktop phone-preview iframe, DesktopDeviceShell renders the
  // slider panel itself, out in the spacious chrome beside the bezel instead
  // of squeezed into the phone-sized viewport -- this document only owns the
  // state the sliders drive, synced in over postMessage. Outside the preview
  // (a real device, or this URL loaded directly with no wrapper), there's no
  // outer chrome to host a panel, so this renders its own local one instead.
  const isInsidePreviewIframe = React.useMemo(
    () => typeof window !== 'undefined' && window.self !== window.top,
    []
  );
  // Landed on by ear via the tuner: snappy but with a visible, slightly
  // heavy bounce (mass 2 makes the overshoot linger a beat longer).
  const [springParams, setSpringParams] = React.useState({ stiffness: 500, damping: 27, mass: 2, stagger: 45 });
  const [springReplayKey, setSpringReplayKey] = React.useState(0);
  const moreRowRefs = React.useRef([]);
  const moreLabelRefs = React.useRef([]);
  const moreTriggerRef = React.useRef(null);
  // The row of footer slots: the sliding lens measures and listens on this.
  const footerSlotsRef = React.useRef(null);
  React.useEffect(() => {
    if (!tuneMoreMenuSprings || !isInsidePreviewIframe) return undefined;
    function handleMessage(event) {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      if (data.type === 'gx-spring-params') setSpringParams(data.params);
      else if (data.type === 'gx-spring-replay') setSpringReplayKey((k) => k + 1);
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tuneMoreMenuSprings, isInsidePreviewIframe]);
  React.useEffect(() => {
    if (!tuneMoreMenuSprings || !isInsidePreviewIframe) return;
    window.parent.postMessage({ type: 'gx-more-menu-open', open: showMoreMenu }, '*');
  }, [tuneMoreMenuSprings, isInsidePreviewIframe, showMoreMenu]);
  // Haptics toggle: only relevant on the native shells (iOS + Android), where taps buzz.
  const isNativeShell = false; // no haptics plugin in this app's shell (see lib/nativeHaptics.js)
  const [hapticsOn, setHapticsOn] = React.useState(() => areNativeHapticsEnabled());
  React.useEffect(() => {
    const sync = () => setHapticsOn(areNativeHapticsEnabled());
    window.addEventListener(HAPTICS_CHANGE_EVENT, sync);
    return () => window.removeEventListener(HAPTICS_CHANGE_EVENT, sync);
  }, []);
  // Drives the More-menu bubble pop-in with real integrated spring physics
  // (utils/springPhysics.js), but ONLY while actively tuning
  // (?tuneMoreMenuSprings=1) -- that's the one context where seeing the
  // literal effect of dragging stiffness/damping/mass matters more than
  // rock-solid reliability. Normal use renders with a plain CSS keyframe
  // instead (further down, the .gx-more-row/.gx-more-label classes): a CSS
  // animation always resolves to its final `both`-filled state regardless of
  // ref timing, effect ordering, or anything else that could go wrong in a
  // JS-driven rAF loop -- it can't get stuck invisible the way this
  // ref-and-effect path could if something upstream misfired. The bottom-most
  // row (closest to the anchor button) starts first; each row above it is
  // delayed further, matching a bottom-to-top reveal. Kept at the top level
  // (not inside the `if (isMobile)` render branch below, where the row
  // elements themselves live) since isMobile can flip at runtime on resize,
  // and hooks can't be called conditionally.
  React.useEffect(() => {
    if (!tuneMoreMenuSprings || !showMoreMenu) return undefined;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const count = moreRowRefs.current.length;
    const cancelFns = [];
    const timeoutIds = [];
    for (let i = 0; i < count; i += 1) {
      const bubbleEl = moreRowRefs.current[i];
      const labelEl = moreLabelRefs.current[i];
      if (!bubbleEl) continue;
      if (prefersReducedMotion) {
        bubbleEl.style.opacity = '1';
        bubbleEl.style.transform = 'none';
        if (labelEl) labelEl.style.opacity = '1';
        continue;
      }
      bubbleEl.style.opacity = '0';
      if (labelEl) labelEl.style.opacity = '0';
      const delay = (count - 1 - i) * springParams.stagger;
      const timeoutId = window.setTimeout(() => {
        const cancel = animateSpring({
          from: 0,
          to: 1,
          stiffness: springParams.stiffness,
          damping: springParams.damping,
          mass: springParams.mass,
          onUpdate: (t) => {
            const opacity = String(Math.min(1, Math.max(0, t * 3)));
            bubbleEl.style.opacity = opacity;
            bubbleEl.style.transform = `scale(${Math.max(0, t)}) translateY(${40 * (1 - t)}px)`;
            if (labelEl) labelEl.style.opacity = opacity;
          },
        });
        cancelFns.push(cancel);
      }, delay);
      timeoutIds.push(timeoutId);
    }
    return () => {
      timeoutIds.forEach((id) => window.clearTimeout(id));
      cancelFns.forEach((cancel) => cancel());
    };
  }, [showMoreMenu, springParams, springReplayKey]);
  const [selectedFooterIndex, setSelectedFooterIndex] = React.useState(null);
  const [footerIds, setFooterIds] = React.useState(() => {
    try {
      const s = localStorage.getItem(FOOTER_STORAGE_KEY);
      if (s) {
        const a = JSON.parse(s);
        if (Array.isArray(a) && a.length >= MIN_FOOTER_SLOTS && a.length <= MAX_FOOTER_SLOTS) {
          const normalized = a.slice(0, MAX_FOOTER_SLOTS);
          const isLegacyDefault =
            normalized.length === 4 &&
            normalized[0] === 'home' &&
            normalized[1] === 'timetable' &&
            normalized[2] === 'attendance' &&
            normalized[3] === 'marks';
          return isLegacyDefault ? [...DEFAULT_FOOTER_IDS] : normalized;
        }
      }
    } catch (_) {}
    return [...DEFAULT_FOOTER_IDS];
  });
  const [selectedGridItemId, setSelectedGridItemId] = React.useState(null);
  const navigate = useNavigate();
  const [showComingSoon, setShowComingSoon] = React.useState(false);
  const isMobile = useIsMobile();
  const isIeeePage = location.pathname === '/ieee';
  const theme = useTheme();
  const isAttendancePage = location.pathname === '/attendance' || location.pathname === '/att';
  const closeMoreMenu = React.useCallback(() => {
    setShowMoreMenu(false);
    const reducedMotion = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    setIsMoreMenuClosing(!reducedMotion);
    setEditingFooter(false);
    setSelectedFooterIndex(null);
    setSelectedGridItemId(null);
  }, []);
  const openMoreMenu = React.useCallback(() => {
    setIsMoreMenuClosing(false);
    setShowMoreMenu(true);
  }, []);
  // Any page change (a menu link, or a link inside the profile popup) retracts
  // the menu, so it never stays open over the page it led to.
  const lastPathRef = React.useRef(location.pathname);
  React.useEffect(() => {
    if (lastPathRef.current === location.pathname) return;
    lastPathRef.current = location.pathname;
    if (showMoreMenu) closeMoreMenu();
  }, [location.pathname, showMoreMenu, closeMoreMenu]);

  // Anchor the panel to the actual More control. This keeps the bubble column
  // and the panel's bottom edge attached to the chevron at every viewport size.
  React.useLayoutEffect(() => {
    if (!isMobile || (!showMoreMenu && !isMoreMenuClosing)) return undefined;

    let alignmentFrame;
    const alignMoreMenu = () => {
      const trigger = moreTriggerRef.current;
      if (!trigger) return;
      const bounds = trigger.getBoundingClientRect();
      const triggerCenter = bounds.left + bounds.width / 2;
      // Panel padding (14) + row right padding (6) + bubble radius (22).
      setMoreMenuRightInset(Math.max(4, window.innerWidth - triggerCenter - 42));
      // Settle the pill stack close to the More control, with just enough
      // clearance for the navigation bar's rim.
      setMoreMenuBottomInset(Math.max(8, window.innerHeight - bounds.top - 8));

      // The visual edge of a material pill is not its layout edge. Correct
      // against a real menu icon after the sheet has committed so every icon
      // sits exactly in the More chevron's vertical column.
      window.cancelAnimationFrame(alignmentFrame);
      alignmentFrame = window.requestAnimationFrame(() => {
        const bubble = moreRowRefs.current.find(Boolean);
        if (!bubble) return;
        const bubbleBounds = bubble.getBoundingClientRect();
        const delta = triggerCenter - (bubbleBounds.left + bubbleBounds.width / 2);
        if (Math.abs(delta) > 0.5) {
          setMoreMenuRightInset((current) => Math.max(4, current - delta));
        }
      });
    };

    alignMoreMenu();
    window.addEventListener('resize', alignMoreMenu);
    return () => {
      window.cancelAnimationFrame(alignmentFrame);
      window.removeEventListener('resize', alignMoreMenu);
    };
  }, [isMobile, showMoreMenu, isMoreMenuClosing]);
  const handleLogout = React.useCallback(() => {
    closeMoreMenu();
    onLogout?.();
  }, [closeMoreMenu, onLogout]);
  
  const isActive = (path) => {
    const currentPath = location.pathname.toLowerCase();
    const itemPath = path.toLowerCase();
    return currentPath === itemPath || currentPath.startsWith(itemPath + '/');
  };

  // When collapsed, show expanded on hover; otherwise use actual state
  // On mobile, always show expanded (but as bottom bar)
  const shouldShowExpanded = isMobile ? true : (isCollapsed ? isHovered : true);
  const sidebarWidth = shouldShowExpanded ? '200px' : '60px';
  const shouldFadeNavItem = (itemId) =>
    UNAVAILABLE_NAV_IDS.has(itemId) || (!isConnected && LOGIN_REQUIRED_NAV_IDS.has(itemId));
  const sidepanelLabelStyle = {
    fontFamily: 'var(--gradex-font-body)',
    fontSize: 'var(--gradex-text-sm)',
    fontWeight: 700,
    letterSpacing: '0.01em',
    textTransform: 'none',
    lineHeight: 1.15,
  };
  const sidepanelCompactLabelStyle = {
    fontFamily: 'var(--gradex-font-body)',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.01em',
    textTransform: 'none',
    lineHeight: 1.1,
  };

  // Pages that exist, and the ones still to come
  const mainItems = navItems.filter((item) => !item.comingSoon);
  const comingSoonItems = navItems.filter((item) => item.comingSoon);
  
  // Mobile bottom bar: 3 customizable slots | More | Bot (footer IDs from localStorage)
  // IEEE keeps the normal GradeX header but needs all available vertical space
  // for the volunteer dashboard, so it intentionally has no bottom navigation.
  if (isMobile && isIeeePage) return null;
  if (isMobile) {
    const footerDefaultIds = isExamMode ? EXAM_MODE_FOOTER_IDS : DEFAULT_FOOTER_IDS;
    const footerNavItems = isExamMode
      ? navItems.filter((item) => !EXAM_MODE_FOOTER_EXCLUDED_IDS.has(item.id))
      : navItems.filter((item) => !item.comingSoon && !item.desktopOnly);
    const validNavIds = new Set(footerNavItems.map((i) => i.id));
    const valid = (isExamMode ? [...footerDefaultIds, ...footerIds] : footerIds)
      .filter((id, index, ids) => validNavIds.has(id) && ids.indexOf(id) === index);
    const resolvedFooterIds = valid.slice(0, MAX_FOOTER_SLOTS);
    if (resolvedFooterIds.length < MIN_FOOTER_SLOTS) {
      const need = MIN_FOOTER_SLOTS - resolvedFooterIds.length;
      const toAdd = footerDefaultIds.filter((x) => !resolvedFooterIds.includes(x)).slice(0, need);
      resolvedFooterIds.push(...toAdd);
    }
    const footerItems = resolvedFooterIds
      .map((id) => footerNavItems.find((item) => item.id === id))
      .filter(Boolean);
    const moreMenuItems = footerNavItems.filter((item) => !resolvedFooterIds.includes(item.id) && item.id !== 'user');
    // Total row count across mapped items + optional Haptics + Edit footer,
    // so the pop-in stagger below forms one continuous bottom-to-top
    // sequence (the row closest to the anchor button starts first) instead
    // of each section restarting its own count from zero.
    const moreMenuRowCount = moreMenuItems.length + (isNativeShell ? 1 : 0) + 1;
    const moreMenuCloseDelay = 560 + Math.max(0, moreMenuRowCount - 1) * 40;
    const morePillStyle = {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: '10px',
      width: 'min(236px, 100%)',
      minHeight: '52px',
      padding: '4px 6px 4px 14px',
      boxSizing: 'border-box',
      borderRadius: '999px',
      border: '1px solid rgba(255,255,255,0.12)',
      background: 'rgba(255,255,255,0.055)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 16px rgba(0,0,0,0.16)',
    };
    const getFooterItemLabel = (item) => {
      if (!isExamMode) return item.label;
      if (item.id === 'gradex') return 'Grades';
      if (item.id === 'subdeck') return 'Notes';
      return item.label;
    };
    const totalVisibleOptions = footerItems.length + 1;
    const useScrollLayout = totalVisibleOptions >= FOOTER_SCROLL_THRESHOLD;
    const footerOptionStyle = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '2px',
      padding: '12px 4px',
      borderRadius: 0,
      background: 'transparent',
      width: '100%',
      height: 'var(--gx-mobile-nav-height)',
      minWidth: useScrollLayout ? 'var(--gx-mobile-nav-height)' : 0,
      flex: useScrollLayout ? '0 0 var(--gx-mobile-nav-height)' : undefined,
      boxSizing: 'border-box',
      position: 'relative',
      font: 'inherit',
      lineHeight: 1,
      appearance: 'none',
      WebkitAppearance: 'none',
    };

    const handleSwapFooter = (otherItemId) => {
      if (selectedFooterIndex == null) return;
      const newIds = [...resolvedFooterIds];
      newIds[selectedFooterIndex] = otherItemId;
      setFooterIds(newIds);
      localStorage.setItem(FOOTER_STORAGE_KEY, JSON.stringify(newIds));
      setSelectedFooterIndex(null);
    };

    const handleAddToFooter = (otherItemId) => {
      if (resolvedFooterIds.length >= MAX_FOOTER_SLOTS || resolvedFooterIds.includes(otherItemId)) return;
      const newIds = [...resolvedFooterIds, otherItemId];
      setFooterIds(newIds);
      localStorage.setItem(FOOTER_STORAGE_KEY, JSON.stringify(newIds));
    };

    const handleRemoveFromFooter = (index) => {
      if (resolvedFooterIds.length <= 1) return;
      const newIds = resolvedFooterIds.filter((_, i) => i !== index);
      setFooterIds(newIds);
      localStorage.setItem(FOOTER_STORAGE_KEY, JSON.stringify(newIds));
      setSelectedFooterIndex(selectedFooterIndex === index ? null : selectedFooterIndex > index ? selectedFooterIndex - 1 : selectedFooterIndex);
      setSelectedGridItemId(null);
    };

    const handleSlotClickForGridItem = (slotIndex) => {
      if (selectedGridItemId == null) return;
      const newIds = [...resolvedFooterIds];
      newIds[slotIndex] = selectedGridItemId;
      setFooterIds(newIds);
      localStorage.setItem(FOOTER_STORAGE_KEY, JSON.stringify(newIds));
      setSelectedGridItemId(null);
    };

    return (
      <>
      <nav 
        className="gx-glass gx-glass--panel gx-glass--nav gx-mobile-nav-pill"
        style={{
          position: 'fixed',
          bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
          left: '50%',
          right: 'auto',
          transform: 'translateX(-50%)',
          paddingBottom: 0,
          paddingTop: 0,
          paddingLeft: 0,
          paddingRight: 0,
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 0,
          overflow: 'hidden',
        }}
      >
        <style>{`
          nav::-webkit-scrollbar { display: none; }
          .footer-icons-scroll::-webkit-scrollbar { display: none; }
          .footer-option {
            transition: transform 0.15s ease, background 0.2s ease, color 0.2s ease;
            -webkit-tap-highlight-color: transparent;
            justify-self: stretch;
          }
          .footer-option:active {
            transform: scale(0.92);
          }
          .footer-option[data-active="true"] svg > *:not(:first-child) {
            stroke: #000000;
          }
          [data-theme="light"] .footer-option[data-active="true"] svg > *:not(:first-child) {
            stroke: #ffffff;
          }
          .footer-option[data-active="true"][data-outline-active="true"] svg,
          .footer-option[data-active="true"][data-outline-active="true"] svg > * {
            fill: none !important;
            stroke: currentColor !important;
          }
          .footer-option-label {
            display: block;
            width: 100%;
            text-align: center;
            max-width: 100%;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        `}</style>

        {/* Footer slots - equal width when few, scroll when many */}
        <div
          className="footer-icons-scroll"
          ref={footerSlotsRef}
          style={{
            position: 'relative',
            // A sideways move on the bar carries the lens; up and down still
            // scrolls the page. Left alone when the bar itself scrolls sideways.
            touchAction: useScrollLayout ? undefined : 'pan-y',
            // Room at each end for the lens to reach past the first and last
            // slot by the same amount it does everywhere else, so it stays
            // centred on them. Exactly NavLens's OVERHANG_PX: with that, the
            // lens on the first slot starts at the bar's border, with no gap.
            paddingLeft: '4px',
            paddingRight: '4px',
            boxSizing: 'border-box',
            width: '100%',
            minWidth: 0,
            display: useScrollLayout ? 'flex' : 'grid',
            flexDirection: useScrollLayout ? 'row' : undefined,
            gridTemplateColumns: useScrollLayout ? undefined : `repeat(${totalVisibleOptions}, minmax(0, 1fr))`,
            alignItems: 'center',
            gap: 0,
            overflowX: useScrollLayout ? 'auto' : 'hidden',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <NavLens
            containerRef={footerSlotsRef}
            watch={`${location.pathname}|${resolvedFooterIds.join(',')}|${useScrollLayout ? 'scroll' : 'grid'}|${showMoreMenu ? 'more' : ''}`}
            draggable={!useScrollLayout}
          />
          {footerItems.map((item) => {
            const icon = getNavIcon(item.id);
            const shouldFade = shouldFadeNavItem(item.id);
            return (
              <Link
                key={item.id}
                to={item.path}
                draggable={false}
                className="footer-option"
                data-active={isActive(item.path) ? 'true' : undefined}
                data-outline-active={item.id === 'subdeck' && isActive(item.path) ? 'true' : undefined}
                style={{
                  ...footerOptionStyle,
                  textDecoration: 'none',
                  color: isActive(item.path) ? (theme === 'light' || theme === 'warm' ? 'var(--text-primary)' : 'rgba(255,255,255,0.95)') : 'var(--text-secondary)',
                  opacity: shouldFade ? FADED_NAV_OPACITY : 1,
                }}
              >
                {icon != null && (
                  <Icon size={22}>
                    {isActive(item.path)
                      ? React.cloneElement(icon, { fill: item.id === 'subdeck' ? 'none' : 'currentColor' })
                      : icon}
                  </Icon>
                )}
                <span className="footer-option-label" style={{ fontSize: 'var(--gradex-text-2xs)', fontWeight: isActive(item.path) ? 600 : 400, opacity: shouldFade ? 0.72 : (isActive(item.path) ? 1 : 0.75) }}>
                  {getFooterItemLabel(item)}
                  {ACTIVE_NAV_IDS.has(item.id) && <span style={{ display: 'inline-block', marginLeft: '3px', fontSize: '8px', fontWeight: 700, color: '#22c55e', letterSpacing: '0.02em' }}>ACTIVE</span>}
                </span>
              </Link>
            );
          })}

          {/* Opens the remaining navigation options. The chevron reverses while
              the panel is open, so it also reads as the close control. */}
          <button
            type="button"
            className="footer-option"
            ref={moreTriggerRef}
            onClick={() => (showMoreMenu ? closeMoreMenu() : openMoreMenu())}
            aria-label={showMoreMenu ? 'Close more navigation' : 'Open more navigation'}
            aria-expanded={showMoreMenu}
            data-divider={footerItems.length > 0 ? 'true' : undefined}
            style={{
              ...footerOptionStyle,
              border: 'none',
              cursor: 'pointer',
              color: showMoreMenu ? (theme === 'light' || theme === 'warm' ? 'var(--text-primary)' : 'rgba(255,255,255,0.95)') : 'var(--text-secondary)',
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                width: '1px',
                height: '26px',
                background: 'var(--border-color, rgba(0,0,0,0.15))',
                opacity: 0.9,
                pointerEvents: 'none',
              }}
            />
            <span style={{
              display: 'inline-flex',
              transform: showMoreMenu ? 'translateY(-2px) rotate(180deg)' : 'translateY(-2px)',
              transition: 'transform 180ms ease',
            }}>
              <Icon size={20}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
              </Icon>
            </span>
            <span className="footer-option-label" style={{ fontSize: 'var(--gradex-text-2xs)', fontWeight: showMoreMenu ? 600 : 400, opacity: showMoreMenu ? 1 : 0.75, transform: 'translateY(-1px)' }}>More</span>
          </button>

        </div>
      </nav>
      
      {/* More - anchored popover growing up from the nav pill: no full-screen
          dim/blur, the rest of the screen stays fully visible behind it. The
          fixed inset:0 layer below is transparent and exists only to catch
          an outside tap to close. */}
      {(showMoreMenu || isMoreMenuClosing) && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) closeMoreMenu(); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'transparent',
            zIndex: 9999,
            // The reverse animation is decorative once close is requested.
            // Let taps reach the bottom navigation immediately instead of
            // leaving an invisible full-screen layer over every button.
            pointerEvents: isMoreMenuClosing ? 'none' : 'auto',
          }}
        >
          <AppleLiquidGlassFilter />
          <style>{`
            @keyframes morePanelPop {
              from { opacity: 0; transform: scale(0.86) translateY(10px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
            .edit-footer-slots-scroll::-webkit-scrollbar { display: none; }
            /* Deterministic bubble pop-in: always resolves to its final
               (visible, full-size) state via fill-mode "both", regardless of
               refs/effects/JS timing -- this can never get stuck invisible. */
            @keyframes moreRowPop {
              0%   { opacity: 0; transform: scale(0.28) rotate(-6deg); }
              50%  { opacity: 1; transform: scale(1.1) rotate(2deg); }
              75%  { transform: scale(0.96) rotate(-1deg); }
              100% { opacity: 1; transform: scale(1) rotate(0deg); }
            }
            .gx-more-row {
              animation: moreRowPop 560ms cubic-bezier(0.22, 1.6, 0.4, 1) both;
            }
            @keyframes morePillSlide {
              from { opacity: 0; transform: translateY(18px) scale(0.9); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            .gx-more-pill {
              animation: morePillSlide 460ms cubic-bezier(0.22, 1.15, 0.4, 1) both;
              transform-origin: right bottom;
            }
            @keyframes moreLabelIn {
              from { opacity: 0; transform: translateX(-6px); }
              to   { opacity: 1; transform: translateX(0); }
            }
            .gx-more-label {
              animation: moreLabelIn 420ms ease-out both;
            }
            .gx-more-row--closing,
            .gx-more-label--closing,
            .gx-more-pill--closing {
              animation-direction: reverse;
            }
            @media (prefers-reduced-motion: reduce) {
              .gx-more-panel { animation: none !important; }
              .gx-more-row { animation: none !important; }
              .gx-more-label { animation: none !important; }
              .gx-more-pill { animation: none !important; }
            }
          `}</style>
          {/* Content: the floating panel itself, anchored above the nav pill */}
          <div
            className="gx-more-panel"
            onClick={(e) => e.stopPropagation()}
            onAnimationEnd={(e) => {
              if (isMoreMenuClosing && e.target === e.currentTarget) setIsMoreMenuClosing(false);
            }}
            style={{
              position: 'fixed',
              // Anchor the sheet to the More control at the right end of the
              // bottom pill. Its icon bubbles already sit on the row's right,
              // so this preserves the visual reading order as it grows up.
              right: `${moreMenuRightInset}px`,
              bottom: `${moreMenuBottomInset}px`,
              transformOrigin: 'bottom right',
              // On close, rows run through the same keyframes in reverse,
              // then this sheet runs its existing pop animation backwards.
              animation: isMoreMenuClosing
                ? `morePanelPop 240ms cubic-bezier(0.2, 0.9, 0.3, 1) ${moreMenuCloseDelay}ms reverse both`
                : 'morePanelPop 240ms cubic-bezier(0.2, 0.9, 0.3, 1) both',
              width: 'min(300px, calc(100vw - 48px))',
              height: 'min(64vh, 560px)',
              // The rows provide the glass. Keeping this parent transparent
              // avoids a second rectangular sheet behind the floating pills.
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
              padding: '14px',
            }}
          >
            {/* Edit footer section - inline when toggled */}
            {editingFooter && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ marginBottom: '16px', padding: '16px', background: 'var(--card-bg)', borderRadius: '4px', border: '1px solid var(--border-color)' }}
              >
                <h3 style={{ margin: '0 0 6px', fontSize: 'var(--gradex-text-md)', fontWeight: 700, color: 'var(--text-primary)' }}>Edit footer</h3>
                <p style={{ margin: 0, fontSize: 'var(--gradex-text-sm)', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                  Tap slot then icon (or icon then slot) to swap. Add as many as you like—scroll for more. Remove with ×.
                </p>
                <p style={{ margin: '0 0 8px', fontSize: 'var(--gradex-text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Footer slots</p>
                <div className="edit-footer-slots-scroll" style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap', overflowX: 'auto', overflowY: 'hidden', minWidth: 0, maxWidth: '100%', paddingBottom: '4px', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
                  {resolvedFooterIds.map((id, idx) => {
                    const item = footerNavItems.find((i) => i.id === id);
                    const icon = getNavIcon(id);
                    const selected = selectedFooterIndex === idx;
                    const isDropTarget = selectedGridItemId != null;
                    const canRemove = resolvedFooterIds.length > 1;
                    const handleSlotClick = () => {
                      if (selectedGridItemId != null) { handleSlotClickForGridItem(idx); return; }
                      setSelectedFooterIndex(selected ? null : idx);
                      setSelectedGridItemId(null);
                    };
                    return (
                      <div key={`${id}-${idx}`} style={{ position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={handleSlotClick}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px',
                            width: EDIT_FOOTER_BOX_SIZE, height: EDIT_FOOTER_BOX_SIZE, padding: 0, borderRadius: '4px',
                            border: selected ? '2px solid var(--accent-color)' : isDropTarget ? '1px solid color-mix(in srgb, var(--accent-color) 50%, transparent)' : '1px solid var(--border-color)',
                            background: selected ? 'var(--hover-bg)' : isDropTarget ? 'color-mix(in srgb, var(--accent-color) 12%, var(--bg-primary))' : 'var(--bg-primary)',
                            boxShadow: selected ? '0 0 0 3px color-mix(in srgb, var(--accent-color) 35%, transparent)' : 'none',
                            color: 'var(--text-primary)', cursor: 'pointer',
                          }}
                        >
                          {icon != null && <Icon size={24}>{icon}</Icon>}
                          <span style={{ ...sidepanelCompactLabelStyle, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }} title={item?.label || id}>{item ? getFooterItemLabel(item) : id}</span>
                        </button>
                        {canRemove && (
                          <button
                            type="button"
                            aria-label="Remove from footer"
                            onClick={(e) => { e.stopPropagation(); handleRemoveFromFooter(idx); }}
                            style={{
                              position: 'absolute', top: '0px', right: '0px', width: '18px', height: '18px', borderRadius: '50%',
                              border: 'none', background: 'var(--text-secondary)', color: 'var(--bg-primary)', fontSize: 'var(--gradex-text-sm)',
                              lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                            }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p style={{ margin: '8px 0 0', fontSize: 'var(--gradex-text-xs)', color: 'var(--text-secondary)' }}>
                  {selectedFooterIndex != null ? 'Tap an icon below to swap' : selectedGridItemId != null ? 'Tap a slot above to put it there' : 'Tap a slot or an icon below'}
                </p>
              </div>
            )}

            {/* Edit mode: grid of square tiles (same as before) */}
            {editingFooter && (
              <>
                <p style={{ margin: '0 0 8px', fontSize: 'var(--gradex-text-xs)', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  {selectedFooterIndex != null ? 'Swap with' : selectedGridItemId != null ? 'Selected — tap a slot above' : 'Add to footer'}
                </p>
                <div
                  className="edit-footer-slots-scroll"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 'clamp(8px, 2.5vw, 14px)',
                    width: '100%',
                    alignContent: 'start',
                    overflowY: 'auto',
                    flex: '1 1 0%',
                    minHeight: 0,
                    paddingRight: '4px',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {footerNavItems.filter((item) => !resolvedFooterIds.includes(item.id)).map((item) => {
                    const icon = getNavIcon(item.id);
                    const isSwapTarget = selectedFooterIndex != null;
                    const canAdd = selectedFooterIndex == null && selectedGridItemId == null && resolvedFooterIds.length < MAX_FOOTER_SLOTS && !resolvedFooterIds.includes(item.id);
                    const isGridSelected = selectedGridItemId === item.id;
                    const handleClick = () => {
                      if (isSwapTarget) { handleSwapFooter(item.id); setSelectedGridItemId(null); return; }
                      if (canAdd) { handleAddToFooter(item.id); return; }
                      if (selectedGridItemId === item.id) setSelectedGridItemId(null);
                      else setSelectedGridItemId(item.id);
                      setSelectedFooterIndex(null);
                    };
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={handleClick}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '2px',
                          padding: '6px 3px',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                          background: isGridSelected ? 'var(--hover-bg)' : 'var(--card-bg)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: isGridSelected ? 'var(--accent-color)' : 'var(--border-color)',
                          transition: 'all 0.2s ease',
                          aspectRatio: '1 / 1',
                          cursor: 'pointer',
                        }}
                      >
                        {icon != null && <Icon size={20}>{icon}</Icon>}
                        <span style={{ ...sidepanelCompactLabelStyle, fontWeight: 500, textAlign: 'center' }}>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Normal mode: scrollable bar list (profile excluded via moreMenuItems) */}
            {!editingFooter && (
              <div
                className="edit-footer-slots-scroll"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: '8px',
                  width: '100%',
                  overflowY: 'auto',
                  flex: '1 1 0%',
                  minHeight: 0,
                  padding: '4px 0 18px 4px',
                  scrollPaddingBottom: '18px',
                  overscrollBehavior: 'contain',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                {moreMenuItems.map((item, index) => {
                  const icon = getNavIcon(item.id);
                  const shouldFade = shouldFadeNavItem(item.id);
                  const rowStyle = {
                    // No card: no background, border, or radius on the row
                    // itself — just the bubble icon and label laid out.
                    // Tight vertical padding so consecutive bubbles sit close
                    // together in a chain, with the connecting thread
                    // visible in the small gaps between them.
                    position: 'relative',
                    zIndex: 1,
                    ...morePillStyle,
                    textDecoration: 'none',
                    opacity: shouldFade ? FADED_NAV_OPACITY : 1,
                  };
                  const bubbleStyle = {
                    flexShrink: 0,
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    // Fixed light icon color, not var(--text-primary): the
                    // sheet's backdrop scrim is always a dark blur regardless
                    // of light/dark theme, so this glass bubble stays
                    // dark-tinted and needs a light icon in both themes.
                    color: '#f2f3f5',
                    background: 'rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(18px) saturate(130%)',
                    WebkitBackdropFilter: 'blur(18px) saturate(130%)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderTopColor: 'rgba(255,255,255,0.26)',
                    boxShadow: '0 8px 18px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
                  };
                  return (
                    <LiquidGlass
                      as={Link}
                      className={tuneMoreMenuSprings ? undefined : `gx-more-pill${isMoreMenuClosing ? ' gx-more-pill--closing' : ''}`}
                      key={item.id}
                      to={item.path}
                      onClick={(e) => { e.stopPropagation(); closeMoreMenu(); }}
                      style={{
                        ...rowStyle,
                        ...(tuneMoreMenuSprings ? {} : { animationDelay: `${(isMoreMenuClosing ? index : moreMenuRowCount - 1 - index) * 40}ms` }),
                      }}
                    >
                      <span
                        ref={(el) => { moreLabelRefs.current[index] = el; }}
                        className={tuneMoreMenuSprings ? undefined : `gx-more-label${isMoreMenuClosing ? ' gx-more-label--closing' : ''}`}
                        style={{
                          ...sidepanelLabelStyle,
                          fontWeight: 400,
                          flex: '0 1 150px',
                          minWidth: 0,
                          textAlign: 'right',
                          color: '#f2f3f5',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          ...(tuneMoreMenuSprings ? {} : { animationDelay: `${(isMoreMenuClosing ? index : moreMenuRowCount - 1 - index) * 40}ms` }),
                        }}
                      >
                        {item.label}
                      </span>
                      {ACTIVE_NAV_IDS.has(item.id) && (
                        <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '2px 6px', borderRadius: '3px', letterSpacing: '0.04em' }}>ACTIVE</span>
                      )}
                      <span
                        ref={(el) => { moreRowRefs.current[index] = el; }}
                        className={tuneMoreMenuSprings ? undefined : `gx-more-row${isMoreMenuClosing ? ' gx-more-row--closing' : ''}`}
                        style={{
                          ...bubbleStyle,
                          ...(tuneMoreMenuSprings ? {} : { animationDelay: `${(isMoreMenuClosing ? index : moreMenuRowCount - 1 - index) * 40}ms` }),
                        }}
                      >
                        {icon != null && <Icon size={20}>{icon}</Icon>}
                      </span>
                    </LiquidGlass>
                  );
                })}

                {/* Haptics mute — only on the native shells (iOS + Android), where taps buzz */}
                {isNativeShell && (
                  <LiquidGlass
                    as="button"
                    className={tuneMoreMenuSprings ? undefined : `gx-more-pill${isMoreMenuClosing ? ' gx-more-pill--closing' : ''}`}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setNativeHapticsEnabled(!hapticsOn); }}
                    data-haptic="none"
                    aria-pressed={hapticsOn}
                    style={{
                      position: 'relative',
                      zIndex: 1,
                      ...morePillStyle,
                      cursor: 'pointer',
                      background: 'rgba(255,255,255,0.055)',
                      ...(tuneMoreMenuSprings ? {} : { animationDelay: `${(isMoreMenuClosing ? moreMenuItems.length : moreMenuRowCount - 1 - moreMenuItems.length) * 40}ms` }),
                    }}
                  >
                    <span
                      ref={(el) => { moreLabelRefs.current[moreMenuItems.length] = el; }}
                      className={tuneMoreMenuSprings ? undefined : `gx-more-label${isMoreMenuClosing ? ' gx-more-label--closing' : ''}`}
                      style={{
                        ...sidepanelLabelStyle,
                        fontWeight: 400,
                        flex: '0 1 150px',
                        minWidth: 0,
                        textAlign: 'right',
                        color: '#f2f3f5',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        ...(tuneMoreMenuSprings ? {} : { animationDelay: `${(isMoreMenuClosing ? moreMenuItems.length : moreMenuRowCount - 1 - moreMenuItems.length) * 40}ms` }),
                      }}
                    >
                      Haptics
                    </span>
                    <span
                      ref={(el) => { moreRowRefs.current[moreMenuItems.length] = el; }}
                      className={tuneMoreMenuSprings ? undefined : `gx-more-row${isMoreMenuClosing ? ' gx-more-row--closing' : ''}`}
                      style={{
                        flexShrink: 0,
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f2f3f5',
                        background: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(18px) saturate(130%)',
                        WebkitBackdropFilter: 'blur(18px) saturate(130%)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        borderTopColor: 'rgba(255,255,255,0.26)',
                        boxShadow: '0 8px 18px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
                        ...(tuneMoreMenuSprings ? {} : { animationDelay: `${(isMoreMenuClosing ? moreMenuItems.length : moreMenuRowCount - 1 - moreMenuItems.length) * 40}ms` }),
                      }}
                    >
                      <Icon size={20}>
                        {hapticsOn ? (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8v8" /><path d="M5 6v12" /><rect x="8" y="3" width="13" height="18" rx="2" /></svg>
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 6v12" /><rect x="8" y="3" width="13" height="18" rx="2" /><line x1="2" y1="2" x2="22" y2="22" /></svg>
                        )}
                      </Icon>
                    </span>
                    {/* Pill switch */}
                    <span
                      style={{
                        width: '40px',
                        height: '22px',
                        borderRadius: '999px',
                        background: hapticsOn ? '#22c55e' : 'var(--border-color)',
                        position: 'relative',
                        flexShrink: 0,
                        transition: 'background 0.2s ease',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '2px',
                          left: hapticsOn ? '20px' : '2px',
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s ease',
                        }}
                      />
                    </span>
                  </LiquidGlass>
                )}

                {/* Edit footer — last item in the chain, opens the edit-footer grid below instead of navigating */}
                <LiquidGlass
                  as="button"
                  className={tuneMoreMenuSprings ? undefined : `gx-more-pill${isMoreMenuClosing ? ' gx-more-pill--closing' : ''}`}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditingFooter(true); }}
                  style={{
                    position: 'relative',
                    zIndex: 1,
                    ...morePillStyle,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.055)',
                    ...(tuneMoreMenuSprings ? {} : { animationDelay: `${(isMoreMenuClosing ? moreMenuItems.length + (isNativeShell ? 1 : 0) : moreMenuRowCount - 1 - (moreMenuItems.length + (isNativeShell ? 1 : 0))) * 40}ms` }),
                  }}
                >
                  <span
                    ref={(el) => { moreLabelRefs.current[moreMenuItems.length + (isNativeShell ? 1 : 0)] = el; }}
                    className={tuneMoreMenuSprings ? undefined : `gx-more-label${isMoreMenuClosing ? ' gx-more-label--closing' : ''}`}
                    style={{
                      ...sidepanelLabelStyle,
                      fontWeight: 400,
                      flex: '0 1 150px',
                      minWidth: 0,
                      textAlign: 'right',
                      color: '#f2f3f5',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      ...(tuneMoreMenuSprings ? {} : { animationDelay: `${(isMoreMenuClosing ? moreMenuItems.length + (isNativeShell ? 1 : 0) : moreMenuRowCount - 1 - (moreMenuItems.length + (isNativeShell ? 1 : 0))) * 40}ms` }),
                    }}
                  >
                    Edit footer
                  </span>
                  <span
                    ref={(el) => { moreRowRefs.current[moreMenuItems.length + (isNativeShell ? 1 : 0)] = el; }}
                    className={tuneMoreMenuSprings ? undefined : `gx-more-row${isMoreMenuClosing ? ' gx-more-row--closing' : ''}`}
                    style={{
                      flexShrink: 0,
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f2f3f5',
                      background: 'rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(18px) saturate(130%)',
                      WebkitBackdropFilter: 'blur(18px) saturate(130%)',
                      border: '1px solid rgba(255,255,255,0.12)',
                      borderTopColor: 'rgba(255,255,255,0.26)',
                      boxShadow: '0 8px 18px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)',
                      ...(tuneMoreMenuSprings ? {} : { animationDelay: `${(isMoreMenuClosing ? moreMenuItems.length + (isNativeShell ? 1 : 0) : moreMenuRowCount - 1 - (moreMenuItems.length + (isNativeShell ? 1 : 0))) * 40}ms` }),
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </span>
                </LiquidGlass>
              </div>
            )}

            {/* When editing: Default + Save below grid (inside scroll) */}
            {editingFooter && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', gap: '12px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFooterIds([...footerDefaultIds]);
                    localStorage.setItem(FOOTER_STORAGE_KEY, JSON.stringify(footerDefaultIds));
                    setSelectedFooterIndex(null);
                  }}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 'var(--gradex-text-md)', cursor: 'pointer' }}
                >
                  Default
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); closeMoreMenu(); }}
                  style={{ flex: 1, padding: '12px 16px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--text-primary)', color: 'var(--bg-primary)', fontWeight: 600, fontSize: 'var(--gradex-text-md)', cursor: 'pointer' }}
                >
                  Save
                </button>
              </div>
            )}

          {/* Profile — no longer a bordered bar (Edit footer moved into the
              chain above as its own row), just the circle, un-boxed like
              everything else in this panel now. */}
          {!editingFooter && (
            <div
              onClick={closeMoreMenu}
              style={{
                flexShrink: 0,
                width: '100%',
                paddingTop: '10px',
                paddingRight: '6px',
                paddingBottom: 'max(4px, env(safe-area-inset-bottom, 0px))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <LiquidGlass
                as="button"
                className={tuneMoreMenuSprings ? undefined : `gx-more-pill${isMoreMenuClosing ? ' gx-more-pill--closing' : ''}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeMoreMenu();
                  navigate('/user');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(18px) saturate(130%)',
                  WebkitBackdropFilter: 'blur(18px) saturate(130%)',
                  color: '#f2f3f5',
                  cursor: 'pointer',
                  ...(tuneMoreMenuSprings ? {} : { animationDelay: '0ms' }),
                }}
                aria-label="Profile"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </LiquidGlass>
            </div>
          )}
          </div>
          {tuneMoreMenuSprings && !isInsidePreviewIframe && (
            <MoreMenuSpringTuner
              params={springParams}
              onChange={setSpringParams}
              onReplay={() => setSpringReplayKey((k) => k + 1)}
            />
          )}
        </div>
      )}
    </>
    );
  }

  // Desktop sidebar layout
  return (
    <>
      <nav 
        className="gx-glass gx-glass--rail gx-glass--left"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
        position: 'fixed',
        left: 0,
        top: '60px', // under this app's header
        bottom: 0,
        width: sidebarWidth,
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
        zIndex: 100,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        transition: 'width 0.3s ease',
        opacity: 1,
      }}>
        <style>{`
          .gradex-sidebar-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        
        {/* Scrollable: Main Navigation Items */}
        <div 
          className="gradex-sidebar-scroll"
          style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0,
          padding: shouldShowExpanded ? '0 12px 0 12px' : '0',
          alignItems: shouldShowExpanded ? 'stretch' : 'center',
        }}>
          {(() => { let hasInsertedNavGap = false; return mainItems.map((item) => {
            const icon = getNavIcon(item.id);
            const shouldFade = shouldFadeNavItem(item.id);
            const isNavGapHere = !PRIMARY_NAV_IDS.has(item.id) && !hasInsertedNavGap;
            if (isNavGapHere) hasInsertedNavGap = true;
            const isPrimaryNavItem = PRIMARY_NAV_IDS.has(item.id);
            const primaryShade = 'color-mix(in srgb, var(--text-primary) 4%, transparent)';
            const restingBackground = isActive(item.path) ? 'var(--hover-bg)' : (isPrimaryNavItem ? primaryShade : 'transparent');
            const linkStyle = {
              display: 'flex',
              alignItems: 'center',
              justifyContent: shouldShowExpanded ? 'flex-start' : 'center',
              gap: shouldShowExpanded ? '12px' : '0',
              padding: '12px',
              paddingLeft: shouldShowExpanded ? 24 : 12,
              paddingRight: shouldShowExpanded ? 24 : 12,
              paddingTop: 12,
              paddingBottom: 12,
              minHeight: 48,
              marginLeft: shouldShowExpanded ? -12 : 0,
              marginRight: shouldShowExpanded ? -12 : 0,
              marginTop: 0,
              borderRadius: 0,
              textDecoration: 'none',
              color: isActive(item.path) ? 'var(--text-primary)' : 'var(--text-secondary)',
              background: restingBackground,
              transition: 'all 0.2s ease',
              fontSize: 'var(--gradex-text-md)',
              fontWeight: isActive(item.path) ? 500 : 400,
              position: 'relative',
              width: shouldShowExpanded ? 'auto' : '100%',
              opacity: shouldFade ? FADED_NAV_OPACITY : 1,
              borderBottom: '1px solid color-mix(in srgb, var(--border-color) 15%, transparent)',
            };
            const linkContent = (
              <>
                {icon != null && <Icon size={20}>{icon}</Icon>}
                {shouldShowExpanded && (
                  <span style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    ...sidepanelLabelStyle,
                    fontWeight: isActive(item.path) ? 400 : 400,
                  }}>
                    {item.label}
                    {ACTIVE_NAV_IDS.has(item.id) && <span style={{ fontSize: '9px', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.12)', padding: '1px 5px', borderRadius: '3px', letterSpacing: '0.04em' }}>ACTIVE</span>}
                  </span>
                )}
              </>
            );
            return (
              <React.Fragment key={item.id}>
                {isNavGapHere && (
                  <div style={{
                    height: shouldShowExpanded ? '18px' : '12px',
                    margin: shouldShowExpanded ? '4px 12px' : '4px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      width: '100%',
                      borderTop: '1px solid color-mix(in srgb, var(--border-color) 60%, transparent)',
                    }} />
                  </div>
                )}
                <Link
                  to={item.path}
                  style={linkStyle}
                    onMouseEnter={(e) => {
                      if (!isActive(item.path)) {
                        e.currentTarget.style.background = 'linear-gradient(to left, var(--hover-bg), transparent)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                      }
                      e.currentTarget.removeAttribute('title');
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive(item.path)) {
                        e.currentTarget.style.background = isPrimaryNavItem ? primaryShade : 'transparent';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }
                    }}
                    title=""
                  >
                    {linkContent}
                  </Link>
              </React.Fragment>
            );
          }); })()}

          {/* Pages not built yet, kept apart from the links above and in the rail's own style */}
          {comingSoonItems.length > 0 && (
            <div style={{ margin: '0 -12px', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => setShowComingSoon((open) => !open)}
                aria-expanded={showComingSoon}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: shouldShowExpanded ? 'space-between' : 'center',
                  gap: shouldShowExpanded ? '12px' : '0',
                  width: '100%',
                  minHeight: 48,
                  padding: shouldShowExpanded ? '12px 24px' : '12px',
                  border: 'none',
                  borderTop: '1px solid color-mix(in srgb, var(--border-color) 15%, transparent)',
                  borderBottom: '1px solid color-mix(in srgb, var(--border-color) 15%, transparent)',
                  borderRadius: 0,
                  background: 'transparent',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--gradex-font-body)',
                  fontSize: 'var(--gradex-text-sm)',
                  fontWeight: 400,
                  whiteSpace: 'nowrap',
                }}
                title={shouldShowExpanded ? undefined : 'Coming Soon'}
              >
                {shouldShowExpanded ? (
                  <>
                    <span>Coming Soon</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: showComingSoon ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                )}
              </button>
              {showComingSoon && shouldShowExpanded && comingSoonItems.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    minHeight: 44,
                    padding: '10px 24px',
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--gradex-font-body)',
                    fontSize: 'var(--gradex-text-sm)',
                    opacity: 0.7,
                    borderBottom: '1px solid color-mix(in srgb, var(--border-color) 15%, transparent)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Icon size={18}>{icons[item.id] || icons.groupgrid}</Icon>
                    <span>{item.label}</span>
                  </span>
                  <span style={{ fontSize: '9px', padding: '2px 6px', background: 'var(--hover-bg)', textTransform: 'uppercase' }}>Soon</span>
                </div>
              ))}
            </div>
          )}
        </div>
        </div>


        {/* User Page Link - Bottom of sidebar (fixed, does not scroll) */}
        {!isConnected && (
          <div style={{
            flexShrink: 0,
            marginTop: '8px',
            paddingTop: '16px',
            borderTop: '1px solid var(--border-color)',
            padding: shouldShowExpanded ? '0 12px 0 12px' : '0',
          }}>
            <Link
              to="/user"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: shouldShowExpanded ? 'flex-start' : 'center',
                gap: shouldShowExpanded ? '12px' : '0',
                padding: '12px',
                paddingLeft: shouldShowExpanded ? 24 : 12,
                paddingRight: shouldShowExpanded ? 24 : 12,
                paddingTop: shouldShowExpanded ? 28 : 12,
                marginLeft: shouldShowExpanded ? -12 : 0,
                marginRight: shouldShowExpanded ? -12 : 0,
                marginTop: shouldShowExpanded ? -16 : 0,
                borderRadius: 0,
                textDecoration: 'none',
                color: isActive('/user') ? 'var(--text-primary)' : 'var(--text-secondary)',
                background: isActive('/user') ? 'var(--hover-bg)' : 'transparent',
                transition: 'all 0.2s ease',
                fontSize: 'var(--gradex-text-md)',
                fontWeight: isActive('/user') ? 500 : 400,
                position: 'relative',
                width: shouldShowExpanded ? 'auto' : '100%',
              }}
              onMouseEnter={(e) => {
                if (!isActive('/user')) {
                  e.currentTarget.style.background = 'linear-gradient(to left, var(--hover-bg), transparent)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
                e.currentTarget.removeAttribute('title');
              }}
              onMouseLeave={(e) => {
                if (!isActive('/user')) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              title=""
            >
              <Icon size={20}>
                {icons.user}
              </Icon>
              {shouldShowExpanded && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  flex: 1,
                  ...sidepanelLabelStyle,
                  fontWeight: 400,
                }}>
                  Profile
                </span>
              )}
            </Link>
          </div>
        )}

        {/* User Section - no top padding so separator sits right under last nav option */}
        {isConnected && (
          <div
            style={{
              flexShrink: 0,
              marginTop: shouldShowExpanded ? 0 : '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
              padding: shouldShowExpanded ? '0 12px 0 12px' : '0',
              alignItems: shouldShowExpanded ? 'stretch' : 'center',
            }}
          >
            <UserSection
              isCollapsed={!shouldShowExpanded}
              onLogout={handleLogout}
            />
          </div>
        )}
      </nav>
    
      {/* Toggle Button - Positioned on right edge (hidden on mobile) */}
      {!isMobile && (
      <button
        onClick={onToggle}
        style={{
          position: 'fixed',
          left: sidebarWidth,
          top: '50%',
          transform: 'translateY(-50%)',
          width: '20px',
          height: '40px',
          padding: 0,
          border: '1px solid var(--border-color)',
          borderLeft: 'none',
          background: 'var(--card-bg)',
          borderTopRightRadius: '0px',
          borderBottomRightRadius: '0px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease',
          color: 'var(--text-primary)',
          zIndex: 101,
          boxShadow: '2px 0 4px rgba(0,0,0,0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-hover)';
          e.currentTarget.style.background = 'var(--hover-bg)';
          e.currentTarget.style.width = '24px';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-color)';
          e.currentTarget.style.background = 'var(--card-bg)';
          e.currentTarget.style.width = '20px';
        }}
        title={isCollapsed ? 'Expand sidebar permanently' : 'Collapse sidebar'}
      >
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{
            transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}
        >
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      )}
    </>
  );
}
