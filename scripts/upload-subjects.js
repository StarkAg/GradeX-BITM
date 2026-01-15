/**
 * Upload parsed subject list to Supabase `subjects` table.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/upload-subjects.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ACCESS_TOKEN;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ACCESS_TOKEN) are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const subjectsPath = path.join(__dirname, '..', 'public', 'subjects.json');
if (!fs.existsSync(subjectsPath)) {
  console.error(`❌ subjects.json not found at ${subjectsPath}. Run scripts/parse-subjects.js first.`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(subjectsPath, 'utf-8'));
const subjects = raw
  .filter((entry) => entry.code && entry.name)
  .map((entry) => ({
    code: entry.code.toUpperCase().trim(),
    name: entry.name.trim(),
    source: entry.source || null
  }));

if (subjects.length === 0) {
  console.error('❌ No subjects found to upload.');
  process.exit(1);
}

console.log(`📤 Preparing to upload ${subjects.length} subjects to Supabase...`);

const batchSize = 500;

for (let i = 0; i < subjects.length; i += batchSize) {
  const batch = subjects.slice(i, i + batchSize);
  const batchNum = Math.floor(i / batchSize) + 1;
  process.stdout.write(`  → Batch ${batchNum} (${batch.length} records)... `);

  const { error } = await supabase
    .from('subjects')
    .upsert(batch, { onConflict: 'code' });

  if (error) {
    console.error(`\n❌ Failed batch ${batchNum}:`, error.message);
    process.exit(1);
  }

  console.log('done');
}

const { count, error: countError } = await supabase
  .from('subjects')
  .select('*', { count: 'exact', head: true });

if (countError) {
  console.warn('⚠️ Uploaded but count check failed:', countError.message);
} else {
  console.log(`\n✅ Upload complete. Total subjects in Supabase: ${count}`);
}

