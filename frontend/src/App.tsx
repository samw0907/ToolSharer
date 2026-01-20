// src/App.tsx
import { useEffect, useState } from "react";
import BrowseToolsPage from "./pages/BrowseToolsPage";
import MyLendingPage from "./pages/MyLendingPage";
import MyBorrowingPage from "./pages/MyBorrowingPage";
import LoginPage from "./pages/LoginPage";
import { useAuth } from "./context/AuthContext";
import { apiGet } from "./lib/api";

type View = "browse" | "lending" | "borrowing";

interface BorrowRequestForCount {
  id: number;
  status: string;
  due_date: string | null;
  is_overdue?: boolean;
}

function App() {
  const { user, isLoading, logout } = useAuth();
  const [view, setView] = useState<View>("browse");
  const [reloadToken, setReloadToken] = useState<number>(0);
  const [lendingCount, setLendingCount] = useState<number>(0);
  const [borrowingCount, setBorrowingCount] = useState<number>(0);

  function notifyDataChanged() {
    setReloadToken((prev) => prev + 1);
  }

  // Fetch notification counts
  useEffect(() => {
    if (!user) return;

    // Fetch owner's incoming requests (for lending count)
    apiGet<BorrowRequestForCount[]>(`/borrow_requests/owner/${user.id}`)
      .then((data) => {
        // Count PENDING (need approval) + RETURN_PENDING (need confirmation)
        const actionNeeded = data.filter(
          (r) => r.status === "PENDING" || r.status === "RETURN_PENDING"
        ).length;
        setLendingCount(actionNeeded);
      })
      .catch((err) => {
        console.error("Failed to fetch lending counts:", err);
        setLendingCount(0);
      });

    // Fetch borrower's requests (for borrowing count)
    apiGet<BorrowRequestForCount[]>(`/borrow_requests/borrower/${user.id}`)
      .then((data) => {
        // Count overdue items + RETURN_PENDING (waiting for owner)
        const actionNeeded = data.filter(
          (r) =>
            r.is_overdue ||
            r.status === "RETURN_PENDING"
        ).length;
        setBorrowingCount(actionNeeded);
      })
      .catch((err) => {
        console.error("Failed to fetch borrowing counts:", err);
        setBorrowingCount(0);
      });
  }, [user, reloadToken]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading...
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  return (
    <div>
      <header
        style={{
          padding: "1rem 2rem",
          borderBottom: "1px solid #ddd",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ marginBottom: "0.5rem" }}>ToolSharer</h1>

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setView("browse")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  border: view === "browse" ? "2px solid #000" : "1px solid #ccc",
                  backgroundColor: view === "browse" ? "#f0f0f0" : "#ffffff",
                  color: "#000",
                }}
              >
                Browse Tools
              </button>

              <button
                type="button"
                onClick={() => setView("lending")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  border:
                    view === "lending" ? "2px solid #000" : "1px solid #ccc",
                  backgroundColor: view === "lending" ? "#f0f0f0" : "#ffffff",
                  color: "#000",
                  position: "relative",
                }}
              >
                My Lending
                {lendingCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-8px",
                      right: "-8px",
                      backgroundColor: "#e53935",
                      color: "#fff",
                      borderRadius: "50%",
                      minWidth: "20px",
                      height: "20px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                    }}
                  >
                    {lendingCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setView("borrowing")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  border:
                    view === "borrowing" ? "2px solid #000" : "1px solid #ccc",
                  backgroundColor: view === "borrowing" ? "#f0f0f0" : "#ffffff",
                  color: "#000",
                  position: "relative",
                }}
              >
                My Borrowing
                {borrowingCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-8px",
                      right: "-8px",
                      backgroundColor: "#ff9800",
                      color: "#fff",
                      borderRadius: "50%",
                      minWidth: "20px",
                      height: "20px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                    }}
                  >
                    {borrowingCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "#fff" }}>
              {user.full_name || user.email}
            </span>
            <button
              type="button"
              onClick={logout}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
                backgroundColor: "#fff",
                color: "#333",
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {view === "browse" && <BrowseToolsPage currentUserId={user.id} reloadToken={reloadToken} />}
      {view === "lending" && <MyLendingPage ownerId={user.id} onRequestsChanged={notifyDataChanged} />}
      {view === "borrowing" && <MyBorrowingPage borrowerId={user.id} onRequestsChanged={notifyDataChanged} />}
    </div>
  );
}

export default App;