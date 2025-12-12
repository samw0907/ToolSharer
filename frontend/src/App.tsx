// src/App.tsx
import { useState } from "react";
import ToolsPage from "./pages/ToolsPage";
import OwnerRequestsPage from "./pages/OwnerRequestsPage";

type View = "tools" | "requests";

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
            onClick={() => setView("requests")}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "4px",
              border:
                view === "requests" ? "2px solid #000" : "1px solid #ccc",
              backgroundColor: view === "requests" ? "#f0f0f0" : "#fff",
              color: "#000",
            }}
          >
            Owner Requests
          </button>
        </div>
      </header>

      {view === "tools" ? <ToolsPage /> : <OwnerRequestsPage />}
    </div>
  );
}

export default App;
