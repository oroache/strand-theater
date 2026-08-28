"use client";

import { KeyboardEvent, ReactNode, useRef, useState } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
}

export default function Tabs({ tabs, defaultTabId }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultTabId ?? tabs[0]?.id);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  const focusTab = (index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    setActiveId(tab.id);
    tabRefs.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case "ArrowLeft":
        event.preventDefault();
        focusTab((index - 1 + tabs.length) % tabs.length);
        break;
      case "ArrowRight":
        event.preventDefault();
        focusTab((index + 1) % tabs.length);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(tabs.length - 1);
        break;
    }
  };

  return (
    <div>
      <div role="tablist" style={{ display: "flex", gap: 4, borderBottom: "1px solid #ddd" }}>
        {tabs.map((tab, index) => {
          const isSelected = tab.id === activeTab?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              onClick={() => setActiveId(tab.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              style={{
                padding: "8px 16px",
                border: "none",
                borderBottom: isSelected ? "2px solid #333" : "2px solid transparent",
                background: "transparent",
                fontWeight: isSelected ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab && (
        <div
          role="tabpanel"
          id={`panel-${activeTab.id}`}
          aria-labelledby={`tab-${activeTab.id}`}
          style={{ padding: 16 }}
        >
          {activeTab.content}
        </div>
      )}
    </div>
  );
}
