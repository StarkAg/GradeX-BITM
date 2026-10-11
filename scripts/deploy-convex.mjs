#!/usr/bin/env node
// Deploys the Convex functions to production - but only from a tree that is
// exactly what is on origin/main.
//
// A Convex deploy replaces the whole function set with what is on disk. In
// August 2026 a deploy from a checkout three commits behind main removed
// `appSettings` from production and, with a `vercel --prod` from the same
// stale tree, put the site back two versions. This refuses to repeat that.
//
//   npm run deploy:convex            deploy
//   npm run deploy:convex -- --dry   run the checks only

import { execFileSync, spawnSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const dryRun = process.argv.includes('--dry');
const problems = [];

try {
  git('fetch', 'origin', '--quiet');
} catch {
  problems.push('Could not reach origin to compare with main (git fetch failed).');
}

if (!problems.length) {
  const behind = Number(git('rev-list', '--count', 'HEAD..origin/main'));
  if (behind > 0) {
    problems.push(`This checkout is ${behind} commit(s) behind origin/main. Pull first.`);
  }

  const ahead = Number(git('rev-list', '--count', 'origin/main..HEAD'));
  if (ahead > 0) {
    problems.push(`${ahead} local commit(s) are not on origin/main. Push first.`);
  }
}

// Untracked files count too: Convex deploys whatever sits in convex/.
const dirty = git('status', '--porcelain', '--', 'convex');
if (dirty) {
  problems.push(`convex/ has changes that are not committed:\n${dirty}`);
}

if (problems.length) {
  console.error('Not deploying Convex:\n');
  problems.forEach((problem) => console.error(`- ${problem}\n`));
  process.exit(1);
}

console.log(`Convex tree matches origin/main at ${git('rev-parse', '--short', 'HEAD')}.`);
if (dryRun) process.exit(0);

const extraArgs = process.argv.slice(2).filter((arg) => arg !== '--dry');
const result = spawnSync('npx', ['convex', 'deploy', ...extraArgs], { stdio: 'inherit' });
process.exit(result.status ?? 1);
