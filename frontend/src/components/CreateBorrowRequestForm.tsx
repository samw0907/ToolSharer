import { FormEvent, useMemo, useState } from "react";
import { apiPost } from "../lib/api";

interface BorrowRequest {
  id: number;
  tool_id: number;
  borrower_id: number;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
  start_date?: string | null;
  due_date?: string | null;
}

interface CreateBorrowRequestFormProps {
  toolId: number;
  borrowerId: number;
  onCreated: (request: BorrowRequest) => void;
  onCancel?: () => void;
}

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
  const defaults = useMemo(() => {
    const start = new Date();
    const due = new Date();
    due.setDate(due.getDate() + 7);

    return {
      start: toDateInputValue(start),
      due: toDateInputValue(due),
    };
  }, []);

  const [startDate, setStartDate] = useState<string>(defaults.start);
  const [dueDate, setDueDate] = useState<string>(defaults.due);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // client-side validation
    if (dueDate < startDate) {
      setSubmitting(false);
      setError("Due date cannot be before start date.");
      return;
    }

    try {
      const payload = {
        tool_id: toolId,
        borrower_id: borrowerId,
        message,
        start_date: startDate,
        due_date: dueDate,
      };

      const created = await apiPost<BorrowRequest>("/borrow_requests", payload);
      onCreated(created);
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create borrow request.");
      }
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
        border: "1px solid #444",
        borderRadius: "6px",
        backgroundColor: "#1a1a1a",
        color: "#fff",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        <label style={{ color: "#fff" }}>
          Start date
          <br />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: "0.25rem",
              padding: "0.4rem 0.5rem",
              borderRadius: "4px",
              border: "1px solid #555",
              backgroundColor: "#111",
              color: "#fff",
            }}
          />
        </label>

        <label style={{ color: "#fff" }}>
          Due date
          <br />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
            style={{
              width: "100%",
              marginTop: "0.25rem",
              padding: "0.4rem 0.5rem",
              borderRadius: "4px",
              border: "1px solid #555",
              backgroundColor: "#111",
              color: "#fff",
            }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "0.5rem" }}>
        <label style={{ color: "#fff" }}>
          Message
          <br />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              marginTop: "0.25rem",
              padding: "0.5rem",
              borderRadius: "4px",
              border: "1px solid #555",
              backgroundColor: "#111",
              color: "#fff",
            }}
          />
        </label>
      </div>

      {error && (
        <p style={{ color: "#ff6b6b", marginBottom: "0.5rem" }}>{error}</p>
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
