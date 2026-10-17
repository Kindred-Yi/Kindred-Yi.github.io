// Run before CSS to avoid a flash of the wrong theme. Storage is optional.
(() => {
  const root = document.documentElement;
  const preference = window.matchMedia('(prefers-color-scheme: dark)');
  let saved;
  try { saved = localStorage.getItem('theme'); } catch { /* Private browsing. */ }
  let explicit = saved === 'dark' || saved === 'light';
  root.dataset.theme = explicit ? saved : (preference.matches ? 'dark' : 'light');

  function updateButton() {
    const button = document.querySelector('.theme-toggle');
    if (!button) return;
    const label = `Switch to ${root.dataset.theme === 'dark' ? 'light' : 'dark'} mode`;
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  preference.addEventListener('change', event => {
    if (!explicit) {
      root.dataset.theme = event.matches ? 'dark' : 'light';
      updateButton();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('.theme-toggle');
    button.hidden = false;
    updateButton();
    button.addEventListener('click', () => {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      explicit = true;
      try { localStorage.setItem('theme', root.dataset.theme); } catch { /* Optional. */ }
      updateButton();
    });
  });
})();
