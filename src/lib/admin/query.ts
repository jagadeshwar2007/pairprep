import { escapeLike } from '@/lib/data/resource-mapper';

export const ADMIN_PAGE_SIZE = 20;

export function parsePage(value: string | undefined): number {
  const n = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(n) && n >= 1 && n <= 10_000 ? n : 1;
}

export function pageRange(page: number, size = ADMIN_PAGE_SIZE): [number, number] {
  return [(page - 1) * size, page * size - 1];
}

/**
 * Admin search boxes feed PostgREST filters. Anything outside this small alphabet is dropped so
 * user text can never add filter operators (`,` `(` `)` `.eq.`-style injection) to an `.or()` string.
 */
export function sanitizeSearch(value: string | undefined | null): string {
  return (value ?? '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} @._+-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

/** `%term%` with LIKE wildcards in the term escaped. Empty input yields null (no filter). */
export function likePattern(value: string | undefined | null): string | null {
  const clean = sanitizeSearch(value);
  return clean ? `%${escapeLike(clean)}%` : null;
}

export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value ?? '') ? (value as T) : fallback;
}

/** Builds `?a=1&b=2`, skipping empty values. */
export function queryString(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') sp.set(key, String(value));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
