// The device's own copy of a student's data, and the queue of writes on their
// way to Convex. No React in here, so it can be tested directly.
//
// The app is local-first. Marking a class, changing a total, a holiday or the
// timetable is written to this device at once and shown from here; it is then
// sent to Convex in the background, immediately when there is a connection
// and whenever one returns when there is not. Nothing a student does waits on
// the network, and nothing is lost by closing the app before it has synced:
// the queue is kept in localStorage.
//
// Every queued write states a final value (this class is "present", this
// subject's total is 12/15), never a change, so sending one twice is harmless.

import { ACADEMIC_CACHE_KEYS, ACADEMIC_CACHE_OWNER_KEY } from './session';
import { DEFAULT_SUBJECTS } from './subjects';

export const PENDING_OPS_KEY = 'gradex_pending_ops';
export const PENDING_OPS_EVENT = 'gradex-pending-ops';
// Same event name and shape as GradeX's OfflineIndicator listens for.
export const SYNC_FEEDBACK_EVENT = 'gradex-sync-feedback';
const MAX_PENDING_OPS = 500;
const MAX_PENDING_ATTEMPTS = 3;

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readString(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

export function isBrowserOnline() {
  return typeof navigator === 'undefined' || navigator.onLine !== false;
}

function readObject(key) {
  const value = readJson(key, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function normalizeAttendanceTotals(input) {
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

// ---------------------------------------------------------------------------
// Whose offline copy is it
// ---------------------------------------------------------------------------

// The cached copy belongs to whoever was signed in when it was written. On a
// shared phone the next person to sign in must not be shown (or, through a
// queued write, have saved into their account) the previous person's data.
// A cache written before owners were recorded has no stamp and is trusted.
export function isCacheOwnedBy(ownerId) {
  const cacheOwner = readString(ACADEMIC_CACHE_OWNER_KEY);
  return !cacheOwner || cacheOwner === ownerId;
}

// True once this device holds its own copy of the signed-in student's data
// (written by the first server snapshot). Until then a write has nothing real
// to be applied to locally.
export function isLocalCopyReady() {
  const ownerId = readString('gradex_user_id');
  return Boolean(ownerId)
    && readString(ACADEMIC_CACHE_OWNER_KEY) === ownerId
    && localStorage.getItem('gradex_subjects') !== null;
}

// Claims the cache for the current user before a local write, discarding a
// previous owner's copy first so the two never mix.
function claimLocalCache(ownerId) {
  if (!isCacheOwnedBy(ownerId)) {
    ACADEMIC_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));
  }
  localStorage.setItem(ACADEMIC_CACHE_OWNER_KEY, ownerId);
}

// ---------------------------------------------------------------------------
// Applying a write to the offline copy
// ---------------------------------------------------------------------------

function stripSlotSuffix(subjectCode) {
  if (subjectCode.endsWith('-LAB')) return subjectCode.slice(0, -4);
  const parts = subjectCode.split('-');
  const tail = parts[parts.length - 1];
  if (parts.length > 1 && /^\d+$/.test(tail)) {
    return parts.slice(0, -1).join('-');
  }
  return subjectCode;
}

// Mirrors resolveBaseSubjectCode in convex/defaults.ts.
export function resolveBaseCode(subjectCode, knownCodes) {
  const known = new Set(knownCodes);
  let current = subjectCode;
  for (let i = 0; i < 4; i += 1) {
    if (known.has(current)) return current;
    const next = stripSlotSuffix(current);
    if (next === current) break;
    current = next;
  }
  return current;
}

const LOCAL_WRITES = {
  academic(args) {
    writeJson('gradex_subjects', args.subjects);
    writeJson('gradex_timetable', args.timetable);
  },

  total(args) {
    const totals = normalizeAttendanceTotals(readObject('gradex_manual_attendance'));
    const conducted = Math.max(0, Number(args.conducted || 0));
    totals[args.subjectCode] = {
      attended: Math.min(conducted, Math.max(0, Number(args.attended || 0))),
      conducted,
    };
    writeJson('gradex_manual_attendance', totals);
  },

  daily(args) {
    const dailyAttendance = readObject('gradex_daily_attendance');
    const previous = dailyAttendance[args.date]?.[args.subjectCode] || null;
    if (previous === args.status) return;

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

    // Same arithmetic as adjustAttendanceTotal in convex/academics.ts: move
    // the running total by this one mark, never recount it from the daily
    // rows (that would drop the classes entered on the Attendance page).
    const cachedSubjects = readJson('gradex_subjects', DEFAULT_SUBJECTS);
    const subjectCodes = (Array.isArray(cachedSubjects) ? cachedSubjects : DEFAULT_SUBJECTS).map((subject) => subject?.code);
    const baseCode = resolveBaseCode(args.subjectCode, subjectCodes);
    const totals = normalizeAttendanceTotals(readObject('gradex_manual_attendance'));
    const current = totals[baseCode] || { attended: 0, conducted: 0 };
    const conducted = Math.max(0, current.conducted + (args.status === null ? 0 : 1) - (previous === null ? 0 : 1));
    const attended = Math.min(
      conducted,
      Math.max(0, current.attended + (args.status === 'present' ? 1 : 0) - (previous === 'present' ? 1 : 0))
    );
    totals[baseCode] = { attended, conducted };
    writeJson('gradex_manual_attendance', totals);
  },

  holiday(args) {
    const holidays = readObject('gradex_holidays');
    if (args.isHoliday) {
      holidays[args.date] = args.label || 'Holiday';
    } else {
      delete holidays[args.date];
    }
    writeJson('gradex_holidays', holidays);
  },
};

// ---------------------------------------------------------------------------
// The queue
// ---------------------------------------------------------------------------

function pendingOpKey(type, args) {
  if (type === 'daily') return `daily:${args.date}:${args.subjectCode}`;
  if (type === 'total') return `total:${args.subjectCode}`;
  if (type === 'holiday') return `holiday:${args.date}`;
  return type;
}

export function readPendingOps() {
  const ops = readJson(PENDING_OPS_KEY, []);
  return Array.isArray(ops) ? ops : [];
}

function writePendingOps(ops) {
  try {
    writeJson(PENDING_OPS_KEY, ops.slice(-MAX_PENDING_OPS));
  } catch (err) {
    console.warn('[PendingWrites] Failed to store pending writes:', err);
  }
  window.dispatchEvent(new Event(PENDING_OPS_EVENT));
}

export function hasPendingOpsFor(ownerId) {
  return Boolean(ownerId) && readPendingOps().some((op) => op.owner === ownerId);
}

// How many writes this device is still holding for the signed-in user.
export function countPendingOps() {
  const ownerId = readString('gradex_user_id');
  return ownerId ? readPendingOps().filter((op) => op.owner === ownerId).length : 0;
}

// Strictly increasing, so a write can always be told from the one it replaced
// even when both are made within the same millisecond.
let lastQueuedAt = 0;

// Applies the write to the offline copy and queues it for the server.
// `type` is one of: academic, total, daily, holiday.
export function queueLocalWrite(type, args, ownerId) {
  const owner = ownerId || readString('gradex_user_id');
  if (!owner) return false;

  claimLocalCache(owner);
  LOCAL_WRITES[type](args);

  const key = pendingOpKey(type, args);
  // A newer write to the same thing replaces the older one.
  const ops = readPendingOps().filter((op) => !(op.owner === owner && op.key === key));
  lastQueuedAt = Math.max(Date.now(), lastQueuedAt + 1);
  ops.push({ owner, key, type, args, queuedAt: lastQueuedAt, attempts: 0 });
  writePendingOps(ops);
  window.dispatchEvent(new Event('subjectsUpdated'));
  return true;
}

// Re-files writes queued under one account id as another's. Used once per
// student, when an account from the Clerk sign-in is carried over to its new
// id (users:syncCurrentUser returns the old id as `legacyId`): anything marked
// offline just before the change would otherwise be thrown away as "someone
// else's".
export function adoptPendingOps(fromOwner, toOwner) {
  if (!fromOwner || !toOwner || fromOwner === toOwner) return;
  const ops = readPendingOps();
  if (!ops.some((op) => op.owner === fromOwner)) return;
  writePendingOps(ops.map((op) => (op.owner === fromOwner ? { ...op, owner: toOwner } : op)));
}

let flushing = false;

// Sends queued writes for `userId`, oldest first. `send(type, args)` performs
// the mutation and rejects if the server refuses it.
// Resolves to how many of this user's writes are still queued.
export async function flushPendingOps(send, userId) {
  const remaining = () => readPendingOps().filter((op) => op.owner === userId).length;
  if (flushing || !userId || !isBrowserOnline()) return remaining();
  flushing = true;

  // One attempt per write per pass: a refused write goes to the back, the
  // rest still go out, and the pass ends when only refused writes are left.
  const refusedThisPass = new Set();

  try {
    for (;;) {
      // Writes queued under another account on this device are not ours to
      // send.
      const all = readPendingOps();
      const mine = all.filter((op) => op.owner === userId);
      if (mine.length !== all.length) writePendingOps(mine);

      const next = mine[0];
      if (!next || refusedThisPass.has(next.key)) break;

      const isSameOp = (op) => op.key === next.key && op.queuedAt === next.queuedAt;

      try {
        await send(next.type, next.args);
      } catch (err) {
        // The server refused it. It gets a few passes, then is dropped so it
        // cannot sit in the queue for ever.
        console.warn('[PendingWrites] Pending write failed:', next.key, err);
        const attempts = (next.attempts || 0) + 1;
        const rest = readPendingOps().filter((op) => !isSameOp(op));
        refusedThisPass.add(next.key);
        // A newer write to the same thing was queued while this one was out.
        // It has the final say; putting this one back behind it would send the
        // older value last.
        const replaced = rest.some((op) => op.owner === next.owner && op.key === next.key);
        const giveUp = attempts >= MAX_PENDING_ATTEMPTS;
        writePendingOps(giveUp || replaced ? rest : [...rest, { ...next, attempts }]);
        if (giveUp && !replaced) {
          // Shown by OfflineIndicator: the change is on screen but will not
          // survive, and the student should know rather than find out later.
          window.dispatchEvent(new CustomEvent(SYNC_FEEDBACK_EVENT, {
            detail: { message: 'A change made offline could not be saved', tone: 'error' },
          }));
        }
        continue;
      }

      writePendingOps(readPendingOps().filter((op) => !isSameOp(op)));
    }
  } finally {
    flushing = false;
  }

  return remaining();
}
