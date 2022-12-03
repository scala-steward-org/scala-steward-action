/**
 * Represents an HTTP client
 */
export type HttpClient = {
  run: (url: string) => Promise<Response>;
}

export type Response = {
  ok: boolean;
  status: number;
}
