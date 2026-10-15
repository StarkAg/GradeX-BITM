// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const { getActivityLog, logActivity } = await import('../src/lib/activity-log');

beforeEach(() => store.clear());

// logActivity runs right after a class is marked, inside the same try block
// as the save: if it throws, the screen takes the mark back although it was
// saved. A log is a convenience and must never do that.
describe('the activity log', () => {
  it('keeps the latest entries first', () => {
    logActivity('attendance_updated', { subject: 'A' });
    logActivity('attendance_updated', { subject: 'B' });
    expect(getActivityLog().map((entry) => entry.details.subject)).toEqual(['B', 'A']);
  });

  it.each(['{', 'null', '{"a":1}', '"text"'])('starts over instead of throwing when the stored log is %s', (stored) => {
    localStorage.setItem('gradex_activity_log', stored);
    expect(() => logActivity('attendance_updated', { subject: 'A' })).not.toThrow();
    expect(getActivityLog()).toHaveLength(1);
  });

  it.each(['{', 'null', '{"a":1}'])('reads a damaged log (%s) as empty', (stored) => {
    localStorage.setItem('gradex_activity_log', stored);
    expect(getActivityLog()).toEqual([]);
  });
});
