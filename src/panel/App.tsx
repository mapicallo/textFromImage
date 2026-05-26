import { useCallback, useEffect, useRef, useState } from 'react';
import type { CropRect, OcrLang, PendingImagePayload, UiLocale } from '../lib/types';
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
import {
  loadLocale,
  loadOcrLang,
  saveLocale,
  saveOcrLang,
  t,
} from './i18n';
import CropCanvas from './CropCanvas';

function send<T>(msg: { type: string }): Promise<T> {
  return chrome.runtime.sendMessage(msg);
}

export default function App() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [locale, setLocale] = useState<UiLocale>('es');
  const [ocrLang, setOcrLang] = useState<OcrLang>('eng');
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

  const loadImagePayload = useCallback(async (payload: PendingImagePayload) => {
    if (payload.error) {
      setDataUrl(null);
      setStatus('error');
      setStatusMsg(payload.error.includes('permission') ? t(locale, 'webError') : payload.error);
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
  }, [locale]);

  useEffect(() => {
    void (async () => {
      setLocale(await loadLocale());
      setOcrLang(await loadOcrLang());
      const pending = await send<PendingImagePayload | null>({ type: MSG_GET_PENDING_IMAGE });
      if (pending) {
        await loadImagePayload(pending);
        await send({ type: MSG_CLEAR_PENDING_IMAGE });
      }
    })();
  }, [loadImagePayload]);

  const onLocale = async (l: UiLocale) => {
    setLocale(l);
    await saveLocale(l);
  };

  const onOcrLang = async (l: OcrLang) => {
    setOcrLang(l);
    await saveOcrLang(l);
  };

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
      const { text, confidence } = await runOcr(blob, ocrLang, setProgress);
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
        </header>

        <div className="lang-bar">
          <span className="lang-label">{t(locale, 'uiLang')}</span>
          <button type="button" className={locale === 'es' ? 'lang-on' : ''} onClick={() => void onLocale('es')}>
            ES
          </button>
          <button type="button" className={locale === 'en' ? 'lang-on' : ''} onClick={() => void onLocale('en')}>
            EN
          </button>
          <span className="lang-label ocr-label">{t(locale, 'ocrLang')}</span>
          <button type="button" className={ocrLang === 'eng' ? 'lang-on' : ''} onClick={() => void onOcrLang('eng')}>
            EN
          </button>
          <button type="button" className={ocrLang === 'spa' ? 'lang-on' : ''} onClick={() => void onOcrLang('spa')}>
            ES
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
            <CropCanvas dataUrl={dataUrl} onCropChange={setCropRect} />
            <div className="actions row">
              <button
                type="button"
                className="btn"
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
            {useCrop && cropRect && <p className="hint subtle crop-on">✓ crop</p>}
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
            <textarea className="result-text" readOnly value={result} rows={8} />
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

      <footer className="footer">
        <img src={getBrandMarkUrl()} alt="" className="footer-mark" width={22} height={22} />
        <span>
          {t(locale, 'by')}{' '}
          <a href="https://ai4context.com" target="_blank" rel="noopener noreferrer">
            AI4Context
          </a>
          ·{' '}
          <a href={chrome.runtime.getURL('privacy.html')} target="_blank" rel="noopener noreferrer">
            {t(locale, 'privacy')}
          </a>
        </span>
      </footer>
    </div>
  );
}
