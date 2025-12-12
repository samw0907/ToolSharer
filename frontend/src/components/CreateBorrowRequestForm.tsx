// src/components/CreateBorrowRequestForm.tsx
import { FormEvent, useState } from "react";
import { apiPost } from "../lib/api";

interface BorrowRequest {
  id: number;
  tool_id: number;
  borrower_id: number;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface CreateBorrowRequestFormProps {
  toolId: number;
  borrowerId: number;
  onCreated: (request: BorrowRequest) => void;
  onCancel?: () => void;
}

export default function CreateBorrowRequestForm({
  toolId,
  borrowerId,
  onCreated,
  onCancel,
}: CreateBorrowRequestFormProps) {
  const [message, setMessage] = useState("Could I borrow this tool, please?");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        tool_id: toolId,
        borrower_id: borrowerId,
        message,
      };

      const created = await apiPost<BorrowRequest>("/borrow_requests", payload);
      onCreated(created);
    } catch (err) {
      console.error(err);
      setError("Failed to create borrow request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: "0.5rem",
        padding: "0.75rem",
        border: "1px solid #ddd",
        borderRadius: "4px",
        backgroundColor: "#fafafa",
      }}
    >
      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Message
          <br />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            style={{ width: "100%" }}
          />
        </label>
      </div>

      {error && (
        <p style={{ color: "red", marginBottom: "0.5rem" }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send Request"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
