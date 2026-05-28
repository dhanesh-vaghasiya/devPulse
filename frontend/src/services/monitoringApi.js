const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

function buildUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function requestJson(path, options = {}) {
  const response = await fetch(buildUrl(path), {
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
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

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getWebSocketUrl() {
  const url = new URL(API_BASE_URL);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/ws';
  url.search = '';
  url.hash = '';
  return url.toString();
}

export function getServices() {
  return requestJson('/services');
}

export function getMetrics(hours = 24) {
  return requestJson(`/metrics?hours=${hours}`);
}

export function getServiceLogs(serviceId, { limit = 20, offset = 0 } = {}) {
  return requestJson(`/services/${serviceId}/logs?limit=${limit}&offset=${offset}`);
}

export function createService(url) {
  return requestJson('/services', {
    method: 'POST',
    body: JSON.stringify({ url }),
  });
}
