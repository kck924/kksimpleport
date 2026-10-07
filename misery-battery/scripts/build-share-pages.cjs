// Builds a static preview page for every local fan base (default view: all four sports, full span) so a shared link
// shows that fan base's own title and image in iMessage, X, Slack, Facebook and the like. Preview bots don't run
// JavaScript, so each page is plain HTML with its own meta tags; people who open it are sent on to the live page
// with that fan base highlighted.
//
// Run after any data or scoring change, with the site served locally:
//   npm run dev                                   (in the site root; or any static server on public/)
//   node misery-battery/scripts/build-share-pages.cjs http://localhost:5173
// Needs Playwright (npm i -D playwright) and Google Chrome.
// Writes public/misery-battery/f/<key>/index.html and og.jpg, replacing the previous set.

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const BASE = (process.argv[2] || 'http://localhost:5173').replace(/\/$/, '');
const SITE = 'https://kckdata.com';
const OUT = path.resolve(__dirname, '../../public/misery-battery/f');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const page = p => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.title)} | Kevin Klein Data</title>
<meta name="description" content="${esc(p.description)}">
<link rel="canonical" href="${SITE}/misery-battery/f/${p.key}/">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<meta name="theme-color" content="#0d1117">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Kevin Klein Data">
<meta property="og:title" content="${esc(p.title)}">
<meta property="og:description" content="${esc(p.description)}">
<meta property="og:url" content="${SITE}/misery-battery/f/${p.key}/">
<meta property="og:image" content="${SITE}/misery-battery/f/${p.key}/og.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(p.title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(p.title)}">
<meta name="twitter:description" content="${esc(p.description)}">
<meta name="twitter:image" content="${SITE}/misery-battery/f/${p.key}/og.jpg">
<meta name="twitter:image:alt" content="${esc(p.title)}">
<script>location.replace(${JSON.stringify(`/misery-battery/index.html?city=${encodeURIComponent(p.city)}&fb=${p.key}`)});</script>
<style>body{margin:0;font:16px/1.5 "Helvetica Neue",Arial,sans-serif;background:#fff;color:#222;display:grid;place-items:center;min-height:100vh;padding:16px}a{color:#0072aa}</style>
</head>
<body>
<p><a href="/misery-battery/index.html?city=${encodeURIComponent(p.city)}&amp;fb=${p.key}">${esc(p.title)}: see it on kckdata.com</a></p>
</body>
</html>
`;

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const tab = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  await tab.goto(`${BASE}/misery-battery/index.html`);
  await tab.waitForFunction(() => typeof window.__mbSharePages === 'function');
  const pages = await tab.evaluate(() => window.__mbSharePages());
  await browser.close();

  fs.rmSync(OUT, { recursive: true, force: true });
  let bytes = 0;
  for (const p of pages) {
    const dir = path.join(OUT, p.key);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), page(p));
    const img = Buffer.from(p.image.split(',')[1], 'base64');
    fs.writeFileSync(path.join(dir, 'og.jpg'), img);
    bytes += img.length;
  }
  console.log(`${pages.length} share pages written to ${path.relative(process.cwd(), OUT)} (${Math.round(bytes / 1024)} KB of images)`);
})();
