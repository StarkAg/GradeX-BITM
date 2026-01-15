/**
 * Parse downloaded campus HTML into structured JSON using existing parser.
 * Run with: node scripts/parse-seats.js
 */

import fs from 'fs/promises';
import path from 'path';
import { extractSeatingRows } from '../lib/api-utils/seating-utils.js';

const RAW_DIR = path.resolve('downloads/raw');
const JSON_DIR = path.resolve('downloads/json');
const OUTPUT_FILE = path.resolve('downloads/seats-27Nov-01Dec.json');

function sessionLabel(tag) {
  if (tag?.toUpperCase() === 'FN') return 'Forenoon';
  if (tag?.toUpperCase() === 'AN') return 'Afternoon';
  return tag;
}

async function main() {
  const files = await fs.readdir(RAW_DIR);
  const rows = [];
  await fs.mkdir(JSON_DIR, { recursive: true });

  for (const file of files) {
    if (!file.endsWith('.html')) continue;
    const [campus, datePart, sessionTag] = file.replace('.html', '').split('_');
    const html = await fs.readFile(path.join(RAW_DIR, file), 'utf8');
    const parsedRows = extractSeatingRows(html) || [];
    const date = datePart.replaceAll('-', '/');
    const session = sessionLabel(sessionTag);

    const normalizedRows = parsedRows.map((row) => ({
      register_number: row.ra,
      campus,
      date,
      session,
      hall: row.hall,
      bench: row.bench,
      department: row.department,
      subject_code: row.subjectCode,
      floor: row.floor ?? null,
    }));

    normalizedRows.forEach((row) => rows.push(row));

    const perFileJson = path.join(JSON_DIR, file.replace('.html', '.json'));
    await fs.writeFile(perFileJson, JSON.stringify(normalizedRows, null, 2));

    console.log('Parsed', file, '-', normalizedRows.length, 'rows');
  }

  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(rows, null, 2));
  console.log(`Saved ${rows.length} entries to ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

