import { FormEvent, useState } from "react";
import { apiPost, apiPut } from "../lib/api";

interface Tool {
  id: number;
  name: string;
  description: string;
  address: string;
  lat?: number | null;
  lng?: number | null;
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
  const [address, setAddress] = useState(tool.address || "");
  const [lat, setLat] = useState<number | null>(tool.lat ?? null);
  const [lng, setLng] = useState<number | null>(tool.lng ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  async function handleGeocode() {
    if (!address.trim()) {
      setGeocodeError("Please enter an address first.");
      return;
    }

    setGeocoding(true);
    setGeocodeError(null);

    try {
      const result = await apiPost<{ lat: number; lng: number; formatted_address: string }>(
        "/geo/geocode",
        { address }
      );
      setLat(result.lat);
      setLng(result.lng);
      setAddress(result.formatted_address);
    } catch (err) {
      console.error(err);
      setGeocodeError("Could not find coordinates for this address.");
    } finally {
      setGeocoding(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        name,
        description,
        address,
        lat,
        lng,
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
          Address
          <br />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setLat(null);
                setLng(null);
              }}
              placeholder="e.g., 123 Main St, Seattle, WA"
              required
              style={{ flex: 1, padding: "0.4rem" }}
            />
            <button
              type="button"
              onClick={handleGeocode}
              disabled={geocoding || !address.trim()}
              style={{ whiteSpace: "nowrap" }}
            >
              {geocoding ? "Looking up..." : "Lookup"}
            </button>
          </div>
        </label>
        {lat !== null && lng !== null && (
          <small style={{ color: "#4caf50", display: "block", marginTop: "0.25rem" }}>
            Coordinates: {lat.toFixed(4)}, {lng.toFixed(4)}
          </small>
        )}
        {geocodeError && (
          <small style={{ color: "#f44336", display: "block", marginTop: "0.25rem" }}>
            {geocodeError}
          </small>
        )}
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
