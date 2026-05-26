import { defineManifest } from '@crxjs/vite-plugin';

const VERSION = '0.1.0';

export default defineManifest({
  manifest_version: 3,
  name: `TextFromImage ${VERSION}`,
  description:
    'Extract readable text from images on web pages or local files. Optional crop, local OCR, copy or download. By AI4Context.',
  version: VERSION,
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  action: {
    default_title: `TextFromImage ${VERSION}`,
    default_popup: 'src/action/index.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  permissions: ['storage', 'contextMenus', 'windows'],
  optional_host_permissions: ['<all_urls>'],
  web_accessible_resources: [
    {
      resources: ['tesseract/*', 'tesseract/lang/*'],
      matches: ['<all_urls>'],
    },
  ],
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
});
