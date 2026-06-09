// Injected into the renderer main world on did-finish-load.
//
// Ketcher dispatches 'copyOrCutComplete' on window after every successful
// clipboard write. We listen for it, generate a high-resolution PNG of the
// current structure, and hand it to the main process via IPC. The main process
// reads the mol text that Ketcher already wrote (text/plain) then re-writes the
// clipboard with both image/png and text/plain so non-chemistry apps can paste
// the image while text-based tools still get the structure data.
//
// Strategy: ask Ketcher for SVG (vector), render it onto an offscreen canvas at
// 1600px on the longest side, then export as PNG. This sidesteps the Indigo
// WASM renderer's fixed ~87×76 px output and produces sharp images at any zoom.
// A pHYs DPI chunk is injected so apps like LibreOffice paste the image at the
// same physical size the molecule occupies on-screen in Ketcher.
(function () {
  'use strict';

  // Inject a PNG pHYs chunk at byte 33 (right after the IHDR chunk).
  // Without DPI metadata canvas.toBlob produces a 72-DPI PNG, making a 1600 px
  // image appear 22 inches wide in LibreOffice / Word.
  function injectPngDpi(buffer, dpi) {
    const ppm = Math.round(dpi / 0.0254); // pixels per metre (PNG unit = metre)

    // Standard CRC32 (PNG spec polynomial 0xEDB88320).
    function crc32(data) {
      const table = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        table[n] = c >>> 0;
      }
      let crc = 0xFFFFFFFF;
      for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
      return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    // Build the 21-byte pHYs chunk: 4 length + 4 type + 9 data + 4 CRC.
    const chunk = new Uint8Array(21);
    const v = new DataView(chunk.buffer);
    v.setUint32(0, 9, false);                        // data length = 9
    chunk.set([0x70, 0x48, 0x59, 0x73], 4);          // 'pHYs'
    v.setUint32(8, ppm, false);                      // X pixels/metre
    v.setUint32(12, ppm, false);                     // Y pixels/metre
    chunk[16] = 1;                                   // unit specifier = metre
    v.setUint32(17, crc32(chunk.subarray(4, 17)), false); // CRC over type+data

    // PNG layout: 8-byte signature + 25-byte IHDR = 33 bytes before first chunk.
    // Insert pHYs immediately after IHDR (required position by the PNG spec).
    const src = new Uint8Array(buffer);
    const out = new Uint8Array(src.length + 21);
    out.set(src.subarray(0, 33), 0);
    out.set(chunk, 33);
    out.set(src.subarray(33), 54);
    return out.buffer;
  }

  async function svgBlobToHighResPng(svgBlob) {
    const svgText = await svgBlob.text();

    // Parse the SVG's intrinsic dimensions so we can preserve the aspect ratio
    // and derive the correct DPI to match on-screen physical size.
    const natW = parseFloat(svgText.match(/width="([^"]+)"/)?.[1]) || 400;
    const natH = parseFloat(svgText.match(/height="([^"]+)"/)?.[1]) || 300;

    // 800 px on the longest side gives sharp quality from the vector SVG while
    // keeping the clipboard payload small. At 300 DPI the image pastes at
    // 800 / 300 ≈ 2.67 inches (≈ 6.8 cm) in LibreOffice / Word — a typical
    // chemistry-document size. Change LONG_SIDE / DPI here to taste.
    const LONG_SIDE = 800;
    const DPI = 300;
    const scale = LONG_SIDE / Math.max(natW, natH);
    const targetW = Math.round(natW * scale);
    const targetH = Math.round(natH * scale);

    // Override the SVG's width/height to the target pixel dimensions. Chromium
    // rasterises an <img src=SVG> at its declared width/height, so setting these
    // to the target size forces full-vector rendering at 1600 px — not a bitmap
    // upscale of the tiny default. Preserve (or add) a viewBox so the coordinate
    // system is kept correct when the dimensions change.
    let scaledSvg = svgText
      .replace(/width="[^"]+"/, `width="${targetW}"`)
      .replace(/height="[^"]+"/, `height="${targetH}"`);
    if (!scaledSvg.includes('viewBox')) {
      scaledSvg = scaledSvg.replace('<svg', `<svg viewBox="0 0 ${natW} ${natH}"`);
    }

    const scaledBlob = new Blob([scaledSvg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(scaledBlob);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = url;
      });

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const pngBlob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      return injectPngDpi(await pngBlob.arrayBuffer(), DPI);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  window.addEventListener('copyOrCutComplete', async () => {
    if (typeof window.ketcher?.generateImage !== 'function') return;
    if (typeof window.ketcherDesktop?.copyImageToClipboard !== 'function') return;

    try {
      const mol = await window.ketcher.getMolfile();
      if (!mol?.trim()) return;

      const svgBlob = await window.ketcher.generateImage(mol, { outputFormat: 'svg' });
      const pngBuffer = await svgBlobToHighResPng(svgBlob);
      await window.ketcherDesktop.copyImageToClipboard(pngBuffer);
    } catch (e) {
      console.warn('[Ketcher Desktop] PNG clipboard generation failed:', e);
    }
  });
})();
