// src/App.tsx
import { useState } from "react";
import ToolsPage from "./pages/ToolsPage";
import OwnerRequestsPage from "./pages/OwnerRequestsPage";
import BorrowerRequestsPage from "./pages/BorrowerRequestsPage";

type View = "tools" | "ownerRequests" | "myRequests";

function App() {
  const [view, setView] = useState<View>("tools");

  return (
    <div>
      <header
        style={{
          padding: "1rem 2rem",
          borderBottom: "1px solid #ddd",
          marginBottom: "1rem",
        }}
      >
        <h1 style={{ marginBottom: "0.5rem" }}>ToolSharer</h1>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setView("tools")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              border: view === "tools" ? "2px solid #000" : "1px solid #ccc",
              backgroundColor: view === "tools" ? "#f0f0f0" : "#fff",
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
              backgroundColor: view === "ownerRequests" ? "#f0f0f0" : "#fff",
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
              backgroundColor: view === "myRequests" ? "#f0f0f0" : "#fff",
              color: "#000",
            }}
          >
            My Requests
          </button>
        </div>
      </header>

      {view === "tools" && <ToolsPage />}
      {view === "ownerRequests" && <OwnerRequestsPage />}
      {view === "myRequests" && <BorrowerRequestsPage />}
    </div>
  );
}

export default App;
