/**
 * Vercel Serverless Function: Seating Arrangement API
 * GET /api/seating?ra=<RA>&date=<DATE>
 * 
 * Vercel automatically detects files in /api directory as serverless functions
 */

import { getSeatingInfo, getClassSeatingOverview, getSeatingRangeOverview } from '../lib/api-utils/seating-utils.js';
import { checkBotProtection } from '../lib/api-utils/bot-protection.js';
import { getAdvancedRadarEnabled } from '../lib/api-utils/feature-flags-store.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow GET
  if (req.method !== 'GET') {
    res.status(405).json({
      status: 'error',
      error: 'Method not allowed',
    });
    return;
  }
  
  try {
    // Extract query parameters
    const { ra, date, mode } = req.query;
    const normalizedMode = mode ? mode.toString().toLowerCase() : null;
    const classIdentifier = req.query.room || req.query.class || req.query.classNumber || '';
    const rangeStart = req.query.start || req.query.startRA || req.query.from || '';
    const rangeEnd = req.query.end || req.query.endRA || req.query.to || '';
    const actorIdentifier = normalizedMode === 'class'
      ? classIdentifier
      : normalizedMode === 'range'
        ? `${rangeStart}-${rangeEnd}`
        : ra;
    
    // Bot protection check (with RA for pattern detection)
    const botCheck = checkBotProtection(req, actorIdentifier);
    if (botCheck.blocked) {
      console.warn(`[Bot Protection] Blocked request from IP: ${botCheck.ip}, RA: ${ra}, Reason: ${botCheck.reason}`);
      
      // User-friendly error messages that indicate user behavior issue
      let userMessage = 'You are making requests too quickly. Please slow down and try again in a few minutes.';
      if (botCheck.reason?.includes('sequential')) {
        userMessage = 'Automated scraping detected. Please use the website normally instead of automated tools.';
      } else if (botCheck.reason?.includes('Rate limit')) {
        userMessage = 'Too many requests detected. Please wait a few minutes before trying again.';
      } else if (botCheck.reason?.includes('short time')) {
        userMessage = 'You are clicking too fast. Please wait a moment between searches.';
      }
      
      res.status(429).json({
        status: 'error',
        error: 'Too many requests',
        message: userMessage,
        retryAfter: botCheck.retryAfter || 60,
        userError: true, // Flag to indicate this is a user behavior issue
      });
      return;
    }
    
    const isAdvancedMode = normalizedMode === 'class' || normalizedMode === 'range';
    if (isAdvancedMode) {
      const advancedEnabled = await getAdvancedRadarEnabled();
      if (!advancedEnabled) {
        res.status(503).json({
          status: 'error',
          error: 'Advanced radar is temporarily disabled to conserve bandwidth. Try again later.',
        });
        return;
      }
    }
    
    if (normalizedMode === 'class') {
      const response = await getClassSeatingOverview(date || '', classIdentifier);
      const statusCode = response.status === 'ok' ? 200 : 400;
      res.status(statusCode).json(response);
      return;
    }

    if (normalizedMode === 'range') {
      const response = await getSeatingRangeOverview(date || '', rangeStart, rangeEnd);
      const statusCode = response.status === 'ok' ? 200 : 400;
      res.status(statusCode).json(response);
      return;
    }
    
    // Validate RA for default lookup
    if (!ra || typeof ra !== 'string' || ra.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        error: 'RA number is required',
      });
      return;
    }
    
    // Fetch seating information
    const result = await getSeatingInfo(ra, date || null);
    
    // Return response
    res.status(200).json(result);
  } catch (error) {
    console.error('Seating API Error:', error);
    
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error.message,
      lastUpdated: new Date().toISOString(),
    });
  }
}

