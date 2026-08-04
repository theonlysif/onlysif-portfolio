#!/usr/bin/env node
/*
 * Turns proposals/<slug>.md into out/<slug>.pdf — a plain, self-contained PDF
 * you can forward over WhatsApp. No CMS, no service, just markdown in and a
 * PDF out, styled to match sif.fyi.
 *
 *   node scripts/build-proposal.js                  # build everything
 *   node scripts/build-proposal.js architecture     # build one (prefix match)
 *   node scripts/build-proposal.js --html           # also drop the HTML for a browser preview
 *
 * Markdown dialect (a thin layer on top of normal markdown):
 *   ## heading            -> uppercase eyebrow label, opens a new section
 *   - text                -> bullet
 *   - label :: value      -> two-column row (label left, value right)
 *   - **label** :: value  -> same row, emphasised as the total line
 *   1. text               -> numbered step
 *   > text                -> small muted note
 * Inline **bold**, _italic_, [links](url) work everywhere.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'proposals');
const OUT = path.join(ROOT, 'out');
const CSS = fs.readFileSync(path.join(__dirname, 'proposal.css'), 'utf8');
const FONT = fs.readFileSync(path.join(ROOT, 'assets/fonts/inter-latin-var.woff2')).toString('base64');

/* A4 (210x297mm) less the @page margins in proposal.css, at 96dpi */
const MM = 96 / 25.4;
const PRINTABLE_PX = Math.round((297 - 20 - 18) * MM);
const PRINTABLE_W = Math.round((210 - 22 - 22) * MM);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => marked.parseInline(s.trim());

/* Playwright's bundled browser isn't always the one that's installed. Prefer an
   explicit path, then a known system location, then let Playwright decide. */
function chromiumPath() {
  const candidates = [process.env.PLAYWRIGHT_CHROMIUM_PATH, '/opt/pw-browsers/chromium'];
  return candidates.find((p) => p && fs.existsSync(p));
}

/* --- markdown -> html ---------------------------------------------------- */

function render(body) {
  const lines = body.split('\n');
  const out = [];
  let open = false; // is a <section> currently open
  let list = null; // 'rows' | 'ul' | 'ol' | null

  const closeList = () => {
    if (list) out.push(list === 'rows' ? '</ul>' : `</${list}>`);
    list = null;
  };
  const openList = (kind) => {
    if (list !== kind) {
      closeList();
      out.push(kind === 'rows' ? '<ul class="rows">' : `<${kind}>`);
      list = kind;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      closeList();
      continue;
    }

    // ## heading -> new section
    if (line.startsWith('## ')) {
      closeList();
      if (open) out.push('</section>');
      out.push('<section>', `<h2>${inline(line.slice(3))}</h2>`);
      open = true;
      continue;
    }

    // > muted note
    if (line.startsWith('> ')) {
      closeList();
      out.push(`<p class="note">${inline(line.slice(2))}</p>`);
      continue;
    }

    // - label :: value  /  - bullet
    if (/^[-*]\s+/.test(line)) {
      const item = line.replace(/^[-*]\s+/, '');
      const split = item.split('::');
      if (split.length === 2) {
        const [k, v] = split;
        const total = /^\s*\*\*/.test(k);
        openList('rows');
        out.push(
          `<li${total ? ' class="total"' : ''}>` +
            `<span class="k">${inline(k)}</span><span class="v">${inline(v)}</span></li>`
        );
      } else {
        openList('ul');
        out.push(`<li>${inline(item)}</li>`);
      }
      continue;
    }

    // 1. numbered step
    if (/^\d+[.)]\s+/.test(line)) {
      openList('ol');
      out.push(`<li>${inline(line.replace(/^\d+[.)]\s+/, ''))}</li>`);
      continue;
    }

    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  if (open) out.push('</section>');
  return out.join('\n');
}

function page(data, body) {
  const meta = [
    data.date && ['date', data.date],
    data.valid && ['valid for', data.valid],
    data.ref && ['ref', data.ref],
  ].filter(Boolean);

  const links = (data.contact || []).map((c) => {
    const [label, href] = Object.entries(c)[0];
    return href ? `<a href="${esc(String(href))}">${esc(label)}</a>` : `<span>${esc(label)}</span>`;
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(data.title || 'proposal')}</title>
<style>
@font-face {
  font-family: 'Inter';
  font-style: normal;
  font-weight: 100 900;
  font-display: block;
  src: url(data:font/woff2;base64,${FONT}) format('woff2');
}
${CSS}
</style>
</head>
<body>
<header>
  <h1>${esc(data.from || 'asif hassan')}</h1>
  <p class="subject">${inline(data.title || '')}${data.client ? ` for ${inline(data.client)}` : ''}</p>
  ${meta.length ? `<div class="meta">${meta.map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(String(v))}</span>`).join('')}</div>` : ''}
</header>
${body}
${links.length ? `<footer>${links.join('')}</footer>` : ''}
</body>
</html>`;
}

/* --- build --------------------------------------------------------------- */

async function main() {
  const args = process.argv.slice(2);
  const keepHtml = args.includes('--html');
  const filter = args.find((a) => !a.startsWith('--'));

  if (!fs.existsSync(SRC)) {
    console.error(`no proposals/ directory at ${SRC}`);
    process.exit(1);
  }

  let files = fs.readdirSync(SRC).filter((f) => f.endsWith('.md') && !f.startsWith('_'));
  if (filter) files = files.filter((f) => f.includes(filter));

  if (!files.length) {
    console.error(filter ? `nothing in proposals/ matches "${filter}"` : 'no proposals to build');
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  const exe = chromiumPath();
  const browser = await chromium.launch(exe ? { executablePath: exe } : {});
  const ctx = await browser.newContext({ viewport: { width: PRINTABLE_W, height: PRINTABLE_PX } });

  for (const file of files) {
    const slug = file.replace(/\.md$/, '');
    const { data, content } = matter(fs.readFileSync(path.join(SRC, file), 'utf8'));
    const html = page(data, render(content));

    const name = data.filename || slug;
    if (keepHtml) fs.writeFileSync(path.join(OUT, `${name}.html`), html);

    const p = await ctx.newPage();
    await p.emulateMedia({ media: 'print' }); // so the measurement below sees print layout, not the screen preview padding
    await p.setContent(html, { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    const pdfPath = path.join(OUT, `${name}.pdf`);
    await p.pdf({ path: pdfPath, format: 'A4', printBackground: true, preferCSSPageSize: true });

    // page count + how far onto the last page it runs, so a proposal that
    // quietly grows past 1.5 pages is visible without opening the file
    const pages = (fs.readFileSync(pdfPath).toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    const length = await p.evaluate((h) => document.body.scrollHeight / h, PRINTABLE_PX);
    await p.close();
    console.log(
      `${path.relative(ROOT, pdfPath)}  ${pages} page${pages === 1 ? '' : 's'}, ${length.toFixed(2)} deep`
    );
  }

  await ctx.close();
  await browser.close();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
