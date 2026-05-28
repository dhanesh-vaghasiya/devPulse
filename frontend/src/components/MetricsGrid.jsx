import MetricCard from './MetricCard';

export default function MetricsGrid({ metrics, loading }) {
  const totalServices = metrics?.services?.total ?? 0;
  const healthyServices = metrics?.services?.healthy ?? 0;
  const downServices = metrics?.services?.down ?? 0;
  const successRate = metrics?.uptime?.success_rate_percent ?? 0;
  const averageLatency = metrics?.latency?.average_ms ?? 0;
  const failedLogs = metrics?.logs?.failed ?? 0;

  return (
    <section className="metrics-grid">
      <MetricCard label="Total Services" value={loading ? '...' : totalServices} hint="Monitored now" />
      <MetricCard label="Healthy" value={loading ? '...' : healthyServices} hint="Currently up" />
      <MetricCard label="Down" value={loading ? '...' : downServices} hint="Needs attention" />
      <MetricCard label="Success Rate" value={loading ? '...' : `${successRate}%`} hint="Last 24 hours" />
      <MetricCard label="Average Latency" value={loading ? '...' : `${Number(averageLatency).toFixed(0)} ms`} hint="Recent average" />
      <MetricCard label="Failed Logs" value={loading ? '...' : failedLogs} hint="Recent window" />
    </section>
  );
}
