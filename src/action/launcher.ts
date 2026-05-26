import { MSG_OPEN_PANEL } from '../lib/messages';

chrome.runtime.sendMessage({ type: MSG_OPEN_PANEL }, () => {
  if (chrome.runtime.lastError) {
    void chrome.windows.create({
      url: chrome.runtime.getURL('src/panel/index.html'),
      type: 'popup',
      width: 480,
      height: 720,
      focused: true,
    });
  }
  window.close();
});
