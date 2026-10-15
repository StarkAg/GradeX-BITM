import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthActions } from '@convex-dev/auth/react';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import { Analytics } from '@vercel/analytics/react';
import { APP_BUILD_DATE, APP_VERSION } from './version';
import {
  checkConvexAvailability,
  publishConvexAvailability,
  readConvexAvailability,
} from './lib/convexAvailability';
import { buildRefreshUrl, hardRefreshApp } from './lib/appUpdate';

// Shown only while there is nothing to draw yet: the first moments after a
// sign-in on a device that has no cached copy of the student's data.
function AuthHandshakeSpinner({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px', minHeight: '100vh', padding: '40px' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid var(--border-color)', borderTopColor: 'var(--text-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}
// Admin954 is gitignored (local-only, hidden admin panel) - it never exists in
// the GitHub-cloned tree Vercel builds from. A literal import path gets resolved
// by Rollup at build time regardless of `@vite-ignore` (that comment only quiets
// Vite's dev-server warning), which fails the whole build on any machine
// without this file on disk. Building the path from a variable stops Rollup
// from attempting build-time resolution at all - it becomes a genuine runtime
// import, which resolves normally wherever the file is present, and the
// existing .catch() already handles it being absent everywhere else.
const ADMIN954_MODULE = './components/Admin954';
const Admin954 = React.lazy(() =>
  import(/* @vite-ignore */ ADMIN954_MODULE).catch(() => ({ default: () => null }))
);
import Timetable from './components/Timetable';
import Navigation from './components/Navigation';
import UserPage from './components/UserPage';
import ManualAttendance from './components/ManualAttendance';
import Subjects from './components/Subjects';
import Home from './components/Home';
import AuthPage from './components/AuthPage';
import AttendanceCalendar from './components/AttendanceCalendar';
import DemoLogin from './components/DemoLogin';
import FacultyAttendancePanel from './components/FacultyAttendancePanel';
import StudentDemoView from './components/StudentDemoView';
import PWAUpdatePrompt from './components/PWAUpdatePrompt';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';
import {
  useCurrentProfile,
  usePendingOpsSync,
  useSyncCurrentUser,
  useUpdateCurrentProfile,
} from './lib/academic-data';
import {
  cacheIdentity,
  clearLocalAuthCache,
  hasCachedIdentity,
} from './lib/session';
import { adoptPendingOps } from './lib/pending-writes';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', path: '/' },
  { id: 'timetable', label: 'Schedule', path: '/schedule' },
  { id: 'attendance', label: 'Attendance', path: '/attendance' },
  { id: 'calendar', label: 'Calendar', path: '/calendar' },
  { id: 'subjects', label: 'Subjects', path: '/subjects' },
  { id: 'marks', label: 'Marks', path: '/marks', comingSoon: true, desktopOnly: true },
  { id: 'messmenu', label: 'Mess Menu', path: '/messmenu', comingSoon: true, desktopOnly: true },
  { id: 'expenza', label: 'Expenza', path: '/expenza', comingSoon: true, desktopOnly: true },
  { id: 'groupgrid', label: 'GroupGrid', path: '/groupgrid', comingSoon: true, desktopOnly: true },
  { id: 'faculty', label: 'Faculty', path: '/faculty', comingSoon: true, desktopOnly: true },
];
const AUDIO_URL = '/back-in-black.mp3';
const CONVEX_HEALTH_POLL_MS = 20 * 1000;
const SPLASH_PROGRESS_INTERVAL_MS = 20;
const SPLASH_PROGRESS_STEP = 4;
const SPLASH_EXIT_DELAY_MS = 150;
const SPLASH_TEXT_PAUSE_MS = 50;
const SPLASH_TEXTS = ['INITIALIZING...'];

// The force-update check lives in its own component, inside its own error
// boundary: useQuery throws during render when the server rejects a query, and
// a backend that does not (yet, or any longer) have this function must not be
// able to take the whole app down with it.
function ForceUpdateProbe({ onChange }) {
  const version = useQuery(api.appSettings.getForceUpdateVersion, {});
  useEffect(() => {
    onChange(version);
  }, [version, onChange]);
  return null;
}

export default function App() {
  // Sign-in is Convex Auth (convex/auth.ts). `convexAuthLoading` covers both
  // reading the saved token and waiting for the server to accept it, so it
  // stays true for as long as the phone is offline with a saved session.
  const { isAuthenticated: convexAuthenticated, isLoading: convexAuthLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const signedOut = !convexAuthLoading && !convexAuthenticated;
  const [isConvexAvailable, setIsConvexAvailable] = useState(() => readConvexAvailability());
  const [convexStatusChecked, setConvexStatusChecked] = useState(false);
  const currentProfile = useCurrentProfile(convexAuthenticated && isConvexAvailable);
  const syncCurrentUser = useSyncCurrentUser();
  const updateCurrentProfile = useUpdateCurrentProfile();
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [loadingText, setLoadingText] = useState('');
  const [progress, setProgress] = useState(0);
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('gradex-theme');
    return savedTheme || 'dark';
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('gradex-sidebar-collapsed');
    return saved === 'true';
  });
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showNameModal, setShowNameModal] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [isForceUpdating, setIsForceUpdating] = useState(false);
  const [forceUpdateTargetVersion, setForceUpdateTargetVersion] = useState('');
  const [tabVisible, setTabVisible] = useState(() => (
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  ));
  const audioRef = useRef(null);
  const syncedRef = useRef(false);
  const forceUpdateInFlightRef = useRef(null);
  const location = useLocation();

  // Reported by <ForceUpdateProbe>, which is only mounted once the Convex probe
  // says the backend is actually reachable, so an offline launch never blocks
  // on this query.
  const [forceUpdateVersion, setForceUpdateVersion] = useState(undefined);

  // Sends anything the user did while Convex could not take it.
  usePendingOpsSync();

  useEffect(() => {
    const handleVisibility = () => setTabVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    console.log(`%cGradeX BITM ${APP_VERSION}`, 'color: #3b82f6; font-weight: bold; font-size: 16px; padding: 4px;');
    if (APP_BUILD_DATE) {
      console.log(`%cBuild: ${APP_BUILD_DATE.split('T')[0]}`, 'color: #10b981; font-size: 12px;');
    }
  }, []);

  useEffect(() => {
    let disposed = false;

    const probeConvex = async () => {
      if (disposed) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setIsConvexAvailable(false);
        setConvexStatusChecked(true);
        publishConvexAvailability(false);
        return;
      }

      const available = await checkConvexAvailability({ timeoutMs: 3500 });
      if (disposed) return;

      setIsConvexAvailable(available);
      setConvexStatusChecked(true);
      publishConvexAvailability(available);
    };

    const handleOnline = () => {
      setConvexStatusChecked(false);
      void probeConvex();
    };
    const handleOffline = () => {
      setIsConvexAvailable(false);
      setConvexStatusChecked(true);
      publishConvexAvailability(false);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void probeConvex();
      }
    };

    void probeConvex();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void probeConvex();
      }
    }, CONVEX_HEALTH_POLL_MS);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Detect mobile devices
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Force update: an admin sets appSettings.force_update_version in Convex and
  // every client older than it wipes its caches/service worker and reloads
  // once. Only runs while the tab is visible so it never fires in a background
  // tab the user isn't looking at.
  useEffect(() => {
    if (forceUpdateVersion === undefined) return;
    if (!forceUpdateVersion) return;
    if (!tabVisible) return;

    const currentVersion = APP_VERSION.replace('v', '').trim();
    const requiredVersion = String(forceUpdateVersion).replace('v', '').trim();

    const compareSemver = (a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < 3; i += 1) {
        if ((pa[i] || 0) < (pb[i] || 0)) return -1;
        if ((pa[i] || 0) > (pb[i] || 0)) return 1;
      }
      return 0;
    };

    const needUpdate = compareSemver(currentVersion, requiredVersion) < 0;

    const lastProcessedVersion = localStorage.getItem('gradex_last_force_update');
    if (!needUpdate && lastProcessedVersion === requiredVersion) return;

    const forceUpdateAttemptKey = `${currentVersion}->${requiredVersion}`;
    const previousAttemptKey = localStorage.getItem('gradex_force_update_attempt');

    // If a cached bundle survives the refresh, don't trap the user in an
    // infinite "Updating..." reload loop - give up and keep running the current
    // build. A later release changes this key and gets a fresh attempt.
    if (needUpdate && previousAttemptKey === forceUpdateAttemptKey) {
      console.warn(`[App] Force update already attempted for ${forceUpdateAttemptKey}; continuing with the current bundle.`);
      forceUpdateInFlightRef.current = null;
      return;
    }

    try {
      if (!needUpdate && sessionStorage.getItem('gradex_force_update_checked') === requiredVersion) return;
    } catch (_) {}

    if (needUpdate) {
      if (forceUpdateInFlightRef.current === requiredVersion) return;
      forceUpdateInFlightRef.current = requiredVersion;
      localStorage.setItem('gradex_force_update_attempt', forceUpdateAttemptKey);
      setForceUpdateTargetVersion(`v${requiredVersion}`);
      setIsForceUpdating(true);

      setTimeout(() => {
        hardRefreshApp({
          requestServiceWorkerUpdate: true,
          clearCacheStorage: true,
          clearServiceWorkers: true,
          clearIndexedDb: true,
          clearLocalStorage: false,
          clearSessionStorage: false,
        }).catch((error) => {
          console.warn('[App] Forced refresh failed, falling back to hard reload:', error);
          window.location.replace(buildRefreshUrl(window.location.href));
        });
      }, 600);
    } else {
      forceUpdateInFlightRef.current = null;
      setForceUpdateTargetVersion('');
      localStorage.removeItem('gradex_force_update_attempt');
      localStorage.setItem('gradex_last_force_update', requiredVersion);
      try {
        sessionStorage.setItem('gradex_force_update_checked', requiredVersion);
      } catch (_) {}
    }
  }, [forceUpdateVersion, tabVisible]);

  // Signed out for certain (no saved session, or the server ended it): forget
  // who was here so the next person starts clean.
  useEffect(() => {
    if (!signedOut) return;
    syncedRef.current = false;
    clearLocalAuthCache();
  }, [signedOut]);

  // Once per session, as soon as the server accepts it: make sure the account
  // has its profile and timetable (and, the first time, bring an account from
  // the old sign-in across - see users:syncCurrentUser).
  const [syncedProfile, setSyncedProfile] = useState(null);
  useEffect(() => {
    if (!convexAuthenticated || syncedRef.current) return;
    syncedRef.current = true;

    syncCurrentUser({})
      .then((profile) => {
        // Before the identity is cached, so the queue is already in the new
        // account's name when its sender starts.
        adoptPendingOps(profile.legacyId, profile.id);
        cacheIdentity(profile);
        setSyncedProfile(profile);
      })
      .catch((err) => {
        console.error('Error preparing the account:', err);
        syncedRef.current = false;
      });
  }, [convexAuthenticated, syncCurrentUser]);

  useEffect(() => {
    if (!convexAuthenticated || !currentProfile) return;
    cacheIdentity(currentProfile);
  }, [convexAuthenticated, currentProfile]);

  // AuthPage reports a finished sign-in; the greeting waits for the account
  // itself, because only that says whether a name has been entered yet.
  const [justSignedIn, setJustSignedIn] = useState(false);
  const handleAuthSuccess = () => {
    setSyncedProfile(null);
    setJustSignedIn(true);
  };

  useEffect(() => {
    if (!justSignedIn || !syncedProfile) return;
    setJustSignedIn(false);

    if (syncedProfile.name && syncedProfile.name !== syncedProfile.username) {
      setWelcomeName(syncedProfile.name);
      setShowWelcomeModal(true);
    } else {
      setShowNameModal(true);
    }
  }, [justSignedIn, syncedProfile]);

  const handleSaveName = async () => {
    const trimmedName = nameInput.trim();
    if (!trimmedName || savingName) return;

    setSavingName(true);
    setNameError('');
    try {
      await updateCurrentProfile({ name: trimmedName });
      setWelcomeName(trimmedName);
      setShowNameModal(false);
      setShowWelcomeModal(true);
    } catch (err) {
      console.error('Error saving name:', err);
      setNameError(getAuthErrorMessage(err, 'Could not save your name. Try again.'));
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Error signing out:', err);
    } finally {
      clearLocalAuthCache();
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gradex-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleSidebarToggle = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('gradex-sidebar-collapsed', newState.toString());
  };

  // Splash screen animation
  useEffect(() => {
    let textIndex = 0;
    let charIndex = 0;
    let progressInterval;
    let textInterval;
    let textPauseTimeout;

    textInterval = setInterval(() => {
      if (charIndex < SPLASH_TEXTS[textIndex].length) {
        setLoadingText(SPLASH_TEXTS[textIndex].substring(0, charIndex + 1));
        charIndex++;
      } else {
        window.clearTimeout(textPauseTimeout);
        textPauseTimeout = window.setTimeout(() => {
          charIndex = 0;
          textIndex = (textIndex + 1) % SPLASH_TEXTS.length;
          setLoadingText('');
        }, SPLASH_TEXT_PAUSE_MS);
      }
    }, 100);

    progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(textInterval);
          window.clearTimeout(textPauseTimeout);
          setTimeout(() => setShowSplash(false), SPLASH_EXIT_DELAY_MS);
          return 100;
        }
        return prev + SPLASH_PROGRESS_STEP;
      });
    }, SPLASH_PROGRESS_INTERVAL_MS);

    return () => {
      clearInterval(progressInterval);
      clearInterval(textInterval);
      window.clearTimeout(textPauseTimeout);
    };
  }, []);

  const ensureAudioLoaded = () => {
    if (!audioRef.current || audioLoaded) return;
    try {
      audioRef.current.src = AUDIO_URL;
      audioRef.current.load();
      setAudioLoaded(true);
    } catch (err) {
      console.warn('Unable to load audio:', err);
    }
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audioLoaded) ensureAudioLoaded();
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    // play() is asynchronous and can be refused (no gesture yet, the file not
    // reachable offline): only a song that actually started counts as playing.
    let started;
    try {
      started = Promise.resolve(audio.play());
    } catch (err) {
      started = Promise.reject(err);
    }
    started
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn('Audio playback failed:', err);
        setIsPlaying(false);
      });
  };

  // Splash is an overlay, not a blocking early-return: the real screen underneath
  // (auth, main app, etc.) mounts and starts loading its own data at the same
  // time, so by the time the splash fades there's nothing left to wait for -
  // matching how the main GradeX app runs its splash.
  const splashScreen = (
        <div
          className="splash-screen"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'var(--splash-bg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            opacity: (showSplash || isForceUpdating) ? 1 : 0,
            transition: 'opacity 0.5s ease-out',
            pointerEvents: (showSplash || isForceUpdating) ? 'auto' : 'none',
            overflow: 'hidden'
          }}
        >
        <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `linear-gradient(transparent 50%, var(--splash-overlay) 50%)`,
              backgroundSize: '100% 4px',
              animation: 'scan 2s linear infinite',
              pointerEvents: 'none'
        }} />
          
        <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
          backgroundImage: `linear-gradient(var(--splash-overlay) 1px, transparent 1px), linear-gradient(90deg, var(--splash-overlay) 1px, transparent 1px)`,
              backgroundSize: '50px 50px',
              opacity: 0.3,
              pointerEvents: 'none'
        }} />

          <div style={{ position: 'relative', marginBottom: '40px' }}>
            <img 
              src="/arc-reactor.png" 
              alt="Arc Reactor" 
              style={{
                width: '140px',
                height: '140px',
                animation: 'reactorPulse 2s ease-in-out infinite, reactorGlow 2s ease-in-out infinite',
                filter: 'drop-shadow(0 0 30px rgba(245, 245, 245, 0.4)) drop-shadow(0 0 60px rgba(245, 245, 245, 0.2))'
              }}
            />
          <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '140px',
                height: '140px',
                border: '2px solid rgba(245, 245, 245, 0.2)',
                borderRadius: '8px',
                animation: 'ringPulse 2s ease-out infinite'
          }} />
          </div>

        <div style={{
              fontFamily: 'Space Grotesk, monospace',
              fontSize: '14px',
              letterSpacing: '0.2em',
              color: 'var(--splash-text)',
              marginBottom: '30px',
              minHeight: '20px',
              textTransform: 'uppercase',
              opacity: 0.8
        }}>
            {isForceUpdating
              ? `Updating GradeX BITM to ${forceUpdateTargetVersion || 'the latest version'}...`
              : loadingText}
            <span style={{ animation: 'blink 1s infinite' }}>|</span>
          </div>

        <div style={{
              width: '300px',
              height: '2px',
              background: 'var(--splash-overlay)',
              borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
                width: `${progress}%`,
                height: '100%',
                background: `linear-gradient(90deg, transparent, var(--splash-text), transparent)`,
            transition: 'width 0.1s linear'
          }} />
          </div>

          {/* Tech corners */}
        <div style={{ position: 'absolute', top: '20px', left: '20px', width: '40px', height: '40px', borderTop: '2px solid var(--splash-overlay)', borderLeft: '2px solid var(--splash-overlay)' }} />
        <div style={{ position: 'absolute', top: '20px', right: '20px', width: '40px', height: '40px', borderTop: '2px solid var(--splash-overlay)', borderRight: '2px solid var(--splash-overlay)' }} />
        <div style={{ position: 'absolute', bottom: '20px', left: '20px', width: '40px', height: '40px', borderBottom: '2px solid var(--splash-overlay)', borderLeft: '2px solid var(--splash-overlay)' }} />
        <div style={{ position: 'absolute', bottom: '20px', right: '20px', width: '40px', height: '40px', borderBottom: '2px solid var(--splash-overlay)', borderRight: '2px solid var(--splash-overlay)' }} />
        </div>
  );

  // Everything below picks what renders under the splash overlay. The app
  // never waits on Convex when it has something to show: with a cached
  // identity it opens from the offline copy at once, online or not, and the
  // live data replaces it when the server answers. OfflineIndicator (rendered
  // below) surfaces connectivity.
  const mainScreen = (() => {
    if (signedOut) {
      return <AuthPage onAuthSuccess={handleAuthSuccess} />;
    }

    if (!convexAuthenticated && !hasCachedIdentity()) {
      return <AuthHandshakeSpinner label="Connecting..." />;
    }

    // Main app
    return (
    <>
      <div className="app-container" style={{ opacity: 1, transition: 'opacity 0.5s ease-in' }}>
      <header className="app-header single gx-glass gx-glass--top" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        width: '100%',
        padding: isMobile ? '8px 12px 4px 12px' : '0 12px 12px 12px',
        fontSize: isMobile ? '14px' : undefined,
        position: 'fixed',
        top: 0,
        paddingTop: isMobile ? `calc(8px + env(safe-area-inset-top, 0px))` : '12px',
        left: 0,
        right: 0,
        zIndex: 1000,
        boxSizing: 'border-box'
      }}>
          <div className="app-header-left">
            <h1 style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              lineHeight: 1,
              fontSize: isMobile ? '1.2em' : '1.4em',
              height: isMobile ? '1.3em' : 'auto',
              whiteSpace: 'nowrap',
              margin: 0,
              padding: 0
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 1, whiteSpace: 'nowrap' }}>GradeX - BITM</span>
              <img 
                src="/arc-reactor.png" 
                alt="Arc Reactor" 
                onClick={togglePlay}
                style={{ 
                  width: isMobile ? '1.3em' : '1em', 
                  height: isMobile ? '1.3em' : '1em', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  objectFit: 'contain',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease, filter 0.2s ease',
                  filter: theme === 'light' ? 'invert(1)' : 'none',
                  flexShrink: 0,
                  margin: 0,
                  padding: 0,
                  verticalAlign: 'middle'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                title="Easter Egg - Click to play"
              />
            </h1>
          </div>
          <div className="app-header-right" style={{ 
                  display: 'flex',
                  alignItems: 'center',
            gap: isMobile ? '4px' : '6px', 
            flexWrap: isMobile ? 'nowrap' : 'wrap', 
            marginLeft: 'auto',
            flexShrink: 0,
          }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'flex-end', 
              gap: '2px',
              fontSize: isMobile ? '8px' : '9px',
              lineHeight: isMobile ? '1.2' : '1',
            }}>
              <span style={{ fontSize: isMobile ? '8px' : '9px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', lineHeight: '1' }}>BY</span>
              <span style={{ fontSize: isMobile ? '8px' : '9px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', lineHeight: '1' }}>STARK</span>
            </div>
            <button
              onClick={toggleTheme}
              style={{ width: isMobile ? '28px' : '32px', height: isMobile ? '28px' : '32px', padding: 0, border: '1px solid var(--border-color)', background: 'var(--card-bg)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', color: 'var(--text-primary)', flexShrink: 0 }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.background = 'var(--hover-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.background = 'var(--card-bg)'; }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              )}
            </button>
          </div>
      </header>
      <div style={{
        display: 'flex',
        minHeight: isMobile ? 'calc(100vh - 50px)' : 'calc(100vh - 60px)',
        marginTop: isMobile ? `calc(50px + env(safe-area-inset-top, 0px))` : '55px'
      }}>
        <Navigation 
          isCollapsed={isSidebarCollapsed}
          onToggle={handleSidebarToggle}
          navItems={NAV_ITEMS}
            isConnected={convexAuthenticated}
          onLogout={handleLogout}
        />
        <main className="app-main single" style={{
          flex: 1,
          marginLeft: isMobile ? '0' : (isSidebarCollapsed ? '60px' : '200px'),
          padding: isMobile ? '6px 8px' : '6px 10px',
          paddingBottom: isMobile ? 'var(--gx-mobile-nav-clearance)' : '6px',
          overflowY: 'auto',
          transition: 'margin-left 0.3s ease',
          position: 'relative',
          zIndex: 1
        }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/schedule" element={<Timetable />} />
          <Route path="/tt" element={<Navigate to="/schedule" replace />} />
          <Route path="/timetable" element={<Navigate to="/schedule" replace />} />
          <Route path="/att" element={<ManualAttendance />} />
          <Route path="/attendance" element={<ManualAttendance />} />
          <Route path="/calendar" element={<AttendanceCalendar />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/admin" element={
            <React.Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
              <Admin954 />
            </React.Suspense>
          } />
          <Route path="/admin954" element={
              <React.Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
                <Admin954 />
              </React.Suspense>
          } />
          <Route path="/demo" element={<DemoLogin />} />
          <Route path="/demo/faculty" element={<FacultyAttendancePanel />} />
          <Route path="/demo/student" element={<StudentDemoView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      </div>
        <audio ref={audioRef} preload="none" onEnded={() => setIsPlaying(false)} />
      <Analytics />

        {/* Name Input Modal */}
        {showNameModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}>
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              animation: 'fadeInUp 0.3s ease'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 20px',
                background: 'var(--hover-bg)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <h2 style={{
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 8px 0'
              }}>
                What's your name?
              </h2>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary)',
                margin: '0 0 24px 0'
              }}>
                Let us personalize your experience
              </p>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => { setNameInput(e.target.value); setNameError(''); }}
                placeholder="Enter your name"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  fontSize: '15px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}
              />
              {nameError && (
                <p role="alert" style={{ margin: '0 0 12px 0', fontSize: '13px', color: 'var(--error-color)' }}>{nameError}</p>
              )}
              <button
                onClick={handleSaveName}
                disabled={!nameInput.trim() || savingName}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  border: 'none',
                  background: 'var(--text-primary)',
                  color: 'var(--bg-primary)',
                  borderRadius: '8px',
                  cursor: !nameInput.trim() || savingName ? 'not-allowed' : 'pointer',
                  opacity: !nameInput.trim() || savingName ? 0.5 : 1,
                  transition: 'opacity 0.2s ease'
                }}
              >
                {savingName ? 'Saving...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Welcome Modal */}
        {showWelcomeModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}>
            <div style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '420px',
              width: '100%',
              textAlign: 'center',
              animation: 'fadeInUp 0.3s ease'
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                margin: '0 auto 20px',
                background: 'var(--text-primary)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--bg-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 12px 0',
                fontFamily: "'AmericanCaptain', 'Bebas Neue', sans-serif",
                letterSpacing: '0.05em'
              }}>
                Welcome, {welcomeName}!
              </h2>
              <p style={{
                fontSize: '15px',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: '0 0 28px 0'
              }}>
                This is a platform to manage your academics with basics for now, but many more features to come soon!
              </p>
              <button
                onClick={() => setShowWelcomeModal(false)}
                style={{
                  padding: '14px 32px',
                  fontSize: '15px',
                  fontWeight: 600,
                  border: 'none',
                  background: 'var(--text-primary)',
                  color: 'var(--bg-primary)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                Let's Go!
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
    </div>
    </>
    );
  })();

  return (
    <>
      <OfflineIndicator />
      {/* Mounted at the top level, outside every auth/Convex gate: this is the
          only thing that registers the service worker, so keeping it inside the
          signed-in tree meant a user sitting on the login screen (or any
          loading/error gate) never installed one - no offline, and no update
          pipeline either. */}
      <PWAUpdatePrompt />
      {convexStatusChecked && isConvexAvailable && (
        <ErrorBoundary silent name="force-update">
          <ForceUpdateProbe onChange={setForceUpdateVersion} />
        </ErrorBoundary>
      )}
      {(showSplash || isForceUpdating) && splashScreen}
      <div style={{ opacity: (showSplash || isForceUpdating) ? 0 : 1, transition: 'opacity 0.5s ease-in' }}>
        {mainScreen}
      </div>
    </>
  );
}
