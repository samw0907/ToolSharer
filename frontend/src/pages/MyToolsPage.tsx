// src/pages/MyToolsPage.tsx
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../lib/api";

interface Tool {
  id: number;
  name: string;
  description: string;
  location: string;
  owner_id: number;
  is_available: boolean;
}

interface MyToolsPageProps {
  ownerId: number;
}

export default function MyToolsPage({ ownerId }: MyToolsPageProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function fetchMyTools() {
    try {
      setLoading(true);
      const data = await apiGet<Tool[]>(`/tools/owner/${ownerId}`);
      setTools(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load your tools.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMyTools();
  }, [ownerId]);

  async function toggleAvailability(toolId: number) {
    try {
      setUpdatingId(toolId);
      const updated = await apiPatch<Tool>(`/tools/${toolId}/availability`);
      setTools((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      console.error(err);
      setError("Failed to update tool availability.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>My Tools</h2>
        <p>Loading your tools...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>My Tools</h2>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>My Tools</h2>
        <p>You don’t own any tools yet.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>My Tools</h2>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "1rem",
          textAlign: "left",
        }}
      >
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Name
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Location
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Status
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {tools.map((t) => {
            const isUpdating = updatingId === t.id;

            return (
              <tr key={t.id}>
                <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                  <strong>{t.name}</strong>
                  <div style={{ color: "#aaa" }}>{t.description}</div>
                </td>

                <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                  {t.location}
                </td>

                <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                  {t.is_available ? "Available" : "Not available"}
                </td>

                <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => toggleAvailability(t.id)}
                    disabled={isUpdating}
                  >
                    {isUpdating
                      ? "Updating..."
                      : t.is_available
                      ? "Mark unavailable"
                      : "Mark available"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
