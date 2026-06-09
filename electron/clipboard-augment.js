// Injected into the renderer main world on did-finish-load.
//
// Ketcher dispatches 'copyOrCutComplete' on window after every successful
// clipboard write. We listen for it, generate a PNG of the current structure,
// and hand it to the main process via IPC. The main process reads the mol text
// that Ketcher already wrote (text/plain) then re-writes the clipboard with
// both image/png and text/plain so non-chemistry apps can paste the image
// while text-based tools still get the structure data.
(function () {
  'use strict';

  window.addEventListener('copyOrCutComplete', async () => {
    if (typeof window.ketcher?.generateImage !== 'function') return;
    if (typeof window.ketcherDesktop?.copyImageToClipboard !== 'function') return;

    try {
      const mol = await window.ketcher.getMolfile();
      if (!mol?.trim()) return;

      const pngBlob = await window.ketcher.generateImage(mol, {
        outputFormat: 'png',
      });
      const arrayBuffer = await pngBlob.arrayBuffer();
      await window.ketcherDesktop.copyImageToClipboard(arrayBuffer);
    } catch (e) {
      console.warn('[Ketcher Desktop] PNG clipboard generation failed:', e);
    }
  });
})();
