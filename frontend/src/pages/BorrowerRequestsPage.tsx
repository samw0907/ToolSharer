import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch } from "../lib/api";

interface ToolMini {
  id: number;
  name: string;
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

  start_date?: string | null;
  due_date?: string | null;
  is_overdue?: boolean;
  days_overdue?: number;
  days_until_due?: number;
}

interface BorrowerRequestsPageProps {
  borrowerId: number;
  onRequestsChanged?: () => void;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return value;
}

export default function BorrowerRequestsPage({
  borrowerId,
  onRequestsChanged,
}: BorrowerRequestsPageProps) {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  async function fetchRequests() {
    try {
      setLoading(true);
      const data = await apiGet<BorrowRequest[]>(
        `/borrow_requests/borrower/${borrowerId}`
      );
      setRequests(data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load your borrow requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRequests();
  }, [borrowerId]);

  async function cancelRequest(requestId: number) {
    const ok = window.confirm("Cancel this request?");
    if (!ok) return;

    try {
      setUpdatingId(requestId);
      setError(null);

      await apiPatch<BorrowRequest>(`/borrow_requests/${requestId}/cancel`);
      await fetchRequests();

      if (onRequestsChanged) onRequestsChanged();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to cancel request.");
    } finally {
      setUpdatingId(null);
    }
  }

  const grouped = useMemo(() => {
    const borrowing = requests.filter((r) => r.status === "APPROVED");
    const pending = requests.filter((r) => r.status === "PENDING");
    const history = requests.filter(
      (r) =>
        r.status === "DECLINED" ||
        r.status === "CANCELLED" ||
        r.status === "RETURNED"
    );

    return { borrowing, pending, history };
  }, [requests]);

  function RequestsTable({
    rows,
    showActions,
  }: {
    rows: BorrowRequest[];
    showActions: boolean;
  }) {
    if (rows.length === 0) {
      return <p style={{ color: "#aaa" }}>None.</p>;
    }

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
            <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>
              Tool
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
          {rows.map((r) => {
            const toolLabel = r.tool?.name ?? `Tool #${r.tool_id}`;
            const isPending = r.status === "PENDING";
            const isUpdating = updatingId === r.id;

            const dateLabel =
              r.start_date && r.due_date
                ? `${r.start_date} → ${r.due_date}`
                : "—";

            const isOverdue = Boolean(r.is_overdue);
            const daysOverdue = r.days_overdue ?? 0;
            const daysUntilDue = r.days_until_due ?? 0;

            return (
              <tr key={r.id}>
                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  {toolLabel}
                  <div style={{ color: "#aaa", marginTop: "0.25rem" }}>
                    {r.message || (
                      <span style={{ fontStyle: "italic" }}>No message</span>
                    )}
                  </div>
                </td>

                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  {dateLabel}
                  {r.status === "APPROVED" && r.due_date && (
                    <div style={{ marginTop: "0.25rem", color: "#aaa" }}>
                      {isOverdue
                        ? null
                        : daysUntilDue === 0
                        ? "Due today"
                        : `Due in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}`}
                    </div>
                  )}
                </td>

                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  {r.status}{" "}
                  {isOverdue && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        padding: "0.15rem 0.4rem",
                        borderRadius: "4px",
                        border: "1px solid #ff6b6b",
                        color: "#ff6b6b",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                      }}
                      title={`Overdue by ${daysOverdue} day(s)`}
                    >
                      OVERDUE ({daysOverdue})
                    </span>
                  )}
                </td>

                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  {showActions ? (
                    <button
                      type="button"
                      onClick={() => cancelRequest(r.id)}
                      disabled={!isPending || isUpdating}
                    >
                      {isUpdating ? "Cancelling..." : "Cancel"}
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
        <h2>My Requests</h2>
        <p>Loading your requests...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>My Requests</h2>

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

      {requests.length === 0 ? (
        <p>You haven’t made any requests yet.</p>
      ) : (
        <>
          <div
            style={{
              border: "1px solid #444",
              borderRadius: "6px",
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Currently Borrowing</h3>
            <RequestsTable rows={grouped.borrowing} showActions={false} />
            <p style={{ color: "#aaa", marginTop: "0.75rem" }}>
              Returns are confirmed by the tool owner.
            </p>
          </div>

          <div
            style={{
              border: "1px solid #444",
              borderRadius: "6px",
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Pending Requests</h3>
            <RequestsTable rows={grouped.pending} showActions={true} />
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
            <RequestsTable rows={grouped.history} showActions={false} />
          </div>
        </>
      )}
    </div>
  );
}
