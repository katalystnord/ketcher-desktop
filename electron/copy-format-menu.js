// Injected into the renderer main world on did-finish-load, before
// clipboard-augment.js, which reads window.__ketcherDesktopCopyFormat.get()
// at copy time.
//
// A small floating dropdown that picks which single format Ctrl+C produces:
// PNG (default), SVG, Molfile, or SMILES. Exclusive on purpose — writing
// several formats to the clipboard at once is unreliable, since not every
// app picks the richest available one (some grab plain text over an image
// when both are present, e.g. pasting a raw Molfile into a document instead
// of a picture).
(function () {
  'use strict';

  if (window.__ketcherDesktopCopyFormat) return;

  const FORMATS = [
    { id: 'png', label: 'PNG (image)' },
    { id: 'svg', label: 'SVG (vector image)' },
    { id: 'molfile', label: 'Molfile (chemical text)' },
    { id: 'smiles', label: 'SMILES (chemical text)' },
  ];
  let current = 'png';

  const container = document.createElement('div');
  container.id = 'ketcher-copy-format-menu';
  Object.assign(container.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    zIndex: 2147483647,
    fontFamily: 'sans-serif',
    fontSize: '13px',
  });

  const mainButton = document.createElement('button');
  mainButton.id = 'ketcher-copy-format-toggle';
  Object.assign(mainButton.style, {
    padding: '8px 14px',
    borderRadius: '6px',
    border: '1px solid #2d6cdf',
    background: '#2d6cdf',
    color: '#fff',
    cursor: 'pointer',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  });

  const menu = document.createElement('div');
  Object.assign(menu.style, {
    position: 'absolute',
    right: '0',
    bottom: 'calc(100% + 6px)',
    background: '#fff',
    color: '#222',
    border: '1px solid #ccc',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    display: 'none',
    minWidth: '190px',
    overflow: 'hidden',
  });

  function label(id) {
    return `Copy format: ${FORMATS.find((f) => f.id === id).label.split(' ')[0]} ▾`;
  }

  function closeMenu() { menu.style.display = 'none'; }
  mainButton.addEventListener('click', () => {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) closeMenu();
  });

  function renderMenu() {
    menu.innerHTML = '';
    mainButton.textContent = label(current);
    for (const format of FORMATS) {
      const item = document.createElement('div');
      item.textContent = (format.id === current ? '✓ ' : '   ') + format.label;
      Object.assign(item.style, { padding: '8px 14px', cursor: 'pointer' });
      item.addEventListener('mouseenter', () => { item.style.background = '#f0f0f0'; });
      item.addEventListener('mouseleave', () => { item.style.background = ''; });
      item.addEventListener('click', () => {
        current = format.id;
        closeMenu();
        renderMenu();
      });
      menu.appendChild(item);
    }
  }
  renderMenu();

  function mount() {
    container.appendChild(menu);
    container.appendChild(mainButton);
    document.body.appendChild(container);
  }
  if (document.body) mount(); else window.addEventListener('DOMContentLoaded', mount);

  window.__ketcherDesktopCopyFormat = { get: () => current };
})();
