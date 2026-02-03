import { TOOL_ICONS, getIconCategories, getToolIcon } from "../assets/tool-icons";

interface IconPickerProps {
  value: string | null;
  onChange: (iconKey: string | null) => void;
}

export default function IconPicker({ value, onChange }: IconPickerProps) {
  const categories = getIconCategories();
  const selectedIcon = value ? getToolIcon(value) : null;

  return (
    <div style={{ marginBottom: "0.5rem" }}>
      <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500 }}>
        Tool Icon
      </label>

      {/* Selected icon preview */}
      {selectedIcon && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            padding: "0.5rem",
            background: "#e8f5e9",
            borderRadius: "4px",
          }}
        >
          <img
            src={selectedIcon.src}
            alt={selectedIcon.label}
            style={{ width: 32, height: 32 }}
          />
          <span style={{ color: "#2e7d32", fontWeight: 500 }}>
            {selectedIcon.label}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              marginLeft: "auto",
              background: "transparent",
              border: "none",
              color: "#666",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Icon grid by category */}
      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "4px",
          padding: "0.75rem",
          maxHeight: "280px",
          overflowY: "auto",
        }}
      >
        {categories.map((category) => (
          <div key={category} style={{ marginBottom: "0.75rem" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#666",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {category}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {TOOL_ICONS.filter((icon) => icon.category === category).map(
                (icon) => {
                  const isSelected = value === icon.key;
                  return (
                    <button
                      key={icon.key}
                      type="button"
                      onClick={() => onChange(icon.key)}
                      title={icon.label}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "0.5rem",
                        border: isSelected
                          ? "2px solid #1976d2"
                          : "1px solid #ddd",
                        borderRadius: "6px",
                        background: isSelected ? "#e3f2fd" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <img
                        src={icon.src}
                        alt={icon.label}
                        style={{
                          width: 32,
                          height: 32,
                          opacity: isSelected ? 1 : 0.7,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: "#666",
                          marginTop: "0.25rem",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100%",
                        }}
                      >
                        {icon.label}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
