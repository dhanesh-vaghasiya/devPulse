export default function AlertsPanel({ alerts }) {
  return (
    <section className="panel alerts-panel">
      <div className="panel-header">
        <div>
          <h2>Alerts</h2>
          <p>Latest websocket alerts from the backend.</p>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">No alerts received yet.</div>
      ) : (
        <div className="alert-list">
          {alerts.map((alert) => (
            <div key={alert.id} className="alert-item">
              <strong>{alert.message}</strong>
              <span>{alert.service}</span>
              <small>{alert.receivedAt}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
