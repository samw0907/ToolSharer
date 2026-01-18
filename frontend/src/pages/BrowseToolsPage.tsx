// src/pages/BrowseToolsPage.tsx
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
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
  owner_email?: string;
  owner_name?: string;
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

interface BrowseToolsPageProps {
  currentUserId: number;
  reloadToken: number;
}

export default function BrowseToolsPage({ currentUserId, reloadToken }: BrowseToolsPageProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeRequestToolId, setActiveRequestToolId] = useState<number | null>(null);
  const [lastRequest, setLastRequest] = useState<BorrowRequest | null>(null);
  const [showMyTools, setShowMyTools] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [hideUnavailable, setHideUnavailable] = useState(false);

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

  function handleBorrowRequestCreated(request: BorrowRequest) {
    console.log("Borrow request received in BrowseToolsPage:", request);
    setLastRequest(request);
    setActiveRequestToolId(null);
    loadTools();
  }

  // Apply filters: own tools, search query, availability
  const filteredTools = tools.filter((t) => {
    // Filter out own tools unless toggled
    if (!showMyTools && t.owner_id === currentUserId) return false;

    // Filter out unavailable tools if checkbox is checked
    if (hideUnavailable && !t.is_available) return false;

    // Filter by search query (name or description)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesName = t.name.toLowerCase().includes(query);
      const matchesDescription = t.description?.toLowerCase().includes(query) ?? false;
      if (!matchesName && !matchesDescription) return false;
    }

    return true;
  });

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Browse Tools</h1>

      <div style={{ marginBottom: "1rem" }}>
        <input
          type="text"
          placeholder="Search by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            padding: "0.5rem",
            width: "300px",
            maxWidth: "100%",
            borderRadius: "4px",
            border: "1px solid #555",
            backgroundColor: "#111",
            color: "#fff",
          }}
        />
      </div>

      <div style={{ marginBottom: "1rem", display: "flex", gap: "1.5rem" }}>
        <label>
          <input
            type="checkbox"
            checked={hideUnavailable}
            onChange={(e) => setHideUnavailable(e.target.checked)}
          />
          {" "}Hide unavailable tools
        </label>
        <label>
          <input
            type="checkbox"
            checked={showMyTools}
            onChange={(e) => setShowMyTools(e.target.checked)}
          />
          {" "}Show my own tools
        </label>
      </div>

      {lastRequest && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem",
            border: "1px solid #4caf50",
            borderRadius: "4px",
            backgroundColor: "#f0fff0",
            color: "#1a1a1a",
          }}
        >
          <strong>Borrow request created:</strong> "{lastRequest.message}" for
          tool #{lastRequest.tool_id} (status: {lastRequest.status})
        </div>
      )}

      {loading && <p>Loading tools...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && filteredTools.length === 0 && (
        <p>No tools available to borrow.</p>
      )}

      {!loading && !error && filteredTools.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {filteredTools.map((t) => {
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
                  Owner: {t.owner_name || t.owner_email || `User #${t.owner_id}`} | {t.is_available ? "Available" : "Not available"}
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
                      (See "My Borrowing" for return status)
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
