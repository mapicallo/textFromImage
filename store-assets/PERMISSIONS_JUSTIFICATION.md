# Justificación de permisos — TextFromImage 1.0.0

## storage

**EN:** Stores UI language, optional panel layout heights (image preview and result text area), and temporary session data when an image is queued from the context menu (`chrome.storage.local` / `chrome.storage.session`). Keeps the background service worker and panel in sync. No data is sent to developer servers.

**ES:** Guarda idioma de interfaz, alturas opcionales del panel y datos temporales al encolar una imagen desde el menú contextual. Coordina service worker y panel. No se envían datos a servidores del desarrollador.

---

## contextMenus

**EN:** Adds “Extract text from image (TextFromImage)” when the user right-clicks an `<img>` on a page. Only runs when the user chooses that menu item.

**ES:** Añade “Extract text from image (TextFromImage)” al clic derecho en imágenes. Solo actúa cuando el usuario elige esa opción.

---

## windows

**EN:** Creates and focuses the floating OCR panel window when the user clicks the extension icon or completes a context-menu action. Required because `windows.create` must run during a user gesture.

**ES:** Crea y enfoca la ventana flotante del panel al pulsar el icono o usar el menú contextual en una imagen.

---

## optional_host_permissions (`<all_urls>`)

**EN:** Used only when the user invokes the context menu on a web image. The extension requests permission for that page’s origin (e.g. `https://example.com/*`) to fetch the image bytes for local OCR. It is not granted automatically for all sites; the user must approve per origin. No broad monitoring of browsing.

**ES:** Solo cuando el usuario usa el menú contextual en una imagen web. Se pide permiso para el origen concreto (p. ej. `https://ejemplo.com/*`) para descargar la imagen y hacer OCR local. No vigila la navegación general.

---

## web_accessible_resources (tesseract/*)

**EN:** Bundled Tesseract.js worker, WASM core, and English/Spanish traineddata files are exposed to extension pages only so OCR runs offline inside the panel. Not loaded from remote CDNs at runtime.

**ES:** Worker, WASM y datos de idioma empaquetados, accesibles solo a páginas de la extensión para OCR offline. No se cargan desde CDN en tiempo de ejecución.

---

## content_security_policy (`wasm-unsafe-eval`)

**EN:** Required for Tesseract.js WebAssembly OCR in the extension panel. All scripts are packaged in the `.zip`; no remote code execution.

**ES:** Necesario para el WASM de Tesseract.js en el panel. Scripts empaquetados en el zip; sin código remoto.
