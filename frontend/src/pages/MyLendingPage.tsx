import { useEffect, useMemo, useState } from "react";
import { apiGet, apiPatch, apiDelete } from "../lib/api";
import CreateToolForm from "../components/CreateToolForm";
import EditToolForm from "../components/EditToolForm";
import { getToolIcon } from "../assets/tool-icons";

interface Tool {
  id: number;
  name: string;
  description: string;
  location: string;
  icon_key?: string | null;
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
  status: "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED" | "RETURN_PENDING" | "RETURNED";
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

interface MyLendingPageProps {
  ownerId: number;
  onRequestsChanged?: () => void;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  return value;
}

function renderDueStatus(
  status: BorrowRequest["status"],
  due_date?: string | null,
  is_overdue?: boolean,
  days_overdue?: number,
  days_until_due?: number
) {
  if ((status !== "APPROVED" && status !== "RETURN_PENDING") || !due_date) {
    return <span style={{ color: "#777" }}>—</span>;
  }

  const overdue = Boolean(is_overdue);
  const daysOver = days_overdue ?? 0;
  const daysUntil = days_until_due ?? 0;

  if (overdue) {
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
        title={`Overdue by ${daysOver} day(s)`}
      >
        OVERDUE ({daysOver})
      </span>
    );
  }

  if (daysUntil === 0) {
    return <span style={{ color: "#f7cd46" }}>Due today</span>;
  }

  return (
    <span style={{ color: "#aaa" }}>
      Due in {daysUntil} day{daysUntil === 1 ? "" : "s"}
    </span>
  );
}

export default function MyLendingPage({ ownerId, onRequestsChanged }: MyLendingPageProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editingToolId, setEditingToolId] = useState<number | null>(null);

  async function fetchData() {
    try {
      setLoading(true);
      const [toolsData, requestsData] = await Promise.all([
        apiGet<Tool[]>(`/tools/owner/${ownerId}`),
        apiGet<BorrowRequest[]>(`/borrow_requests/owner/${ownerId}`),
      ]);
      setTools(toolsData);
      setRequests(requestsData);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
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
    const ok = window.confirm("Delete this tool? This cannot be undone.");
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

  async function approveRequest(requestId: number) {
    try {
      setUpdatingId(requestId);
      setError(null);
      await apiPatch<BorrowRequest>(`/borrow_requests/${requestId}/approve`);
      await fetchData(); // Refresh everything
      if (onRequestsChanged) onRequestsChanged();
    } catch (err) {
      console.error(err);
      setError("Failed to approve request.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function declineRequest(requestId: number) {
    try {
      setUpdatingId(requestId);
      setError(null);
      const updated = await apiPatch<BorrowRequest>(`/borrow_requests/${requestId}/decline`);
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (onRequestsChanged) onRequestsChanged();
    } catch (err) {
      console.error(err);
      setError("Failed to decline request.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmReturn(requestId: number) {
    try {
      setUpdatingId(requestId);
      setError(null);
      await apiPatch<BorrowRequest>(`/borrow_requests/${requestId}/confirm-return`);
      await fetchData(); // Refresh everything
      if (onRequestsChanged) onRequestsChanged();
    } catch (err) {
      console.error(err);
      setError("Failed to confirm return.");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleToolCreated(tool: Tool) {
    setTools((prev) => [...prev, tool]);
  }

  function handleToolUpdated(updated: Tool) {
    setTools((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditingToolId(null);
  }

  const grouped = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING");
    const active = requests.filter((r) => r.status === "APPROVED");
    const returnPending = requests.filter((r) => r.status === "RETURN_PENDING");
    const history = requests.filter(
      (r) => r.status === "DECLINED" || r.status === "CANCELLED" || r.status === "RETURNED"
    );

    return { pending, active, returnPending, history };
  }, [requests]);

  if (loading) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>My Lending</h2>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>My Lending</h2>

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

      {/* My Tools Inventory */}
      <div
        style={{
          border: "1px solid #444",
          borderRadius: "6px",
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>My Tools</h3>

        <CreateToolForm onCreated={handleToolCreated} />

        {tools.length === 0 ? (
          <div
            style={{
              padding: "1.5rem",
              textAlign: "center",
              backgroundColor: "#222",
              borderRadius: "6px",
              border: "1px dashed #444",
              marginTop: "1rem",
            }}
          >
            <p style={{ marginBottom: "0.5rem" }}>You haven't added any tools yet.</p>
            <p style={{ color: "#aaa", fontSize: "0.9em" }}>
              Use the form above to share your first tool with the community!
            </p>
          </div>
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
                <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Name</th>
                <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Location</th>
                <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Status</th>
                <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => {
                const isUpdating = updatingId === t.id;
                const isDeleting = deletingId === t.id;
                const isBorrowed = Boolean(t.is_borrowed);
                const isEditing = editingToolId === t.id;

                const toolIcon = t.icon_key ? getToolIcon(t.icon_key) : null;

                return (
                  <tr key={t.id}>
                    <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                        {toolIcon && (
                          <img
                            src={toolIcon.src}
                            alt={toolIcon.label}
                            style={{
                              width: 36,
                              height: 36,
                              padding: "4px",
                              backgroundColor: "#f5f5f5",
                              borderRadius: "6px",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div>
                          <strong>{t.name}</strong>
                          <div style={{ color: "#aaa", fontSize: "0.9rem" }}>{t.description}</div>
                        </div>
                      </div>
                      {isEditing && (
                        <EditToolForm
                          tool={t}
                          onUpdated={handleToolUpdated}
                          onCancel={() => setEditingToolId(null)}
                        />
                      )}
                    </td>
                    <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                      {t.location}
                    </td>
                    <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                      {isBorrowed ? (
                        <span>
                          Borrowed
                          {t.borrowed_by_email ? ` by ${t.borrowed_by_email}` : ""}
                        </span>
                      ) : t.is_available ? (
                        "Available"
                      ) : (
                        "Not available"
                      )}
                    </td>
                    <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => setEditingToolId(isEditing ? null : t.id)}
                          disabled={isUpdating || isDeleting}
                        >
                          {isEditing ? "Cancel Edit" : "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAvailability(t.id)}
                          disabled={isUpdating || isDeleting || isBorrowed}
                          title={
                            isBorrowed
                              ? "Tool is borrowed. Confirm return first."
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
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pending Requests */}
      <div
        style={{
          border: "1px solid #444",
          borderRadius: "6px",
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Pending Requests (Need Your Approval)</h3>
        {grouped.pending.length === 0 ? (
          <p style={{ color: "#aaa" }}>No pending requests.</p>
        ) : (
          <RequestsTable
            rows={grouped.pending}
            mode="pending"
            updatingId={updatingId}
            onApprove={approveRequest}
            onDecline={declineRequest}
          />
        )}
      </div>

      {/* Return Pending */}
      <div
        style={{
          border: "1px solid #444",
          borderRadius: "6px",
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Returns Pending Confirmation</h3>
        {grouped.returnPending.length === 0 ? (
          <p style={{ color: "#aaa" }}>No returns awaiting confirmation.</p>
        ) : (
          <RequestsTable
            rows={grouped.returnPending}
            mode="return-pending"
            updatingId={updatingId}
            onConfirmReturn={confirmReturn}
          />
        )}
      </div>

      {/* Active Loans */}
      <div
        style={{
          border: "1px solid #444",
          borderRadius: "6px",
          padding: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Active Loans</h3>
        {grouped.active.length === 0 ? (
          <p style={{ color: "#aaa" }}>No active loans.</p>
        ) : (
          <RequestsTable rows={grouped.active} mode="active" updatingId={updatingId} />
        )}
      </div>

      {/* History */}
      <div
        style={{
          border: "1px solid #444",
          borderRadius: "6px",
          padding: "1rem",
        }}
      >
        <h3 style={{ marginTop: 0 }}>History</h3>
        {grouped.history.length === 0 ? (
          <p style={{ color: "#aaa" }}>No history.</p>
        ) : (
          <RequestsTable rows={grouped.history} mode="history" updatingId={updatingId} />
        )}
      </div>
    </div>
  );
}

function RequestsTable({
  rows,
  mode,
  updatingId,
  onApprove,
  onDecline,
  onConfirmReturn,
}: {
  rows: BorrowRequest[];
  mode: "pending" | "active" | "return-pending" | "history";
  updatingId: number | null;
  onApprove?: (id: number) => void;
  onDecline?: (id: number) => void;
  onConfirmReturn?: (id: number) => void;
}) {
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
          <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>Due Status</th>
          <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>Status</th>
          <th style={{ borderBottom: "1px solid #444", padding: "0.5rem" }}>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const isUpdating = updatingId === r.id;
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
                {renderDueStatus(
                  r.status,
                  r.due_date,
                  r.is_overdue,
                  r.days_overdue,
                  r.days_until_due
                )}
              </td>
              <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>{r.status}</td>
              <td style={{ borderBottom: "1px solid #333", padding: "0.5rem" }}>
                {mode === "pending" && onApprove && onDecline && (
                  <>
                    <button
                      type="button"
                      onClick={() => onApprove(r.id)}
                      disabled={disableActions}
                      style={{ marginRight: "0.5rem" }}
                    >
                      {isUpdating ? "Working..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDecline(r.id)}
                      disabled={disableActions}
                    >
                      {isUpdating ? "Working..." : "Decline"}
                    </button>
                  </>
                )}
                {mode === "return-pending" && onConfirmReturn && (
                  <button
                    type="button"
                    onClick={() => onConfirmReturn(r.id)}
                    disabled={disableActions}
                  >
                    {isUpdating ? "Working..." : "Confirm Return"}
                  </button>
                )}
                {(mode === "active" || mode === "history") && (
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
