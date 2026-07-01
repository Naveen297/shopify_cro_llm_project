export interface FetchFailure {
  ok: false;
  status?: number;
  error: string;
}

export interface FetchSuccess<T> {
  ok: true;
  status: number;
  data: T;
  headers: Headers;
}

export type FetchResult<T> = FetchFailure | FetchSuccess<T>;

const DEFAULT_TIMEOUT_MS = 12_000;

export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "user-agent":
          "Shopify-CRO-Opportunity-Engine/0.1 (+https://localhost; evidence audit)",
        accept: "application/json,text/html;q=0.9,*/*;q=0.8",
        ...init.headers
      }
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchJson<T>(url: string, timeoutMs?: number): Promise<FetchResult<T>> {
  try {
    const response = await fetchWithTimeout(url, {}, timeoutMs);
    if (!response.ok) {
      return { ok: false, status: response.status, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as T;
    return { ok: true, status: response.status, data, headers: response.headers };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown fetch error"
    };
  }
}

export async function fetchText(url: string, timeoutMs?: number): Promise<FetchResult<string>> {
  try {
    const response = await fetchWithTimeout(url, {}, timeoutMs);
    if (!response.ok) {
      return { ok: false, status: response.status, error: `HTTP ${response.status}` };
    }

    return { ok: true, status: response.status, data: await response.text(), headers: response.headers };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown fetch error"
    };
  }
}
