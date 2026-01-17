// src/pages/MyToolsPage.tsx
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiDelete } from "../lib/api";

interface Tool {
  id: number;
  name: string;
  description: string;
  location: string;
  owner_id: number;
  is_available: boolean;
  is_borrowed?: boolean;
  borrowed_by_user_id?: number | null;
  borrowed_by_email?: string | null;

  borrowed_start_date?: string | null;
  borrowed_due_date?: string | null;
  borrowed_is_overdue?: boolean;
  borrowed_days_overdue?: number;
  borrowed_days_until_due?: number;
}

interface MyToolsPageProps {
  ownerId: number;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return value;
}

function renderDueStatus(t: Tool) {
  if (!t.is_borrowed || !t.borrowed_due_date) {
    return <span style={{ color: "#777" }}>—</span>;
  }

  const isOverdue = Boolean(t.borrowed_is_overdue);
  const daysOverdue = t.borrowed_days_overdue ?? 0;
  const daysUntilDue = t.borrowed_days_until_due ?? 0;

  if (isOverdue) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "0.15rem 0.4rem",
          borderRadius: "4px",
          border: "1px solid #ff6b6b",
          color: "#ff6b6b",
          fontWeight: 700,
          fontSize: "0.85rem",
        }}
        title={`Overdue by ${daysOverdue} day(s)`}
      >
        OVERDUE ({daysOverdue})
      </span>
    );
  }

  if (daysUntilDue === 0) {
    return <span style={{ color: "#f7cd46" }}>Due today</span>;
  }

  return (
    <span style={{ color: "#aaa" }}>
      Due in {daysUntilDue} day{daysUntilDue === 1 ? "" : "s"}
    </span>
  );
}

export default function MyToolsPage({ ownerId }: MyToolsPageProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function fetchMyTools() {
    try {
      setLoading(true);
      const data = await apiGet<Tool[]>(`/tools/owner/${ownerId}`);
      setTools(data);
      setError(null);
    } catch (err) {
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
      setError(null);
      const updated = await apiPatch<Tool>(`/tools/${toolId}/availability`);
      setTools((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tool availability.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteTool(toolId: number) {
    const ok = window.confirm(
      "Delete this tool? This cannot be undone and may affect existing requests."
    );
    if (!ok) return;

    try {
      setDeletingId(toolId);
      setError(null);

      await apiDelete(`/tools/${toolId}`);

      setTools((prev) => prev.filter((t) => t.id !== toolId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tool.");
    } finally {
      setDeletingId(null);
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

  return (
    <div style={{ padding: "2rem" }}>
      <h2>My Tools</h2>

      {error && (
        <div
          style={{
            marginTop: "0.75rem",
            marginBottom: "0.75rem",
            padding: "0.75rem",
            border: "1px solid #d32f2f",
            borderRadius: "4px",
            backgroundColor: "transparent",
            color: "#ff6b6b",
          }}
        >
          {error}
        </div>
      )}

      {tools.length === 0 ? (
        <p>You don’t own any tools yet.</p>
      ) : (
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
                Borrow Status
              </th>
              <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
                Start
              </th>
              <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
                Due
              </th>
              <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
                Due status
              </th>
              <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {tools.map((t) => {
              const isUpdating = updatingId === t.id;
              const isDeleting = deletingId === t.id;
              const isBorrowed = Boolean(t.is_borrowed);
              const borrowedLabel =
                t.borrowed_by_email ??
                (t.borrowed_by_user_id ? `User #${t.borrowed_by_user_id}` : null);

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
                    {isBorrowed ? (
                      <span>
                        Borrowed{borrowedLabel ? ` by ${borrowedLabel}` : ""}
                      </span>
                    ) : t.is_available ? (
                      "Available"
                    ) : (
                      "Not available"
                    )}
                  </td>

                  <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                    {formatDate(t.borrowed_start_date)}
                  </td>

                  <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                    {formatDate(t.borrowed_due_date)}
                  </td>

                  <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                    {renderDueStatus(t)}
                  </td>

                  <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={() => toggleAvailability(t.id)}
                      disabled={isUpdating || isDeleting || isBorrowed}
                      style={{ marginRight: "0.5rem" }}
                      title={
                        isBorrowed
                          ? "This tool is currently borrowed. Use Owner Requests -> Return to make it available again."
                          : undefined
                      }
                    >
                      {isUpdating
                        ? "Updating..."
                        : t.is_available
                        ? "Mark unavailable"
                        : "Mark available"}
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteTool(t.id)}
                      disabled={isUpdating || isDeleting}
                    >
                      {isDeleting ? "Deleting..." : "Delete"}
                    </button>

                    {isBorrowed && (
                      <div style={{ marginTop: "0.5rem", color: "#777" }}>
                        Return is confirmed in <strong>Owner Requests</strong>.
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

