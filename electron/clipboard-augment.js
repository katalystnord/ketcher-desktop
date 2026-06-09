// Injected into the renderer main world on did-finish-load.
// After Ketcher writes chemical types to the clipboard, also sends a PNG to
// the main process via IPC. The main process writes it with Electron's native
// clipboard API, which works on Linux X11 (navigator.clipboard.write silently
// drops image/png when custom 'web ' MIME types are in the same ClipboardItem).
(function () {
  'use strict';

  if (!navigator.clipboard?.write) return;

  const origWrite = navigator.clipboard.write.bind(navigator.clipboard);

  navigator.clipboard.write = async function (items) {
    // Let Ketcher's write proceed normally first
    await origWrite(items);

    // Only augment chemistry copies
    const hasMol = items.some((item) =>
      item.types.includes('web chemical/x-mdl-molfile'),
    );
    if (!hasMol || typeof window.ketcher?.generateImage !== 'function') return;
    if (typeof window.ketcherDesktop?.copyImageToClipboard !== 'function') return;

    try {
      let molText = null;
      for (const item of items) {
        if (item.types.includes('web chemical/x-mdl-molfile')) {
          molText = await (await item.getType('web chemical/x-mdl-molfile')).text();
          break;
        }
      }
      if (!molText?.trim()) return;

      const pngBlob = await window.ketcher.generateImage(molText, {
        outputFormat: 'png',
        backgroundColor: '#ffffff',
      });
      const arrayBuffer = await pngBlob.arrayBuffer();
      await window.ketcherDesktop.copyImageToClipboard(arrayBuffer);
    } catch (e) {
      console.warn('[Ketcher Desktop] PNG clipboard generation failed:', e);
    }
  };
})();
