export type InstallGuide =
  'ios' | 'firefox-android' | 'firefox-windows' | 'safari-mac';

export const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches === true ||
  window.matchMedia?.('(display-mode: fullscreen)').matches === true ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const getInstallGuide = (): InstallGuide | null => {
  const ua = navigator.userAgent;
  if (isIos()) return 'ios';
  if (ua.includes('Firefox/')) {
    if (ua.includes('Android')) return 'firefox-android';
    const version = Number(/Firefox\/(\d+)/.exec(ua)?.[1]);
    if (ua.includes('Windows') && version >= 143) return 'firefox-windows';
    return null;
  }
  if (
    ua.includes('Macintosh') &&
    /Version\/(1[7-9]|[2-9]\d).*Safari\//.test(ua)
  ) {
    return 'safari-mac';
  }
  return null;
};
