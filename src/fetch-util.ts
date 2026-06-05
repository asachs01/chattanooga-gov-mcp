/**
 * Utility for making HTTP requests with timeouts and clear error handling.
 * No silent failures - all errors are explicitly reported.
 */

export class FetchError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'FetchError';
  }
}

export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
  method?: string;
  body?: string;
}

/**
 * Wrapper around fetch with timeout and clear error handling.
 * Throws FetchError with descriptive messages on any failure.
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { timeout = 10000, headers, method = 'GET', body } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new FetchError(`Request to ${url} timed out after ${timeout}ms`);
      }
      throw new FetchError(`Failed to fetch ${url}: ${error.message}`, error);
    }

    throw new FetchError(`Failed to fetch ${url}: Unknown error`);
  }
}

/**
 * Fetches and returns text content with error handling.
 */
export async function fetchText(url: string, options?: FetchOptions): Promise<string> {
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    throw new FetchError(
      `HTTP ${response.status} ${response.statusText} from ${url}`
    );
  }

  try {
    return await response.text();
  } catch (error) {
    throw new FetchError(
      `Failed to read response text from ${url}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Fetches and returns JSON content with error handling.
 */
export async function fetchJson(url: string, options?: FetchOptions): Promise<any> {
  const response = await fetchWithTimeout(url, options);

  if (!response.ok) {
    throw new FetchError(
      `HTTP ${response.status} ${response.statusText} from ${url}`
    );
  }

  try {
    return await response.json();
  } catch (error) {
    throw new FetchError(
      `Failed to parse JSON response from ${url}`,
      error instanceof Error ? error : undefined
    );
  }
}