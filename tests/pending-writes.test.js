// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

// A phone's worth of browser: localStorage, window events, an online flag.
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};
globalThis.window = new EventTarget();
let online = true;
Object.defineProperty(globalThis, 'navigator', { value: { get onLine() { return online; } }, configurable: true });

const {
  flushPendingOps,
  hasPendingOpsFor,
  queueLocalWrite,
  readJson,
  readPendingOps,
} = await import('../src/lib/pending-writes');

const signIn = (id) => localStorage.setItem('gradex_user_id', id);
const totals = () => readJson('gradex_manual_attendance', {});

beforeEach(() => {
  store.clear();
  online = true;
  signIn('user_a');
});

describe('a write made while Convex is unreachable', () => {
  it('is applied to the offline copy and queued', () => {
    queueLocalWrite('daily', { date: '2026-08-03', subjectCode: 'RM', status: 'present' });

    expect(readJson('gradex_daily_attendance', {})).toEqual({ '2026-08-03': { RM: 'present' } });
    expect(totals().RM).toEqual({ attended: 1, conducted: 1 });
    expect(hasPendingOpsFor('user_a')).toBe(true);
  });

  it('adds to an entered total instead of recounting it', () => {
    localStorage.setItem('gradex_manual_attendance', JSON.stringify({ RM: { attended: 20, conducted: 25 } }));
    queueLocalWrite('daily', { date: '2026-08-03', subjectCode: 'RM', status: 'absent' });
    queueLocalWrite('daily', { date: '2026-08-03', subjectCode: 'RM', status: 'present' });
    expect(totals().RM).toEqual({ attended: 21, conducted: 26 });
  });

  it('files a second hour and a lab hour under their subject', () => {
    queueLocalWrite('daily', { date: '2026-08-03', subjectCode: 'PD-2', status: 'present' });
    queueLocalWrite('daily', { date: '2026-08-06', subjectCode: 'CA-LAB-2', status: 'absent' });
    expect(totals().PD).toEqual({ attended: 1, conducted: 1 });
    expect(totals().CA).toEqual({ attended: 0, conducted: 1 });
  });

  it('keeps only the latest write to the same class', () => {
    const args = { date: '2026-08-03', subjectCode: 'RM' };
    queueLocalWrite('daily', { ...args, status: 'present' });
    queueLocalWrite('daily', { ...args, status: 'absent' });
    queueLocalWrite('daily', { ...args, status: null });

    const ops = readPendingOps();
    expect(ops).toHaveLength(1);
    expect(ops[0].args.status).toBeNull();
    expect(readJson('gradex_daily_attendance', {})).toEqual({});
    expect(totals().RM).toEqual({ attended: 0, conducted: 0 });
  });

  it('is not queued when nobody is signed in', () => {
    store.clear();
    expect(queueLocalWrite('holiday', { date: '2026-08-15', isHoliday: true })).toBe(false);
    expect(readPendingOps()).toEqual([]);
  });
});

describe('sending the queue', () => {
  it('sends everything in order and empties the queue', async () => {
    queueLocalWrite('daily', { date: '2026-08-03', subjectCode: 'RM', status: 'present' });
    queueLocalWrite('holiday', { date: '2026-08-15', isHoliday: true });
    queueLocalWrite('total', { subjectCode: 'QTM', attended: 3, conducted: 4 });

    const send = vi.fn().mockResolvedValue(null);
    await flushPendingOps(send, 'user_a');

    expect(send.mock.calls.map(([type]) => type)).toEqual(['daily', 'holiday', 'total']);
    expect(readPendingOps()).toEqual([]);
    expect(hasPendingOpsFor('user_a')).toBe(false);
  });

  it('does nothing while offline', async () => {
    queueLocalWrite('holiday', { date: '2026-08-15', isHoliday: true });
    online = false;
    const send = vi.fn();
    await flushPendingOps(send, 'user_a');
    expect(send).not.toHaveBeenCalled();
    expect(readPendingOps()).toHaveLength(1);
  });

  it('never sends one account\'s writes into another account', async () => {
    queueLocalWrite('daily', { date: '2026-08-03', subjectCode: 'RM', status: 'present' });
    signIn('user_b');
    const send = vi.fn().mockResolvedValue(null);
    await flushPendingOps(send, 'user_b');
    expect(send).not.toHaveBeenCalled();
    expect(readPendingOps()).toEqual([]);
  });

  it('retries a refused write, then gives up on it without blocking the rest', async () => {
    queueLocalWrite('daily', { date: 'bad', subjectCode: 'RM', status: 'present' });
    queueLocalWrite('holiday', { date: '2026-08-15', isHoliday: true });

    const send = vi.fn((type) => (type === 'daily' ? Promise.reject(new Error('Invalid date')) : Promise.resolve(null)));
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    await flushPendingOps(send, 'user_a');
    // The good write went out on the first pass, behind the refused one.
    expect(send.mock.calls.map(([type]) => type)).toEqual(['daily', 'holiday']);
    expect(readPendingOps().map((op) => op.type)).toEqual(['daily']);

    await flushPendingOps(send, 'user_a');
    await flushPendingOps(send, 'user_a');
    expect(send.mock.calls.filter(([type]) => type === 'daily')).toHaveLength(3);
    expect(readPendingOps()).toEqual([]);
  });
});

describe('the offline copy on a shared phone', () => {
  it('discards the previous account\'s copy before the next account writes', () => {
    queueLocalWrite('daily', { date: '2026-08-03', subjectCode: 'RM', status: 'present' });
    signIn('user_b');
    queueLocalWrite('holiday', { date: '2026-08-15', isHoliday: true });

    expect(readJson('gradex_daily_attendance', {})).toEqual({});
    expect(readJson('gradex_holidays', {})).toEqual({ '2026-08-15': 'Holiday' });
    expect(localStorage.getItem('gradex_cache_owner')).toBe('user_b');
  });
});
