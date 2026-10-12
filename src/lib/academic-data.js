import { useEffect, useMemo, useState } from 'react';
import { useConvex, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ACADEMIC_CACHE_OWNER_KEY, readCachedIdentity } from './session';
import { DEFAULT_SUBJECTS, DEFAULT_TIMETABLE } from './subjects';
import {
  PENDING_OPS_EVENT,
  flushPendingOps,
  hasPendingOpsFor,
  isBrowserOnline,
  isCacheOwnedBy,
  normalizeAttendanceTotals,
  queueLocalWrite,
  readJson,
  readString,
  writeJson,
} from './pending-writes';

// buildLocalSnapshot reads localStorage and allocates a new object every call.
// Bumping this on 'subjectsUpdated' keeps the memoized snapshot referentially
// stable across re-renders (so effects keyed on it don't loop) while still
// picking up local edits made while offline.
function useLocalDataVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener('subjectsUpdated', bump);
    return () => window.removeEventListener('subjectsUpdated', bump);
  }, []);
  return version;
}

// The id of the student this device is signed in as ('' when signed out). It
// is the key their rows are stored under on the server and the owner stamp on
// the offline copy and on queued writes. session.js announces every change to
// it with a 'storage' event, and only when it really changed.
function useSessionUserId() {
  const [userId, setUserId] = useState(() => readString('gradex_user_id'));
  useEffect(() => {
    const refresh = () => setUserId(readString('gradex_user_id'));
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);
  return userId;
}

const PENDING_MUTATIONS = {
  daily: api.academics.setDailyAttendanceStatus,
  total: api.academics.setManualAttendanceTotal,
  holiday: api.academics.setHoliday,
  academic: api.academics.saveAcademicState,
};

const PENDING_RETRY_MS = 5000;

function usePendingOpsVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    window.addEventListener(PENDING_OPS_EVENT, bump);
    return () => window.removeEventListener(PENDING_OPS_EVENT, bump);
  }, []);
  return version;
}

// Mounted once (App.jsx). Sends queued writes (see ./pending-writes.js)
// whenever Convex has accepted the session and the browser is online.
export function usePendingOpsSync() {
  const { isAuthenticated } = useConvexAuth();
  const convex = useConvex();
  const userId = useSessionUserId();

  useEffect(() => {
    if (!isAuthenticated || !userId) return undefined;

    // While anything is left queued the app shows the offline copy rather
    // than live data, so a refused write is retried on a timer until it is
    // sent or dropped - never left waiting for the next launch.
    let retryTimer = null;
    let stopped = false;
    const flush = async () => {
      if (stopped) return;
      window.clearTimeout(retryTimer);
      const left = await flushPendingOps(
        (type, args) => convex.mutation(PENDING_MUTATIONS[type], args),
        userId
      );
      if (!stopped && left > 0 && isBrowserOnline()) {
        retryTimer = window.setTimeout(flush, PENDING_RETRY_MS);
      }
    };

    void flush();
    window.addEventListener('online', flush);
    window.addEventListener(PENDING_OPS_EVENT, flush);
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      window.removeEventListener('online', flush);
      window.removeEventListener(PENDING_OPS_EVENT, flush);
    };
  }, [isAuthenticated, userId, convex]);
}

const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

// localStorage is outside the app's control (old versions, a half-written
// value, a full disk). Every screen assumes these shapes, so anything that is
// not the expected shape falls back to the default instead of crashing render.
function readCachedSubjects() {
  const subjects = readJson('gradex_subjects', DEFAULT_SUBJECTS);
  if (!Array.isArray(subjects)) return DEFAULT_SUBJECTS;
  return subjects.filter((subject) => isPlainObject(subject) && typeof subject.code === 'string' && typeof subject.name === 'string');
}

function readCachedTimetable() {
  const timetable = readJson('gradex_timetable', DEFAULT_TIMETABLE);
  if (!isPlainObject(timetable)) return DEFAULT_TIMETABLE;
  const cleaned = {};
  Object.entries(timetable).forEach(([day, slots]) => {
    if (Array.isArray(slots)) {
      cleaned[day] = slots.map((cell) => (isPlainObject(cell) && typeof cell.code === 'string' ? cell : null));
    }
  });
  return cleaned;
}

function readCachedMap(key) {
  const value = readJson(key, {});
  return isPlainObject(value) ? value : {};
}

function buildLocalSnapshot(ownerId) {
  const owned = isCacheOwnedBy(ownerId);
  return {
    profile: readCachedIdentity(),
    subjects: owned ? readCachedSubjects() : DEFAULT_SUBJECTS,
    timetable: owned ? readCachedTimetable() : DEFAULT_TIMETABLE,
    attendanceTotals: normalizeAttendanceTotals(owned ? readCachedMap('gradex_manual_attendance') : {}),
    dailyAttendance: owned ? readCachedMap('gradex_daily_attendance') : {},
    holidays: owned ? readCachedMap('gradex_holidays') : {},
  };
}

export function useAcademicSnapshot(enabled = true) {
  const { isAuthenticated } = useConvexAuth();
  const query = useQuery(api.academics.getCurrentSnapshot, enabled && isAuthenticated ? {} : 'skip');
  const localVersion = useLocalDataVersion();
  const pendingVersion = usePendingOpsVersion();
  const ownerId = useSessionUserId();
  const localSnapshot = useMemo(() => buildLocalSnapshot(ownerId), [ownerId, localVersion, pendingVersion]);
  const hasPending = useMemo(() => hasPendingOpsFor(ownerId), [ownerId, pendingVersion, localVersion]);

  // Mirror each successful snapshot into localStorage so the offline fallback
  // above serves the user's real data rather than DEFAULT_*. Writes directly
  // instead of going through the mutations' local branch: those dispatch
  // 'subjectsUpdated', which would bump localVersion, rebuild the memo, and
  // re-run this effect on a loop.
  //
  // Held back while writes are still queued: the server has not seen them yet,
  // so its snapshot would overwrite the only copy of what the user just did.
  // Filed under the id the snapshot itself reports, never a remembered one.
  const snapshotOwnerId = query?.profile?.id || '';
  useEffect(() => {
    if (!query || !snapshotOwnerId || hasPendingOpsFor(snapshotOwnerId)) return;
    try {
      writeJson('gradex_subjects', query.subjects || []);
      writeJson('gradex_timetable', query.timetable || {});
      writeJson('gradex_daily_attendance', query.dailyAttendance || {});
      writeJson('gradex_manual_attendance', query.attendanceTotals || {});
      writeJson('gradex_holidays', query.holidays || {});
      localStorage.setItem(ACADEMIC_CACHE_OWNER_KEY, snapshotOwnerId);
    } catch (err) {
      console.warn('[AcademicData] Failed to cache snapshot for offline use:', err);
    }
  }, [query, snapshotOwnerId, hasPending]);

  if (!enabled) return undefined;
  // Convex query resolved (online, handshake done) and nothing is waiting to
  // be sent: use live data.
  if (query !== undefined && !hasPending) return query;
  // Signed in but Convex hasn't caught up yet (offline, still connecting, or
  // queued writes not yet sent): serve the local copy, which already includes
  // those writes, instead of spinning or showing the state before them.
  if (ownerId) return localSnapshot;
  return query === undefined ? null : query;
}

export function useCurrentProfile(enabled = true) {
  const { isAuthenticated } = useConvexAuth();
  const query = useQuery(api.users.getCurrentProfile, enabled && isAuthenticated ? {} : 'skip');
  const ownerId = useSessionUserId();
  const localProfile = useMemo(() => readCachedIdentity(), [ownerId]);

  if (!enabled) return undefined;
  if (query !== undefined) return query;
  return ownerId ? localProfile : null;
}

export function useSyncCurrentUser() {
  return useMutation(api.users.syncCurrentUser);
}

export function useUpdateCurrentProfile() {
  const { isAuthenticated } = useConvexAuth();
  const mutation = useMutation(api.users.updateCurrentProfile);

  return async ({ name }) => {
    if (!isAuthenticated) {
      throw new Error('You are offline. Connect to the internet to change your name.');
    }

    return mutation({ name });
  };
}

export function useDeleteCurrentUserData() {
  const { isAuthenticated } = useConvexAuth();
  const mutation = useMutation(api.users.deleteCurrentUserData);

  return async (args) => {
    if (!isAuthenticated) {
      // Deleting an account needs the server; refusing is better than
      // clearing this device and reporting the account as deleted.
      throw new Error('You are offline. Connect to the internet to delete your account.');
    }

    return mutation(args);
  };
}

// One hook per academic write. Online with a live session it is an ordinary
// Convex mutation; otherwise it is applied to the offline copy and queued.
function useQueuedMutation(type) {
  const { isAuthenticated } = useConvexAuth();
  const mutation = useMutation(PENDING_MUTATIONS[type]);

  return async (args) => {
    if (isAuthenticated && isBrowserOnline()) return mutation(args);
    queueLocalWrite(type, args);
    return null;
  };
}

export function useSaveAcademicState() {
  return useQueuedMutation('academic');
}

export function useSetManualAttendanceTotal() {
  return useQueuedMutation('total');
}

export function useSetDailyAttendanceStatus() {
  return useQueuedMutation('daily');
}

export function useSetHoliday() {
  return useQueuedMutation('holiday');
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
