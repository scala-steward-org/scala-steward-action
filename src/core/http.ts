/**
 * Represents an HTTP client
 */
export type HttpClient = {
  run: (url: string, options?: RequestOptions) => Promise<Response>;
}

export type RequestOptions = {
  headers?: Record<string, string>;
}

export type Response = {
  ok: boolean;
  status: number;
}
