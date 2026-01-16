// src/pages/OwnerRequestsPage.tsx
import { useEffect, useMemo, useState } from "react";
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

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return value;
}

function renderDueStatus(r: BorrowRequest) {
  if (r.status !== "APPROVED" || !r.due_date) {
    return <span style={{ color: "#777" }}>—</span>;
  }

  const isOverdue = Boolean(r.is_overdue);
  const daysOverdue = r.days_overdue ?? 0;
  const daysUntilDue = r.days_until_due ?? 0;

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

interface OwnerRequestsPageProps {
  ownerId: number;
  onRequestsChanged?: () => void;
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

  const grouped = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING");
    const active = requests.filter((r) => r.status === "APPROVED");
    const history = requests.filter(
      (r) => r.status === "DECLINED" || r.status === "CANCELLED" || r.status === "RETURNED"
    );

    return { pending, active, history };
  }, [requests]);

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

  function RequestsTable({
    rows,
    mode,
  }: {
    rows: BorrowRequest[];
    mode: "pending" | "active" | "history";
  }) {
    if (rows.length === 0) {
      return <p style={{ color: "#aaa" }}>None.</p>;
    }

    const showPendingActions = mode === "pending";
    const showReturnAction = mode === "active";

    return (
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginTop: "0.75rem",
          textAlign: "left",
        }}
      >
        <thead>
          <tr>
            <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>Tool</th>
            <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>Borrower</th>
            <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>Start</th>
            <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>Due</th>
            <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>Due status</th>
            <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>Status</th>
            <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((r) => {
            const isPending = r.status === "PENDING";
            const isApproved = r.status === "APPROVED";
            const isUpdatingRow = updatingId === r.id;
            const disableActions = updatingId !== null;

            const toolLabel = r.tool?.name ?? `Tool #${r.tool_id}`;
            const borrowerLabel = r.borrower?.email ?? `User #${r.borrower_id}`;

            return (
              <tr key={r.id}>
                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  <div style={{ fontWeight: 600 }}>{toolLabel}</div>

                  <div style={{ color: "#aaa", marginTop: "0.25rem" }}>
                    {r.message || <span style={{ fontStyle: "italic" }}>No message</span>}
                  </div>
                </td>

                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  {borrowerLabel}
                </td>

                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  {formatDate(r.start_date)}
                </td>

                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  {formatDate(r.due_date)}
                </td>

                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  {renderDueStatus(r)}
                </td>

                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>{r.status}</td>

                <td
                  style={{
                    borderBottom: "1px solid #333",
                    padding: "0.5rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {showPendingActions ? (
                    <>
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
                      >
                        {isUpdatingRow ? "Working..." : "Decline"}
                      </button>
                    </>
                  ) : showReturnAction ? (
                    <button
                      type="button"
                      onClick={() => returnTool(r.id)}
                      disabled={!isApproved || disableActions}
                    >
                      {isUpdatingRow ? "Working..." : "Return"}
                    </button>
                  ) : (
                    <span style={{ color: "#777" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
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
            backgroundColor: "transparent",
            color: "#ff6b6b",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          border: "1px solid #444",
          borderRadius: "6px",
          padding: "1rem",
          marginTop: "1rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Pending Requests</h3>
        <RequestsTable rows={grouped.pending} mode="pending" />
      </div>

      <div
        style={{
          border: "1px solid #444",
          borderRadius: "6px",
          padding: "1rem",
          marginTop: "1rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Active Borrows</h3>
        <RequestsTable rows={grouped.active} mode="active" />
      </div>

      <div
        style={{
          border: "1px solid #444",
          borderRadius: "6px",
          padding: "1rem",
          marginTop: "1rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>History</h3>
        <RequestsTable rows={grouped.history} mode="history" />
      </div>
    </div>
  );
}
