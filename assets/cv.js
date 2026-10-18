// Keep the document within this noindex page, without a separate indexed PDF URL.
(() => {
  const data = document.getElementById('cv-document');
  const bytes = Uint8Array.from(atob(data.textContent.trim()), character => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  const viewer = document.getElementById('cv-viewer');
  const download = document.getElementById('cv-download');
  viewer.src = url;
  viewer.hidden = false;
  download.href = url;
  download.hidden = false;
  document.getElementById('cv-status').hidden = true;
})();
