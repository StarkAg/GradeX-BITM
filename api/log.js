/**
 * Unified Logging API endpoint
 * Handles multiple logging operations via query parameter routing
 * 
 * POST /api/log?type=enquiry - Log seat search enquiry
 * POST /api/log?type=social-click - Log social media click
 * POST /api/log?type=feedback - Log user feedback
 */

import { supabase, isSupabaseConfigured, supabaseAdmin } from '../lib/api-utils/supabase-client.js';
import { checkBotProtection } from '../lib/api-utils/bot-protection.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({
      status: 'error',
      error: 'Method not allowed',
    });
    return;
  }
  
  const logType = req.query.type || req.body?.type;
  
  // Route to appropriate handler
  if (logType === 'enquiry') {
    return handleEnquiryLog(req, res);
  } else if (logType === 'social-click') {
    return handleSocialClickLog(req, res);
  } else if (logType === 'feedback') {
    return handleFeedbackLog(req, res);
  } else {
    res.status(400).json({
      status: 'error',
      error: 'Invalid log type. Use ?type=enquiry, ?type=social-click, or ?type=feedback',
    });
  }
}

/**
 * Handle enquiry logging
 */
async function handleEnquiryLog(req, res) {
  try {
    if (!isSupabaseConfigured() || !supabase) {
      console.error('[log] Supabase not configured');
      res.status(500).json({
        status: 'error',
        error: 'Supabase not configured',
      });
      return;
    }
    
    // Extract data from request body
    const {
      register_number,
      search_date,
      results_found = false,
      result_count = 0,
      campuses = [],
      use_live_api = true,
      error_message = null,
      student_name = null,
      rooms = [],
      venues = [],
      floors = [],
      performance_time = null,
    } = req.body;
    
    // Bot protection check (with RA for pattern detection)
    const botCheck = checkBotProtection(req, register_number);
    if (botCheck.blocked) {
      console.warn(`[Bot Protection] Blocked log-enquiry from IP: ${botCheck.ip}, RA: ${register_number}, Reason: ${botCheck.reason}`);
      
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
    
    console.log('[log] Received enquiry:', {
      register_number,
      search_date,
      results_found,
      result_count,
      campuses,
      use_live_api,
      student_name,
      rooms,
      venues,
      floors,
      performance_time,
    });
    
    // Validate required fields
    if (!register_number || typeof register_number !== 'string' || register_number.trim().length === 0) {
      res.status(400).json({
        status: 'error',
        error: 'register_number is required',
      });
      return;
    }
    
    // Get IP address and user agent (optional)
    const ip_address = req.headers['x-forwarded-for'] 
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.headers['x-real-ip'] 
      ? req.headers['x-real-ip']
      : null;
    
    const user_agent = req.headers['user-agent'] || null;
    
    // Get current UTC time - PostgreSQL TIMESTAMPTZ stores in UTC internally
    const now = new Date();
    const searchedAtUTC = now.toISOString();
    
    // Use admin client if available (bypasses RLS), otherwise use regular client
    const clientToUse = supabaseAdmin || supabase;
    
    if (!clientToUse) {
      res.status(500).json({
        status: 'error',
        error: 'Supabase client not available',
      });
      return;
    }
    
    // Insert into enquiries table
    const { data, error } = await clientToUse
      .from('enquiries')
      .insert({
        register_number: register_number.trim().toUpperCase(),
        search_date: search_date || null,
        searched_at: searchedAtUTC,
        results_found: results_found === true,
        result_count: result_count || 0,
        campuses: Array.isArray(campuses) ? campuses : [],
        use_live_api: use_live_api === true,
        error_message: error_message || null,
        student_name: student_name || null,
        rooms: Array.isArray(rooms) ? rooms : (rooms ? [rooms] : []),
        venues: Array.isArray(venues) ? venues : (venues ? [venues] : []),
        floors: Array.isArray(floors) ? floors : (floors ? [floors] : []),
        performance_time: performance_time !== null && performance_time !== undefined ? parseInt(performance_time, 10) : null,
        ip_address: ip_address || null,
        user_agent: user_agent || null,
        created_at: searchedAtUTC,
      })
      .select()
      .single();
    
    if (error) {
      console.error('[log] Supabase insert error:', error);
      console.error('[log] Error details:', JSON.stringify(error, null, 2));
      res.status(500).json({
        status: 'error',
        error: 'Failed to log enquiry',
        message: error.message,
        details: error,
      });
      return;
    }
    
    console.log('[log] ✅ Successfully logged enquiry:', data.id);
    
    // Return success
    res.status(200).json({
      status: 'success',
      id: data.id,
      message: 'Enquiry logged successfully',
    });
  } catch (error) {
    console.error('Error in log enquiry:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * Handle social click logging
 */
async function handleSocialClickLog(req, res) {
  try {
    const { platform } = req.body;
    
    // Validate platform
    if (!platform || !['linkedin', 'github'].includes(platform.toLowerCase())) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid platform. Must be "linkedin" or "github"',
      });
    }
    
    // Get IP address and user agent (optional)
    const ip_address = req.headers['x-forwarded-for'] 
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.headers['x-real-ip'] 
      ? req.headers['x-real-ip']
      : null;
    
    const user_agent = req.headers['user-agent'] || null;
    const referrer = req.headers['referer'] || req.headers['referrer'] || null;
    
    // Use admin client if available (bypasses RLS), otherwise use regular client
    const clientToUse = supabaseAdmin || supabase;
    
    if (!clientToUse) {
      return res.status(500).json({
        status: 'error',
        error: 'Supabase client not available',
      });
    }
    
    // Insert click record
    const { data, error } = await clientToUse
      .from('social_clicks')
      .insert({
        platform: platform.toLowerCase(),
        ip_address,
        user_agent,
        referrer,
      })
      .select()
      .single();
    
    if (error) {
      console.error('[log] Supabase insert error:', error);
      return res.status(500).json({
        status: 'error',
        error: error.message || 'Failed to log click',
      });
    }
    
    console.log(`[log] ✅ Successfully logged ${platform} click`);
    
    return res.status(200).json({
      status: 'success',
      id: data.id,
      message: 'Click logged successfully',
    });
  } catch (error) {
    console.error('[log] Error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Handle feedback logging
 */
async function handleFeedbackLog(req, res) {
  try {
    const { feedback, registerNumber } = req.body;

    console.log('[log] Feedback submission received:', {
      feedbackLength: feedback?.length,
      hasRegisterNumber: !!registerNumber,
    });

    // Validate feedback
    if (!feedback || typeof feedback !== 'string' || feedback.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        error: 'Feedback is required',
      });
    }

    if (feedback.length > 200) {
      return res.status(400).json({
        status: 'error',
        error: 'Feedback must be 200 characters or less',
      });
    }

    // Use admin client if available, otherwise fall back to regular client
    const clientToUse = supabaseAdmin || supabase;
    
    if (!clientToUse) {
      console.error('[log] Supabase client not configured');
      return res.status(500).json({
        status: 'error',
        error: 'Database not configured',
      });
    }

    // Prepare insert data - register_number is optional
    const insertData = {
      feedback: feedback.trim(),
      created_at: new Date().toISOString(),
    };

    // Only include register_number if it's provided and not empty
    if (registerNumber && typeof registerNumber === 'string' && registerNumber.trim().length > 0) {
      insertData.register_number = registerNumber.trim().toUpperCase();
    }

    console.log('[log] Inserting feedback:', { ...insertData, feedback: insertData.feedback.substring(0, 50) + '...' });
    console.log('[log] Using client:', supabaseAdmin ? 'admin' : 'regular');

    const { data, error } = await clientToUse
      .from('feedback')
      .insert([insertData])
      .select();

    if (error) {
      console.error('[log] Supabase error:', error);
      console.error('[log] Error details:', JSON.stringify(error, null, 2));
      return res.status(500).json({
        status: 'error',
        error: 'Failed to save feedback',
        details: error.message,
      });
    }

    console.log('[log] ✅ Successfully saved feedback:', data?.[0]?.id);

    return res.status(200).json({
      status: 'success',
      data,
    });
  } catch (error) {
    console.error('[log] Error:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error.message,
    });
  }
}

