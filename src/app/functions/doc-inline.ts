import { DocInlineSegment } from '../types/doc-inline-segment';

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;
/** ./other.md or other.md — an internal cross-article link. */
const INTERNAL = /^(?:\.\/)?([\w-]+)\.md$/;

/**
 * Split doc text into plain runs and inline links. A link whose target is a
 * local `.md` file becomes an internal `slug`; anything else (http(s), mailto)
 * becomes an external `href`. Non-link text is preserved verbatim, including
 * the spaces around links.
 */
export function parseDocInline(text: string): DocInlineSegment[] {
  const segments: DocInlineSegment[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  LINK.lastIndex = 0;
  while ((m = LINK.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ text: text.slice(last, m.index) });
    }
    const label = m[1];
    const url = m[2].trim();
    const internal = url.match(INTERNAL);
    if (internal) {
      segments.push({ text: label, slug: internal[1] });
    } else if (url.startsWith('/')) {
      segments.push({ text: label, route: url });
    } else {
      segments.push({ text: label, href: url });
    }
    last = LINK.lastIndex;
  }

  if (last < text.length) {
    segments.push({ text: text.slice(last) });
  }
  return segments;
}
