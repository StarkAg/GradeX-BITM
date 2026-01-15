/**
 * Remove raw download files that do not contain any seat rows.
 * Run: node scripts/clean-raw-downloads.js
 */

import fs from 'fs/promises';
import path from 'path';
import { extractSeatingRows } from '../lib/api-utils/seating-utils.js';

const RAW_DIR = path.resolve('downloads/raw');

async function hasSeats(filePath) {
  const html = await fs.readFile(filePath, 'utf8');
  const rows = extractSeatingRows(html) || [];
  return rows.length > 0;
}

async function main() {
  const files = await fs.readdir(RAW_DIR);
  const removed = [];

  for (const file of files) {
    if (!file.endsWith('.html')) continue;
    const fullPath = path.join(RAW_DIR, file);
    try {
      const ok = await hasSeats(fullPath);
      if (!ok) {
        await fs.unlink(fullPath);
        removed.push(file);
        console.log('🗑 Removed empty file', file);
      } else {
        console.log('✅ Keeping', file);
      }
    } catch (err) {
      console.error('⚠️ Error processing', file, err.message);
    }
  }

  if (removed.length === 0) {
    console.log('No empty files found.');
  } else {
    console.log('Removed', removed.length, 'files with no seats.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

