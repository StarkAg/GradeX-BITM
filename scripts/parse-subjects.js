/**
 * Parse subject curriculum PDFs to extract subject codes and titles.
 * Usage: node scripts/parse-subjects.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBJECT_PDFS = [
  path.join(__dirname, '..', 'public', 'Subjects', 'academic-curricula-2021.pdf'),
  path.join(__dirname, '..', 'public', 'Subjects', 'btech-cse-cc-2021r.pdf'),
  path.join(__dirname, '..', 'public', 'Subjects', 'CSE-CS-2021.pdf')
].filter((filePath) => fs.existsSync(filePath));

const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'subjects.json');

const CODE_REGEX = /^\d{2}[A-Z]{2,4}[A-Z0-9]{0,3}\d{3}[A-Z]$/;
const STOP_WORDS = new Set([
  'COURSE', 'CODE', 'TITLE', 'HOURS', 'WEEK', 'TOTAL', 'CREDITS',
  'PROGRAM', 'CLR', 'CLR-1', 'CLR-2', 'CLR-3', 'PO', 'PSO', 'LTP', 'L-T-P-C',
  'SYLLABUS', 'UNIT', 'OUTCOMES', 'KCAT', 'PRACTICAL', 'THEORY', 'SESSION', 'SEMESTER'
]);

function normalizeToken(token) {
  if (!token) return '';
  return token.replace(/\s+/g, ' ').trim();
}

function cleanChunk(token) {
  return token ? token.replace(/[^A-Za-z0-9]/g, '') : '';
}

function tryBuildCode(tokens, start, maxSpan = 4) {
  let candidate = '';
  let consumed = 0;

  for (let i = start; i < Math.min(tokens.length, start + maxSpan); i++) {
    const chunk = cleanChunk(tokens[i]);
    if (!chunk) {
      consumed++;
      continue;
    }

    candidate += chunk;
    consumed++;

    if (CODE_REGEX.test(candidate)) {
      return { code: candidate.toUpperCase(), span: consumed };
    }

    if (candidate.length > 12) {
      break;
    }
  }

  return null;
}

function looksLikeUpcomingCode(tokens, start) {
  const result = tryBuildCode(tokens, start, 4);
  return !!result;
}

function extractSubjectsFromTokens(tokens, source) {
  const results = [];

  for (let i = 0; i < tokens.length; i++) {
    const match = tryBuildCode(tokens, i);
    if (!match) continue;

    const code = match.code;
    i += match.span - 1;

    const titleTokens = [];
    let j = i + 1;

    while (j < tokens.length) {
      const raw = normalizeToken(tokens[j]);
      if (!raw) {
        j++;
        continue;
      }

      const upper = raw.toUpperCase();
      if (/^[0-9]+$/.test(raw)) break;
      if (/^[LTPCltcp]$/.test(raw)) break;
      if (STOP_WORDS.has(upper)) break;
      if (looksLikeUpcomingCode(tokens, j)) break;

      titleTokens.push(raw);
      j++;

      if (titleTokens.length >= 12) break;
    }

    const title = titleTokens.join(' ').replace(/\s+/g, ' ').trim();
    if (!title) continue;

    const upcoming = tokens.slice(j, j + 4).some((token) => /^[0-9]+$/.test(token));
    if (!upcoming) {
      continue;
    }

    results.push({
      code,
      name: title,
      source
    });

    i = j - 1;
  }

  return results;
}

async function parsePdf(filePath) {
  console.log(`\n📄 Parsing ${path.basename(filePath)}`);
  const buffer = fs.readFileSync(filePath);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

  const subjects = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const tokens = textContent.items
      .map((item) => normalizeToken(item.str))
      .filter(Boolean);

    const pageSubjects = extractSubjectsFromTokens(tokens, path.basename(filePath));
    if (pageSubjects.length) {
      console.log(`  • Page ${pageNum}: ${pageSubjects.length} subjects`);
      subjects.push(...pageSubjects);
    }
  }

  return subjects;
}

async function main() {
  if (SUBJECT_PDFS.length === 0) {
    console.error('❌ No PDF files found in public/Subjects');
    process.exit(1);
  }

  const subjectMap = new Map();

  for (const pdfPath of SUBJECT_PDFS) {
    try {
      const entries = await parsePdf(pdfPath);
      entries.forEach((entry) => {
        if (!subjectMap.has(entry.code)) {
          subjectMap.set(entry.code, entry);
        }
      });
    } catch (error) {
      console.error(`❌ Failed to parse ${pdfPath}:`, error.message);
    }
  }

  const subjects = Array.from(subjectMap.values()).sort((a, b) => a.code.localeCompare(b.code));
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(subjects, null, 2));

  console.log(`\n✅ Extracted ${subjects.length} unique subjects`);
  console.log(`📦 Saved to ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  if (subjects.length) {
    console.log('🔎 Sample:');
    subjects.slice(0, 5).forEach((subj) => {
      console.log(`  - ${subj.code}: ${subj.name}`);
    });
  }
}

main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

