// src/lib/api.ts
const API_BASE_URL = "http://127.0.0.1:8000/api";

async function readErrorDetail(res: Response): Promise<string | null> {
  try {
    const data = await res.json();
    if (data && typeof data.detail === "string") return data.detail;
    return null;
  } catch {
    return null;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? `GET ${path} failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPost<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : JSON.stringify({}),
  });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? `PATCH ${path} failed: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}${path}`, { method: "DELETE" });
  if (!res.ok) {
    const detail = await readErrorDetail(res);
    throw new Error(detail ?? `DELETE ${path} failed: ${res.status}`);
  }
}