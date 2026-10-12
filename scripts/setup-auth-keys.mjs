#!/usr/bin/env node
// One-time setup of the sign-in keys on a Convex deployment (convex/auth.ts).
//
//   node scripts/setup-auth-keys.mjs           the dev deployment
//   node scripts/setup-auth-keys.mjs --prod    production
//
// Sets JWT_PRIVATE_KEY and JWKS (the key pair sign-in tokens are signed and
// checked with) and SITE_URL. The keys are generated here and go straight to
// Convex; they are never written to disk or printed.
//
// Refuses if the deployment already has a key: replacing it makes every token
// already issued invalid, which signs out every student on every device.

import { spawnSync } from 'node:child_process';
import { exportJWK, exportPKCS8, generateKeyPair } from 'jose';

const prod = process.argv.includes('--prod');
const target = prod ? ['--prod'] : [];
const siteUrl = prod ? 'https://bitm.gradex.bond' : 'http://localhost:3000';

const convex = (...args) => spawnSync('npx', ['convex', ...args], { encoding: 'utf8' });

const existing = convex('env', 'get', ...target, 'JWT_PRIVATE_KEY');
if (existing.status === 0 && existing.stdout.trim()) {
  console.error(`${prod ? 'Production' : 'The dev deployment'} already has sign-in keys. Not replacing them.`);
  process.exit(1);
}

const keys = await generateKeyPair('RS256', { extractable: true });
const privateKey = (await exportPKCS8(keys.privateKey)).trimEnd().replace(/\n/g, ' ');
const jwks = JSON.stringify({ keys: [{ use: 'sig', ...(await exportJWK(keys.publicKey)) }] });

for (const [name, value] of [['JWT_PRIVATE_KEY', privateKey], ['JWKS', jwks], ['SITE_URL', siteUrl]]) {
  // The target flag goes before `--`: everything after it is taken as the value.
  const result = convex('env', 'set', ...target, name, '--', value);
  if (result.status !== 0) {
    console.error(`Could not set ${name}:\n${result.stderr}`);
    process.exit(1);
  }
  console.log(`Set ${name}`);
}
