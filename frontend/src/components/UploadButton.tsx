import React, { useRef, useState } from "react";
import { getPresignedUrl } from "../lib/api";

type Props = {
  accept?: string;
  label?: string;
  onUploaded?: (info: { file: File; s3Url: string }) => void;
};

const UploadButton: React.FC<Props> = ({ accept = "*/*", label = "Upload", onUploaded }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handlePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMsg("presign…");
    setBusy(true);
    try {
      const presign = await getPresignedUrl({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      console.log("PRESIGN URL →", presign.url);
      setMsg("uploading…");

      const headers: Record<string, string> = {
        "Content-Type": file.type || "application/octet-stream",
        ...(presign.headers ?? {}),
      };

      console.log("PUT →", presign.url, headers);
      const putRes = await fetch(presign.url, {
        method: "PUT",
        mode: "cors",              // be explicit
        headers,
        body: file,
      });

      console.log("PUT status →", putRes.status);
      if (!putRes.ok) {
        const text = await putRes.text().catch(() => "");
        throw new Error(`Upload failed: ${putRes.status} ${text}`);
      }

      onUploaded?.({ file, s3Url: presign.url.split("?")[0] });
      setMsg("done");
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      console.error("UPLOAD ERROR →", m);
      setMsg(m);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 8 }}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handlePicked}
        style={{ display: "none" }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #ccc",
          cursor: busy ? "not-allowed" : "pointer",
          background: busy ? "#e9ecef" : "#f7f7f7",
          fontWeight: 600,
        }}
      >
        {busy ? "Uploading…" : label}
      </button>
      {msg && <span style={{ fontSize: 12 }}>{msg}</span>}
    </div>
  );
};

export default UploadButton;
