/**
 * Returns `candidate` only if it is a same-site relative path. Blocks open redirects such as
 * `https://evil.example`, `//evil.example`, `/\evil.example` and `javascript:` URLs.
 */
export function safeNextPath(candidate: string | null | undefined, fallback = '/'): string {
  if (!candidate) return fallback;
  let value = candidate.trim();
  try {
    value = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  // Never bounce back into the auth flow itself.
  if (value.startsWith('/auth/') || value === '/login') return fallback;
  return value;
}
