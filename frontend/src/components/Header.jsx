export default function Header({ connectionState }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">FastAPI Monitoring</p>
        <h1>DevPulse</h1>
        <p className="subtitle">Simple live status, metrics, logs, and alerts for monitored services.</p>
      </div>

      <div className={`connection-pill ${connectionState}`}>
        WebSocket {connectionState}
      </div>
    </header>
  );
}
