/**
 * Download seating HTML for given date range & sessions across all campuses.
 * Run with: node scripts/download-seats.js
 */

import fs from 'fs/promises';

const CAMPUSES = [
  { id: 'main', url: 'https://examcell.srmist.edu.in/main/seating/bench/fetch_data.php' },
  { id: 'tp', url: 'https://examcell.srmist.edu.in/tp/seating/bench/fetch_data.php' },
  { id: 'tp2', url: 'https://examcell.srmist.edu.in/tp2/seating/bench/fetch_data.php' },
  { id: 'bio', url: 'https://examcell.srmist.edu.in/bio/seating/bench/fetch_data.php' },
  { id: 'ub', url: 'https://examcell.srmist.edu.in/ub/seating/bench/fetch_data.php' },
];

const START_DATE = '27/11/2025';
const END_DATE = '01/12/2025';
const SESSIONS = ['FN', 'AN'];
const RAW_DIR = 'downloads/raw';

function parseDate(str) {
  const [day, month, year] = str.split('/').map(Number);
  return { day, month, year };
}

function toDateObj({ day, month, year }) {
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

function getDateRange(start, end) {
  const results = [];
  const startObj = toDateObj(parseDate(start));
  const endObj = toDateObj(parseDate(end));
  for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
    results.push(formatDate(d));
  }
  return results;
}

async function download(campus, date, session) {
  const body = new URLSearchParams({ dated: date, session });
  const response = await fetch(campus.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Fetch failed ${campus.id} ${date} ${session}: ${response.status}`);
  }

  const text = await response.text();
  const safeDate = date.replaceAll('/', '-');
  const filename = `${RAW_DIR}/${campus.id}_${safeDate}_${session}.html`;
  await fs.mkdir(RAW_DIR, { recursive: true });
  await fs.writeFile(filename, text, 'utf8');
  console.log('✓ Saved', filename);
}

async function main() {
  const dates = getDateRange(START_DATE, END_DATE);
  for (const date of dates) {
    for (const session of SESSIONS) {
      for (const campus of CAMPUSES) {
        try {
          await download(campus, date, session);
          await new Promise((resolve) => setTimeout(resolve, 600));
        } catch (err) {
          console.error('✗ Error', campus.id, date, session, err.message);
        }
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

