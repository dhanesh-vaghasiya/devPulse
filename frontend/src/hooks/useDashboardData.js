import { useCallback, useEffect, useMemo, useState } from 'react';
import { createService, getMetrics, getServiceLogs, getServices } from '../services/monitoringApi';

const INITIAL_METRICS = {
  services: { total: 0, healthy: 0, down: 0 },
  logs: { total: 0, successful: 0, failed: 0 },
  latency: { average_ms: 0, max_ms: 0, min_ms: 0 },
  uptime: { success_rate_percent: 0 },
};

export function useDashboardData() {
  const [services, setServices] = useState([]);
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
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

  const selectedServiceId = useMemo(() => selectedService?.id ?? null, [selectedService]);

  const refreshServices = useCallback(async () => {
    setLoadingServices(true);

    try {
      const nextServices = await getServices();
      setServices(Array.isArray(nextServices) ? nextServices : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load services');
    } finally {
      setLoadingServices(false);
    }
  }, []);

  const refreshMetrics = useCallback(async () => {
    setLoadingMetrics(true);

    try {
      const nextMetrics = await getMetrics();
      setMetrics(nextMetrics || INITIAL_METRICS);
    } catch (err) {
      setError(err.message || 'Failed to load metrics');
    } finally {
      setLoadingMetrics(false);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    await Promise.all([refreshServices(), refreshMetrics()]);
  }, [refreshMetrics, refreshServices]);

  const refreshLogs = useCallback(async (serviceId) => {
    if (!serviceId) {
      setLogs([]);
      return;
    }

    setLoadingLogs(true);
    setLogsError('');

    try {
      const nextLogs = await getServiceLogs(serviceId, { limit: 20, offset: 0 });
      setLogs(Array.isArray(nextLogs) ? nextLogs : []);
    } catch (err) {
      setLogs([]);
      setLogsError(err.message || 'Failed to load logs');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  const selectService = useCallback(async (service) => {
    setSelectedService(service);
    await refreshLogs(service?.id);
  }, [refreshLogs]);

  const addService = useCallback(async (url) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Enter a service URL');
      return false;
    }

    setSubmitting(true);
    setError('');

    try {
      await createService(trimmedUrl);
      setServiceUrl('');
      await refreshDashboard();
      return true;
    } catch (err) {
      setError(err.message || 'Failed to add service');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [refreshDashboard]);

  const applyStatusUpdate = useCallback((message) => {
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

        if (selectedServiceId === service.id) {
          setSelectedService(updatedService);
        }

        return updatedService;
      });

      return next;
    });
  }, [selectedServiceId]);

  const appendAlert = useCallback((message) => {
    setAlerts((current) => [
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        service: message.service,
        message: message.message,
        receivedAt: new Date().toLocaleTimeString(),
      },
      ...current,
    ].slice(0, 8));
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  return {
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
    refreshServices,
    refreshMetrics,
    refreshLogs,
    selectService,
    addService,
    applyStatusUpdate,
    appendAlert,
  };
}
