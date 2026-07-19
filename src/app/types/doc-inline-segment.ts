/**
 * A run of doc text: plain when neither link field is set, an internal
 * cross-article link when `slug` is set, or an external/mailto link when
 * `href` is set.
 */
export interface DocInlineSegment {
  text: string;
  /** Slug of another manual article (internal navigation). */
  slug?: string;
  /** In-app route path, e.g. /activity/add (router navigation). */
  route?: string;
  /** Absolute URL or mailto: (opens externally). */
  href?: string;
}
