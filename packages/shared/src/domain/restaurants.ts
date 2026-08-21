// Lowercase alphanumeric segments separated by single hyphens, e.g.
// "pizza-place" — no client-side check existed before this; a bad slug
// only ever failed after a round trip via the DB's unique constraint.
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}
