// src/pages/ToolsPage.tsx
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import CreateToolForm from "../components/CreateToolForm";

interface Tool {
  id: number;
  name: string;
  description: string;
  location: string;
  owner_id: number;
  is_available: boolean;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function loadTools() {
    setLoading(true);
    apiGet<Tool[]>("/tools")
      .then((data) => {
        setTools(data);
        setError(null);
      })
      .catch((err: unknown) => {
        console.error(err);
        setError("Failed to load tools.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadTools();
  }, []);

  function handleToolCreated(tool: Tool) {
    // append newly created tool to the list
    setTools((prev) => [...prev, tool]);
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Available Tools</h1>

      <CreateToolForm onCreated={handleToolCreated} />

      {loading && <p>Loading tools...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && tools.length === 0 && <p>No tools found.</p>}

      {!loading && !error && tools.length > 0 && (
        <ul>
          {tools.map((t) => (
            <li key={t.id} style={{ marginBottom: "1rem" }}>
              <strong>{t.name}</strong> — {t.description}
              <br />
              <span>{t.location}</span>
              <br />
              <small>
                Owner ID: {t.owner_id} |{" "}
                {t.is_available ? "Available" : "Not available"}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}