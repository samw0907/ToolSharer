// src/components/ToolsMap.tsx
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in Leaflet with bundlers
const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// User location marker (different color)
const userIcon = new Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Tool {
  id: number;
  name: string;
  description: string;
  lat?: number | null;
  lng?: number | null;
  is_available: boolean;
  owner_name?: string;
  owner_email?: string;
  distance_km?: number;
}

interface ToolsMapProps {
  tools: Tool[];
  height?: string;
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  userLat?: number | null;
  userLng?: number | null;
  radiusKm?: number;
}

export default function ToolsMap({
  tools,
  height = "400px",
  centerLat = 39.8283, // Default: center of USA
  centerLng = -98.5795,
  zoom = 4,
  userLat = null,
  userLng = null,
  radiusKm,
}: ToolsMapProps) {
  // Filter tools that have valid coordinates
  const toolsWithLocation = tools.filter(
    (t) => t.lat != null && t.lng != null && !isNaN(t.lat) && !isNaN(t.lng)
  );

  const hasUserLocation = userLat != null && userLng != null;

  // Center on user location if available, otherwise first tool, otherwise default
  const mapCenter: [number, number] = hasUserLocation
    ? [userLat, userLng]
    : toolsWithLocation.length > 0
      ? [toolsWithLocation[0].lat!, toolsWithLocation[0].lng!]
      : [centerLat, centerLng];

  const mapZoom = hasUserLocation ? 11 : toolsWithLocation.length > 0 ? 10 : zoom;

  return (
    <div style={{ height, width: "100%", marginBottom: "1rem" }}>
      {toolsWithLocation.length === 0 ? (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#1a1a1a",
            borderRadius: "8px",
            border: "1px dashed #444",
            color: "#aaa",
          }}
        >
          No tools with location data to display on map.
        </div>
      ) : (
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: "100%", width: "100%", borderRadius: "8px" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* User location marker and radius circle */}
          {hasUserLocation && (
            <>
              <Marker position={[userLat, userLng]} icon={userIcon}>
                <Popup>
                  <strong>Your location</strong>
                </Popup>
              </Marker>
              {radiusKm && (
                <Circle
                  center={[userLat, userLng]}
                  radius={radiusKm * 1000} // Convert km to meters
                  pathOptions={{
                    color: "#4caf50",
                    fillColor: "#4caf50",
                    fillOpacity: 0.1,
                  }}
                />
              )}
            </>
          )}
          {toolsWithLocation.map((tool) => (
            <Marker
              key={tool.id}
              position={[tool.lat!, tool.lng!]}
              icon={defaultIcon}
            >
              <Popup>
                <div>
                  <strong>{tool.name}</strong>
                  <br />
                  {tool.description}
                  <br />
                  <small>
                    Owner: {tool.owner_name || tool.owner_email || "Unknown"}
                  </small>
                  {tool.distance_km !== undefined && (
                    <>
                      <br />
                      <small style={{ color: "#4caf50" }}>
                        {tool.distance_km} km away
                      </small>
                    </>
                  )}
                  <br />
                  <span
                    style={{
                      color: tool.is_available ? "green" : "red",
                      fontWeight: "bold",
                    }}
                  >
                    {tool.is_available ? "Available" : "Not available"}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
