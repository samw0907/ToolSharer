import { FormEvent, useState } from "react";
import { apiPut } from "../lib/api";

interface Tool {
  id: number;
  name: string;
  description: string;
  location: string;
  owner_id: number;
  is_available: boolean;
}

interface EditToolFormProps {
  tool: Tool;
  onUpdated: (tool: Tool) => void;
  onCancel: () => void;
}

export default function EditToolForm({ tool, onUpdated, onCancel }: EditToolFormProps) {
  const [name, setName] = useState(tool.name);
  const [description, setDescription] = useState(tool.description);
  const [location, setLocation] = useState(tool.location);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name,
        description,
        location,
      };

      const updated = await apiPut<Tool>(`/tools/${tool.id}`, payload);
      onUpdated(updated);
    } catch (err) {
      console.error(err);
      setError("Failed to update tool.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: "0.75rem",
        padding: "1rem",
        border: "1px solid #ccc",
        borderRadius: "4px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <h3 style={{ marginTop: 0 }}>Edit Tool</h3>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Name
          <br />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Description
          <br />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </label>
      </div>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Location
          <br />
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            style={{ width: "100%", padding: "0.4rem" }}
          />
        </label>
      </div>

      {error && (
        <p style={{ color: "red", marginBottom: "0.5rem" }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save Changes"}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
}
