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
  status: "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED" | "RETURN_PENDING" | "RETURNED";
  created_at: string;
  updated_at: string;
  tool?: ToolMini | null;
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
  if ((r.status !== "APPROVED" && r.status !== "RETURN_PENDING") || !r.due_date) {
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

interface MyBorrowingPageProps {
  borrowerId: number;
  onRequestsChanged?: () => void;
}

export default function MyBorrowingPage({
  borrowerId,
  onRequestsChanged,
}: MyBorrowingPageProps) {
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

  async function initiateReturn(requestId: number) {
    const ok = window.confirm("Mark this tool as returned? The owner will need to confirm.");
    if (!ok) return;

    try {
      setUpdatingId(requestId);
      setError(null);
      await apiPatch<BorrowRequest>(`/borrow_requests/${requestId}/initiate-return`);
      await fetchRequests();
      if (onRequestsChanged) onRequestsChanged();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to initiate return.");
    } finally {
      setUpdatingId(null);
    }
  }

  const grouped = useMemo(() => {
    const borrowing = requests.filter((r) => r.status === "APPROVED");
    const pending = requests.filter((r) => r.status === "PENDING");
    const returnPending = requests.filter((r) => r.status === "RETURN_PENDING");
    const history = requests.filter(
      (r) =>
        r.status === "DECLINED" ||
        r.status === "CANCELLED" ||
        r.status === "RETURNED"
    );

    return { borrowing, pending, returnPending, history };
  }, [requests]);

  function RequestsTable({
    rows,
    showCancelAction,
    showReturnAction,
  }: {
    rows: BorrowRequest[];
    showCancelAction: boolean;
    showReturnAction: boolean;
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
              Due Status
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
            const isUpdating = updatingId === r.id;

            return (
              <tr key={r.id}>
                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  <div style={{ fontWeight: 600 }}>{toolLabel}</div>
                  <div style={{ color: "#aaa", marginTop: "0.25rem" }}>
                    {r.message || (
                      <span style={{ fontStyle: "italic" }}>No message</span>
                    )}
                  </div>
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

                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  {r.status}
                </td>

                <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                  {showCancelAction && (
                    <button
                      type="button"
                      onClick={() => cancelRequest(r.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? "Cancelling..." : "Cancel"}
                    </button>
                  )}
                  {showReturnAction && (
                    <button
                      type="button"
                      onClick={() => initiateReturn(r.id)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? "Returning..." : "I Returned This"}
                    </button>
                  )}
                  {!showCancelAction && !showReturnAction && (
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
        <h2>My Borrowing</h2>
        <p>Loading your requests...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>My Borrowing</h2>

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
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            backgroundColor: "#1a1a1a",
            borderRadius: "8px",
            border: "1px dashed #444",
            marginTop: "1rem",
          }}
        >
          <p style={{ fontSize: "1.1em", marginBottom: "0.5rem" }}>
            You haven't borrowed any tools yet.
          </p>
          <p style={{ color: "#aaa" }}>
            Head over to Browse Tools to find something you need!
          </p>
        </div>
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
            <RequestsTable
              rows={grouped.borrowing}
              showCancelAction={false}
              showReturnAction={true}
            />
          </div>

          <div
            style={{
              border: "1px solid #444",
              borderRadius: "6px",
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Return Pending Owner Confirmation</h3>
            <RequestsTable
              rows={grouped.returnPending}
              showCancelAction={false}
              showReturnAction={false}
            />
            {grouped.returnPending.length > 0 && (
              <p style={{ color: "#aaa", marginTop: "0.75rem", fontSize: "0.9rem" }}>
                The owner will confirm they received the tool back.
              </p>
            )}
          </div>

          <div
            style={{
              border: "1px solid #444",
              borderRadius: "6px",
              padding: "1rem",
              marginTop: "1rem",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Pending Approval</h3>
            <RequestsTable
              rows={grouped.pending}
              showCancelAction={true}
              showReturnAction={false}
            />
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
            <RequestsTable
              rows={grouped.history}
              showCancelAction={false}
              showReturnAction={false}
            />
          </div>
        </>
      )}
    </div>
  );
}
