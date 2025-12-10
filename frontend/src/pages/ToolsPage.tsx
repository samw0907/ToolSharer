import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

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

  useEffect(() => {
    apiGet<Tool[]>("/tools")
      .then((data) => setTools(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading tools...</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Available Tools</h1>
      {tools.length === 0 && <p>No tools found.</p>}
      <ul>
        {tools.map((t) => (
          <li key={t.id}>
            <strong>{t.name}</strong> — {t.description}  
            <br />
            <em>{t.location}</em>
          </li>
        ))}
      </ul>
    </div>
  );
}
