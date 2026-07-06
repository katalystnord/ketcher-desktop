// Injected into the renderer main world on did-finish-load, after
// png-export.js and copy-format-menu.js.
//
// Ketcher dispatches 'copyOrCutComplete' on window after every successful
// clipboard write. We listen for it and overwrite the clipboard with
// whichever single format is currently selected in the copy-format dropdown
// (PNG by default, or SVG / Molfile) — only one format is ever written, since
// not every paste target picks the richest available one when several are
// present (some apps grab plain text over an image).
(function () {
  'use strict';

  // Both PNG and SVG paste at the same real-world size by default — 400px at
  // 300 DPI ≈ 3.39cm on the longest side — so switching format in the
  // dropdown doesn't change how big the molecule looks once pasted.
  const LONG_SIDE_CM = (400 / 300) * 2.54;

  window.addEventListener('copyOrCutComplete', async () => {
    if (typeof window.ketcher?.getMolfile !== 'function') return;
    if (typeof window.ketcherDesktop?.writeClipboard !== 'function') return;
    if (!window.__ketcherDesktopImageExport) return;

    const format = window.__ketcherDesktopCopyFormat?.get() || 'png';

    try {
      const mol = await window.ketcher.getMolfile();
      if (!mol?.trim()) return;

      if (format === 'molfile') {
        await window.ketcherDesktop.writeClipboard('molfile', mol);
        return;
      }

      const svgBlob = await window.ketcher.generateImage(mol, { outputFormat: 'svg' });

      if (format === 'svg') {
        // Re-declare width/height in physical cm (viewBox and geometry
        // untouched) so vector apps like Inkscape/LibreOffice Draw import it
        // at a real, consistent size instead of Ketcher's tiny native ~87×76
        // unitless canvas — pasted unscaled, that reads as razor-thin strokes
        // the moment you zoom in at all.
        const svgText = await svgBlob.text();
        const scaledSvg = window.__ketcherDesktopImageExport.scaleSvgToPhysicalSize(svgText, LONG_SIDE_CM);
        await window.ketcherDesktop.writeClipboard('svg', scaledSvg);
        return;
      }

      // PNG: rasterize the SVG at a fixed size via the shared helper, sidestepping
      // the Indigo WASM renderer's fixed ~87×76 px output. A pHYs DPI chunk is
      // injected so apps like LibreOffice paste it at a consistent physical size.
      const pngBuffer = await window.__ketcherDesktopImageExport.svgBlobToHighResPng(svgBlob, { longSide: 400, dpi: 300 });
      await window.ketcherDesktop.writeClipboard('png', pngBuffer);
    } catch (e) {
      console.warn('[Ketcher Desktop] clipboard generation failed:', e);
    }
  });
})();
