export interface PortraitImage {
  data: Buffer;
  contentType: 'image/png' | 'image/webp' | 'image/jpeg';
}

const HOST = 'dxi4wb638ujep.cloudfront.net';
const MAX_BYTES = 1_048_576;

function candidates(source: string): string[] {
  try {
    const url = new URL(source);
    if (
      url.protocol !== 'https:' ||
      url.hostname !== HOST ||
      url.port ||
      url.username ||
      url.password ||
      !/\.(?:webp|png|jpe?g)$/i.test(url.pathname)
    )
      return [];
    const sources = [url.href];
    if (url.pathname.endsWith('.webp')) {
      url.pathname = url.pathname.replace(/\.webp$/, '.png');
      sources.push(url.href);
    }
    return sources;
  } catch {
    return [];
  }
}

function contentType(data: Buffer): PortraitImage['contentType'] | null {
  if (data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
    return 'image/png';
  if (
    data.length >= 12 &&
    data.toString('ascii', 0, 4) === 'RIFF' &&
    data.toString('ascii', 8, 12) === 'WEBP'
  )
    return 'image/webp';
  if (data[0] === 255 && data[1] === 216 && data[2] === 255) return 'image/jpeg';
  return null;
}

export async function loadPortrait(
  source: string,
  fetcher: typeof fetch = fetch,
): Promise<PortraitImage> {
  for (const url of candidates(source)) {
    try {
      const response = await fetcher(url, {
        redirect: 'error',
        signal: AbortSignal.timeout(5_000),
        headers: { Accept: 'image/webp,image/png,image/jpeg' },
      });
      if (
        !response.ok ||
        Number(response.headers.get('content-length')) > MAX_BYTES ||
        !response.body
      ) {
        await response.body?.cancel();
        continue;
      }
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > MAX_BYTES) {
            await reader.cancel();
            throw new Error('Portrait trop volumineux.');
          }
          chunks.push(chunk.value);
        }
      } finally {
        reader.releaseLock();
      }
      const data = Buffer.concat(chunks);
      const type = contentType(data);
      if (type) return { data, contentType: type };
    } catch {
      continue;
    }
  }
  throw new Error('Le portrait est indisponible.');
}
