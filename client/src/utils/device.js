export function getDisplayContext() {
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  if (isStandalone) return "installed";

  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return isMobile ? "mobile-browser" : "desktop-browser";
}

export function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}
