import { useUser } from '@clerk/clerk-react';
import { useConvexAuth, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { buildBridgeUser } from './clerk';
import { DEFAULT_SUBJECTS, DEFAULT_TIMETABLE } from './subjects';

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

  if (!enabled) return undefined;
  if (isAuthenticated) return query;
  if (isSignedIn) return undefined;
  if (!isSignedIn) return null;
  return buildLocalSnapshot(user);
}

export function useCurrentProfile(enabled = true) {
  const { isAuthenticated } = useConvexAuth();
  const { user, isSignedIn } = useUser();
  const query = useQuery(api.users.getCurrentProfile, enabled && isAuthenticated ? {} : 'skip');

  if (!enabled) return undefined;
  if (isAuthenticated) return query;
  if (isSignedIn) return undefined;
  if (!isSignedIn) return null;
  return buildLocalProfile(user);
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
