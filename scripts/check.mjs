// Check the built pages, including shared assets, internal destinations and anchors.
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import vm from 'node:vm';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name)))).flat();
}
const files = (await walk(root)).filter(file => file.endsWith('.html'));
const documents = new Map();
for (const file of files) {
  const html = await readFile(file, 'utf8');
  assert(!/\{\{\w+\}\}/.test(html), `Unresolved template: ${file}`);
  assert(/<title>[^<]+<\/title>/.test(html), `Missing title: ${file}`);
  assert(/name="viewport"/.test(html), `Missing viewport: ${file}`);
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size, `Duplicate IDs: ${file}`);
  documents.set(file, { html, ids: new Set(ids) });
}
let checked = 0;
for (const [file, { html }] of documents) {
  for (const [, raw] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const value = raw.replaceAll('&amp;', '&');
    assert(value !== '#', `Empty link: ${file}`);
    assert(!/^(?:javascript|data):/i.test(value), `Unsafe URL: ${file}`);
    if (/^(https?:|mailto:)/.test(value)) continue;
    const url = new URL(value, `https://local.test/${path.relative(root, file).split(path.sep).join('/')}`);
    let target = path.join(root, decodeURIComponent(url.pathname));
    const info = await stat(target).catch(() => null);
    assert(info, `Missing ${value} in ${file}`);
    if (info.isDirectory()) target = path.join(target, 'index.html');
    assert(await stat(target).catch(() => null), `Missing index: ${value}`);
    if (url.hash) assert(documents.get(target)?.ids.has(decodeURIComponent(url.hash.slice(1))), `Missing anchor ${value} in ${file}`);
    checked++;
  }
}
const home = documents.get(path.join(root, 'index.html')).html;
assert(home.includes('id="about"') && home.includes('id="research"'), 'Missing home sections');
assert(!home.includes('Paper Title Number'), 'Sample publications survived');
assert(!home.includes('is-pending'), 'A social link is still missing');

// Exercise theme behavior without a browser, including blocked localStorage.
const source = await readFile(new URL('../assets/theme.js', import.meta.url), 'utf8');
for (const storageBlocked of [false, true]) {
  let click, systemChange, label;
  const state = { dataset: {} };
  const button = { hidden: true, setAttribute: (_, value) => { label = value; }, addEventListener: (_, fn) => { click = fn; } };
  const storage = new Map();
  const context = {
    window: { matchMedia: () => ({ matches: false, addEventListener: (_, fn) => { systemChange = fn; } }) },
    document: { documentElement: state, querySelector: () => button, addEventListener: (_, fn) => fn() },
    localStorage: {
      getItem: key => { if (storageBlocked) throw new Error('Blocked'); return storage.get(key); },
      setItem: (key, value) => { if (storageBlocked) throw new Error('Blocked'); storage.set(key, value); }
    }
  };
  vm.runInNewContext(source, context);
  assert.equal(state.dataset.theme, 'light');
  assert.equal(button.hidden, false);
  systemChange({ matches: true });
  assert.equal(state.dataset.theme, 'dark');
  click();
  assert.equal(state.dataset.theme, 'light');
  assert.equal(label, 'Switch to dark mode');
  systemChange({ matches: true });
  assert.equal(state.dataset.theme, 'light', 'Explicit choice must override system changes');
  if (!storageBlocked) {
    assert.equal(storage.get('theme'), 'light');
    storage.set('theme', 'dark');
    vm.runInNewContext(source, context);
    assert.equal(state.dataset.theme, 'dark', 'Saved choice must survive navigation');
  }
}
console.log(`Passed: ${files.length} HTML pages, ${checked} internal references, and theme behavior (including blocked storage).`);
