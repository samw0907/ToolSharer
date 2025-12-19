// src/components/CreateBorrowRequestForm.tsx
import { FormEvent, useMemo, useState } from "react"; // CHANGE: added useMemo
import { apiPost } from "../lib/api";

interface BorrowRequest {
  id: number;
  tool_id: number;
  borrower_id: number;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;

  // CHANGE: dates returned by backend (optional to avoid breaking anything)
  start_date?: string | null;
  due_date?: string | null;
}

interface CreateBorrowRequestFormProps {
  toolId: number;
  borrowerId: number;
  onCreated: (request: BorrowRequest) => void;
  onCancel?: () => void;
}

// CHANGE: helper to format YYYY-MM-DD for <input type="date">
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

  // CHANGE: default dates (today -> today + 7 days)
  const defaults = useMemo(() => {
    const start = new Date();
    const due = new Date();
    due.setDate(due.getDate() + 7);

    return {
      start: toDateInputValue(start),
      due: toDateInputValue(due),
    };
  }, []);

  // CHANGE: state for date fields
  const [startDate, setStartDate] = useState<string>(defaults.start);
  const [dueDate, setDueDate] = useState<string>(defaults.due);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // CHANGE: simple client-side validation
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

        // CHANGE: send dates (backend expects these now)
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
        border: "1px solid #ddd",
        borderRadius: "4px",
        backgroundColor: "#fafafa",
      }}
    >
      {/* CHANGE: start/due date inputs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
          marginBottom: "0.75rem",
        }}
      >
        <label>
          Start date
          <br />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </label>

        <label>
          Due date
          <br />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </label>
      </div>

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
