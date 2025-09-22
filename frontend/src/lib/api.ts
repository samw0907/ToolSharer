export const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "http://localhost:8000";

export type PresignResponse = { url: string; headers?: Record<string, string> };

export async function getPresignedUrl(params: {
  filename: string;
  contentType: string;
  sizeBytes?: number;
}): Promise<PresignResponse> {
  const qs = new URLSearchParams();
  qs.set("filename", params.filename);
  qs.set("contentType", params.contentType || "application/octet-stream");
  if (typeof params.sizeBytes === "number") qs.set("sizeBytes", String(params.sizeBytes));

  const res = await fetch(`${API_BASE}/api/s3/presign?${qs.toString()}`, {
    method: "GET",
    credentials: "omit", // ← IMPORTANT
  });
  if (!res.ok) throw new Error(`Presign failed: ${res.status}`);
  return res.json();
}
