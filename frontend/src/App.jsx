import { useEffect, useMemo, useRef, useState } from 'react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function formatDateTime(value) {
  if (!value) return 'Never';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString();
}

function formatNumber(value, suffix = '') {
  if (value === null || value === undefined || value === '') return '—';
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return String(value);
  return `${Number.isInteger(numberValue) ? numberValue : numberValue.toFixed(0)}${suffix}`;
}

function toWebSocketUrl(baseUrl) {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  url.hash = '';
  return url.toString();
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;

  if (!response.ok) {
    throw new Error(payload?.detail || payload?.message || `Request failed (${response.status})`);
  }

  return payload;
}

function MetricCard({ label, value, hint }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

export default function App() {
  const [services, setServices] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [logs, setLogs] = useState([]);
  const [serviceUrl, setServiceUrl] = useState('');
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [logsError, setLogsError] = useState('');
  const [connectionState, setConnectionState] = useState('connecting');

  const selectedServiceRef = useRef(null);
  const socketRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const selectedLogsTitle = useMemo(() => {
    if (!selectedService) return 'Logs';
    return `Logs for ${selectedService.url}`;
  }, [selectedService]);

  useEffect(() => {
    selectedServiceRef.current = selectedService;
  }, [selectedService]);

  async function loadServices() {
    setLoadingServices(true);

    try {
      const data = await fetchJson('/services');
      const nextServices = Array.isArray(data) ? data : [];
      setServices(nextServices);

      const currentSelected = selectedServiceRef.current;
      if (currentSelected) {
        const refreshedSelection = nextServices.find((service) => service.id === currentSelected.id);
        if (refreshedSelection) {
          setSelectedService(refreshedSelection);
        }
      }

      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load services');
    } finally {
      setLoadingServices(false);
    }
  }

  async function loadMetrics() {
    setLoadingMetrics(true);

    try {
      const data = await fetchJson('/metrics?hours=24');
      setMetrics(data);
    } catch (err) {
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoadingMetrics(false);
    }
  }

  async function loadLogs(service) {
    if (!service?.id) return;

    setSelectedService(service);
    setLoadingLogs(true);
    setLogsError('');

    try {
      const data = await fetchJson(`/services/${service.id}/logs?limit=20&offset=0`);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      setLogs([]);
      setLogsError(err.message || 'Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleAddService(event) {
    event.preventDefault();

    const nextUrl = serviceUrl.trim();
    if (!nextUrl) {
      setError('Enter a service URL');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await fetchJson('/services', {
        method: 'POST',
        body: JSON.stringify({ url: nextUrl }),
      });

      setServiceUrl('');
      await Promise.all([loadServices(), loadMetrics()]);
    } catch (err) {
      setError(err.message || 'Failed to add service');
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    loadServices();
    loadMetrics();
  }, []);

  useEffect(() => {
    let active = true;

    function connect() {
      if (!active) return;

      const socket = new WebSocket(toWebSocketUrl(API_BASE_URL));
      socketRef.current = socket;
      setConnectionState('connecting');

      socket.onopen = () => {
        if (active) {
          setConnectionState('connected');
        }
      };

      socket.onmessage = (event) => {
        if (!active) return;

        let message;
        try {
          message = JSON.parse(event.data);
        } catch {
          return;
        }

        if (message.type === 'STATUS_UPDATE') {
          let shouldRefresh = false;

          setServices((current) => {
            const next = current.map((service) => {
              if (service.url !== message.service) {
                return service;
              }

              const updatedService = {
                ...service,
                is_up: Boolean(message.is_up),
                last_latency: message.latency,
                last_status_code: message.status_code,
                failure_count: message.failure_count,
                last_checked: new Date().toISOString(),
              };

              if (selectedServiceRef.current?.id === service.id) {
                setSelectedService(updatedService);
              }

              return updatedService;
            });

            shouldRefresh = next.every((service) => service.url !== message.service);
            return next;
          });

          if (shouldRefresh) {
            loadServices();
          }
        }

        if (message.type === 'ALERT') {
          setAlerts((current) => [
            {
              id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
              service: message.service,
              message: message.message,
              receivedAt: new Date().toLocaleTimeString(),
            },
            ...current,
          ].slice(0, 8));
        }
      };

      socket.onerror = () => {
        if (active) {
          setConnectionState('error');
        }
      };

      socket.onclose = () => {
        if (!active) return;

        setConnectionState('reconnecting');
        reconnectTimerRef.current = window.setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      active = false;

      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }

      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  const totalServices = metrics?.services?.total ?? 0;
  const healthyServices = metrics?.services?.healthy ?? 0;
  const downServices = metrics?.services?.down ?? 0;
  const successRate = metrics?.uptime?.success_rate_percent ?? 0;

  return (
    <div className="app-shell">
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

      {error ? <div className="banner banner-error">{error}</div> : null}

      <section className="panel add-service-panel">
        <div>
          <h2>Add Service</h2>
          <p>Register a new endpoint to start monitoring it immediately.</p>
        </div>

        <form className="add-form" onSubmit={handleAddService}>
          <input
            type="url"
            placeholder="https://example.com"
            value={serviceUrl}
            onChange={(event) => setServiceUrl(event.target.value)}
          />
          <button type="submit" disabled={submitting}>
            {submitting ? 'Adding...' : 'Add Service'}
          </button>
        </form>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Total Services" value={loadingMetrics ? '...' : totalServices} hint="Monitored now" />
        <MetricCard label="Healthy" value={loadingMetrics ? '...' : healthyServices} hint="Currently up" />
        <MetricCard label="Down" value={loadingMetrics ? '...' : downServices} hint="Needs attention" />
        <MetricCard label="Success Rate" value={loadingMetrics ? '...' : `${successRate}%`} hint="Last 24 hours" />
        <MetricCard
          label="Average Latency"
          value={loadingMetrics ? '...' : formatNumber(metrics?.latency?.average_ms, ' ms')}
          hint="Recent average"
        />
        <MetricCard
          label="Failed Logs"
          value={loadingMetrics ? '...' : metrics?.logs?.failed ?? 0}
          hint="Recent window"
        />
      </section>

      <section className="content-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Services</h2>
              <p>Click a service to view its latest logs.</p>
            </div>

            <button type="button" className="secondary-button" onClick={() => { loadServices(); loadMetrics(); }}>
              Refresh
            </button>
          </div>

          {loadingServices ? <div className="empty-state">Loading services...</div> : null}

          {!loadingServices && services.length === 0 ? (
            <div className="empty-state">No services are being monitored yet.</div>
          ) : null}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>URL</th>
                  <th>Latency</th>
                  <th>Status Code</th>
                  <th>Failures</th>
                  <th>Last Checked</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr
                    key={service.id}
                    className={selectedService?.id === service.id ? 'selected-row' : ''}
                    onClick={() => loadLogs(service)}
                  >
                    <td>
                      <span className={`status-dot ${service.is_up ? 'up' : 'down'}`} />
                    </td>
                    <td className="service-url">{service.url}</td>
                    <td>{formatNumber(service.last_latency, ' ms')}</td>
                    <td>{formatNumber(service.last_status_code)}</td>
                    <td>{service.failure_count ?? 0}</td>
                    <td>{formatDateTime(service.last_checked)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="side-column">
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

          <section className="panel logs-panel">
            <div className="panel-header">
              <div>
                <h2>{selectedLogsTitle}</h2>
                <p>Newest entries first.</p>
              </div>
            </div>

            {!selectedService ? <div className="empty-state">Select a service to load logs.</div> : null}
            {loadingLogs ? <div className="empty-state">Loading logs...</div> : null}
            {logsError ? <div className="banner banner-error">{logsError}</div> : null}

            {selectedService && !loadingLogs && logs.length === 0 && !logsError ? (
              <div className="empty-state">No logs available for this service.</div>
            ) : null}

            <div className="log-list">
              {logs.map((log) => (
                <article key={log.id} className="log-item">
                  <div className="log-topline">
                    <strong className={log.success ? 'success-text' : 'failure-text'}>
                      {log.success ? 'Successful check' : 'Failed check'}
                    </strong>
                    <span>{formatDateTime(log.created_at)}</span>
                  </div>
                  <div className="log-meta">
                    <span>Status: {formatNumber(log.status_code)}</span>
                    <span>Latency: {formatNumber(log.latency, ' ms')}</span>
                  </div>
                  {log.error ? <p className="log-error">{log.error}</p> : null}
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}
