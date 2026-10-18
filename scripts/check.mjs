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
assert(!(await stat(path.join(root, 'README.md')).catch(() => null)), 'Local maintenance instructions must not be published');
const documents = new Map();
for (const file of files) {
  const html = await readFile(file, 'utf8');
  assert(!/\{\{\w+\}\}/.test(html), `Unresolved template: ${file}`);
  assert(!html.includes('<!--'), `Author comment leaked into the page source: ${file}`);
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

// Broken structured data is invisible on the page but silently costs indexing.
const schemaMatch = home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
assert(schemaMatch, 'Home page lost its Person structured data');
const person = JSON.parse(schemaMatch[1]);
assert.equal(person['@type'], 'Person');
for (const field of ['name', 'url', 'image', 'sameAs', 'alternateName']) {
  assert(person[field]?.length, `Structured data is missing ${field}`);
}
assert(person.sameAs.every(url => url.startsWith('https://')), 'sameAs profiles must be absolute HTTPS URLs');
assert(!/[<>]/.test(schemaMatch[1]), 'Structured data must not contain raw angle brackets');
const robots = await readFile(path.join(root, 'robots.txt'), 'utf8');
assert(!/^\s*Disallow:\s*\/\s*$/mi.test(robots), 'robots.txt blocks the whole site');
// A Disallow for a path that does not exist is a typo that silently does nothing.
const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
for (const [, blocked] of robots.matchAll(/^Disallow:\s*(\S+)$/gm)) {
  assert(await stat(path.join(root, blocked)).catch(() => null), `robots.txt blocks a path that does not exist: ${blocked}`);
  assert(!sitemap.includes(blocked), `${blocked} is both blocked and advertised in the sitemap`);
}
for (const [file, { html }] of documents) {
  const noindex = /name="robots"[^>]*noindex/i.test(html);
  assert.equal(noindex, ['cv/index.html', 'resume/index.html'].some(name => file === path.join(root, name)), `Unexpected indexing rule: ${file}`);
}
const cvHtml = documents.get(path.join(root, 'resume/index.html')).html;
assert(documents.get(path.join(root, 'cv/index.html')).html.includes('content="0;url=/"'), 'Legacy CV search results must lead to the homepage');
const pdfMatch = cvHtml.match(/<script id="cv-document" type="application\/octet-stream">([A-Za-z0-9+/=]+)<\/script>/);
assert(pdfMatch, 'CV document missing from its noindex page');
const pdfBytes = Buffer.from(pdfMatch[1], 'base64');
assert(pdfBytes.subarray(0, 5).equals(Buffer.from('%PDF-')), 'CV content is not a PDF');
assert(pdfBytes.equals(await readFile(new URL('../assets/Kindred_CV.pdf', import.meta.url))), 'CV download differs from the source document');
assert(!(await walk(root)).some(file => file.toLowerCase().endsWith('.pdf')), 'Standalone PDF leaked into the published site');
for (const pathname of ['/cv/', '/resume/']) assert(!sitemap.includes(`<loc>https://kindred-yi.github.io${pathname}</loc>`), 'CV pages must stay out of the sitemap');
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
