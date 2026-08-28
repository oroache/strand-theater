"use client";

import { ReactNode, useState } from "react";

interface DisclosureProps {
  id: string;
  title: string;
  defaultOpen?: boolean;
  children?: ReactNode;
}

export default function Disclosure({ id, title, defaultOpen = false, children }: DisclosureProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = `disclosure-panel-${id}`;

  return (
    <div style={{ borderBottom: "1px solid #ddd" }}>
      <h3 style={{ margin: 0 }}>
        <button
          type="button"
          id={`disclosure-button-${id}`}
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((open) => !open)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            padding: "12px 4px",
            border: "none",
            background: "transparent",
            font: "inherit",
            fontWeight: 600,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
          >
            ▸
          </span>
          {title}
          <span style={{ marginLeft: "auto", fontWeight: 400, color: "#666" }}>
            {isOpen ? "Hide" : "Show"}
          </span>
        </button>
      </h3>
      {isOpen && (
        <div id={contentId} style={{ padding: "0 4px 16px" }}>
          {children}
        </div>
      )}
    </div>
  );
}
