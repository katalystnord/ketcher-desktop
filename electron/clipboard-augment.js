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
(function () {
  'use strict';

  async function svgBlobToHighResPng(svgBlob) {
    const svgText = await svgBlob.text();

    // Parse the SVG's intrinsic dimensions so we can preserve the aspect ratio.
    const natW = parseFloat(svgText.match(/width="([^"]+)"/)?.[1]) || 400;
    const natH = parseFloat(svgText.match(/height="([^"]+)"/)?.[1]) || 300;

    const LONG_SIDE = 1600;
    const scale = LONG_SIDE / Math.max(natW, natH);
    const targetW = Math.round(natW * scale);
    const targetH = Math.round(natH * scale);

    // Override the SVG's width/height to the target pixel dimensions. Chromium
    // rasterises an <img src=SVG> at its declared width/height, so setting these
    // to the target size forces full-vector rendering at 1600 px — not a bitmap
    // upscale of the tiny 87×76 default. Preserve (or add) a viewBox so the
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

      return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
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
      const pngBlob = await svgBlobToHighResPng(svgBlob);
      const arrayBuffer = await pngBlob.arrayBuffer();
      await window.ketcherDesktop.copyImageToClipboard(arrayBuffer);
    } catch (e) {
      console.warn('[Ketcher Desktop] PNG clipboard generation failed:', e);
    }
  });
})();
