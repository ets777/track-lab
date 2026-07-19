/**
 * Generates the in-app user manual (src/app/pages/docs/docs-content.generated.ts)
 * from markdown sources under docs/en and docs/ru.
 *
 * One file per article per language; the filename (without .md) is the slug.
 * Each file has YAML-ish frontmatter (title, summary, order) and a markdown
 * body. English and Russian bodies must be structurally parallel (same blocks
 * in the same order) so they can be zipped into bilingual { en, ru } strings —
 * the generator fails loudly if they diverge.
 *
 * Supported block markdown: headings (#..), paragraphs, unordered lists (-/*),
 * ordered lists (1.), GFM pipe tables, and a cross-article link on its own line
 * ([text](./other.md)) which becomes a "see" block. Inline emphasis and links
 * are flattened to plain text — the renderer shows plain strings.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const EN_DIR = path.join(ROOT, 'docs', 'en');
const RU_DIR = path.join(ROOT, 'docs', 'ru');
const OUT = path.join(ROOT, 'src', 'app', 'pages', 'docs', 'docs-content.generated.ts');

/**
 * Flatten inline emphasis/code to plain text, but KEEP markdown links
 * ([text](url)) intact — the renderer parses them into tappable inline links.
 */
function clean(text) {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split a GFM table row into trimmed, cleaned cells. */
function splitCells(row) {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(clean);
}

const RE_HEADING = /^#{1,6}\s+(.*)$/;
const RE_UL = /^[-*]\s+(.*)$/;
const RE_OL = /^\d+\.\s+(.*)$/;
const RE_SEE = /^\[([^\]]+)\]\((?:\.\/)?([^)]+)\.md\)$/;
const RE_TABLE_SEP = /^\|?[\s:|-]*-[\s:|-]*\|?$/;

/** Parse "---\nkey: value\n---\nbody" into { front, body }. */
function parseFrontmatter(raw, file) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    throw new Error(`${file}: missing frontmatter (--- title/summary/order ---)`);
  }
  const front = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) front[kv[1]] = kv[2].trim();
  }
  return { front, body: m[2] };
}

/** Parse a markdown body into an array of blocks (single-language). */
function parseBlocks(body, file) {
  const lines = body.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') { i++; continue; }

    let m;
    if ((m = line.match(RE_HEADING))) {
      blocks.push({ t: 'h', text: clean(m[1]) });
      i++;
    } else if (line.trim().startsWith('|') && RE_TABLE_SEP.test((lines[i + 1] || '').trim())) {
      const headers = splitCells(line);
      i += 2; // header + separator
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(splitCells(lines[i]));
        i++;
      }
      blocks.push({ t: 'table', headers, rows });
    } else if (RE_UL.test(line)) {
      const items = [];
      while (i < lines.length && RE_UL.test(lines[i])) {
        items.push(clean(lines[i].match(RE_UL)[1]));
        i++;
      }
      blocks.push({ t: 'ul', items });
    } else if (RE_OL.test(line)) {
      const items = [];
      while (i < lines.length && RE_OL.test(lines[i])) {
        items.push(clean(lines[i].match(RE_OL)[1]));
        i++;
      }
      blocks.push({ t: 'ol', items });
    } else if ((m = line.trim().match(RE_SEE))) {
      blocks.push({ t: 'see', slug: m[2], text: clean(m[1]) });
      i++;
    } else {
      // Paragraph: consecutive plain lines until a blank or a special line.
      const buf = [];
      while (i < lines.length && lines[i].trim() !== '') {
        const l = lines[i];
        if (RE_HEADING.test(l) || RE_UL.test(l) || RE_OL.test(l) || l.trim().startsWith('|')) break;
        buf.push(l.trim());
        i++;
      }
      blocks.push({ t: 'p', text: clean(buf.join(' ')) });
    }
  }
  return blocks;
}

/** Read one article (frontmatter + parsed blocks) for a single language. */
function readArticle(dir, slug) {
  const file = path.join(dir, `${slug}.md`);
  const raw = fs.readFileSync(file, 'utf8');
  const { front, body } = parseFrontmatter(raw, path.relative(ROOT, file));
  return { file: path.relative(ROOT, file), front, blocks: parseBlocks(body, file) };
}

/** Zip parallel en/ru blocks into blocks carrying { en, ru } strings. */
function mergeBlocks(en, ru, slug) {
  if (en.blocks.length !== ru.blocks.length) {
    throw new Error(
      `${slug}: en has ${en.blocks.length} blocks, ru has ${ru.blocks.length} — bodies must be structurally parallel`
    );
  }
  return en.blocks.map((eb, idx) => {
    const rb = ru.blocks[idx];
    if (eb.t !== rb.t) {
      throw new Error(`${slug}: block #${idx} is "${eb.t}" in en but "${rb.t}" in ru`);
    }
    const loc = (e, r) => ({ en: e, ru: r });
    switch (eb.t) {
      case 'h':
      case 'p':
        return { t: eb.t, text: loc(eb.text, rb.text) };
      case 'ul':
      case 'ol':
        if (eb.items.length !== rb.items.length) {
          throw new Error(`${slug}: list block #${idx} has ${eb.items.length} en / ${rb.items.length} ru items`);
        }
        return { t: eb.t, items: eb.items.map((e, k) => loc(e, rb.items[k])) };
      case 'table':
        if (eb.headers.length !== rb.headers.length || eb.rows.length !== rb.rows.length) {
          throw new Error(`${slug}: table block #${idx} shape differs between en and ru`);
        }
        return {
          t: 'table',
          headers: eb.headers.map((e, k) => loc(e, rb.headers[k])),
          rows: eb.rows.map((row, r) => row.map((cell, c) => loc(cell, rb.rows[r][c]))),
        };
      case 'see':
        if (eb.slug !== rb.slug) {
          throw new Error(`${slug}: see block #${idx} links "${eb.slug}" in en but "${rb.slug}" in ru`);
        }
        return { t: 'see', slug: eb.slug, text: loc(eb.text, rb.text) };
      default:
        throw new Error(`${slug}: unknown block type "${eb.t}"`);
    }
  });
}

function build() {
  const slugs = fs
    .readdirSync(EN_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));

  const articles = slugs.map((slug) => {
    const en = readArticle(EN_DIR, slug);
    const ru = readArticle(RU_DIR, slug);
    for (const key of ['title', 'summary', 'order']) {
      if (!en.front[key]) throw new Error(`${en.file}: frontmatter missing "${key}"`);
      if (!ru.front[key]) throw new Error(`${ru.file}: frontmatter missing "${key}"`);
    }
    return {
      order: Number(en.front.order),
      article: {
        slug,
        title: { en: en.front.title, ru: ru.front.title },
        summary: { en: en.front.summary, ru: ru.front.summary },
        blocks: mergeBlocks(en, ru, slug),
      },
    };
  });

  articles.sort((a, b) => a.order - b.order);

  const data = articles.map((a) => a.article);
  const banner =
    '// AUTO-GENERATED by tools/docs-gen — do not edit.\n' +
    '// Source: docs/en/*.md and docs/ru/*.md. Run `npm run docs:gen` to regenerate.\n';
  const out = `${banner}import type { DocArticle } from './docs-content';\n\nexport const DOC_ARTICLES: DocArticle[] = ${JSON.stringify(
    data,
    null,
    2
  )};\n`;

  fs.writeFileSync(OUT, out);
  console.log(`docs-gen: wrote ${data.length} articles to ${path.relative(ROOT, OUT)}`);
}

build();
