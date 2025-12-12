// src/pages/OwnerRequestsPage.tsx
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "../lib/api";

interface BorrowRequest {
  id: number;
  tool_id: number;
  borrower_id: number;
  message: string | null;
  status: "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED";
  created_at: string;
  updated_at: string;
}

interface OwnerRequestsPageProps {
  ownerId: number;
}

export default function OwnerRequestsPage({ ownerId }: OwnerRequestsPageProps) {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    async function fetchRequests() {
      try {
        setLoading(true);
        const data = await apiGet<BorrowRequest[]>(
          `/borrow_requests/owner/${ownerId}`
        );
        setRequests(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Failed to load incoming borrow requests.");
      } finally {
        setLoading(false);
      }
    }

    fetchRequests();
  }, []);

  async function updateStatus(
    requestId: number,
    action: "approve" | "decline"
  ) {
    try {
      setUpdatingId(requestId);
      const updated = await apiPatch<BorrowRequest>(
        `/borrow_requests/${requestId}/${action}`
      );
      setRequests((prev) =>
        prev.map((r) => (r.id === updated.id ? updated : r))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to update request status.");
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

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Incoming Borrow Requests</h2>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Incoming Borrow Requests</h2>
        <p>No incoming requests for your tools yet.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Incoming Borrow Requests</h2>

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
              ID
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Tool ID
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Borrower ID
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
            const isPending = r.status === "PENDING";
            const isUpdating = updatingId === r.id;

            return (
              <tr key={r.id}>
                <td
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "0.5rem",
                  }}
                >
                  {r.id}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "0.5rem",
                  }}
                >
                  {r.tool_id}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "0.5rem",
                  }}
                >
                  {r.borrower_id}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "0.5rem",
                  }}
                >
                  {r.message || (
                    <span style={{ fontStyle: "italic", color: "#666" }}>
                      No message
                    </span>
                  )}
                </td>
                <td
                  style={{
                    borderBottom: "1px solid #eee",
                    padding: "0.5rem",
                  }}
                >
                  {r.status}
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
                    disabled={!isPending || isUpdating}
                    style={{ marginRight: "0.5rem" }}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(r.id, "decline")}
                    disabled={!isPending || isUpdating}
                  >
                    Decline
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
