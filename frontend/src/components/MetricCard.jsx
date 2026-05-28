export default function MetricCard({ label, value, hint }) {
  return (
    <article className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      {hint ? <small className="metric-hint">{hint}</small> : null}
    </article>
  );
}
