"use client";

import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  titleId: string;
  title: string;
  children?: ReactNode;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "audio[controls]",
  "video[controls]",
  "[contenteditable]",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export default function Modal({
  isOpen,
  onClose,
  titleId,
  title,
  children,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Move focus in on open, and restore it to the trigger on close.
  // useLayoutEffect (not useEffect) so this runs synchronously in the
  // commit phase, before paint. useEffect's cleanup is a passive effect
  // that fires after paint, on a separate scheduler task — by then the
  // dialog's DOM has already been removed and the browser has already
  // shifted focus to <body> on its own, so the restore can lose the race
  // (or land after other keystrokes) instead of happening atomically with
  // the close.
  useLayoutEffect(() => {
    if (!isOpen) return;

    const trigger = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    const focusable = dialog ? getFocusableElements(dialog) : [];
    (focusable[0] ?? dialog)?.focus();

    return () => {
      if (trigger?.isConnected) {
        trigger.focus();
      }
    };
  }, [isOpen]);

  // Trap Tab/Shift+Tab inside the dialog and close on Escape.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const isInsideDialog = active instanceof Node && dialog.contains(active);

      if (event.shiftKey) {
        if (!isInsideDialog || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (!isInsideDialog || active === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          background: "#fff",
          borderRadius: 8,
          padding: 24,
          minWidth: 320,
          maxWidth: "90vw",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h2 id={titleId} style={{ margin: 0 }}>
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
