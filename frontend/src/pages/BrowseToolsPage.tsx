// src/pages/BrowseToolsPage.tsx
import { useEffect, useState } from "react";
import { apiGet } from "../lib/api";
import CreateBorrowRequestForm from "../components/CreateBorrowRequestForm";
import ToolsMap from "../components/ToolsMap";

interface Tool {
  id: number;
  name: string;
  description: string;
  location: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  owner_id: number;
  is_available: boolean;
  has_pending_request?: boolean;
  is_borrowing?: boolean;
  owner_email?: string;
  owner_name?: string;
  pending_request_count?: number;
  my_pending_request_message?: string;
  distance_km?: number;
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

  // "Tools near me" state
  const [nearbyMode, setNearbyMode] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locatingUser, setLocatingUser] = useState(false);

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

  function loadNearbyTools(lat: number, lng: number, radius: number) {
    setLoading(true);
    apiGet<Tool[]>(`/geo/tools/near?lat=${lat}&lng=${lng}&radius_km=${radius}`)
      .then((data) => {
        setTools(data);
        setError(null);
      })
      .catch((err: unknown) => {
        console.error(err);
        setError("Failed to load nearby tools.");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  function getUserLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    setLocatingUser(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLat(latitude);
        setUserLng(longitude);
        setLocatingUser(false);
        setNearbyMode(true);
        loadNearbyTools(latitude, longitude, radiusKm);
      },
      (err) => {
        setLocatingUser(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setLocationError("Location access denied. Please enable location permissions.");
            break;
          case err.POSITION_UNAVAILABLE:
            setLocationError("Location information unavailable.");
            break;
          case err.TIMEOUT:
            setLocationError("Location request timed out.");
            break;
          default:
            setLocationError("An unknown error occurred getting location.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  }

  function handleNearbyToggle() {
    if (nearbyMode) {
      // Turn off nearby mode, reload all tools
      setNearbyMode(false);
      loadTools();
    } else {
      // Turn on nearby mode
      if (userLat !== null && userLng !== null) {
        // Already have location, just switch mode
        setNearbyMode(true);
        loadNearbyTools(userLat, userLng, radiusKm);
      } else {
        // Need to get location first
        getUserLocation();
      }
    }
  }

  function handleRadiusChange(newRadius: number) {
    setRadiusKm(newRadius);
    if (nearbyMode && userLat !== null && userLng !== null) {
      loadNearbyTools(userLat, userLng, newRadius);
    }
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

      <div style={{ marginBottom: "1rem", display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
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

      {/* Tools near me controls */}
      <div
        style={{
          marginBottom: "1rem",
          padding: "1rem",
          backgroundColor: "#1a1a1a",
          borderRadius: "8px",
          border: "1px solid #333",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleNearbyToggle}
            disabled={locatingUser}
            style={{
              backgroundColor: nearbyMode ? "#4caf50" : "#333",
              color: "#fff",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              cursor: locatingUser ? "wait" : "pointer",
            }}
          >
            {locatingUser ? "Getting location..." : nearbyMode ? "Nearby mode ON" : "Tools near me"}
          </button>

          {nearbyMode && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <label htmlFor="radius-select">Radius:</label>
              <select
                id="radius-select"
                value={radiusKm}
                onChange={(e) => handleRadiusChange(Number(e.target.value))}
                style={{
                  padding: "0.4rem",
                  borderRadius: "4px",
                  border: "1px solid #555",
                  backgroundColor: "#111",
                  color: "#fff",
                }}
              >
                <option value={5}>5 km</option>
                <option value={10}>10 km</option>
                <option value={25}>25 km</option>
                <option value={50}>50 km</option>
                <option value={100}>100 km</option>
              </select>
            </div>
          )}

          {nearbyMode && userLat !== null && userLng !== null && (
            <span style={{ color: "#aaa", fontSize: "0.9em" }}>
              Your location: {userLat.toFixed(4)}, {userLng.toFixed(4)}
            </span>
          )}
        </div>

        {locationError && (
          <p style={{ color: "#f44336", marginTop: "0.5rem", marginBottom: 0 }}>
            {locationError}
          </p>
        )}
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

      {/* Map showing tool locations - always show map even with no tools */}
      {!loading && !error && (
        <ToolsMap
          tools={filteredTools}
          height="350px"
          userLat={userLat}
          userLng={userLng}
          radiusKm={nearbyMode ? radiusKm : undefined}
        />
      )}

      {loading && <p>Loading tools...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && !error && filteredTools.length === 0 && (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            backgroundColor: "#1a1a1a",
            borderRadius: "8px",
            border: "1px dashed #444",
          }}
        >
          {tools.length === 0 ? (
            <>
              <p style={{ fontSize: "1.1em", marginBottom: "0.5rem" }}>
                No tools available yet.
              </p>
              <p style={{ color: "#aaa", marginBottom: "1rem" }}>
                Be the first to share a tool with the community!
              </p>
              <button
                type="button"
                onClick={() => {
                  // Navigate to My Lending page where tools can be added
                  window.dispatchEvent(new CustomEvent("navigate", { detail: "lending" }));
                }}
              >
                Go to My Lending to add a tool
              </button>
            </>
          ) : (
            <>
              <p style={{ fontSize: "1.1em", marginBottom: "0.5rem" }}>
                No tools match your filters.
              </p>
              <p style={{ color: "#aaa" }}>
                Try adjusting your search or filter settings.
              </p>
            </>
          )}
        </div>
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
                  {t.distance_km !== undefined && (
                    <span style={{ marginLeft: "0.5rem", color: "#4caf50" }}>
                      | {t.distance_km} km away
                    </span>
                  )}
                  {t.pending_request_count !== undefined && t.pending_request_count > 0 && (
                    <span style={{ marginLeft: "0.5rem", color: "#ff9800" }}>
                      | {t.pending_request_count} pending request{t.pending_request_count > 1 ? "s" : ""}
                    </span>
                  )}
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

                {hasPending && t.my_pending_request_message && (
                  <div
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.5rem",
                      backgroundColor: "#2a2a2a",
                      borderRadius: "4px",
                      borderLeft: "3px solid #ff9800",
                      fontSize: "0.9em",
                    }}
                  >
                    <span style={{ color: "#aaa" }}>Your message: </span>
                    <span style={{ fontStyle: "italic" }}>"{t.my_pending_request_message}"</span>
                  </div>
                )}

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
