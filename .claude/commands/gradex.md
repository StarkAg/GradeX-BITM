---
description: Release GradeX BITM - bump version, deploy to main, then set the Convex force-update gate
---

Ship a GradeX BITM release. Target version: **$ARGUMENTS** (if empty, bump the minor
version of the current `package.json` version and state what you picked).

Run these in order. **The ordering is the whole point of this command** - see the
warning at the bottom before deviating.

## 1. Bump and build

- Set `version` in `package.json` to the target version.
- `npx vite build --mode production` and confirm it succeeds.
- Confirm `dist/version.json` reports the new `appVersion`.

## 2. Push to main

- `git add -A` and commit. Write a real commit message: what changed and *why*,
  not a version number alone.
- Confirm the push is a clean fast-forward first:
  `git fetch origin -q && git log --oneline HEAD..origin/main` must be **empty**.
  If it is not, stop and report - do not force anything.
- `git push origin HEAD:main`

## 3. Wait for production to actually serve it

Poll until it flips (Vercel deploys from `main`, and takes ~30-60s):

```
curl -s "https://gradex-bitm.vercel.app/version.json?cb=$(date +%s)"
```

Do not continue until `appVersion` equals the target version. If it never
flips, stop and report - a stuck deploy is a real failure, not something to
work around.

## 4. Only now, set the Convex force-update gate

`setForceUpdateVersion` requires an authenticated identity, so the Convex CLI
**cannot** call it (`requireIdentity` rejects it). Write the row directly instead.

`appSettings` should hold exactly one row, so use `--replace`, never `--append` -
`getForceUpdateVersion` uses `.first()`, and a duplicate row makes which value
wins nondeterministic.

```
echo '{"key":"force_update_version","value":"<TARGET>","createdAt":<ORIGINAL>,"updatedAt":<NOW>}' > gate.jsonl
npx convex import --prod --table appSettings --replace -y gate.jsonl
```

Preserve the existing `createdAt`; only `updatedAt` changes.

## 5. Verify

- `npx convex run appSettings:getForceUpdateVersion --prod` returns the target version.
- `appSettings` still has exactly **one** row.
- Production `/version.json` reports the target version.
- If the release changed icons or other static assets, curl them on production
  and confirm 200.

---

## Why the order matters

Never set the gate before production is confirmed serving the new build.

The gate makes every client on an older version wipe its caches, unregister its
service worker, and hard-refresh. If production is still serving the old bundle
when that fires, users take a destructive refresh, land on the *same* old build,
and get recorded in `gradex_force_update_attempt` as having already tried
`old->new`. The loop guard in `App.jsx` then refuses to retry - so they stay
stuck on the old version even after the real deploy lands, until some later
release changes the attempt key.

Also note the gate is one-shot per user, not a permanent floor: once a client
reaches the target it records `gradex_last_force_update` and stops checking.
Leave the row at the current version; bump it on the next release.

To disable a forced update, set `value` to an empty string or delete the row.
