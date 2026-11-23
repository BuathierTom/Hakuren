import { createHash, randomBytes } from 'node:crypto';
export const STATE_SECONDS = 600;
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const token = () => randomBytes(32).toString('base64url');
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const challenge = (value: string) => createHash('sha256').update(value).digest('base64url');
export const validToken = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
export function returnPath(value: unknown, appUrl: string) {
  if (
    typeof value !== 'string' ||
    value.length > 1024 ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return '/';
  const url = new URL(value, appUrl);
  if (url.origin !== appUrl || url.pathname.startsWith('/api/')) return '/';
  url.searchParams.delete('auth_error');
  return url.pathname + url.search + url.hash;
}
