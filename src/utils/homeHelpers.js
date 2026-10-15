// Preview switches for the More sheet in Navigation.jsx, as in GradeX.
// Add ?previewMoreMenu=1 on localhost to open it on load, and
// ?tuneMoreMenuSprings=1 (implies the preview) to show the spring sliders.
export const shouldPreviewMoreMenu = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  return new URLSearchParams(window.location.search).get('previewMoreMenu') === '1';
};
export const shouldTuneMoreMenuSprings = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') return false;
  return new URLSearchParams(window.location.search).get('tuneMoreMenuSprings') === '1';
};
