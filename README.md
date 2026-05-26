# TextFromImage

Chrome/Edge extension (MV3) to **extract text from images** locally — web `<img>` (context menu), file upload, or paste. Optional crop before OCR (Tesseract.js). By [AI4Context](https://ai4context.com).

## Probar en Chrome (modo desarrollador)

1. Instala dependencias y genera `dist`:
   ```bash
   npm install
   npm run build
   ```
2. Abre `chrome://extensions`.
3. Activa **Modo de desarrollador** (arriba a la derecha).
4. Pulsa **Cargar descomprimida** y selecciona la carpeta **`dist`** de este proyecto  
   (p. ej. `C:\code-TextFromImage\dist`).
5. Fija el icono en la barra si hace falta. Clic en el icono → se abre el panel.
6. Tras cambiar código: `npm run build` y pulsa **Actualizar** en la tarjeta de la extensión.

**Pruebas rápidas:** arrastra una captura con texto, pega con Ctrl+V, o clic derecho en una imagen web → *Extract text from image (TextFromImage)*.

## Development (hot reload)

```bash
npm install
npm run dev
```

Con `npm run dev`, carga la carpeta `dist` que Vite regenera al guardar cambios.

## Build & package

```bash
npm run build
npm run pack
```

Output: `release/TextFromImage-0.1.0-chrome-edge-store.zip`

## Usage

1. Click the toolbar icon → floating panel opens.
2. Drop/paste an image, or right-click an image on a page → **Extract text from image**.
3. Optionally drag to crop, then **Extract text**.
4. Copy or download the result.

## Stack

- Vite 8 + React 19 + TypeScript + [@crxjs/vite-plugin](https://crxjs.dev/vite-plugin)
- [Tesseract.js](https://github.com/naptha/tesseract.js) (local OCR, eng + spa)

## Repo

https://github.com/mapicallo/textFromImage
