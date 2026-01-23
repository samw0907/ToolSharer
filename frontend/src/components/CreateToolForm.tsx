// src/components/CreateToolForm.tsx
import { FormEvent, useState } from "react";
import { apiPost } from "../lib/api";

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

interface CreateToolFormProps {
  onCreated: (tool: Tool) => void;
}

export default function CreateToolForm({ onCreated }: CreateToolFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [ownerId, setOwnerId] = useState("1");
  const [isAvailable, setIsAvailable] = useState(true);
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
        owner_id: Number(ownerId),
        is_available: isAvailable,
      };

      const created = await apiPost<Tool>("/tools", payload);
      onCreated(created);

      // reset form
      setName("");
      setDescription("");
      setAddress("");
      setLat(null);
      setLng(null);
      setIsAvailable(true);
    } catch (err) {
      console.error(err);
      setError("Failed to create tool.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginBottom: "2rem",
        padding: "1rem",
        border: "1px solid #ddd",
        borderRadius: "4px",
      }}
    >
      <h2>Add a Tool</h2>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Name
          <br />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: "100%" }}
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
            style={{ width: "100%" }}
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
                // Clear coordinates when address changes
                setLat(null);
                setLng(null);
              }}
              placeholder="e.g., 123 Main St, Seattle, WA"
              required
              style={{ flex: 1 }}
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

      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          Owner ID
          <br />
          <input
            type="number"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            min={1}
            required
          />
        </label>
      </div>

      <div style={{ marginBottom: "0.5rem" }}>
        <label>
          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
          />{" "}
          Available
        </label>
      </div>

      {error && (
        <p style={{ color: "red", marginBottom: "0.5rem" }}>{error}</p>
      )}

      <button type="submit" disabled={submitting}>
        {submitting ? "Creating..." : "Create Tool"}
      </button>
    </form>
  );
}
