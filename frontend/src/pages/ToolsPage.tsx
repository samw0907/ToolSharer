// src/pages/ToolsPage.tsx
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import CreateToolForm from "../components/CreateToolForm";
import CreateBorrowRequestForm from "../components/CreateBorrowRequestForm";

interface Tool {
  id: number;
  name: string;
  description: string;
  location: string;
  owner_id: number;
  is_available: boolean;
  has_pending_request?: boolean;
  is_borrowing?: boolean;
}

interface BorrowRequest {
  id: number;
  tool_id: number;
  borrower_id: number;
  message: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ToolsPageProps {
  currentUserId: number;
  reloadToken: number;
}


export default function ToolsPage({ currentUserId, reloadToken }: ToolsPageProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRequestToolId, setActiveRequestToolId] = useState<number | null>(null);
  const [lastRequest, setLastRequest] = useState<BorrowRequest | null>(null);

  function loadTools() {
    setLoading(true);
    apiGet<Tool[]>(`/tools?current_user_id=${currentUserId}`)
      .then((data) => {
        setTools(data);
        setError(null);
      })
      .catch((err: unknown) => {
        console.error(err);
        setError("Failed to load tools.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    loadTools();
  }, [currentUserId, reloadToken]);

  function handleToolCreated(tool: Tool) {
    setTools((prev) => [...prev, tool]);
  }

  function handleBorrowRequestCreated(request: BorrowRequest) {
    console.log("Borrow request received in ToolsPage:", request);
    setLastRequest(request);
    setActiveRequestToolId(null);
    loadTools();
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Available Tools</h1>

      <CreateToolForm onCreated={handleToolCreated} />

      {lastRequest && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            border: "1px solid #4caf50",
            borderRadius: "4px",
            backgroundColor: "#f0fff0",
          }}
        >
          <strong>Borrow request created:</strong> “{lastRequest.message}” for
          tool #{lastRequest.tool_id} (status: {lastRequest.status})
        </div>
      )}

      {loading && <p>Loading tools...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && tools.length === 0 && <p>No tools found.</p>}

      {!loading && !error && tools.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {tools.map((t) => {
            const isOwnTool = t.owner_id === currentUserId;
            const hasPending = Boolean(t.has_pending_request);
            const isBorrowing = Boolean(t.is_borrowing);
            const isFormOpen = activeRequestToolId === t.id;
            const canRequest = t.is_available && !isOwnTool && !hasPending && !isBorrowing;

            let buttonLabel = "Request to borrow";
            if (!t.is_available && isBorrowing) buttonLabel = "You're borrowing this";
            else if (!t.is_available) buttonLabel = "Unavailable";
            else if (isOwnTool) buttonLabel = "Your tool";
            else if (hasPending) buttonLabel = "Request pending";
            else if (isFormOpen) buttonLabel = "Hide request form";

            return (
              <li
                key={t.id}
                style={{
                  marginBottom: "1.5rem",
                  paddingBottom: "1rem",
                  borderBottom: "1px solid #ddd",
                }}
              >
                <strong>{t.name}</strong> — {t.description}
                <br />
                <span>{t.location}</span>
                <br />
                <small>
                  Owner ID: {t.owner_id} | {t.is_available ? "Available" : "Not available"}
                </small>

                <div style={{ marginTop: "0.5rem" }}>
                  <button
                    type="button"
                    disabled={!canRequest}
                    onClick={() => {
                      if (!canRequest) return;
                      setActiveRequestToolId(isFormOpen ? null : t.id);
                    }}
                  >
                    {buttonLabel}
                  </button>
                  
                  {!t.is_available && isBorrowing && (
                    <span style={{ marginLeft: "0.75rem", color: "#555" }}>
                      (See “My Requests” for return status)
                    </span>
                  )}
                </div>

                {canRequest && isFormOpen && (
                  <CreateBorrowRequestForm
                    toolId={t.id}
                    borrowerId={currentUserId}
                    onCreated={handleBorrowRequestCreated}
                    onCancel={() => setActiveRequestToolId(null)}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}