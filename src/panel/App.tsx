import { useCallback, useEffect, useRef, useState } from 'react';
import type { CropRect, PendingImagePayload, UiLocale } from '../lib/types';
import { getBrandMarkUrl } from '../lib/brandMarkUrl';
import { getExtensionVersion } from '../lib/extensionVersion';
import {
  blobToDataUrl,
  cropBlobToBlob,
  dataUrlToBlob,
  isImageMime,
} from '../lib/imageSources';
import { classifyOcrOutput, runOcr } from '../lib/ocr';
import {
  MSG_CLEAR_PENDING_IMAGE,
  MSG_GET_PENDING_IMAGE,
} from '../lib/messages';
import { PENDING_IMAGE_KEY, RESULT_TEXT_HEIGHT_KEY, IMAGE_PREVIEW_HEIGHT_KEY } from '../lib/storageKeys';
import {
  loadLocale,
  saveLocale,
  t,
} from './i18n';
import CropCanvas from './CropCanvas';

function send<T>(msg: { type: string }): Promise<T> {
  return chrome.runtime.sendMessage(msg);
}

export default function App() {
  const fileRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLTextAreaElement>(null);
  const previewShellRef = useRef<HTMLDivElement>(null);
  const [locale, setLocale] = useState<UiLocale>('es');
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState<string | null>(null);
  const [sourceKind, setSourceKind] = useState<PendingImagePayload['source'] | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [useCrop, setUseCrop] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'ok' | 'empty' | 'low_quality' | 'error'>('idle');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const applyPendingPayload = useCallback(
    async (payload: PendingImagePayload, clearWhenDone: boolean) => {
      if (payload.loading) {
        setDataUrl(null);
        setSourceKind('web');
        setSourceLabel(payload.sourceLabel ?? null);
        setResult(null);
        setStatus('idle');
        setStatusMsg(t(locale, 'loadingWeb'));
        setCropRect(null);
        setUseCrop(false);
        return;
      }

      if (payload.error) {
        setDataUrl(null);
        setStatus('error');
        setStatusMsg(
          payload.error.toLowerCase().includes('permission')
            ? t(locale, 'webError')
            : payload.error
        );
        if (clearWhenDone) await send({ type: MSG_CLEAR_PENDING_IMAGE });
        return;
      }

      if (!payload.dataUrl) return;

      setDataUrl(payload.dataUrl);
      setSourceKind(payload.source);
      setSourceLabel(payload.sourceLabel ?? null);
      setResult(null);
      setStatus('idle');
      setStatusMsg(null);
      setCropRect(null);
      setUseCrop(false);
      if (clearWhenDone) await send({ type: MSG_CLEAR_PENDING_IMAGE });
    },
    [locale]
  );

  useEffect(() => {
    void (async () => {
      setLocale(await loadLocale());
      const pending = await send<PendingImagePayload | null>({ type: MSG_GET_PENDING_IMAGE });
      if (pending) await applyPendingPayload(pending, !pending.loading);
    })();
  }, [applyPendingPayload]);

  useEffect(() => {
    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName !== 'session' || !changes[PENDING_IMAGE_KEY]) return;
      const next = changes[PENDING_IMAGE_KEY].newValue as PendingImagePayload | undefined;
      if (next) void applyPendingPayload(next, !next.loading);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, [applyPendingPayload]);

  useEffect(() => {
    const el = resultRef.current;
    if (!el || !result) return;

    void chrome.storage.local.get(RESULT_TEXT_HEIGHT_KEY).then((data) => {
      const h = data[RESULT_TEXT_HEIGHT_KEY];
      if (typeof h === 'number' && h >= 112 && h <= 520) {
        el.style.height = `${h}px`;
      }
    });

    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const height = el.offsetHeight;
        if (height >= 112) {
          void chrome.storage.local.set({ [RESULT_TEXT_HEIGHT_KEY]: height });
        }
      }, 250);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [result]);

  useEffect(() => {
    const el = previewShellRef.current;
    if (!el || !dataUrl) return;

    void chrome.storage.local.get(IMAGE_PREVIEW_HEIGHT_KEY).then((data) => {
      const h = data[IMAGE_PREVIEW_HEIGHT_KEY];
      if (typeof h === 'number' && h >= 100 && h <= 480) {
        el.style.height = `${h}px`;
      }
    });

    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        const height = el.offsetHeight;
        if (height >= 100) {
          void chrome.storage.local.set({ [IMAGE_PREVIEW_HEIGHT_KEY]: height });
        }
      }, 250);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (saveTimer) clearTimeout(saveTimer);
    };
  }, [dataUrl]);

  const onLocale = async (l: UiLocale) => {
    setLocale(l);
    await saveLocale(l);
  };

  const handleCropChange = useCallback((rect: CropRect | null) => {
    setCropRect(rect);
    if (rect) setUseCrop(true);
    else setUseCrop(false);
  }, []);

  const ingestBlob = async (blob: Blob, source: PendingImagePayload['source'], label?: string) => {
    if (!isImageMime(blob.type)) {
      setStatus('error');
      setStatusMsg(t(locale, 'loadError'));
      return;
    }
    const url = await blobToDataUrl(blob);
    setDataUrl(url);
    setSourceKind(source);
    setSourceLabel(label ?? null);
    setResult(null);
    setStatus('idle');
    setStatusMsg(null);
    setCropRect(null);
    setUseCrop(false);
  };

  const onFile = (file: File) => {
    void ingestBlob(file, 'file', file.name);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onFile(f);
  };

  const onPaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) void ingestBlob(f, 'clipboard');
        break;
      }
    }
  };

  useEffect(() => {
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const onExtract = async () => {
    if (!dataUrl || busy) return;
    setBusy(true);
    setProgress(0);
    setResult(null);
    setStatus('idle');
    setStatusMsg(null);
    try {
      let blob = await dataUrlToBlob(dataUrl);
      if (useCrop && cropRect) {
        blob = await cropBlobToBlob(blob, cropRect);
      }
      const { text, confidence } = await runOcr(blob, setProgress);
      const kind = classifyOcrOutput(text, confidence);
      if (kind === 'empty') {
        setStatus('empty');
        setStatusMsg(t(locale, 'noText'));
      } else if (kind === 'low_quality') {
        setStatus('low_quality');
        setResult(text);
        setStatusMsg(t(locale, 'lowQuality'));
      } else {
        setStatus('ok');
        setResult(text);
      }
    } catch (err) {
      setStatus('error');
      setStatusMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const onCopy = async () => {
    if (result) await navigator.clipboard.writeText(result);
  };

  const onDownload = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'textfromimage.txt';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const onClear = () => {
    setDataUrl(null);
    setResult(null);
    setStatus('idle');
    setStatusMsg(null);
    setCropRect(null);
    setUseCrop(false);
    setSourceLabel(null);
    setSourceKind(null);
  };

  const sourceText =
    sourceKind === 'web'
      ? t(locale, 'sourceWeb')
      : sourceKind === 'clipboard'
        ? t(locale, 'sourceClipboard')
        : sourceKind === 'file'
          ? t(locale, 'sourceFile')
          : null;

  return (
    <div className="app-shell">
      <div className="app-inner">
        <header className="header">
          <h1>{t(locale, 'title')}</h1>
          <p className="subtitle">{t(locale, 'subtitle')}</p>
          <p className="app-version">v{getExtensionVersion()}</p>
          <p className="header-privacy">
            <a
              className="link"
              href={chrome.runtime.getURL('privacy.html')}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t(locale, 'privacy')}
            </a>
          </p>
        </header>

        <div className="lang-bar">
          <span className="lang-label">{t(locale, 'uiLang')}</span>
          <button type="button" className={locale === 'es' ? 'lang-on' : ''} onClick={() => void onLocale('es')}>
            ES
          </button>
          <button type="button" className={locale === 'en' ? 'lang-on' : ''} onClick={() => void onLocale('en')}>
            EN
          </button>
        </div>

        {!dataUrl ? (
          <div
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
          >
            <p>{t(locale, 'dropHint')}</p>
            <button type="button" className="btn btn--primary" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
              {t(locale, 'chooseFile')}
            </button>
            <p className="hint subtle">{t(locale, 'pasteHint')}</p>
          </div>
        ) : (
          <>
            {sourceText && (
              <p className="hint source-line">
                {sourceText}
                {sourceLabel ? `: ${sourceLabel}` : ''}
              </p>
            )}
            <p className="hint subtle">{t(locale, 'cropHint')}</p>
            <div ref={previewShellRef} className="image-preview-shell">
              <CropCanvas dataUrl={dataUrl} cropRect={cropRect} onCropChange={handleCropChange} />
            </div>
            <p className="hint subtle">{t(locale, 'imagePreviewResizeHint')}</p>
            <div className="actions row">
              <button
                type="button"
                className={`btn${useCrop && cropRect ? ' btn--primary' : ''}`}
                disabled={!cropRect}
                onClick={() => setUseCrop(true)}
              >
                {t(locale, 'cropApply')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setUseCrop(false);
                  setCropRect(null);
                }}
              >
                {t(locale, 'cropReset')}
              </button>
            </div>
            {useCrop && cropRect && <p className="hint subtle crop-on">{t(locale, 'cropActive')}</p>}
            <div className="actions">
              <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void onExtract()}>
                {busy ? t(locale, 'extracting') : t(locale, 'extract')}
              </button>
              <button type="button" className="btn" disabled={busy} onClick={onClear}>
                {t(locale, 'clear')}
              </button>
            </div>
            {busy && (
              <div className="progress">
                <div className="progress-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/bmp"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = '';
          }}
        />

        {statusMsg && (
          <p className={`status status--${status}`}>{statusMsg}</p>
        )}

        {result && status !== 'empty' && (
          <section className="result-block">
            <h2>{t(locale, 'result')}</h2>
            <p className="result-resize-hint">{t(locale, 'resultResizeHint')}</p>
            <textarea
              ref={resultRef}
              className="result-text"
              readOnly
              value={result}
              aria-label={t(locale, 'result')}
            />
            <div className="actions row">
              <button type="button" className="btn" onClick={() => void onCopy()}>
                {t(locale, 'copy')}
              </button>
              <button type="button" className="btn" onClick={onDownload}>
                {t(locale, 'download')}
              </button>
            </div>
          </section>
        )}
      </div>

      <footer className="a4c-brand-footer-strip">
        <div className="a4c-brand-footer a4c-brand-footer--ghost">
          <span className="a4c-brand-footer__accent" aria-hidden="true" />
          <img
            className="a4c-brand-footer__mark"
            src={getBrandMarkUrl()}
            width={22}
            height={22}
            alt=""
          />
          <span className="a4c-brand-footer__copy">
            <span className="a4c-brand-footer__by">{t(locale, 'brandBy')}</span>
            <a
              className="a4c-brand-footer__name"
              href="https://ai4context.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t(locale, 'brandAria')}
            >
              AI4Context
            </a>
            <span className="a4c-brand-footer__separator" aria-hidden="true">
              |
            </span>
            <a
              className="a4c-brand-footer__support"
              href="https://ai4context.com/mission-support"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t(locale, 'brandSupportAria')}
            >
              {t(locale, 'brandSupport')}
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
