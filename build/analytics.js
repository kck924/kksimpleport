// Adds the Google Analytics tag to every built HTML page that doesn't already have it.
// The homepage carries the tag in index.html; standalone pages in public/ (keep-quinn, misery-battery, ...)
// are copied to dist as-is, so without this they'd go untracked. Runs after every `vite build`.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const GA_ID = 'G-ZT1S7MVVBW';

const SNIPPET = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${GA_ID}"></script>
<script>window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${GA_ID}');</script>
`;

/** Returns html with the tag added at the top of <head>, or unchanged if the tag is already there or there's no <head>. */
export function injectGA(html) {
  if (html.includes(GA_ID)) return html;
  const m = html.match(/<head[^>]*>/i);
  if (!m) return html;
  const at = m.index + m[0].length;
  return html.slice(0, at) + '\n' + SNIPPET + html.slice(at);
}

function* htmlFiles(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* htmlFiles(p);
    else if (e.name.endsWith('.html')) yield p;
  }
}

export function analytics() {
  let outDir;
  return {
    name: 'kck-analytics',
    apply: 'build',
    configResolved(c) { outDir = join(c.root, c.build.outDir); },
    closeBundle() {
      let added = 0, missing = [];
      for (const f of htmlFiles(outDir)) {
        const html = readFileSync(f, 'utf8'), out = injectGA(html);
        if (out !== html) { writeFileSync(f, out); added++; }
        else if (!html.includes(GA_ID)) missing.push(f);
      }
      console.log(`analytics: tag added to ${added} pages`);
      if (missing.length) console.warn(`analytics: no <head>, left untracked:\n  ${missing.join('\n  ')}`);
    },
  };
}
