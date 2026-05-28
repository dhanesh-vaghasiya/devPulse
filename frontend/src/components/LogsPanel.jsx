
// components/LogsPanel.jsx

import {
  formatMetricValue,
  formatIndiaDateTime
} from '../utils/formatters';


export default function LogsPanel({
  selectedService,
  logs,
  loading,
  error,
  onReload
}) {

  const title = selectedService
    ? `Logs for ${selectedService.url}`
    : 'Logs';

  return (

    <section className="panel logs-panel">

      <div className="panel-header">

        <div>
          <h2>{title}</h2>
          <p>Newest entries first</p>
        </div>

        {selectedService && (
          <button
            type="button"
            className="secondary-button"
            onClick={onReload}
          >
            Reload logs
          </button>
        )}

      </div>

      {!selectedService && (
        <div className="empty-state">
          Select a service to load logs.
        </div>
      )}

      {loading && (
        <div className="empty-state">
          Loading logs...
        </div>
      )}

      {error && (
        <div className="banner banner-error">
          {error}
        </div>
      )}

      {selectedService &&
        !loading &&
        logs.length === 0 &&
        !error && (
          <div className="empty-state empty-dash" aria-label="No logs available">
            —
          </div>
        )}

      <div
        className="log-list"
        style={{
          maxHeight: '500px',
          overflowY: 'auto',
          paddingRight: '6px'
        }}
      >

        {logs.map((log) => (

          <article
            key={log.id}
            className="log-item"
          >

            <div className="log-topline">

              <strong
                className={
                  log.success
                    ? 'success-text'
                    : 'failure-text'
                }
              >
                {log.success
                  ? 'Successful check'
                  : 'Failed check'}
              </strong>

              <span className="log-time">
                {formatIndiaDateTime(log.created_at)}
              </span>

            </div>

            <div className="log-meta">

              <span>
                Status: {
                  formatMetricValue(log.status_code)
                }
              </span>

              <span>
                Latency: {
                  formatMetricValue(
                    log.latency,
                    ' ms'
                  )
                }
              </span>

            </div>

            {log.error && (
              <p className="log-error">
                {log.error}
              </p>
            )}

          </article>

        ))}

      </div>

    </section>
  );
}
