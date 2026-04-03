export default function SubscribeModal({ author, onClose, onConfirm }) {
  if (!author) return null;

  return (
    <div className="smodal-backdrop" onClick={onClose}>
      <div className="smodal-sheet" onClick={e => e.stopPropagation()}>

        {/* Flash badge */}
        <div className="smodal-badge">⚡ Coming Soon</div>

        {/* Icon */}
        <div className="smodal-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </div>

        <h2 className="smodal-heading">Something Legendary<br />is Coming Soon</h2>
        <p className="smodal-sub">
          Subscriptions to <strong>{author}</strong> will be live very soon.
          We're building something extraordinary — newsletters, exclusive posts, and more.
        </p>

        <button className="smodal-notify-btn" onClick={onConfirm}>
          🔔 Notify Me When It's Live
        </button>
        <button className="smodal-dismiss-btn" onClick={onClose}>
          Maybe Later
        </button>
      </div>
    </div>
  );
}
