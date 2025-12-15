// src/App.tsx
import { useEffect, useState, ChangeEvent } from "react";
import ToolsPage from "./pages/ToolsPage";
import OwnerRequestsPage from "./pages/OwnerRequestsPage";
import BorrowerRequestsPage from "./pages/BorrowerRequestsPage";
import MyToolsPage from "./pages/MyToolsPage";
import { apiGet } from "./lib/api";

type View = "tools" | "ownerRequests" | "myRequests" | "myTools";

interface User {
  id: number;
  email: string;
  full_name: string | null;
}

function App() {
  const [view, setView] = useState<View>("tools");
  const [currentUserId, setCurrentUserId] = useState<number>(1);
  const [users, setUsers] = useState<User[]>([]);
  const [usersError, setUsersError] = useState<string | null>(null);

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
                onClick={() => setView("tools")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  border: view === "tools" ? "2px solid #000" : "1px solid #ccc",
                  backgroundColor: view === "tools" ? "#f0f0f0" : "#ffffff",
                  color: "#000",
                }}
              >
                Tools
              </button>

              <button
                type="button"
                onClick={() => setView("ownerRequests")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  border:
                    view === "ownerRequests" ? "2px solid #000" : "1px solid #ccc",
                  backgroundColor: view === "ownerRequests" ? "#f0f0f0" : "#ffffff",
                  color: "#000",
                }}
              >
                Owner Requests
              </button>

              <button
                type="button"
                onClick={() => setView("myRequests")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  border:
                    view === "myRequests" ? "2px solid #000" : "1px solid #ccc",
                  backgroundColor: view === "myRequests" ? "#f0f0f0" : "#ffffff",
                  color: "#000",
                }}
              >
                My Requests
              </button>
              <button
                type="button"
                onClick={() => setView("myTools")}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  border:
                    view === "myTools" ? "2px solid #000" : "1px solid #ccc",
                  backgroundColor: view === "myTools" ? "#f0f0f0" : "#ffffff",
                  color: "#000",
                }}
              >
                My Tools
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

      {view === "tools" && <ToolsPage currentUserId={currentUserId} />}
      {view === "ownerRequests" && <OwnerRequestsPage ownerId={currentUserId} />}
      {view === "myRequests" && ( <BorrowerRequestsPage borrowerId={currentUserId} />)}
      {view === "myTools" && <MyToolsPage ownerId={currentUserId} />}
    </div>
  );
}

export default App;