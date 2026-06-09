// Injected into the renderer main world on did-finish-load.
// Patches navigator.clipboard.write so that Ketcher chemistry copies also
// include image/png — making Ctrl+C paste as an image in Word, GIMP, etc.
// Chemical MIME types are still preserved for chemistry-aware apps.
(function () {
  'use strict';

  if (!navigator.clipboard?.write) return;

  const origWrite = navigator.clipboard.write.bind(navigator.clipboard);

  navigator.clipboard.write = async function (items) {
    // Only augment when Ketcher's molfile type is present
    const hasMol = items.some((item) =>
      item.types.includes('web chemical/x-mdl-molfile'),
    );

    if (!hasMol || typeof window.ketcher?.generateImage !== 'function') {
      return origWrite(items);
    }

    let pngBlob = null;
    try {
      // Read the molfile that is already going to the clipboard (selection only)
      let molText = null;
      for (const item of items) {
        if (item.types.includes('web chemical/x-mdl-molfile')) {
          const blob = await item.getType('web chemical/x-mdl-molfile');
          molText = await blob.text();
          break;
        }
      }

      if (molText?.trim()) {
        pngBlob = await window.ketcher.generateImage(molText, {
          outputFormat: 'png',
          backgroundColor: '#ffffff',
        });
      }
    } catch (e) {
      console.warn('[Ketcher Desktop] PNG clipboard generation failed:', e);
    }

    if (!pngBlob) {
      return origWrite(items);
    }

    // Rebuild ClipboardItems with image/png added alongside the chemical types
    try {
      const augmented = await Promise.all(
        items.map(async (item) => {
          const data = { 'image/png': pngBlob };
          for (const type of item.types) {
            data[type] = await item.getType(type);
          }
          return new ClipboardItem(data);
        }),
      );
      return origWrite(augmented);
    } catch (e) {
      console.warn('[Ketcher Desktop] Clipboard augmentation failed:', e);
      return origWrite(items);
    }
  };
})();
