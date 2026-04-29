export const API_URL = process.env["USEAI_API_URL"] ?? "https://api.useai.dev";

export interface RequestOptions {
  method?: string;
  token?: string;
  body?: unknown;
}

export interface CloudResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
  status: number;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<CloudResponse<T>> {
  const { method = "GET", token, body } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  const status = res.status;

  if (!res.ok) {
    let error = `HTTP ${status}`;
    try {
      const json = (await res.json()) as { error?: string; message?: string };
      error = json.message ?? json.error ?? error;
    } catch {
      // ignore parse error
    }
    return { ok: false, error, status };
  }

  try {
    const data = (await res.json()) as T;
    return { ok: true, data, status };
  } catch {
    return { ok: true, status };
  }
}
