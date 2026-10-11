---
description: Release GradeX BITM - bump version, deploy to main, then set the Convex force-update gate
---

Ship a GradeX BITM release. Target version: **$ARGUMENTS** (if empty, bump the minor
version of the current `package.json` version and state what you picked).

Run these in order. **The ordering is the whole point of this command** - see the
warning at the bottom before deviating.

## 1. Bump, test and build

- `git fetch origin -q && git log --oneline HEAD..origin/main`
  must be **empty**. A release is never cut from a checkout that is behind main.
- Set `version` in `package.json` to the target version.
- `npm test` must pass.
- `npx vite build --mode production` and confirm it succeeds.
- Confirm `dist/version.json` reports the new `appVersion`.

## 2. Commit, deploy Convex, push to main

- `git add -A` and commit. Write a real commit message: what changed and *why*,
  not a version number alone.
- `git push origin HEAD:main` (a clean fast-forward; if it is not, stop and
  report - do not force anything).
- `npm run deploy:convex`. Never a bare `npx convex deploy`, and never
  `vercel --prod`: a Convex deploy replaces the whole function set with what is
  on disk, so deploying from a stale or uncommitted tree deletes functions in
  production. The script refuses unless `convex/` is committed and the checkout
  is exactly origin/main. Vercel deploys itself from the push.

The new Convex functions go live a few seconds before the new site does. That
order is deliberate: the backend must keep accepting the old site's calls, and
the new site may call functions the old backend does not have.

## 3. Wait for production to actually serve it

Poll until it flips (Vercel deploys from `main`, and takes ~30-60s):

```
curl -s "https://gradex-bitm.vercel.app/version.json?cb=$(date +%s)"
```

Do not continue until `appVersion` equals the target version. If it never
flips, stop and report - a stuck deploy is a real failure, not something to
work around.

## 4. Only now, set the Convex force-update gate

`setForceUpdateVersion` is an internal mutation: no client can call it, the CLI
can. It keeps `appSettings` at exactly one row.

```
npx convex run appSettings:setForceUpdateVersion '{"version":"<TARGET>"}' --prod
```

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

To disable a forced update, run the same command with `"version":""`.
