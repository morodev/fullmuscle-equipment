import { createHash } from 'node:crypto';
import { SOURCE } from './config.js';

export interface HttpClientOptions {
  delayMs: number;
  retries: number;
  timeoutMs: number;
}

export class PoliteHttpClient {
  readonly #options: HttpClientOptions;
  #nextRequestAt = 0;

  constructor(options: Partial<HttpClientOptions> = {}) {
    this.#options = {
      delayMs: options.delayMs ?? 350,
      retries: options.retries ?? 3,
      timeoutMs: options.timeoutMs ?? 30_000,
    };
  }

  async text(url: string): Promise<string> {
    const response = await this.request(url);
    return response.text();
  }

  async bytes(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
    const response = await this.request(url);
    const contentType = response.headers.get('content-type')?.split(';')[0]?.trim() ?? '';
    return { bytes: new Uint8Array(await response.arrayBuffer()), contentType };
  }

  private async request(url: string): Promise<Response> {
    assertSourceUrl(url);
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.#options.retries; attempt += 1) {
      try {
        await this.waitForSlot();
        const response = await fetch(url, {
          headers: {
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/*;q=0.8,*/*;q=0.5',
            'user-agent': SOURCE.userAgent,
          },
          redirect: 'follow',
          signal: AbortSignal.timeout(this.#options.timeoutMs),
        });

        if (response.ok) return response;
        if (![408, 425, 429, 500, 502, 503, 504].includes(response.status)) {
          throw new FatalHttpError(`HTTP ${response.status} per ${url}`);
        }
        lastError = new Error(`HTTP ${response.status} per ${url}`);
      } catch (error) {
        if (error instanceof FatalHttpError) throw error;
        lastError = error;
      }

      if (attempt < this.#options.retries) {
        await sleep(Math.min(8_000, 750 * 2 ** attempt));
      }
    }

    throw lastError instanceof Error ? lastError : new Error(`Download fallito: ${url}`);
  }

  private async waitForSlot(): Promise<void> {
    const now = Date.now();
    const waitMs = Math.max(0, this.#nextRequestAt - now);
    this.#nextRequestAt = Math.max(now, this.#nextRequestAt) + this.#options.delayMs;
    if (waitMs > 0) await sleep(waitMs);
  }
}

class FatalHttpError extends Error {}

export function assertSourceUrl(value: string): void {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.hostname !== new URL(SOURCE.baseUrl).hostname) {
    throw new Error(`URL sorgente non consentito: ${value}`);
  }
}

export function hash(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
