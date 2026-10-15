/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api, internal } from '../convex/_generated/api';
import schema from '../convex/schema';
import { resolveBaseSubjectCode } from '../convex/defaults';

const modules = import.meta.glob('../convex/**/*.*s');

// A signed-in student: a row in `users` plus a token whose subject is
// "<user id>|<session id>", which is what Convex Auth issues.
async function addUser(t: ReturnType<typeof convexTest>, email: string) {
  const userId = await t.run((ctx) => ctx.db.insert('users', { email }));
  return { userId, user: t.withIdentity({ subject: `${userId}|test-session` }) };
}

async function signedIn(email = 'asha@example.com') {
  const t = convexTest(schema, modules);
  const { user, userId } = await addUser(t, email);
  await user.mutation(api.users.syncCurrentUser, {});
  return { t, user, userId };
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
    const { t, user } = await signedIn('asha@example.com');
    await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'RM', status: 'present' });

    const { user: other } = await addUser(t, 'ben@example.com');
    await other.mutation(api.users.syncCurrentUser, {});
    const snapshot = await other.query(api.academics.getCurrentSnapshot, {});
    expect(snapshot.dailyAttendance).toEqual({});
    expect(snapshot.attendanceTotals).toEqual({});
    expect(snapshot.profile).toMatchObject({ username: 'ben', email: 'ben@example.com' });
  });

  it('refuses the admin overview to an ordinary signed-in student', async () => {
    const { user } = await signedIn();
    await expect(user.query(api.admin.getAdmin954Overview, {})).rejects.toThrow('Not authorized');
  });

  it('allows the admin overview to an account named in ADMIN_USER_IDS', async () => {
    const { t } = await signedIn('asha@example.com');
    const { user: admin, userId: adminId } = await addUser(t, 'admin@example.com');
    process.env.ADMIN_USER_IDS = `someone-else, ${adminId}`;
    try {
      const overview = await admin.query(api.admin.getAdmin954Overview, {});
      expect(overview.users.map((u: any) => u.username).sort()).toEqual(['admin', 'asha']);
    } finally {
      delete process.env.ADMIN_USER_IDS;
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

  it('refuses a token that outlived its account', async () => {
    const { user } = await signedIn();
    await user.mutation(api.users.deleteCurrentUserData, {});
    await expect(
      user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'RM', status: 'present' })
    ).rejects.toThrow('Not authenticated');
    await expect(user.mutation(api.users.syncCurrentUser, {})).rejects.toThrow('Not authenticated');
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

describe('profile', () => {
  it('starts with the email name and takes a real name', async () => {
    const { user } = await signedIn('asha.k@example.com');
    expect(await user.query(api.users.getCurrentProfile, {})).toMatchObject({ username: 'asha.k', name: 'asha.k' });
    await user.mutation(api.users.updateCurrentProfile, { name: '  Asha Kumari ' });
    expect(await user.query(api.users.getCurrentProfile, {})).toMatchObject({ username: 'asha.k', name: 'Asha Kumari' });
  });
});

describe('accounts from the Clerk sign-in', () => {
  // What production held on the day sign-in moved: a `users` row keyed by a
  // Clerk id, and that student's rows stored under the same id.
  async function seedLegacy(t: ReturnType<typeof convexTest>, email: string, clerkUserId: string) {
    await t.run(async (ctx) => {
      await ctx.db.insert('users', { clerkUserId, email, username: 'asha', name: 'Asha Kumari', createdAt: 111, updatedAt: 111 });
      const stamp = { userId: clerkUserId, createdAt: 111, updatedAt: 111 };
      await ctx.db.insert('subjects', { ...stamp, code: 'OB', name: 'Organizational Behavior', room: 'LH-11', isLab: false });
      await ctx.db.insert('timetableEntries', { ...stamp, day: 'Monday', slotIndex: 0, subjectCode: 'OB', room: 'LH-11', isLab: false });
      await ctx.db.insert('attendanceDaily', { ...stamp, date: '2026-08-03', subjectCode: 'OB', status: 'present' });
      await ctx.db.insert('attendanceTotals', { userId: clerkUserId, subjectCode: 'OB', classesAttended: 21, classesConducted: 26, updatedAt: 111 });
      await ctx.db.insert('holidays', { ...stamp, date: '2026-08-15', label: 'Holiday' });
    });
  }

  it('hands everything to the account created with the same email', async () => {
    const t = convexTest(schema, modules);
    await seedLegacy(t, 'asha@example.com', 'user_clerk_1');

    const { user, userId } = await addUser(t, 'asha@example.com');
    const synced = await user.mutation(api.users.syncCurrentUser, {});
    expect(synced).toMatchObject({ id: userId, name: 'Asha Kumari', username: 'asha', legacyId: 'user_clerk_1' });

    const snapshot = await user.query(api.academics.getCurrentSnapshot, {});
    expect(snapshot.subjects.map((s: any) => s.code)).toEqual(['OB']);
    expect(snapshot.timetable.Monday[0]).toMatchObject({ code: 'OB' });
    expect(snapshot.dailyAttendance).toEqual({ '2026-08-03': { OB: 'present' } });
    expect(snapshot.attendanceTotals).toEqual({ OB: { attended: 21, conducted: 26 } });
    expect(snapshot.holidays).toEqual({ '2026-08-15': 'Holiday' });

    const left = await t.run(async (ctx) => ({
      users: (await ctx.db.query('users').collect()).length,
      underOldId: (await ctx.db.query('subjects').withIndex('by_user_id', (q) => q.eq('userId', 'user_clerk_1')).collect()).length,
    }));
    expect(left).toEqual({ users: 1, underOldId: 0 });

    // The next launch does nothing further.
    expect((await user.mutation(api.users.syncCurrentUser, {})).legacyId).toBeNull();
    await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-04', subjectCode: 'OB', status: 'absent' });
    expect(await total(user, 'OB')).toEqual({ attended: 21, conducted: 27 });
  });

  it('leaves it alone for an account with a different email', async () => {
    const t = convexTest(schema, modules);
    await seedLegacy(t, 'asha@example.com', 'user_clerk_1');

    const { user } = await addUser(t, 'someone.else@example.com');
    expect((await user.mutation(api.users.syncCurrentUser, {})).legacyId).toBeNull();
    const snapshot = await user.query(api.academics.getCurrentSnapshot, {});
    expect(snapshot.attendanceTotals).toEqual({});
    expect(snapshot.subjects.length).toBeGreaterThan(1);

    const legacyRows = await t.run((ctx) => ctx.db.query('attendanceDaily').withIndex('by_user_id', (q) => q.eq('userId', 'user_clerk_1')).collect());
    expect(legacyRows).toHaveLength(1);
  });
});

describe('account deletion', () => {
  it('removes every row the student owns, sign-in included', async () => {
    const { t, user, userId } = await signedIn();
    await user.mutation(api.academics.setDailyAttendanceStatus, { date: '2026-08-03', subjectCode: 'RM', status: 'present' });
    await user.mutation(api.academics.setHoliday, { date: '2026-08-15', isHoliday: true });
    await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert('authSessions', { userId, expirationTime: Date.now() + 1000 });
      await ctx.db.insert('authRefreshTokens', { sessionId, expirationTime: Date.now() + 1000 });
      await ctx.db.insert('authAccounts', { userId, provider: 'password', providerAccountId: 'asha@example.com', secret: 'hash' });
    });
    await user.mutation(api.users.deleteCurrentUserData, {});

    const left = await t.run(async (ctx) => {
      const tables = [
        'users', 'subjects', 'timetableEntries', 'attendanceDaily', 'attendanceTotals', 'holidays',
        'authSessions', 'authRefreshTokens', 'authAccounts',
      ] as const;
      const counts: Record<string, number> = {};
      for (const table of tables) counts[table] = (await ctx.db.query(table).collect()).length;
      return counts;
    });
    expect(Object.values(left).every((count) => count === 0)).toBe(true);
  });
});

describe('a student who has set up their own subjects', () => {
  // A student in another section clears the starter classes and keeps one
  // subject of their own, not yet placed in the week. The starter timetable is
  // only for an account that has never saved anything: handed back here, its
  // cells show as taken slots in the editor, under subjects they do not have.
  it('keeps an empty timetable empty instead of showing the starter one', async () => {
    const { user } = await signedIn();
    const emptyWeek = Object.fromEntries(
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => [day, Array(10).fill(null)])
    );
    await user.mutation(api.academics.saveAcademicState, {
      subjects: [{ name: 'Marketing', code: 'MKT', room: 'LH-2' }],
      timetable: emptyWeek,
    });

    const snapshot = await user.query(api.academics.getCurrentSnapshot, {});
    expect(snapshot.subjects.map((subject: any) => subject.code)).toEqual(['MKT']);
    const placed = Object.values(snapshot.timetable).flat().filter(Boolean);
    expect(placed).toEqual([]);
  });

  it('still shows the starter timetable to an account that has saved nothing', async () => {
    const t = convexTest(schema, modules);
    const { user } = await addUser(t, 'new@example.com');
    const snapshot = await user.query(api.academics.getCurrentSnapshot, {});
    expect(snapshot.subjects.length).toBeGreaterThan(0);
    expect(Object.values(snapshot.timetable).flat().filter(Boolean).length).toBeGreaterThan(0);
  });
});
