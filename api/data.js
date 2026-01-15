/**
 * API Route: /api/data
 * Combined data endpoint for subjects and student-data
 * Uses action parameter: ?action=subjects or ?action=student-data
 * 
 * GET /api/data?action=subjects&codes=CODE1,CODE2 - Fetch subjects by codes
 * GET /api/data?action=student-data - Fetch student data JSON file
 */

import { supabase, isSupabaseConfigured } from '../lib/api-utils/supabase-client.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const action = req.query.action || 'subjects';

  try {
    // Subjects action
    if (action === 'subjects') {
      if (!isSupabaseConfigured() || !supabase) {
        res.status(500).json({ error: 'Supabase not configured' });
        return;
      }

      const codesParam = req.query.codes;
      if (!codesParam || codesParam.trim().length === 0) {
        res.status(400).json({ error: 'codes query parameter is required' });
        return;
      }

      const codes = codesParam
        .split(',')
        .map((code) => code.trim().toUpperCase())
        .filter((code) => code.length > 0);

      if (codes.length === 0) {
        res.status(400).json({ error: 'No valid subject codes provided' });
        return;
      }

      const { data, error } = await supabase
        .from('subjects')
        .select('code, name')
        .in('code', codes);

      if (error) {
        console.error('[Data API] subjects fetch error:', error.message);
        res.status(500).json({ error: 'Failed to fetch subjects' });
        return;
      }

      res.status(200).json({
        subjects: data || []
      });
      return;
    }

    // Student data action
    if (action === 'student-data') {
      res.setHeader('Content-Type', 'application/json');
      
      // Try multiple possible paths for Vercel
      const possiblePaths = [
        path.join(__dirname, 'data', 'seat-data.json'),
        path.join(__dirname, '..', 'public', 'seat-data.json'),
        path.join(process.cwd(), 'api', 'data', 'seat-data.json'),
        path.join(process.cwd(), 'data', 'seat-data.json'),
        path.join(process.cwd(), 'public', 'seat-data.json'),
        '/var/task/api/data/seat-data.json',
        '/var/task/data/seat-data.json',
        '/var/task/public/seat-data.json',
      ];
      
      let fileContent = null;
      let filePath = null;
      
      for (const tryPath of possiblePaths) {
        try {
          if (fs.existsSync(tryPath)) {
            fileContent = fs.readFileSync(tryPath, 'utf-8');
            filePath = tryPath;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!fileContent) {
        res.status(404).json({
          status: 'error',
          error: 'Student data file not found',
        });
        return;
      }
      
      // Parse to validate JSON
      const data = JSON.parse(fileContent);
      
      // Return the JSON data
      res.status(200).json(data);
      return;
    }

    // Invalid action
    res.status(400).json({ 
      error: `Invalid action: ${action}. Use ?action=subjects or ?action=student-data.` 
    });

  } catch (err) {
    console.error('[Data API] Error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
}

