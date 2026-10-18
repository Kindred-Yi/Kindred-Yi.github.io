import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.join(root, 'dist');
const read = name => readFile(path.join(root, name), 'utf8');
const json = async name => JSON.parse(await read(`content/${name}.json`));
const [profile, publications, posts, layout, home, about] = await Promise.all([
  json('profile'), json('publications'), json('posts'),
  read('templates/layout.html'), read('templates/home.html'),
  // Prose with inline links lives in content/*.html, same as blog post bodies,
  // because a JSON string cannot be wrapped across lines.
  read('content/about.html')
]);
const escape = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
function template(source, values) {
  return source.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Missing template value: ${key}`);
    return values[key];
  });
}
function safeUrl(value) {
  if (typeof value !== 'string' || !(/^(https:\/\/|mailto:|\/(?!\/))/.test(value))) {
    throw new Error(`Use an HTTPS, mailto, or root-relative URL: ${value}`);
  }
  return escape(value);
}
function link(label, url) {
  return url ? `<a href="${safeUrl(url)}">${escape(label)}</a>` : escape(label);
}

// Inline icons avoid font packages, CDNs, and third-party requests.
const paths = {
  scholar: '<path d="m12 2 12 8-12 8L0 10Zm-7 12 7 5 7-5v5c-4 4-10 4-14 0Z"/>',
  linkedin: '<path d="M5.4 7.5H1V22h4.4ZM3.2 1a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2ZM23 13.7c0-4.4-2.3-6.5-5.4-6.5a4.7 4.7 0 0 0-4.2 2.3v-2H9V22h4.4v-8.1c0-2.2.4-4 2.8-4 2.3 0 2.4 2.1 2.4 4.1v8H23Z"/>',
  email: '<path d="M2 4h20v16H2Zm2 2v1l8 6 8-6V6l-8 6Zm16 4-8 6-8-6v8h16Z"/>',
  twitter: '<path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3L12 14.5 5.4 22H2.2l8.3-9.5L.8 2h6.5l4.4 6.8ZM17.8 20h1.7L6.3 4H4.5Z"/>',
  github: '<path d="M12 .8A11.3 11.3 0 0 0 8.4 23c.6.1.8-.3.8-.6v-2.1c-3.5.7-4.2-1.5-4.2-1.5-.6-1.3-1.4-1.7-1.4-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.8-.3-5.7-1.4-5.7-6.2 0-1.4.5-2.5 1.2-3.3-.1-.3-.5-1.6.1-3.3 0 0 1-.3 3.4 1.3a11.7 11.7 0 0 1 6.2 0c2.4-1.6 3.4-1.3 3.4-1.3.7 1.7.3 3 .1 3.3.8.8 1.3 1.9 1.3 3.3 0 4.8-2.9 5.9-5.7 6.2.5.4.9 1.2.9 2.3v3.4c0 .3.2.7.8.6A11.3 11.3 0 0 0 12 .8Z"/>'
};
const labels = { cv: 'CV', scholar: 'Google Scholar', linkedin: 'LinkedIn', email: 'Email', twitter: 'Twitter / X', github: 'GitHub' };
const socialLinks = Object.entries(labels).map(([key, label]) => {
  const icon = key === 'cv' ? '<span class="cv-icon">CV</span>' : `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[key]}</svg>`;
  const url = profile.links[key];
  return url
    ? `<a class="social-link" href="${safeUrl(url)}" aria-label="${label}" title="${label}">${icon}</a>`
    : `<span class="social-link is-pending" role="img" aria-label="${label} — link coming soon" title="${label} — link coming soon">${icon}</span>`;
}).join('\n');
const publicationHtml = publications.map(paper => `<article class="publication">
  ${paper.video ? `<div class="publication-media"><video autoplay loop muted playsinline disablepictureinpicture tabindex="-1" aria-label="Demonstration: ${escape(paper.title)}"><source src="${safeUrl(paper.video)}" type="video/mp4"><a href="${safeUrl(paper.video)}">Download demonstration video</a></video></div>` : ''}
  <div class="publication-body">
    <h3>${link(paper.title, paper.links?.Paper || paper.links?.Website)}</h3>
    <p class="authors">${paper.authors.map(name => name === profile.name ? `<strong>${escape(name)}</strong>` : escape(name)).join(', ')}</p>
    <p class="publication-venue">${escape(paper.venue)}</p>
    <div class="paper-links">${Object.entries(paper.links || {}).filter(([, url]) => url).map(([label, url]) => `[${link(label, url)}]`).join(' ')}</div>
    <p class="publication-summary">${escape(paper.summary)}</p>
  </div>
</article>`).join('\n');
// Search engines need to be told that "Kindred Yi" and "Yongzhe (Kindred) Yi"
// are the same person, and which profiles belong to them. Only the home page
// carries it: repeating an identity claim on every page adds nothing.
const absolute = value => new URL(value, profile.siteUrl).href;
const personSchema = {
  '@context': 'https://schema.org', '@type': 'Person', '@id': `${absolute('/')}#person`,
  name: profile.name, alternateName: profile.alternateNames, jobTitle: profile.title,
  url: absolute('/'), image: absolute(profile.photo), description: profile.description,
  affiliation: { '@type': 'Organization', name: profile.affiliation, url: profile.affiliationUrl },
  alumniOf: { '@type': 'CollegeOrUniversity', name: profile.alumniOf.name, url: profile.alumniOf.url },
  knowsAbout: profile.researchTopics,
  sameAs: ['scholar', 'linkedin', 'github', 'twitter'].map(key => profile.links[key]).filter(Boolean)
};
// `<` cannot appear raw inside a script element without ending it early.
const structuredData = `\n  <script type="application/ld+json">${JSON.stringify(personSchema).replaceAll('<', '\\u003c')}</script>`;
const verificationToken = profile.googleSiteVerification?.trim();
if (verificationToken && !/^[\w-]+$/.test(verificationToken)) throw new Error('googleSiteVerification must be the bare token from Search Console');
const siteVerification = verificationToken ? `\n  <meta name="google-site-verification" content="${escape(verificationToken)}">` : '';

const page = ({ title, description = profile.description, pathname, content, section, article = false }) => template(layout, {
  title: escape(title), description: escape(description),
  canonical: escape(new URL(pathname, profile.siteUrl).href), imageUrl: escape(new URL(profile.photo, profile.siteUrl).href),
  name: escape(profile.name), year: new Date().getUTCFullYear(),
  ogType: article ? 'article' : 'website', aboutCurrent: section === 'home' ? ' aria-current="page"' : '',
  blogCurrent: section === 'blog' ? ' aria-current="page"' : '',
  siteVerification, structuredData: section === 'home' ? structuredData : '', content
});
const homeContent = template(home, {
  name: escape(profile.name), role: escape(profile.title), affiliation: escape(profile.affiliation), affiliationUrl: safeUrl(profile.affiliationUrl),
  photo: safeUrl(profile.photo), about, socialLinks, publications: publicationHtml
});

// Prepare all pages before replacing the previous build: a bad post preserves it.
const pages = new Map([['index.html', page({ title: `${profile.name} · ${profile.affiliation}`, pathname: '/', content: homeContent, section: 'home' })]]);
const published = posts.filter(post => !post.draft);
const slugs = new Set();
const formatDate = date => new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
for (const post of published) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || slugs.has(post.slug)) throw new Error(`Invalid or duplicate post slug: ${post.slug}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.date) || Number.isNaN(Date.parse(`${post.date}T00:00:00Z`)) || new Date(`${post.date}T00:00:00Z`).toISOString().slice(0, 10) !== post.date) throw new Error(`Invalid post date: ${post.date}`);
  for (const field of ['title', 'description']) if (!post[field]?.trim()) throw new Error(`Post ${post.slug} needs ${field}`);
  slugs.add(post.slug);
  const body = await read(`content/posts/${post.slug}.html`);
  const content = `<article class="writing-page"><a class="back-link" href="/blog/">← All writing</a><p class="eyebrow">Blog</p><h1 class="page-title">${escape(post.title)}</h1><p class="post-meta"><time datetime="${post.date}">${formatDate(post.date)}</time> · ${escape(profile.name)}</p><div class="prose">${body}</div></article>`;
  pages.set(`blog/${post.slug}/index.html`, page({ title: `${post.title} · ${profile.name}`, description: post.description, pathname: `/blog/${post.slug}/`, content, section: 'blog', article: true }));
}
published.sort((a, b) => b.date.localeCompare(a.date));
const postList = published.length ? published.map(post => `<article class="post-item"><time datetime="${post.date}">${formatDate(post.date)}</time><h2><a href="/blog/${post.slug}/">${escape(post.title)}</a></h2><p>${escape(post.description)}</p><a class="text-link" href="/blog/${post.slug}/">Read post ↗</a></article>`).join('\n') : '<div class="empty-state"><h2>Writing is on its way.</h2><p>A space for research notes, ideas, and things I learn along the way. No posts yet — check back soon.</p></div>';
pages.set('blog/index.html', page({ title: `Blog · ${profile.name}`, pathname: '/blog/', section: 'blog', content: `<div class="writing-page"><p class="eyebrow">Notes &amp; perspectives</p><h1 class="page-title">Blog</h1><p class="page-description">Thoughts on robots, learning, and the people at the center of it all.</p>${postList}<a class="text-link" href="/">← Back to home</a></div>` }));
pages.set('404.html', page({ title: `Page not found · ${profile.name}`, pathname: '/404.html', content: '<div class="writing-page"><p class="eyebrow">404</p><h1 class="page-title">A little off course.</h1><p class="page-description">This page may have moved, or the link may be out of date.</p><a class="text-link" href="/">← Back to home</a></div>' }));
for (const [oldPath, destination] of [['publications/index.html', '/#research'], ['about/index.html', '/#about']]) {
  pages.set(oldPath, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page moved</title><meta http-equiv="refresh" content="0;url=${destination}"><link rel="canonical" href="${profile.siteUrl}${destination}"></head><body><p><a href="${destination}">Continue to ${profile.name}’s home page</a></p></body></html>`);
}
// The output is a fixed child of the checkout. Source data stays intact.
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== 'dist') throw new Error('Unsafe build output');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
// Editing notes in templates and content/*.html are for the author, not for
// visitors reading the page source. Escaped examples inside posts survive,
// because those read as &lt;!-- rather than a real comment.
const stripComments = html => html.replace(/<!--(?!\[if)[\s\S]*?-->/g, '').replace(/^[ \t]+$\n/gm, '');
for (const [filename, html] of pages) {
  const target = path.join(output, filename);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, stripComments(html));
}
await Promise.all(['assets', 'images'].map(dir => cp(path.join(root, dir), path.join(output, dir), { recursive: true })));
await writeFile(path.join(output, '.nojekyll'), '');
// Files listed in noindexPaths stay downloadable but are kept out of search
// results. GitHub Pages cannot send an X-Robots-Tag header and a PDF has no
// <head> to put a meta tag in, so robots.txt is the only lever available.
const disallow = (profile.noindexPaths ?? []).map(entry => {
  if (!entry.startsWith('/')) throw new Error(`noindexPaths must be root-relative: ${entry}`);
  return `Disallow: ${entry}`;
}).join('\n');
await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\n${disallow}${disallow ? '\n' : ''}Sitemap: ${profile.siteUrl}/sitemap.xml\n`);
// lastmod tells a crawler which pages are worth re-fetching. Posts carry their
// own date; the home and index pages change whenever the site is rebuilt.
const buildDate = new Date().toISOString().slice(0, 10);
const urls = [['/', buildDate], ['/blog/', buildDate], ...published.map(post => [`/blog/${post.slug}/`, post.date])];
await writeFile(path.join(output, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(([url, lastmod]) => `<url><loc>${escape(profile.siteUrl + url)}</loc><lastmod>${lastmod}</lastmod></url>`).join('')}</urlset>\n`);
console.log(`Built ${pages.size} pages in dist/ (${published.length} blog posts).`);
