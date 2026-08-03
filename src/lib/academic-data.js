import { useEffect, useMemo, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { buildBridgeUser, hasCachedIdentity } from './clerk';
import { DEFAULT_SUBJECTS, DEFAULT_TIMETABLE } from './subjects';

// buildLocalSnapshot/buildLocalProfile read localStorage and allocate a new
// object every call. Bumping this on 'subjectsUpdated' keeps the memoized
// snapshot referentially stable across re-renders (so effects keyed on it
// don't loop) while still picking up local edits made while offline.
//
// Deliberately NOT listening for the generic 'storage' event here: it's
// dispatched from effects elsewhere (e.g. syncClerkUserToLocalStorage) that
// aren't guaranteed to fire only once, and turning that into a state update
// here previously created a render loop (Clerk's `user` reference isn't
// guaranteed stable across renders, so a `storage`-driven bump could refire
// every render).
function useLocalDataVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener('subjectsUpdated', bump);
    return () => window.removeEventListener('subjectsUpdated', bump);
  }, []);
  return version;
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeAttendanceTotals(input) {
  const entries = input && typeof input === 'object' ? input : {};
  const normalized = {};
  Object.entries(entries).forEach(([code, value]) => {
    normalized[code] = {
      attended: Number(value?.attended || 0),
      conducted: Number(value?.conducted || 0),
    };
  });
  return normalized;
}

function buildLocalProfile(user) {
  const bridgeUser = buildBridgeUser(user);
  if (bridgeUser) return bridgeUser;

  const id = localStorage.getItem('gradex_user_id');
  const username = localStorage.getItem('gradex_username');
  const name = localStorage.getItem('gradex_user_name');
  return id ? { id, username: username || 'user', name: name || username || 'User' } : null;
}

function buildLocalSnapshot(user) {
  return {
    profile: buildLocalProfile(user),
    subjects: readJson('gradex_subjects', DEFAULT_SUBJECTS),
    timetable: readJson('gradex_timetable', DEFAULT_TIMETABLE),
    attendanceTotals: normalizeAttendanceTotals(readJson('gradex_manual_attendance', {})),
    dailyAttendance: readJson('gradex_daily_attendance', {}),
  };
}

function writeLocalProfile(profile) {
  if (!profile) return;
  localStorage.setItem('gradex_user_id', profile.id);
  localStorage.setItem('gradex_username', profile.username);
  localStorage.setItem('gradex_user_name', profile.name || profile.username);
  window.dispatchEvent(new Event('storage'));
}

function normalizeBaseCode(subjectCode) {
  if (subjectCode.endsWith('-LAB')) return subjectCode.slice(0, -4);
  const parts = subjectCode.split('-');
  const tail = parts[parts.length - 1];
  if (parts.length > 1 && /^\d+$/.test(tail)) {
    return parts.slice(0, -1).join('-');
  }
  return subjectCode;
}

function recalculateTotalsFromDaily(dailyAttendance, targetSubjectCode) {
  const baseCode = normalizeBaseCode(targetSubjectCode);
  let attended = 0;
  let conducted = 0;

  Object.values(dailyAttendance || {}).forEach((dayData) => {
    Object.entries(dayData || {}).forEach(([code, status]) => {
      if (normalizeBaseCode(code) !== baseCode) return;
      conducted += 1;
      if (status === 'present') attended += 1;
    });
  });

  return { attended, conducted };
}

export function useAcademicSnapshot(enabled = true) {
  const { isAuthenticated } = useConvexAuth();
  const { user, isSignedIn } = useUser();
  const query = useQuery(api.academics.getCurrentSnapshot, enabled && isAuthenticated ? {} : 'skip');
  const localVersion = useLocalDataVersion();
  // Keyed on user?.id (a primitive), not the `user` object itself - Clerk
  // doesn't guarantee that reference is stable across renders, and keying on
  // it directly re-triggered this memo (and everything downstream of it)
  // every render.
  const localSnapshot = useMemo(() => buildLocalSnapshot(user), [user?.id, localVersion]);

  // Mirror each successful snapshot into localStorage so the offline fallback
  // above serves the user's real data rather than DEFAULT_*. Writes directly
  // instead of going through the mutations' local branch: those dispatch
  // 'subjectsUpdated', which would bump localVersion, rebuild the memo, and
  // re-run this effect on a loop.
  useEffect(() => {
    if (!query) return;
    try {
      if (query.subjects) writeJson('gradex_subjects', query.subjects);
      if (query.timetable) writeJson('gradex_timetable', query.timetable);
      if (query.dailyAttendance) writeJson('gradex_daily_attendance', query.dailyAttendance);
      if (query.attendanceTotals) writeJson('gradex_manual_attendance', query.attendanceTotals);
    } catch (err) {
      console.warn('[AcademicData] Failed to cache snapshot for offline use:', err);
    }
  }, [query]);

  if (!enabled) return undefined;
  // Convex query resolved (online, handshake done): use live data.
  if (query !== undefined) return query;
  // Signed in but Convex hasn't caught up yet (offline, or still connecting):
  // serve the last-synced local copy instantly instead of spinning forever.
  if (isSignedIn || hasCachedIdentity()) return localSnapshot;
  return null;
}

export function useCurrentProfile(enabled = true) {
  const { isAuthenticated } = useConvexAuth();
  const { user, isSignedIn } = useUser();
  const query = useQuery(api.users.getCurrentProfile, enabled && isAuthenticated ? {} : 'skip');
  const localVersion = useLocalDataVersion();
  const localProfile = useMemo(() => buildLocalProfile(user), [user?.id, localVersion]);

  if (!enabled) return undefined;
  if (query !== undefined) return query;
  if (isSignedIn || hasCachedIdentity()) return localProfile;
  return null;
}

export function useSyncCurrentUser() {
  return useMutation(api.users.syncCurrentUser);
}

export function useUpdateCurrentProfile() {
  const { isAuthenticated } = useConvexAuth();
  const mutation = useMutation(api.users.updateCurrentProfile);

  return async (args) => {
    if (!isAuthenticated) {
      writeLocalProfile({
        id: localStorage.getItem('gradex_user_id') || 'local-user',
        username: args.username || localStorage.getItem('gradex_username') || 'user',
        name: args.name,
      });
      return null;
    }

    return mutation(args);
  };
}

export function useDeleteCurrentUserData() {
  const { isAuthenticated } = useConvexAuth();
  const mutation = useMutation(api.users.deleteCurrentUserData);

  return async (args) => {
    if (!isAuthenticated) {
      [
        'gradex_subjects',
        'gradex_timetable',
        'gradex_daily_attendance',
        'gradex_manual_attendance',
      ].forEach((key) => localStorage.removeItem(key));
      return null;
    }

    return mutation(args);
  };
}

export function useSaveAcademicState() {
  const { isAuthenticated } = useConvexAuth();
  const mutation = useMutation(api.academics.saveAcademicState);

  return async (args) => {
    if (!isAuthenticated) {
      writeJson('gradex_subjects', args.subjects);
      writeJson('gradex_timetable', args.timetable);
      window.dispatchEvent(new Event('subjectsUpdated'));
      return null;
    }

    return mutation(args);
  };
}

export function useSetManualAttendanceTotal() {
  const { isAuthenticated } = useConvexAuth();
  const mutation = useMutation(api.academics.setManualAttendanceTotal);

  return async (args) => {
    if (!isAuthenticated) {
      const totals = normalizeAttendanceTotals(readJson('gradex_manual_attendance', {}));
      totals[args.subjectCode] = {
        attended: Math.max(0, Number(args.attended || 0)),
        conducted: Math.max(0, Number(args.conducted || 0)),
      };
      writeJson('gradex_manual_attendance', totals);
      return null;
    }

    return mutation(args);
  };
}

export function useSetDailyAttendanceStatus() {
  const { isAuthenticated } = useConvexAuth();
  const mutation = useMutation(api.academics.setDailyAttendanceStatus);

  return async (args) => {
    if (!isAuthenticated) {
      const dailyAttendance = readJson('gradex_daily_attendance', {});
      if (!dailyAttendance[args.date]) dailyAttendance[args.date] = {};

      if (args.status === null) {
        delete dailyAttendance[args.date][args.subjectCode];
        if (Object.keys(dailyAttendance[args.date]).length === 0) {
          delete dailyAttendance[args.date];
        }
      } else {
        dailyAttendance[args.date][args.subjectCode] = args.status;
      }

      writeJson('gradex_daily_attendance', dailyAttendance);

      const totals = normalizeAttendanceTotals(readJson('gradex_manual_attendance', {}));
      totals[normalizeBaseCode(args.subjectCode)] = recalculateTotalsFromDaily(dailyAttendance, args.subjectCode);
      writeJson('gradex_manual_attendance', totals);
      return null;
    }

    return mutation(args);
  };
}

export function useLogSocialClick() {
  const { isAuthenticated } = useConvexAuth();
  const mutation = useMutation(api.events.logSocialClick);

  return async (args) => {
    if (!isAuthenticated) return null;
    return mutation(args);
  };
}

export function useAdmin954Overview(enabled = true) {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.admin.getAdmin954Overview, enabled && isAuthenticated ? {} : 'skip');
}

export function useDemoSubjectCatalog(enabled = true) {
  const { isAuthenticated } = useConvexAuth();
  const query = useQuery(api.demo.listSubjectCatalog, enabled && isAuthenticated ? {} : 'skip');
  return isAuthenticated ? query : DEFAULT_SUBJECTS;
}

export function useSetFacultyAttendance() {
  const { isAuthenticated } = useConvexAuth();
  const mutation = useMutation(api.demo.setFacultyAttendance);

  return async (args) => {
    if (!isAuthenticated) {
      const rows = readJson('gradex_demo_faculty_attendance', []);
      const nextRows = rows.filter(
        (row) =>
          !(
            row.facultyId === args.facultyId &&
            row.studentId === args.studentId &&
            row.date === args.date &&
            row.subjectCode === args.subjectCode
          )
      );

      if (args.status) {
        nextRows.push(args);
      }

      writeJson('gradex_demo_faculty_attendance', nextRows);
      return null;
    }

    return mutation(args);
  };
}

export function useStudentFacultyAttendance(studentId) {
  const { isAuthenticated } = useConvexAuth();
  const query = useQuery(api.demo.getStudentFacultyAttendance, isAuthenticated && studentId ? { studentId } : 'skip');

  if (isAuthenticated) return query;
  if (!studentId) return [];
  return readJson('gradex_demo_faculty_attendance', []).filter((row) => row.studentId === studentId);
}
