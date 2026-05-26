import type { PendingImagePayload } from '../lib/types';
import {
  MSG_CLEAR_PENDING_IMAGE,
  MSG_GET_PENDING_IMAGE,
  MSG_OPEN_PANEL,
  type TfiMessage,
} from '../lib/messages';
import { PANEL_WINDOW_ID_KEY, PENDING_IMAGE_KEY } from '../lib/storageKeys';

const PANEL_PATH = 'src/panel/index.html';
const PANEL_WIDTH = 480;
const PANEL_HEIGHT = 720;
const MENU_ID = 'tfi-extract-image';

function panelUrl(): string {
  return chrome.runtime.getURL(PANEL_PATH);
}

async function findPanelTab(): Promise<chrome.tabs.Tab | undefined> {
  const url = panelUrl();
  const tabs = await chrome.tabs.query({});
  return tabs.find((t) => t.url === url);
}

export async function openOrFocusPanel(): Promise<void> {
  const url = panelUrl();

  const existing = await findPanelTab();
  if (existing?.windowId != null && existing.id != null) {
    await chrome.windows.update(existing.windowId, { focused: true });
    await chrome.tabs.update(existing.id, { active: true });
    await chrome.storage.session.set({ [PANEL_WINDOW_ID_KEY]: existing.windowId });
    return;
  }

  const stored = await chrome.storage.session.get(PANEL_WINDOW_ID_KEY);
  const staleWinId = stored[PANEL_WINDOW_ID_KEY] as number | undefined;
  if (typeof staleWinId === 'number') {
    try {
      await chrome.windows.get(staleWinId);
      await chrome.windows.update(staleWinId, { focused: true });
      return;
    } catch {
      await chrome.storage.session.remove(PANEL_WINDOW_ID_KEY);
    }
  }

  const win = await chrome.windows.create({
    url,
    type: 'popup',
    width: PANEL_WIDTH,
    height: PANEL_HEIGHT,
    focused: true,
  });
  if (win?.id != null) {
    await chrome.storage.session.set({ [PANEL_WINDOW_ID_KEY]: win.id });
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 = btoa(binary);
  return `data:${blob.type || 'image/png'};base64,${b64}`;
}

async function fetchImageAsPending(srcUrl: string, pageUrl: string): Promise<PendingImagePayload> {
  let originPattern: string | null = null;
  try {
    const u = new URL(srcUrl);
    originPattern = `${u.origin}/*`;
  } catch {
    throw new Error('Invalid image URL');
  }

  const granted = await chrome.permissions.contains({ origins: [originPattern] });
  if (!granted) {
    const ok = await chrome.permissions.request({ origins: [originPattern] });
    if (!ok) throw new Error('Host permission denied');
  }

  const res = await fetch(srcUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Not an image');

  return {
    dataUrl: await blobToDataUrl(blob),
    mime: blob.type,
    source: 'web',
    sourceLabel: pageUrl || srcUrl,
  };
}

async function queueWebImage(srcUrl: string, pageUrl: string): Promise<void> {
  const pending = await fetchImageAsPending(srcUrl, pageUrl);
  await chrome.storage.session.set({ [PENDING_IMAGE_KEY]: pending });
  await openOrFocusPanel();
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Extract text from image (TextFromImage)',
      contexts: ['image'],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.srcUrl) return;
  void (async () => {
    try {
      await queueWebImage(info.srcUrl!, tab?.url ?? info.srcUrl!);
    } catch (err) {
      console.error('[TextFromImage] context menu:', err);
      await chrome.storage.session.set({
        [PENDING_IMAGE_KEY]: {
          dataUrl: '',
          mime: '',
          source: 'web',
          error: err instanceof Error ? err.message : String(err),
        } satisfies PendingImagePayload,
      });
      await openOrFocusPanel();
    }
  })();
});

chrome.runtime.onMessage.addListener((message: TfiMessage, _sender, sendResponse) => {
  void (async () => {
    switch (message.type) {
      case MSG_OPEN_PANEL:
        await openOrFocusPanel();
        sendResponse({ ok: true });
        break;
      case MSG_GET_PENDING_IMAGE: {
        const data = await chrome.storage.session.get(PENDING_IMAGE_KEY);
        sendResponse(data[PENDING_IMAGE_KEY] ?? null);
        break;
      }
      case MSG_CLEAR_PENDING_IMAGE:
        await chrome.storage.session.remove(PENDING_IMAGE_KEY);
        sendResponse({ ok: true });
        break;
      default:
        sendResponse(null);
    }
  })();
  return true;
});

chrome.windows.onRemoved.addListener((windowId) => {
  void (async () => {
    const stored = await chrome.storage.session.get(PANEL_WINDOW_ID_KEY);
    if (stored[PANEL_WINDOW_ID_KEY] === windowId) {
      await chrome.storage.session.remove(PANEL_WINDOW_ID_KEY);
    }
  })();
});
