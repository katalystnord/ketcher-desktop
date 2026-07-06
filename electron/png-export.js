// Injected into the renderer main world before clipboard-augment.js, which
// needs both a high-resolution PNG rasterized from Ketcher's SVG export, and
// a physically-sized copy of that same raw SVG. Exposed as
// window.__ketcherDesktopImageExport so it's only defined once.
(function () {
  'use strict';

  if (window.__ketcherDesktopImageExport) return;

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

  // Renders an SVG blob (from ketcher.generateImage(mol, {outputFormat:'svg'}))
  // onto an offscreen canvas at `longSide` px on the longest side, then exports
  // as a DPI-tagged PNG ArrayBuffer. Sidesteps the Indigo WASM renderer's fixed
  // ~87×76 px PNG output, which is too small to be legible once embedded.
  async function svgBlobToHighResPng(svgBlob, { longSide = 800, dpi = 300 } = {}) {
    const svgText = await svgBlob.text();

    const natW = parseFloat(svgText.match(/width="([^"]+)"/)?.[1]) || 400;
    const natH = parseFloat(svgText.match(/height="([^"]+)"/)?.[1]) || 300;

    const scale = longSide / Math.max(natW, natH);
    const targetW = Math.round(natW * scale);
    const targetH = Math.round(natH * scale);

    // Override the SVG's width/height to the target pixel dimensions. Chromium
    // rasterises an <img src=SVG> at its declared width/height, so setting these
    // to the target size forces full-vector rendering at target size — not a
    // bitmap upscale of the tiny default. Preserve (or add) a viewBox so the
    // coordinate system is kept correct when the dimensions change.
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
      return injectPngDpi(await pngBlob.arrayBuffer(), dpi);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // Ketcher's raw SVG export is fixed at ~87×76 *unitless* user units — apps
  // that paste SVG from the clipboard (Inkscape, LibreOffice Draw) render it
  // at that native size, so a user zoomed in even slightly sees the fixed
  // stroke-width look razor-thin. Re-declaring width/height in physical `cm`
  // units (while leaving the viewBox and all path geometry untouched) scales
  // the whole vector — strokes included — up to a real, consistent paste
  // size without any loss of vector fidelity.
  function scaleSvgToPhysicalSize(svgText, longSideCm) {
    const natW = parseFloat(svgText.match(/width="([^"]+)"/)?.[1]) || 100;
    const natH = parseFloat(svgText.match(/height="([^"]+)"/)?.[1]) || 100;
    const scale = longSideCm / Math.max(natW, natH);
    const targetWCm = (natW * scale).toFixed(3);
    const targetHCm = (natH * scale).toFixed(3);

    let out = svgText
      .replace(/width="[^"]+"/, `width="${targetWCm}cm"`)
      .replace(/height="[^"]+"/, `height="${targetHCm}cm"`);
    if (!out.includes('viewBox')) {
      out = out.replace('<svg', `<svg viewBox="0 0 ${natW} ${natH}"`);
    }
    return out;
  }

  window.__ketcherDesktopImageExport = { svgBlobToHighResPng, scaleSvgToPhysicalSize };
})();
