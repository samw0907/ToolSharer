// frontend/src/App.tsx
import React, { useState } from "react";
import UploadButton from "./components/UploadButton";

function App() {
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  return (
    <div style={{ padding: 24, maxWidth: 720, margin: "0 auto", lineHeight: 1.5 }}>
      <h1 style={{ marginBottom: 8 }}>ToolSharer — S3 Upload Test</h1>
      <p style={{ marginBottom: 16 }}>
        Click the button to upload a file directly to S3 via a presigned URL.
      </p>

      <UploadButton
        label="Upload to S3"
        accept="image/*,application/pdf"
        maxBytes={20 * 1024 * 1024} // 20 MB client-side guard
        onUploaded={({ s3Url }) => setLastUrl(s3Url)}
      />

      {lastUrl && (
        <div style={{ marginTop: 16 }}>
          <div>Last uploaded object URL:</div>
          <code style={{ display: "block", marginTop: 4, wordBreak: "break-all" }}>
            {lastUrl}
          </code>
        </div>
      )}
    </div>
  );
}

export default App;
