// src/pages/BorrowerRequestsPage.tsx
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";

interface BorrowRequest {
  id: number;
  tool_id: number;
  borrower_id: number;
  message: string | null;
  status: "PENDING" | "APPROVED" | "DECLINED" | "CANCELLED";
  created_at: string;
  updated_at: string;
}

const TEST_BORROWER_ID = 2;

export default function BorrowerRequestsPage() {
  const [requests, setRequests] = useState<BorrowRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequests() {
      try {
        setLoading(true);
        const data = await apiGet<BorrowRequest[]>(
          `/borrow_requests/borrower/${TEST_BORROWER_ID}`
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
  }, []);

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
              ID
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Tool ID
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Message
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Status
            </th>
            <th style={{ borderBottom: "1px solid #ddd", padding: "0.5rem" }}>
              Created At
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => (
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
                }}
              >
                {new Date(r.created_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
