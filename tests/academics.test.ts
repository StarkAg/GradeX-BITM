/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api, internal } from '../convex/_generated/api';
import schema from '../convex/schema';
import { resolveBaseSubjectCode } from '../convex/defaults';

const modules = import.meta.glob('../convex/**/*.*s');

const PROFILE = { username: 'asha', name: 'Asha' };

async function signedIn(subject = 'user_a') {
  const t = convexTest(schema, modules);
  const user = t.withIdentity({ subject });
  await user.mutation(api.users.syncCurrentUser, PROFILE);
  return { t, user };
}

const total = async (user: any, code: string) =>
  (await user.query(api.academics.getCurrentSnapshot, {})).attendanceTotals[code];

describe('resolveBaseSubjectCode', () => {
  it('maps hour keys back to their subject', () => {
    const known = new Set(['PD', 'CA']);
    expect(resolveBaseSubjectCode('PD-2', known)).toBe('PD');
    expect(resolveBaseSubjectCode('CA-LAB', known)).toBe('CA');
    expect(resolveBaseSubjectCode('CA-LAB-2', known)).toBe('CA');
  });

  it('does not cut a subject code that looks like an hour key', () => {
    const known = new Set(['CS-101']);
    expect(resolveBaseSubjectCode('CS-101', known)).toBe('CS-101');
    expect(resolveBaseSubjectCode('CS-101-2', known)).toBe('CS-101');
    expect(resolveBaseSubjectCode('CS-101-LAB', known)).toBe('CS-101');
  });
});

describe('attendance totals', () => {
  it('keeps the entered total when a class is marked on the calendar', async () => {
    const { user } = await signedIn();
    await user.mutation(api.academics.setManualAttendanceTotal, { subjectCode: 'RM', attended: 20, conducted: 25 });

    await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'RM', status: 'present' });
    expect(await total(user, 'RM')).toEqual({ attended: 21, conducted: 26 });

    await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-04', subjectCode: 'RM', status: 'absent' });
    expect(await total(user, 'RM')).toEqual({ attended: 21, conducted: 27 });
  });

  it('moves the total correctly when a mark is changed or cleared', async () => {
    const { user } = await signedIn();
    const mark = (status: 'present' | 'absent' | null) =>
      user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'QTM', status });

    await mark('present');
    expect(await total(user, 'QTM')).toEqual({ attended: 1, conducted: 1 });
    await mark('absent');
    expect(await total(user, 'QTM')).toEqual({ attended: 0, conducted: 1 });
    await mark(null);
    expect(await total(user, 'QTM')).toEqual({ attended: 0, conducted: 0 });
  });

  it('ignores the same mark sent twice', async () => {
    const { user } = await signedIn();
    const args = { date: '2026-08-03', subjectCode: 'QTM', status: 'present' as const };
    await user.mutation(api.academics.setDailyAttendanceStatus, args);
    await user.mutation(api.academics.setDailyAttendanceStatus, args);
    expect(await total(user, 'QTM')).toEqual({ attended: 1, conducted: 1 });
  });

  it('counts each hour of a subject, including both lab hours', async () => {
    const { user } = await signedIn();
    for (const subjectCode of ['CA-LAB', 'CA-LAB-2']) {
      await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-06', subjectCode, status: 'present' });
    }
    for (const subjectCode of ['PD', 'PD-2']) {
      await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode, status: 'absent' });
    }
    expect(await total(user, 'CA')).toEqual({ attended: 2, conducted: 2 });
    expect(await total(user, 'PD')).toEqual({ attended: 0, conducted: 2 });
  });

  it('never stores more attended than conducted, or a negative count', async () => {
    const { user } = await signedIn();
    await user.mutation(api.academics.setManualAttendanceTotal, { subjectCode: 'RM', attended: 9, conducted: 4 });
    expect(await total(user, 'RM')).toEqual({ attended: 4, conducted: 4 });
    await user.mutation(api.academics.setManualAttendanceTotal, { subjectCode: 'RM', attended: -3, conducted: -1 });
    expect(await total(user, 'RM')).toEqual({ attended: 0, conducted: 0 });
  });

  it('rejects a malformed date', async () => {
    const { user } = await signedIn();
    await expect(
      user.mutation(api.academics.setDailyAttendanceStatus, { date: '3 Aug', subjectCode: 'RM', status: 'present' })
    ).rejects.toThrow('Invalid date');
  });
});

describe('saveAcademicState', () => {
  const subject = (code: string) => ({ name: `Subject ${code}`, code, room: 'LH-11', isLab: false });

  it('keeps attendance for a subject whose code contains a hyphen and number', async () => {
    const { user } = await signedIn();
    const subjects = [subject('CS-101'), subject('RM')];
    const timetable = { Monday: [{ code: 'CS-101' }, { code: 'CS-101' }] };
    await user.mutation(api.academics.saveAcademicState, { subjects, timetable });

    await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'CS-101', status: 'present' });
    await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'CS-101-2', status: 'absent' });
    expect(await total(user, 'CS-101')).toEqual({ attended: 1, conducted: 2 });

    // Any later save (here: adding a subject) used to delete all of it.
    await user.mutation(api.academics.saveAcademicState, { subjects: [...subjects, subject('MA')], timetable });
    const snapshot = await user.query(api.academics.getCurrentSnapshot, {});
    expect(snapshot.attendanceTotals['CS-101']).toEqual({ attended: 1, conducted: 2 });
    expect(snapshot.dailyAttendance['2026-08-03']).toEqual({ 'CS-101': 'present', 'CS-101-2': 'absent' });
  });

  it('drops attendance only for a subject that was removed', async () => {
    const { user } = await signedIn();
    await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'RM', status: 'present' });
    await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'PD-2', status: 'present' });

    const before = await user.query(api.academics.getCurrentSnapshot, {});
    await user.mutation(api.academics.saveAcademicState, {
      subjects: before.subjects.filter((s: any) => s.code !== 'RM'),
      timetable: before.timetable,
    });

    const after = await user.query(api.academics.getCurrentSnapshot, {});
    expect(after.attendanceTotals.RM).toBeUndefined();
    expect(after.attendanceTotals.PD).toEqual({ attended: 1, conducted: 1 });
    expect(after.dailyAttendance['2026-08-03']).toEqual({ 'PD-2': 'present' });
    expect(after.timetable.Monday.some((cell: any) => cell?.code === 'RM')).toBe(false);
  });

  it('stores one subject per code and ignores cells outside the grid', async () => {
    const { user } = await signedIn();
    await user.mutation(api.academics.saveAcademicState, {
      subjects: [subject('MM'), { ...subject('MM'), name: 'Duplicate' }],
      timetable: { Monday: [{ code: 'MM' }, { code: 'NOPE' }], Funday: [{ code: 'MM' }] },
    });
    const snapshot = await user.query(api.academics.getCurrentSnapshot, {});
    expect(snapshot.subjects.map((s: any) => s.name)).toEqual(['Subject MM']);
    expect(snapshot.timetable.Monday.filter(Boolean)).toHaveLength(1);
    expect(snapshot.timetable.Funday).toBeUndefined();
  });
});

describe('access', () => {
  it('keeps one student\'s data away from another', async () => {
    const { t, user } = await signedIn('user_a');
    await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'RM', status: 'present' });

    const other = t.withIdentity({ subject: 'user_b' });
    await other.mutation(api.users.syncCurrentUser, { username: 'ben', name: 'Ben' });
    const snapshot = await other.query(api.academics.getCurrentSnapshot, {});
    expect(snapshot.dailyAttendance).toEqual({});
    expect(snapshot.attendanceTotals).toEqual({});
  });

  it('refuses the admin overview to an ordinary signed-in student', async () => {
    const { user } = await signedIn();
    await expect(user.query(api.admin.getAdmin954Overview, {})).rejects.toThrow('Not authorized');
  });

  it('allows the admin overview to an account named in ADMIN_CLERK_USER_IDS', async () => {
    process.env.ADMIN_CLERK_USER_IDS = 'user_admin';
    try {
      const { t } = await signedIn('user_a');
      const admin = t.withIdentity({ subject: 'user_admin' });
      const overview = await admin.query(api.admin.getAdmin954Overview, {});
      expect(overview.users.map((u: any) => u.username)).toEqual(['asha']);
    } finally {
      delete process.env.ADMIN_CLERK_USER_IDS;
    }
  });

  it('refuses every write without a session', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'RM', status: 'present' })
    ).rejects.toThrow('Not authenticated');
    await expect(
      t.mutation(api.demo.setFacultyAttendance, {
        facultyId: 'f', studentId: 's', studentName: 'S', date: '2026-08-03', subjectCode: 'RM', classroom: 'LH-11', status: 'present',
      })
    ).rejects.toThrow('Not authenticated');
  });

  it('sets the force-update version from the CLI-only mutation', async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.appSettings.getForceUpdateVersion, {})).toBeNull();
    await t.mutation(internal.appSettings.setForceUpdateVersion, { version: ' 1.3.0 ' });
    await t.mutation(internal.appSettings.setForceUpdateVersion, { version: '1.4.0' });
    expect(await t.query(api.appSettings.getForceUpdateVersion, {})).toBe('1.4.0');
    expect(await t.run((ctx) => ctx.db.query('appSettings').collect())).toHaveLength(1);
  });
});

describe('account deletion', () => {
  it('removes every row the student owns, holidays included', async () => {
    const { t, user } = await signedIn();
    await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'RM', status: 'present' });
    await user.mutation(api.academics.setHoliday, { date: '2026-08-15', isHoliday: true });
    await user.mutation(api.users.deleteCurrentUserData, {});

    const left = await t.run(async (ctx) => {
      const tables = ['users', 'subjects', 'timetableEntries', 'attendanceDaily', 'attendanceTotals', 'holidays'] as const;
      const counts: Record<string, number> = {};
      for (const table of tables) counts[table] = (await ctx.db.query(table).collect()).length;
      return counts;
    });
    expect(left).toEqual({ users: 0, subjects: 0, timetableEntries: 0, attendanceDaily: 0, attendanceTotals: 0, holidays: 0 });
  });
});
