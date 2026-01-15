/**
 * API Configuration
 * 
 * Centralized configuration for backend API endpoints
 */

// Detect if we're running on VPS or local
const isVPS = typeof window !== 'undefined' && 
  (window.location.hostname === '65.20.84.46' || 
   window.location.hostname.includes('65.20.84.46') ||
   (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')));

// Go backend API base URL
// For VPS: use relative URL (Nginx proxies /api/srm/ to Go backend on port 8080)
// For local dev: use localhost:8080
export const GO_BACKEND_URL = import.meta.env.VITE_GO_BACKEND_URL || 
  (isVPS ? '' : 'http://localhost:8080'); // Empty string = relative URL (same origin)

// Helper function to build API URLs
export const getApiUrl = (endpoint) => {
  // Remove leading slash if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If GO_BACKEND_URL is empty (VPS with Nginx proxy), use relative URL
  if (!GO_BACKEND_URL) {
    return `/${cleanEndpoint}`;
  }
  
  return `${GO_BACKEND_URL}/${cleanEndpoint}`;
};

// Specific API endpoints
export const API_ENDPOINTS = {
  login: () => getApiUrl('api/srm/login'),
  data: (userId) => getApiUrl(`api/srm/data?userId=${encodeURIComponent(userId)}`),
  calendar: (userId) => getApiUrl(`api/srm/calendar?userId=${encodeURIComponent(userId)}`),
  timetable: (userId) => getApiUrl(`api/srm/timetable?userId=${encodeURIComponent(userId)}`),
  logout: (userId) => getApiUrl(`api/srm/logout?userId=${encodeURIComponent(userId)}`),
};

