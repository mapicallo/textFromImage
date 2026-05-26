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

/** Cached panel window id — `windows.create` must run synchronously during a user gesture. */
let panelWindowId: number | undefined;

function panelUrl(): string {
  return chrome.runtime.getURL(PANEL_PATH);
}

async function findPanelTab(): Promise<chrome.tabs.Tab | undefined> {
  const url = panelUrl();
  const tabs = await chrome.tabs.query({});
  return tabs.find((t) => t.url === url);
}

function rememberPanelWindow(winId: number): void {
  panelWindowId = winId;
  void chrome.storage.session.set({ [PANEL_WINDOW_ID_KEY]: winId });
}

function createPanelWindow(url: string): void {
  chrome.windows.create(
    {
      url,
      type: 'popup',
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      focused: true,
    },
    (win) => {
      if (chrome.runtime.lastError) {
        console.error('[TextFromImage] open panel:', chrome.runtime.lastError.message);
        return;
      }
      if (win?.id != null) rememberPanelWindow(win.id);
    }
  );
}

/** Open/focus panel while the user-gesture token is still valid (context menu, action). */
function openPanelDuringUserGesture(): void {
  const url = panelUrl();
  let createdWinId: number | undefined;

  if (panelWindowId != null) {
    chrome.windows.update(panelWindowId, { focused: true }, () => {
      if (chrome.runtime.lastError) {
        panelWindowId = undefined;
        createPanelWindow(url);
      }
    });
    void reconcilePanelWindow(undefined);
    return;
  }

  chrome.windows.create(
    {
      url,
      type: 'popup',
      width: PANEL_WIDTH,
      height: PANEL_HEIGHT,
      focused: true,
    },
    (win) => {
      if (chrome.runtime.lastError) {
        console.error('[TextFromImage] open panel:', chrome.runtime.lastError.message);
        return;
      }
      if (win?.id != null) {
        createdWinId = win.id;
        rememberPanelWindow(win.id);
      }
      void reconcilePanelWindow(createdWinId);
    }
  );
}

async function reconcilePanelWindow(createdWinId: number | undefined): Promise<void> {
  const existing = await findPanelTab();
  if (existing?.windowId == null || existing.id == null) return;

  panelWindowId = existing.windowId;
  await chrome.storage.session.set({ [PANEL_WINDOW_ID_KEY]: existing.windowId });
  await chrome.windows.update(existing.windowId, { focused: true });
  await chrome.tabs.update(existing.id, { active: true });

  if (createdWinId != null && createdWinId !== existing.windowId) {
    try {
      await chrome.windows.remove(createdWinId);
    } catch {
      /* duplicate popup already closed */
    }
  }
}

export async function openOrFocusPanel(): Promise<void> {
  openPanelDuringUserGesture();
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  const b64 = btoa(binary);
  return `data:${blob.type || 'image/png'};base64,${b64}`;
}

function originPatternForImageUrl(srcUrl: string): string | null {
  try {
    const u = new URL(srcUrl);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return `${u.origin}/*`;
  } catch {
    return null;
  }
}

async function fetchImageAsPending(srcUrl: string, pageUrl: string): Promise<PendingImagePayload> {
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

function loadingPayload(pageUrl: string): PendingImagePayload {
  return {
    dataUrl: '',
    mime: '',
    source: 'web',
    sourceLabel: pageUrl,
    loading: true,
  };
}

async function setPending(payload: PendingImagePayload): Promise<void> {
  await chrome.storage.session.set({ [PENDING_IMAGE_KEY]: payload });
}

function queueWebImageFromContextMenu(srcUrl: string, pageUrl: string): void {
  openPanelDuringUserGesture();
  void setPending(loadingPayload(pageUrl));

  const originPattern = originPatternForImageUrl(srcUrl);

  const runFetch = (): void => {
    void (async () => {
      try {
        await setPending(await fetchImageAsPending(srcUrl, pageUrl));
      } catch (err) {
        console.error('[TextFromImage] fetch image:', err);
        await setPending({
          dataUrl: '',
          mime: '',
          source: 'web',
          sourceLabel: pageUrl,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
  };

  if (!originPattern) {
    runFetch();
    return;
  }

  // Must invoke request synchronously in the context-menu handler (before any await).
  chrome.permissions.request({ origins: [originPattern] }, (granted) => {
    if (chrome.runtime.lastError) {
      console.error('[TextFromImage] permission:', chrome.runtime.lastError.message);
      void setPending({
        dataUrl: '',
        mime: '',
        source: 'web',
        sourceLabel: pageUrl,
        error: 'Host permission denied',
      });
      return;
    }
    if (!granted) {
      void setPending({
        dataUrl: '',
        mime: '',
        source: 'web',
        sourceLabel: pageUrl,
        error: 'Host permission denied',
      });
      return;
    }
    runFetch();
  });
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: MENU_ID,
      title: 'Extract text from image (TextFromImage)',
      contexts: ['image'],
    });
  });
  void chrome.storage.session.get(PANEL_WINDOW_ID_KEY).then((stored) => {
    const id = stored[PANEL_WINDOW_ID_KEY];
    if (typeof id === 'number') panelWindowId = id;
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.srcUrl) return;
  queueWebImageFromContextMenu(info.srcUrl, tab?.url ?? info.srcUrl);
});

chrome.runtime.onMessage.addListener((message: TfiMessage, _sender, sendResponse) => {
  void (async () => {
    switch (message.type) {
      case MSG_OPEN_PANEL:
        openPanelDuringUserGesture();
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
  if (panelWindowId === windowId) panelWindowId = undefined;
  void (async () => {
    const stored = await chrome.storage.session.get(PANEL_WINDOW_ID_KEY);
    if (stored[PANEL_WINDOW_ID_KEY] === windowId) {
      await chrome.storage.session.remove(PANEL_WINDOW_ID_KEY);
    }
  })();
});
