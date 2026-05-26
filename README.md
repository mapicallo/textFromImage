# TextFromImage

Chrome/Edge extension (MV3) to **extract text from images locally** — web `<img>` (context menu), file upload, or paste. Optional crop before OCR (Tesseract.js, English + Spanish). By [AI4Context](https://ai4context.com).

## Probar en Chrome (modo desarrollador)

```bash
npm install
npm run build
```

1. `chrome://extensions` → Modo de desarrollador → **Cargar descomprimida** → carpeta `dist/`.
2. Clic en el icono → panel flotante. Clic derecho en imagen web → *Extract text from image*.

## Publicar en Chrome / Edge

```bash
npm run store:all
```

Paquete: `release/TextFromImage-1.0.0-chrome-edge-store.zip`  
Guía completa: [docs/STORE_SUBMISSION.md](docs/STORE_SUBMISSION.md)

## Stack

- Vite 8 + React 19 + TypeScript + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- [Tesseract.js](https://github.com/naptha/tesseract.js) (offline OCR, eng + spa)

## Repo

https://github.com/mapicallo/textFromImage
