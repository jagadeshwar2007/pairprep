/**
 * Validates a user-supplied external link. Mirrors app_private.is_safe_https_url() in the
 * database (which is the enforcing copy). The server NEVER fetches these URLs; they are only
 * rendered as links, so SSRF is out of scope, but unsafe schemes and deceptive hosts are not.
 *
 * Accepts: https:// URLs with a public-looking DNS host, no credentials, no whitespace.
 * Rejects: http, javascript:, data:, file:, localhost, single-label hosts, IP literals, user:pass@.
 */
export function parseSafeHttpsUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (value.length === 0 || value.length > 2048) return null;
  if (/[\s<>"'\\\u0000-\u001f]/.test(value)) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:') return null;
  if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase();
  if (!host.includes('.')) return null; // localhost, intranet single-label names
  if (/^[0-9.]+$/.test(host) || host.includes(':') || host.startsWith('[')) return null; // IPv4 / IPv6 literals
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) return null;
  if (host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.localhost')) return null;

  return url.toString();
}

export interface ExternalHostInfo {
  host: string;
  label: string;
  /** Hosts that commonly need the viewer to be granted access. */
  mayNeedAccess: boolean;
}

export function describeExternalHost(url: string): ExternalHostInfo {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return { host: 'unknown', label: 'External link', mayNeedAccess: false };
  }
  if (host === 'drive.google.com' || host === 'docs.google.com') {
    return { host, label: 'Google Drive', mayNeedAccess: true };
  }
  if (host.endsWith('onedrive.live.com') || host.endsWith('sharepoint.com') || host === '1drv.ms') {
    return { host, label: 'OneDrive', mayNeedAccess: true };
  }
  if (host === 'dropbox.com' || host.endsWith('.dropbox.com')) return { host, label: 'Dropbox', mayNeedAccess: true };
  if (host === 'github.com' || host.endsWith('.githubusercontent.com')) return { host, label: 'GitHub', mayNeedAccess: false };
  return { host, label: host, mayNeedAccess: false };
}
