// src/App.tsx
import { useEffect, useState, ChangeEvent } from "react";
import BrowseToolsPage from "./pages/BrowseToolsPage";
import MyLendingPage from "./pages/MyLendingPage";
import MyBorrowingPage from "./pages/MyBorrowingPage";
import { apiGet } from "./lib/api";

type View = "browse" | "lending" | "borrowing";

interface User {
  id: number;
  email: string;
  full_name: string | null;
}

interface BorrowRequestForCount {
  id: number;
  status: string;
  due_date: string | null;
  is_overdue?: boolean;
}

function App() {
  const [view, setView] = useState<View>("browse");
  const [currentUserId, setCurrentUserId] = useState<number>(1);
  const [users, setUsers] = useState<User[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);
  const [lendingCount, setLendingCount] = useState<number>(0);
  const [borrowingCount, setBorrowingCount] = useState<number>(0);

  function notifyDataChanged() {
    setReloadToken((prev) => prev + 1);
  }

  // Fetch notification counts
  useEffect(() => {
    if (!currentUserId) return;

    // Fetch owner's incoming requests (for lending count)
    apiGet<BorrowRequestForCount[]>(`/borrow_requests/owner/${currentUserId}`)
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
    apiGet<BorrowRequestForCount[]>(`/borrow_requests/borrower/${currentUserId}`)
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
  }, [currentUserId, reloadToken]);

  useEffect(() => {
    apiGet<User[]>("/users")
      .then((data) => {
        setUsers(data);
        setUsersError(null);

        if (data.length > 0) {
          setCurrentUserId((prev) => {
            const exists = data.some((u) => u.id === prev);
            return exists ? prev : data[0].id;
          });
        }
      })
      .catch((err: unknown) => {
        console.error(err);
        setUsersError("Failed to load users.");
      });
  }, []);

  function handleUserSelectChange(e: ChangeEvent<HTMLSelectElement>) {
    const value = Number(e.target.value);
    if (!Number.isNaN(value) && value > 0) {
      setCurrentUserId(value);
      notifyDataChanged();
    }
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
            <label style={{ color: "#fff" }}>
              Current user:{" "}
              <select
                value={currentUserId}
                onChange={handleUserSelectChange}
                style={{ padding: "0.25rem 0.5rem" }}
                disabled={users.length === 0}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} (#{u.id})
                  </option>
                ))}
              </select>
            </label>

            {usersError && <span style={{ color: "red" }}>{usersError}</span>}
          </div>
        </div>
      </header>

      {view === "browse" && <BrowseToolsPage currentUserId={currentUserId} reloadToken={reloadToken} />}
      {view === "lending" && <MyLendingPage ownerId={currentUserId} onRequestsChanged={notifyDataChanged} />}
      {view === "borrowing" && <MyBorrowingPage borrowerId={currentUserId} onRequestsChanged={notifyDataChanged} />}
    </div>
  );
}

export default App;