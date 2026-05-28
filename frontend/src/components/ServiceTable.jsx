import { formatDateTime, formatMetricValue } from '../utils/formatters';

function ServiceRow({ service, selected, onSelect }) {
  return (
    <tr className={selected ? 'selected-row' : ''} onClick={() => onSelect(service)}>
      <td>
        <span className={`status-dot ${service.is_up ? 'up' : 'down'}`} />
      </td>
      <td className="service-url">{service.url}</td>
      <td>{formatMetricValue(service.last_latency, ' ms')}</td>
      <td>{formatMetricValue(service.last_status_code)}</td>
      <td>{service.failure_count ?? 0}</td>
      <td>{formatDateTime(service.last_checked)}</td>
    </tr>
  );
}

export default function ServiceTable({ services, selectedServiceId, loading, onSelect, onRefresh }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Services</h2>
          <p>Click a service to view its latest logs.</p>
        </div>

        <button type="button" className="secondary-button" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      {loading ? <div className="empty-state">Loading services...</div> : null}

      {!loading && services.length === 0 ? (
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
              <ServiceRow
                key={service.id}
                service={service}
                selected={selectedServiceId === service.id}
                onSelect={onSelect}
              />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
