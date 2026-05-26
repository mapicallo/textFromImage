# Edge Add-ons — certification notes (TextFromImage 1.0.0)

**Package:** `release/TextFromImage-1.0.0-chrome-edge-store.zip`  
**Privacy policy:** https://mapicallo.github.io/textFromImage/privacy.html (also bundled as `privacy.html`)

## TEST ACCESS

No extension-specific credentials. Any local image file or any public web page with `<img>` elements is sufficient.

## HOW TO TEST

1. Load the unpacked extension from `dist/` or install the submitted `.zip` in developer mode.
2. Click the toolbar icon → floating panel opens (~480×720).
3. **Local file:** drag `loremIpsum.jpg` or any PNG/JPEG onto the drop zone, or use Choose file / Ctrl+V paste.
4. **Web image:** open a page with photos, right-click an image → **Extract text from image (TextFromImage)**. Approve host permission if Edge prompts for that origin.
5. Optionally drag on the preview to crop, then click **Extract text**. Wait for OCR (first run may take ~10–30 s while models load).
6. Use **Copy** or **Download .txt**; **Clear** resets the panel.

## SCOPE

- OCR runs locally (Tesseract.js, eng+spa bundled). No developer backend.
- Optional host permission is requested only per origin when using the context menu on a web image.
- Package size ~35 MB due to offline language models (expected).

## REMOTE CODE

**No.** All JavaScript and WASM are included in the package. Choose “No remote code” in store forms.

## DEPENDENCIES

None beyond a modern Chromium-based browser with extension support.
