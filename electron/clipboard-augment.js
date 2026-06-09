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
    const svgUrl = URL.createObjectURL(svgBlob);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = svgUrl;
      });

      const LONG_SIDE = 1600;
      const natW = img.naturalWidth || 400;
      const natH = img.naturalHeight || 300;
      const scale = LONG_SIDE / Math.max(natW, natH);
      const canvW = Math.round(natW * scale);
      const canvH = Math.round(natH * scale);

      const canvas = document.createElement('canvas');
      canvas.width = canvW;
      canvas.height = canvH;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvW, canvH);
      ctx.drawImage(img, 0, 0, canvW, canvH);

      return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    } finally {
      URL.revokeObjectURL(svgUrl);
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
