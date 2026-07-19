/**
 * Types and helpers for the in-app user manual.
 *
 * The article data itself is GENERATED from markdown under docs/en and docs/ru
 * into docs-content.generated.ts (run `npm run docs:gen`; it also runs on
 * prebuild/prestart). Edit the markdown, not the generated file. A generic
 * renderer (`DocsArticlePage`) walks the blocks; the index (`DocsPage`) lists
 * articles by title + summary.
 */
import { DOC_ARTICLES } from './docs-content.generated';

/** One string in every supported language. */
export interface Loc {
  en: string;
  ru: string;
}

export type DocBlock =
  | { t: 'h'; text: Loc }
  | { t: 'p'; text: Loc }
  | { t: 'ul'; items: Loc[] }
  | { t: 'ol'; items: Loc[] }
  | { t: 'table'; headers: Loc[]; rows: Loc[][] }
  /** A tappable link to another article in this manual. */
  | { t: 'see'; slug: string; text: Loc };

export interface DocArticle {
  slug: string;
  title: Loc;
  summary: Loc;
  blocks: DocBlock[];
}

/** Pick the field for the active language, falling back to English. */
export function pickLoc(loc: Loc, lang: string): string {
  return (loc as unknown as Record<string, string>)[lang] ?? loc.en;
}

export { DOC_ARTICLES };

export function findArticle(slug: string): DocArticle | undefined {
  return DOC_ARTICLES.find(a => a.slug === slug);
}
