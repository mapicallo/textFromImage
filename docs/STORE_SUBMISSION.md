# Publicación en Chrome Web Store y Microsoft Edge

## Generar paquete y gráficos

```bash
npm install
npm run store:all
```

Salida principal:

| Archivo | Uso |
|---------|-----|
| `release/TextFromImage-1.0.0-chrome-edge-store.zip` | **Subir a Chrome y Edge** (mismo ZIP) |
| `release/TextFromImage-1.0.0.zip` | Alias del mismo paquete |
| `release/chrome-web-store-icon-128x128.png` | Icono de la ficha |
| `release/chrome-web-store-tile-small-440x280.png` | Mosaico pequeño |
| `release/chrome-web-store-marquee-1400x560.png` | Mosaico grande |
| `release/chrome-web-store-screenshot-*.png` | Capturas 1280×800 |

> El zip pesa ~35 MB por los modelos OCR offline (eng+spa). Es normal.

Capturas personalizadas: coloca PNG en `pantallazos/` y ejecuta `npm run store:screenshots` (sustituye las generadas).

---

## Chrome Web Store

1. [Consola para desarrolladores](https://chrome.google.com/webstore/devconsole) → **Nuevo elemento**.
2. Sube `release/TextFromImage-1.0.0-chrome-edge-store.zip`.
3. **Nombre público:** `TextFromImage - Extract text from images locally` (coincide con `manifest.json`).
4. **Resumen corto:** pegar `description` del manifest (~132 caracteres).
5. **Descripción larga:** `store-assets/LISTING_EN.txt` (idioma English recomendado).
6. **Categoría:** Productividad o Herramientas.
7. **Privacidad:** https://mapicallo.github.io/textFromImage/privacy.html  
   (activa GitHub Pages en el repo: rama `main`, carpeta raíz — incluye `privacy.html` en la raíz).
8. **Icono 128×128:** `release/chrome-web-store-icon-128x128.png`.
9. **Capturas:** hasta 5 × `release/chrome-web-store-screenshot-*.png`.
10. **Mosaicos:** tile small + marquee desde `release/`.

### Una sola finalidad (ES, ≤1000 caracteres)

> TextFromImage tiene una sola finalidad: extraer texto legible de imágenes en el dispositivo del usuario mediante OCR local. La extensión abre un panel para cargar imágenes (archivo, portapapeles o menú contextual en imágenes web), permite recortar opcionalmente la zona de texto, ejecuta Tesseract en el navegador (inglés y español) y muestra el resultado para copiar o descargar. No envía imágenes ni texto a servidores del desarrollador ni actúa como cliente de OCR en la nube.

### Una sola finalidad (EN)

> TextFromImage has a single purpose: extract readable text from images on the user’s device using local OCR. The extension opens a panel to load images (file, clipboard, or context menu on web images), optionally crop the text area, run Tesseract in the browser (English and Spanish), and show results for copy or download. It does not upload images or text to the developer’s servers and is not a cloud OCR client.

### Código remoto

**No.** Todo el JS/WASM va en el zip. Marca **No** en «¿Utilizas código remoto?».

### Instrucciones de prueba (EN, <500 caracteres)

```text
No extension login. Click the icon → panel opens. Test A: drag a JPG/PNG or paste an image, click Extract text, wait for OCR, Copy result. Test B: on any page with photos, right-click an image → Extract text from image; approve site permission if prompted. Optional: drag on preview to crop before extract.
```

### Permisos

Ver `store-assets/PERMISSIONS_JUSTIFICATION.md`.

---

## Microsoft Edge Add-ons

1. [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview) → **Submit new extension**.
2. Mismo ZIP que Chrome.
3. Reutiliza textos y justificación de permisos (traduce si la ficha lo pide).
4. Notas de certificación: `store-assets/EDGE_CERTIFICATION_NOTES.md`.

---

## Checklist antes de enviar

- [ ] `npm run store:all` sin errores.
- [ ] Abrir el zip: `manifest.json` en la **raíz**.
- [ ] Probar carga descomprimida en `chrome://extensions`.
- [ ] Publicar `privacy.html` en GitHub Pages (`mapicallo.github.io/textFromImage/privacy.html`).
- [ ] Versión coherente en `package.json` y manifest generado.
