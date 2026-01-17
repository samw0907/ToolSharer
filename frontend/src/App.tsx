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

function App() {
  const [view, setView] = useState<View>("browse");
  const [currentUserId, setCurrentUserId] = useState<number>(1);
  const [users, setUsers] = useState<User[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState<number>(0);

  function notifyDataChanged() {
    setReloadToken((prev) => prev + 1);
  }

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
                }}
              >
                My Lending
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
                }}
              >
                My Borrowing
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