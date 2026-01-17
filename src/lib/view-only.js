// Utility for checking if user is in view-only mode (from admin auto-login)
export function isViewOnlyMode() {
  return localStorage.getItem('gradex_view_only_mode') === 'true';
}

export function clearViewOnlyMode() {
  localStorage.removeItem('gradex_view_only_mode');
}
