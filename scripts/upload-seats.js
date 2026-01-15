/**
 * Upload parsed seats JSON into Supabase.
 * Requires SUPABASE_URL + SUPABASE_SERVICE_KEY env vars.
 * Run with: node scripts/upload-seats.js
 */

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const COMBINED_FILE = 'downloads/seats-27Nov-01Dec.json';
const JSON_DIR = path.resolve('downloads/json');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_KEY before running.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function uploadBatch(payload) {
  const chunkSize = 500;

  for (let i = 0; i < payload.length; i += chunkSize) {
    const slice = payload.slice(i, i + chunkSize).map((row) => ({
      register_number: row.register_number,
      search_date: row.date,
      session: row.session,
      campus: row.campus,
      hall: row.hall,
      bench: row.bench,
      department: row.department,
      subject_code: row.subject_code,
      results_found: true,
      result_count: 1,
    }));

    const { error } = await supabase
      .from('seats')
      .upsert(slice, { onConflict: 'register_number,search_date,session,campus' });

    if (error) {
      console.error('Upload failed at batch', i, error);
      process.exit(1);
    }

    console.log(`Uploaded ${i + slice.length}/${payload.length}`);
  }
}

async function main() {
  try {
    await fs.access(JSON_DIR);
    const files = (await fs.readdir(JSON_DIR)).filter((f) => f.endsWith('.json'));
    if (files.length === 0) throw new Error('No JSON files found in downloads/json');

    for (const file of files) {
      const data = JSON.parse(await fs.readFile(path.join(JSON_DIR, file), 'utf8'));
      console.log(`Uploading ${file} (${data.length} rows)`);
      await uploadBatch(data);
    }
  } catch (err) {
    console.warn('Falling back to combined JSON file:', err.message);
    const fallback = JSON.parse(await fs.readFile(COMBINED_FILE, 'utf8'));
    await uploadBatch(fallback);
  }

  console.log('Done uploading seats.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

