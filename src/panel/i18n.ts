import type { OcrLang, UiLocale } from '../lib/types';
import { OCR_LANG_KEY, UI_LOCALE_KEY } from '../lib/storageKeys';

const strings = {
  es: {
    title: 'TextFromImage',
    subtitle: 'Extrae texto de imágenes en tu dispositivo',
    dropHint: 'Arrastra una imagen aquí o elige un archivo',
    chooseFile: 'Elegir archivo',
    pasteHint: 'También puedes pegar una imagen (Ctrl+V)',
    cropHint: 'Arrastra sobre la imagen para recortar (opcional)',
    cropApply: 'Usar recorte',
    cropReset: 'Imagen completa',
    extract: 'Extraer texto',
    extracting: 'Extrayendo…',
    copy: 'Copiar',
    download: 'Descargar .txt',
    clear: 'Limpiar',
    result: 'Texto detectado',
    resultResizeHint: 'Arrastra la esquina inferior para cambiar el tamaño.',
    noText: 'No se detectó texto legible en esta imagen.',
    lowQuality: 'El texto es difícil de leer. Prueba un recorte más cerrado o una imagen más nítida.',
    loadError: 'No se pudo cargar la imagen.',
    loadingWeb: 'Cargando imagen de la web…',
    webError: 'No se pudo acceder a la imagen del sitio. Descárgala y súbela aquí.',
    ocrLang: 'OCR',
    langEn: 'English',
    langEs: 'Español',
    uiLang: 'UI',
    sourceWeb: 'Desde la web',
    sourceFile: 'Archivo local',
    sourceClipboard: 'Portapapeles',
    privacy: 'Política de privacidad',
    by: 'by AI4Context',
  },
  en: {
    title: 'TextFromImage',
    subtitle: 'Extract text from images on your device',
    dropHint: 'Drop an image here or choose a file',
    chooseFile: 'Choose file',
    pasteHint: 'You can also paste an image (Ctrl+V)',
    cropHint: 'Drag on the image to crop (optional)',
    cropApply: 'Use crop',
    cropReset: 'Full image',
    extract: 'Extract text',
    extracting: 'Extracting…',
    copy: 'Copy',
    download: 'Download .txt',
    clear: 'Clear',
    result: 'Detected text',
    resultResizeHint: 'Drag the bottom corner to resize.',
    noText: 'No readable text was found in this image.',
    lowQuality: 'Text is hard to read. Try a tighter crop or a sharper image.',
    loadError: 'Could not load the image.',
    loadingWeb: 'Loading image from the web…',
    webError: 'Could not access the image from this site. Download it and upload here.',
    ocrLang: 'OCR',
    langEn: 'English',
    langEs: 'Spanish',
    uiLang: 'UI',
    sourceWeb: 'From web',
    sourceFile: 'Local file',
    sourceClipboard: 'Clipboard',
    privacy: 'Privacy policy',
    by: 'by AI4Context',
  },
} as const;

export type StringKey = keyof (typeof strings)['en'];

export function t(locale: UiLocale, key: StringKey): string {
  return strings[locale][key];
}

export async function loadLocale(): Promise<UiLocale> {
  const data = await chrome.storage.local.get(UI_LOCALE_KEY);
  const v = data[UI_LOCALE_KEY];
  return v === 'en' ? 'en' : 'es';
}

export async function saveLocale(locale: UiLocale): Promise<void> {
  await chrome.storage.local.set({ [UI_LOCALE_KEY]: locale });
}

export async function loadOcrLang(): Promise<OcrLang> {
  const data = await chrome.storage.local.get(OCR_LANG_KEY);
  return data[OCR_LANG_KEY] === 'spa' ? 'spa' : 'eng';
}

export async function saveOcrLang(lang: OcrLang): Promise<void> {
  await chrome.storage.local.set({ [OCR_LANG_KEY]: lang });
}
