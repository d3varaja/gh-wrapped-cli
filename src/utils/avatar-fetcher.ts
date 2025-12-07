/**
 * Fetch GitHub avatar and convert to base64 data URI
 * Handles CORS and network errors with 5-second timeout
 */
export async function fetchAvatarAsBase64(
  avatarUrl: string,
  onWarn?: (msg: string) => void
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(avatarUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'github-wrapped-cli'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const contentType = response.headers.get('content-type') || 'image/png';

    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    clearTimeout(timeoutId);

    let errorMsg = 'Unknown error';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMsg = 'Timeout (5s)';
      } else {
        errorMsg = error.message;
      }
    }

    const msg = `Avatar fetch failed: ${errorMsg}`;
    console.warn(msg);
    onWarn?.(msg);

    return '';
  }
}
