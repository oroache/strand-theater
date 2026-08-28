"use client";

import { useState } from "react";
import Modal from "./Modal";

export default function App() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ padding: 40 }}>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open modal
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        titleId="modal-title"
        title="Example modal"
      >
        <p>This is the modal content.</p>
      </Modal>
    </div>
  );
}
