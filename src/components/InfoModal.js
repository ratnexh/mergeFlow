export default function InfoModal({ isOpen, title, body, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      className="modal active"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
      onClick={(e) => {
        if (e.target.id === "infoModal") onClose();
      }}
      id="infoModal"
    >
      <div className="modal-content">
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          &times;
        </button>
        <div className="modal-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        </div>
        <h3 id="modalTitle">{title}</h3>
        <p id="modalBody">{body}</p>
        <button
          className="wide-btn primary-btn"
          type="button"
          onClick={onClose}
        >
          Got it
        </button>
      </div>
    </div>
  );
}
