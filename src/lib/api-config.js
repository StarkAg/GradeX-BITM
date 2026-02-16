/**
 * API Configuration
 *
 * Centralized configuration for backend API endpoints.
 * Self-managed site: no external SRM/VPS backends.
 */

// Base URL for API (same origin on Vercel)
export const GO_BACKEND_URL = import.meta.env.VITE_GO_BACKEND_URL || '';

export const getApiUrl = (endpoint) => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  if (!GO_BACKEND_URL) {
    return `/${cleanEndpoint}`;
  }
  return `${GO_BACKEND_URL}/${cleanEndpoint}`;
};

// Reserved for future use (self-managed: no SRM endpoints)
export const API_ENDPOINTS = {};
