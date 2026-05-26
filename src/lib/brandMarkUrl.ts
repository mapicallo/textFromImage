export function getBrandMarkUrl(): string {
  if (typeof chrome !== 'undefined' && typeof chrome.runtime?.getURL === 'function') {
    return chrome.runtime.getURL('brand/mark-ai4context.png');
  }
  return '/brand/mark-ai4context.png';
}
