// Thin HTTP client for the OpenGrants Gateway API (DAOIP-5 REST endpoints).

export const DEFAULT_BASE_URL = "https://grants.daostar.org";

export type QueryValue = string | number | boolean | undefined;

export class OpenGrantsApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "OpenGrantsApiError";
  }
}

export interface OpenGrantsClientOptions {
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class OpenGrantsClient {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenGrantsClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.apiKey = options.apiKey || undefined;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  buildUrl(path: string, query: Record<string, QueryValue> = {}): string {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  async get<T = unknown>(path: string, query: Record<string, QueryValue> = {}): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    // The API allows anonymous access (lower rate limit); a key raises the limit.
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;

    const res = await this.fetchImpl(this.buildUrl(path, query), {
      headers,
      signal: AbortSignal.timeout(this.timeoutMs),
    });

    const text = await res.text();
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      // Non-JSON body (e.g. an HTML error page) — keep the raw text.
    }

    if (!res.ok) {
      const detail =
        body && typeof body === "object" && "message" in body
          ? String((body as { message: unknown }).message)
          : res.statusText;
      throw new OpenGrantsApiError(`OpenGrants API ${res.status} on ${path}: ${detail}`, res.status, body);
    }
    return body as T;
  }
}
