// src/pages/OwnerRequestsPage.tsx
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../lib/api";

interface ToolMini {
  id: number;
  name: string;
}

interface UserMini {
  id: number;
  email: string;
  full_name: string | null;
}

interface BorrowRequest {
  id: number;
  tool_id: number;
  borrower_id: number;
  message: string | null;
  status: "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED" | "RETURNED";
  created_at: string;
  updated_at: string;

  // CHANGE: dates (returned as YYYY-MM-DD or null)
  start_date?: string | null;
  due_date?: string | null;

  tool?: ToolMini | null;
  borrower?: UserMini | null;
}

interface OwnerRequestsPageProps {
  ownerId: number;
  onRequestsChanged?: () => void;
}

// CHANGE: format helper
function formatDate(value?: string | null): string {
  if (!value) return "—";
  return value;
}

export default function OwnerRequestsPage({
  ownerId,
  onRequestsChanged,
}: OwnerRequestsPageProps) {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function fetchRequests() {
    try {
      setLoading(true);
      const data = await apiGet<BorrowRequest[]>(`/borrow_requests/owner/${ownerId}`);
      setRequests(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load incoming borrow requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, [ownerId]);

  async function updateStatus(requestId: number, action: "approve" | "decline") {
    try {
      setUpdatingId(requestId);
      setError(null);

      const updated = await apiPatch<BorrowRequest>(`/borrow_requests/${requestId}/${action}`);

      if (action === "approve") {
        await fetchRequests();
        if (onRequestsChanged) onRequestsChanged();
        return;
      }

      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

      if (onRequestsChanged) onRequestsChanged();
    } catch (err) {
      console.error(err);
      setError("Failed to update request status.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function returnTool(requestId: number) {
    try {
      setUpdatingId(requestId);
      setError(null);

      await apiPatch<BorrowRequest>(`/borrow_requests/${requestId}/return`);
      await fetchRequests();

      if (onRequestsChanged) onRequestsChanged();
    } catch (err) {
      console.error(err);
      setError("Failed to return tool.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Incoming Borrow Requests</h2>
        <p>Loading incoming requests...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Incoming Borrow Requests</h2>

      {error && (
        <div
          style={{
            marginTop: "0.75rem",
            marginBottom: "0.75rem",
            padding: "0.75rem",
            border: "1px solid #d32f2f",
            borderRadius: "4px",
            backgroundColor: "transparent", // CHANGE: dark-theme friendly
            color: "#ff6b6b", // CHANGE: dark-theme friendly
          }}
        >
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <p>No incoming requests for your tools yet.</p>
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
              <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>
                Tool
              </th>
              <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>
                Borrower
              </th>

              {/* CHANGE: Start + Due columns */}
              <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>
                Start
              </th>
              <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>
                Due
              </th>

              <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>
                Message
              </th>
              <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>
                Status
              </th>
              <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {requests.map((r) => {
              const isPending = r.status === "PENDING";
              const isApproved = r.status === "APPROVED";
              const isUpdatingRow = updatingId === r.id;
              const disableActions = updatingId !== null;

              const toolLabel = r.tool?.name ?? `Tool #${r.tool_id}`;
              const borrowerLabel = r.borrower?.email ?? `User #${r.borrower_id}`;

              return (
                <tr key={r.id}>
                  <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                    {toolLabel}
                  </td>
                  <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                    {borrowerLabel}
                  </td>

                  {/* CHANGE: show dates */}
                  <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                    {formatDate(r.start_date)}
                  </td>
                  <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                    {formatDate(r.due_date)}
                  </td>

                  <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                    {r.message || (
                      <span style={{ fontStyle: "italic", color: "#aaa" }}>
                        No message
                      </span>
                    )}
                  </td>
                  <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                    {r.status}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #333",
                      padding: "0.5rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => updateStatus(r.id, "approve")}
                      disabled={!isPending || disableActions}
                      style={{ marginRight: "0.5rem" }}
                    >
                      {isUpdatingRow ? "Working..." : "Approve"}
                    </button>

                    <button
                      type="button"
                      onClick={() => updateStatus(r.id, "decline")}
                      disabled={!isPending || disableActions}
                      style={{ marginRight: "0.5rem" }}
                    >
                      {isUpdatingRow ? "Working..." : "Decline"}
                    </button>

                    <button
                      type="button"
                      onClick={() => returnTool(r.id)}
                      disabled={!isApproved || disableActions}
                    >
                      {isUpdatingRow ? "Working..." : "Return"}
                    </button>
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
