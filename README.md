# GradeX BITM

Self-managed attendance and timetable tracker for BIT Mesra, Lalpur Campus
(BBA III A). Students enter their own subjects and mark their own attendance;
nothing is fetched from a college portal.

Live: https://gradex-bitm.vercel.app (canonical: https://bitm.gradex.bond)

## What it does

- **Home** - today's classes, one tap to mark each hour present or absent.
- **Schedule** - the week's timetable (grid or one day at a time), exportable as an image.
- **Attendance** - per-subject percentage against the 75% rule, with how many
  classes can still be missed or must be attended. Totals can be entered
  directly for classes held before a student started marking day by day.
- **Calendar** - mark any past day hour by hour; mark holidays.
- **Subjects** - add, edit and remove subjects and their timetable slots.
- Installable PWA. Works offline: the last synced data is shown, and anything
  marked offline is queued on the device and sent when the connection returns.

## Stack

| Part | What |
| --- | --- |
| Frontend | React 18 + Vite, `vite-plugin-pwa` (Workbox) |
| Sign-in | Clerk |
| Backend | Convex (`convex/`) |
| Hosting | Vercel, deployed from pushes to `main` |

## Layout

```
convex/                 schema and server functions
  academics.ts          subjects, timetable, attendance, holidays
  users.ts              profile sync, account deletion
  appSettings.ts        force-update version gate
  defaults.ts           the default BBA III A subjects and timetable
src/
  App.jsx               shell, routing, force-update, connectivity
  components/           one file per screen
  lib/academic-data.js  hooks every screen reads and writes through
  lib/pending-writes.js offline write queue and the offline copy
  lib/attendance-codes.js  per-hour attendance keys (shared by Home and Calendar)
  lib/subjects.js       client copy of convex/defaults.ts - keep the two in sync
tests/                  vitest: Convex logic, attendance keys, offline queue
android/                Capacitor Android shell around the live site
capacitor-shell/        the one page the shell shows if it has never been online
```

## Running it

```bash
npm install
npm run dev:all    # Convex dev + Vite on http://localhost:3000
npm test
npm run build
```

`.env.local` needs `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_CONVEX_URL` and
`CONVEX_DEPLOYMENT`. The Convex deployment needs `CLERK_JWT_ISSUER_DOMAIN`
(or `CLERK_FRONTEND_API_URL`) and, for the admin overview, `ADMIN_EMAILS`
and/or `ADMIN_CLERK_USER_IDS` (comma-separated).

## Releasing

Follow `.claude/commands/gradex.md`. In short: bump the version, `npm test`,
build, commit, push to `main` (Vercel deploys), then `npm run deploy:convex`.

- Never run a bare `npx convex deploy` or `vercel --prod`. Both publish
  whatever is on disk; a stale checkout once put production back two versions
  and deleted Convex functions. `npm run deploy:convex` refuses unless
  `convex/` is committed and the checkout equals `origin/main`.
- Never put anything private in `public/`. Vite copies that whole folder into
  every build, ignored files included.

## Android app

The Android app is a thin Capacitor shell (as in GradeX): it opens the live
site, `https://bitm.gradex.bond`, in a full-screen WebView. Releasing the
website updates the app; the APK only needs rebuilding when the icon, name or
Capacitor itself changes.

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@17
npm run app:android        # android/app/build/outputs/apk/release/app-release.apk
npm run app:android:usb    # same, then installs on a phone connected by USB
```

Signing uses `android/keystore.properties` and the keystore it points to
(`.local/gradex-bitm-release.jks`). Neither is in git. Keep both: Android only
installs an update over the old app if it is signed with the same key. Bump
`versionCode` and `versionName` in `android/app/build.gradle` for each new APK.

## How attendance is stored

Each class hour is one row in `attendanceDaily`, keyed by date and a per-hour
code: `PD`, `PD-2` for a second hour the same day, `CA-LAB`, `CA-LAB-2` for lab
hours. `attendanceTotals` holds one running total per subject. A calendar mark
moves that total by one; it is never recounted from the daily rows, because it
also carries totals the student typed in on the Attendance page.
