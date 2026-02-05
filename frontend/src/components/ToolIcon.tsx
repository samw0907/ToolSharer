// src/components/ToolIcon.tsx
import { useState, useEffect } from "react";
import { getS3IconUrl } from "../lib/api";
import { getToolIcon } from "../assets/tool-icons";

interface ToolIconProps {
  iconKey: string | null | undefined;
  size?: number;
  style?: React.CSSProperties;
}

/**
 * Displays a tool icon, attempting to load from S3 first,
 * falling back to bundled static icons if S3 fails.
 */
export function ToolIcon({ iconKey, size = 48, style }: ToolIconProps) {
  const [useS3, setUseS3] = useState(true);
  const [s3Error, setS3Error] = useState(false);

  // Reset error state when iconKey changes
  useEffect(() => {
    setS3Error(false);
    setUseS3(true);
  }, [iconKey]);

  if (!iconKey) {
    return null;
  }

  const staticIcon = getToolIcon(iconKey);
  const s3Url = getS3IconUrl(iconKey);

  const handleS3Error = () => {
    setS3Error(true);
    setUseS3(false);
  };

  const baseStyle: React.CSSProperties = {
    width: size,
    height: size,
    padding: size > 36 ? "6px" : "4px",
    backgroundColor: "#f5f5f5",
    borderRadius: "8px",
    flexShrink: 0,
    objectFit: "contain",
    ...style,
  };

  // Try S3 first
  if (useS3 && !s3Error) {
    return (
      <img
        src={s3Url}
        alt={staticIcon?.label || iconKey}
        style={baseStyle}
        onError={handleS3Error}
      />
    );
  }

  // Fall back to static icon
  if (staticIcon) {
    return (
      <img
        src={staticIcon.src}
        alt={staticIcon.label}
        style={baseStyle}
      />
    );
  }

  // No icon available
  return null;
}
