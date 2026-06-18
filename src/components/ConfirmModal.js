export default function ConfirmModal({ isOpen, title, body, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel" }) {
  if (!isOpen) return null;

  return (
    <div
      className="modal active"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmModalTitle"
      onClick={(e) => {
        if (e.target.id === "confirmModal") onCancel();
      }}
      id="confirmModal"
    >
      <div className="modal-content">
        <button
          className="modal-close"
          type="button"
          onClick={onCancel}
          aria-label="Close dialog"
        >
          &times;
        </button>
        <div className="modal-icon warning" style={{ color: "var(--gold)" }}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ width: "36px", height: "36px" }}
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h3 id="confirmModalTitle" style={{ margin: "16px 0 8px", fontSize: "20px" }}>{title}</h3>
        <p id="confirmModalBody" style={{ margin: "0 0 24px", color: "var(--subtle)", fontSize: "14.5px", lineHeight: "1.5" }}>{body}</p>
        <div className="modal-actions" style={{ display: "flex", gap: "12px", width: "100%", marginTop: "10px" }}>
          <button
            className="wide-btn secondary"
            type="button"
            onClick={onCancel}
            style={{ margin: 0, flex: 1, minHeight: "48px" }}
          >
            {cancelText}
          </button>
          <button
            className="wide-btn"
            type="button"
            onClick={onConfirm}
            style={{ margin: 0, flex: 1, minHeight: "48px" }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
