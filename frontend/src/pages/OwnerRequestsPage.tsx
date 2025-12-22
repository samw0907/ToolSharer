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
  tool?: ToolMini | null;
  borrower?: UserMini | null;

  start_date?: string | null;
  due_date?: string | null;
  is_overdue?: boolean;
  days_overdue?: number;
  days_until_due?: number;
}

interface OwnerRequestsPageProps {
  ownerId: number;
  onRequestsChanged?: () => void;
}

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

              const isOverdue = Boolean(r.is_overdue);
              const daysOverdue = r.days_overdue ?? 0;
              const daysUntilDue = r.days_until_due ?? 0;

              const dateLabel =
                r.start_date && r.due_date ? `${r.start_date} → ${r.due_date}` : "—";

              return (
                <tr key={r.id}>
                  <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                    {toolLabel}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                    {borrowerLabel}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                    {dateLabel}
                    {r.status === "APPROVED" && r.due_date && !isOverdue && (
                      <div style={{ marginTop: "0.25rem", color: "#666" }}>
                        {daysUntilDue === 0
                          ? "Due today"
                          : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`}
                      </div>
                    )}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                    {r.status}{" "}
                    {isOverdue && (
                      <span
                        style={{
                          marginLeft: "0.5rem",
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                          border: "1px solid #d32f2f",
                          color: "#d32f2f",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                        }}
                        title={`Overdue by ${daysOverdue} day(s)`}
                      >
                        OVERDUE ({daysOverdue})
                      </span>
                    )}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
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