import type { UiLocale } from '../lib/types';
import { UI_LOCALE_KEY } from '../lib/storageKeys';

const strings = {
  es: {
    title: 'TextFromImage',
    subtitle: 'Extrae texto de imágenes en tu dispositivo (español e inglés)',
    dropHint: 'Arrastra una imagen aquí o elige un archivo',
    chooseFile: 'Elegir archivo',
    pasteHint: 'También puedes pegar una imagen (Ctrl+V)',
    cropHint: 'Arrastra sobre la imagen para marcar el área a leer (el recorte se aplica al soltar).',
    imagePreviewResizeHint: 'Arrastra la esquina inferior del marco para cambiar la altura de la vista previa.',
    cropApply: 'Confirmar recorte',
    cropReset: 'Imagen completa',
    cropActive: '✓ Recorte activo — Extraer texto usará solo esa zona',
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
    langEn: 'English',
    langEs: 'Español',
    uiLang: 'UI',
    sourceWeb: 'Desde la web',
    sourceFile: 'Archivo local',
    sourceClipboard: 'Portapapeles',
    privacy: 'Política de privacidad',
    brandBy: 'por',
    brandSupport: 'Apoyar',
    brandSupportAria: 'Apoyar AI4Context',
    brandAria: 'AI4Context — abrir sitio web',
  },
  en: {
    title: 'TextFromImage',
    subtitle: 'Extract text from images on your device (Spanish and English)',
    dropHint: 'Drop an image here or choose a file',
    chooseFile: 'Choose file',
    pasteHint: 'You can also paste an image (Ctrl+V)',
    cropHint: 'Drag on the image to mark the text area (crop applies when you release).',
    imagePreviewResizeHint: 'Drag the bottom corner of the frame to resize the image preview height.',
    cropApply: 'Confirm crop',
    cropReset: 'Full image',
    cropActive: '✓ Crop active — Extract text will use that area only',
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
    langEn: 'English',
    langEs: 'Spanish',
    uiLang: 'UI',
    sourceWeb: 'From web',
    sourceFile: 'Local file',
    sourceClipboard: 'Clipboard',
    privacy: 'Privacy policy',
    brandBy: 'by',
    brandSupport: 'Support',
    brandSupportAria: 'Support AI4Context',
    brandAria: 'AI4Context — open website',
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
