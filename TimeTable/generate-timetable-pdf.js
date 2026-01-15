/**
 * API endpoint to generate timetable PDF from JSON
 * POST /api/generate-timetable-pdf
 * Body: { timetable: {...} } - Timetable JSON from Go backend
 * Returns: PDF file as binary stream
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  let tempJsonPath = null;
  let tempPdfPath = null;

  try {
    const { timetable } = req.body;

    if (!timetable) {
      return res.status(400).json({ error: 'Timetable data is required' });
    }

    // Create temporary JSON file
    const timestamp = Date.now();
    tempJsonPath = path.join(PROJECT_ROOT, 'tmp', `timetable_${timestamp}.json`);
    tempPdfPath = path.join(PROJECT_ROOT, 'tmp', `timetable_${timestamp}.pdf`);

    // Ensure tmp directory exists
    const tmpDir = path.join(PROJECT_ROOT, 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    // Write timetable JSON to temp file
    // The script expects { timetable: {...} } format
    const timetableWrapper = { timetable };
    fs.writeFileSync(tempJsonPath, JSON.stringify(timetableWrapper, null, 2));
    console.log('[PDF API] Wrote timetable JSON to:', tempJsonPath);

    // Generate PDF using the script
    const scriptPath = path.join(PROJECT_ROOT, 'scripts', 'generate-timetable-pdf.js');
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script not found: ${scriptPath}`);
    }
    
    try {
      // Use absolute path for node and script
      const nodePath = process.execPath || 'node';
      const command = `${nodePath} "${scriptPath}" "${tempJsonPath}" "${tempPdfPath}"`;
      
      console.log('[PDF API] Executing command:', command);
      console.log('[PDF API] Working directory:', PROJECT_ROOT);
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 30000 // 30 second timeout
      });
      
      if (stderr && !stderr.includes('⚠')) {
        // Only log non-warning stderr
        console.warn('[PDF API] Script stderr:', stderr);
      }
      if (stdout) {
        console.log('[PDF API] Script stdout:', stdout);
      }
    } catch (execError) {
      console.error('[PDF API] PDF generation error:', execError);
      console.error('[PDF API] Error code:', execError.code);
      console.error('[PDF API] Error signal:', execError.signal);
      console.error('[PDF API] Error stdout:', execError.stdout);
      console.error('[PDF API] Error stderr:', execError.stderr);
      
      // Clean up temp files
      if (tempJsonPath && fs.existsSync(tempJsonPath)) {
        try { fs.unlinkSync(tempJsonPath); } catch (e) {}
      }
      if (tempPdfPath && fs.existsSync(tempPdfPath)) {
        try { fs.unlinkSync(tempPdfPath); } catch (e) {}
      }
      
      const errorMessage = execError.stderr || execError.message || 'Unknown error';
      return res.status(500).json({ 
        error: 'Failed to generate PDF',
        details: errorMessage.substring(0, 200) // Limit error message length
      });
    }

    // Check if PDF was generated
    if (!fs.existsSync(tempPdfPath)) {
      console.error('[PDF API] PDF file was not generated at:', tempPdfPath);
      // Clean up temp files
      if (tempJsonPath && fs.existsSync(tempJsonPath)) {
        try { fs.unlinkSync(tempJsonPath); } catch (e) {}
      }
      
      return res.status(500).json({ 
        error: 'PDF file was not generated',
        details: 'The script completed but no PDF file was created. Check server logs for details.'
      });
    }

    // Read PDF file
    const pdfBuffer = fs.readFileSync(tempPdfPath);
    console.log('[PDF API] PDF generated successfully, size:', pdfBuffer.length, 'bytes');

    // Clean up temp files
    if (tempJsonPath && fs.existsSync(tempJsonPath)) {
      try { fs.unlinkSync(tempJsonPath); } catch (e) {}
    }
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      try { fs.unlinkSync(tempPdfPath); } catch (e) {}
    }

    // Send PDF as response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="timetable.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('[PDF API] Error generating timetable PDF:', error);
    console.error('[PDF API] Error stack:', error.stack);
    
    // Clean up temp files on error
    if (tempJsonPath && fs.existsSync(tempJsonPath)) {
      try { fs.unlinkSync(tempJsonPath); } catch (e) {}
    }
    if (tempPdfPath && fs.existsSync(tempPdfPath)) {
      try { fs.unlinkSync(tempPdfPath); } catch (e) {}
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

