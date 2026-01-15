/**
 * API Route: /api/vps-proxy
 * Combined VPS proxy endpoint for login and timetable
 * Uses action parameter: ?action=login or ?action=timetable
 * 
 * POST /api/vps-proxy?action=login - Proxies login to VPS
 * POST /api/vps-proxy?action=timetable - Proxies timetable to VPS
 */

// VPS Service Configuration
const VPS_URL = process.env.VPS_LOGIN_URL || 'http://65.20.84.46:5000';
const VPS_API_KEY = process.env.VPS_API_KEY || '32631058927400e8e13cd7a7c35cf3381ffc2af66b926a3d79c2b28403769f73';

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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const action = req.query.action || 'login';

  try {
    // Login action
    if (action === 'login') {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
      }

      if (!email.includes('@srmist.edu.in')) {
        return res.status(400).json({
          success: false,
          error: 'Email must be a valid SRM email (@srmist.edu.in)'
        });
      }

      console.log(`[VPS Proxy] Forwarding login request to VPS (${VPS_URL}/login) for ${email.substring(0, 3)}***...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      
      let vpsResponse;
      try {
        vpsResponse = await fetch(`${VPS_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': VPS_API_KEY,
          },
          body: JSON.stringify({
            email,
            password,
            apiKey: VPS_API_KEY,
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error(`[VPS Proxy] Failed to connect to VPS:`, fetchError.message);
        if (fetchError.name === 'AbortError') {
          return res.status(504).json({
            success: false,
            error: 'VPS login timed out after 90 seconds.',
          });
        }
        return res.status(503).json({
          success: false,
          error: `Cannot connect to VPS service: ${fetchError.message || 'Connection error'}`,
        });
      }

      const data = await vpsResponse.json().catch(err => {
        console.error(`[VPS Proxy] Failed to parse VPS response:`, err);
        return { success: false, error: 'Invalid response from VPS service' };
      });

      if (!vpsResponse.ok || !data.success) {
        const errorMsg = data.error || `HTTP ${vpsResponse.status}: VPS login failed`;
        console.error(`[VPS Proxy] VPS returned error: ${errorMsg}`);
        return res.status(vpsResponse.ok ? 500 : vpsResponse.status).json({
          success: false,
          error: errorMsg,
        });
      }

      console.log(`[VPS Proxy] ✓ VPS login successful for ${email.substring(0, 3)}***, cookies: ${data.cookies?.length || 0}`);

      return res.status(200).json({
        success: true,
        cookies: data.cookies || [],
        duration: data.duration || 0,
      });
    }

    // Timetable action
    if (action === 'timetable') {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      if (!email.includes('@srmist.edu.in')) {
        return res.status(400).json({
          success: false,
          error: 'Email must be a valid SRM email (@srmist.edu.in)'
        });
      }

      console.log(`[VPS Proxy] Forwarding timetable request to VPS (${VPS_URL}/timetable) for ${email.substring(0, 3)}***...`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      
      let vpsResponse;
      try {
        vpsResponse = await fetch(`${VPS_URL}/timetable`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': VPS_API_KEY,
          },
          body: JSON.stringify({
            email,
          }),
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error(`[VPS Proxy] Failed to connect to VPS:`, fetchError.message);
        if (fetchError.name === 'AbortError') {
          return res.status(504).json({
            success: false,
            error: 'VPS timetable request timed out after 90 seconds',
          });
        }
        return res.status(503).json({
          success: false,
          error: `Cannot connect to VPS service: ${fetchError.message || 'Connection error'}`,
        });
      }

      let data;
      try {
        data = await vpsResponse.json();
      } catch (parseError) {
        const responseText = await vpsResponse.text().catch(() => 'Unable to read response');
        console.error(`[VPS Proxy] Failed to parse VPS response:`, parseError);
        return res.status(500).json({
          success: false,
          error: `Invalid response from VPS service: ${parseError.message || 'Parse error'}`,
        });
      }

      if (!vpsResponse.ok || !data.success) {
        const errorMsg = data.error || `HTTP ${vpsResponse.status}: VPS timetable request failed`;
        console.error(`[VPS Proxy] VPS returned error: ${errorMsg}`);
        return res.status(vpsResponse.ok ? 500 : vpsResponse.status).json({
          success: false,
          error: errorMsg,
        });
      }

      console.log(`[VPS Proxy] ✓ VPS timetable request successful for ${email.substring(0, 3)}***`);

      return res.status(200).json({
        success: true,
        data: data.data || null,
      });
    }

    // Invalid action
    return res.status(400).json({
      success: false,
      error: `Invalid action: ${action}. Use ?action=login or ?action=timetable.`,
    });

  } catch (error) {
    console.error('[VPS Proxy] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect to VPS service',
    });
  }
}

