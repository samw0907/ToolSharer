// src/pages/BorrowerRequestsPage.tsx
import { useEffect, useState } from "react";
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
  status: "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED";
  created_at: string;
  updated_at: string;
  tool?: ToolMini | null;
}

interface BorrowerRequestsPageProps {
  borrowerId: number;
}

export default function BorrowerRequestsPage({ borrowerId, }: BorrowerRequestsPageProps) {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
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

    fetchRequests();
  }, [borrowerId]);

  async function cancelRequest(requestId: number) {
    try {
      setUpdatingId(requestId);
      const updated = await apiPatch<BorrowRequest>(
        `/borrow_requests/${requestId}/cancel`
      );
      setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      console.error(err);
      setError("Failed to cancel request.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>My Borrow Requests</h2>
        <p>Loading your requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>My Borrow Requests</h2>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>My Borrow Requests</h2>
        <p>You have not made any borrow requests yet.</p>
      </div>
    );
  }

   return (
    <div style={{ padding: "2rem" }}>
      <h2>My Borrow Requests</h2>

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
              Tool
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Message
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Status
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const toolLabel = r.tool?.name ?? `Tool #${r.tool_id}`;

            return (
              <tr key={r.id}>
                <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                  {toolLabel}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                  {r.message || (
                    <span style={{ fontStyle: "italic", color: "#666" }}>
                      No message
                    </span>
                  )}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                  {r.status}
                </td>
                <td style={{ borderBottom: "1px solid #eee", padding: "0.5rem" }}>
                  {r.status === "PENDING" ? (
                    <button
                      type="button"
                      onClick={() => cancelRequest(r.id)}
                      disabled={updatingId === r.id}
                    >
                      {updatingId === r.id ? "Cancelling..." : "Cancel"}
                    </button>
                    ) : (
                    <span style={{ color: "#666" }}>—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}