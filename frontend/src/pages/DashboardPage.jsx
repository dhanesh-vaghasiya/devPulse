import { useCallback } from 'react';
import Header from '../components/Header';
import AddServiceForm from '../components/AddServiceForm';
import MetricsGrid from '../components/MetricsGrid';
import ServiceTable from '../components/ServiceTable';
import AlertsPanel from '../components/AlertsPanel';
import LogsPanel from '../components/LogsPanel';
import { useDashboardData } from '../hooks/useDashboardData';
import { useMonitoringWebSocket } from '../hooks/useMonitoringWebSocket';

export default function DashboardPage() {
  const {
    services,
    metrics,
    alerts,
    selectedService,
    logs,
    serviceUrl,
    setServiceUrl,
    loadingServices,
    loadingMetrics,
    loadingLogs,
    submitting,
    error,
    logsError,
    refreshDashboard,
    refreshLogs,
    selectService,
    addService,
    applyStatusUpdate,
    appendAlert,
  } = useDashboardData();

  const connectionState = useMonitoringWebSocket({
    onStatusUpdate: applyStatusUpdate,
    onAlert: appendAlert,
  });

  const handleAddService = useCallback(
    async (event) => {
      event.preventDefault();
      await addService(serviceUrl);
    },
    [addService, serviceUrl],
  );

  const handleRefreshLogs = useCallback(() => {
    if (selectedService) {
      refreshLogs(selectedService.id);
    }
  }, [refreshLogs, selectedService]);

  const handleRefreshDashboard = useCallback(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  return (
    <div className="app-shell">
      <Header connectionState={connectionState} />

      {error ? <div className="notice error">{error}</div> : null}

      <AddServiceForm
        value={serviceUrl}
        onChange={setServiceUrl}
        onSubmit={handleAddService}
        submitting={submitting}
      />

      <MetricsGrid metrics={metrics} loading={loadingMetrics} />

      <section className="content-grid">
        <ServiceTable
          services={services}
          selectedServiceId={selectedService?.id ?? null}
          loading={loadingServices}
          onSelect={selectService}
          onRefresh={handleRefreshDashboard}
        />

        <aside className="side-stack">
          <AlertsPanel alerts={alerts} />

          <LogsPanel
            selectedService={selectedService}
            logs={logs}
            loading={loadingLogs}
            error={logsError}
            onReload={handleRefreshLogs}
          />
        </aside>
      </section>
    </div>
  );
}
