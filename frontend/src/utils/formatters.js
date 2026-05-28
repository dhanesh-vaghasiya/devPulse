
const IST_TIME_ZONE = 'Asia/Kolkata';

function parseBackendDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  const parsed = new Date(hasTimezone ? value : `${value}Z`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(value) {
  const date = parseBackendDate(value);

  if (!date) {
    return '—';
  }

  const diffMs = Date.now() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  if (diffSeconds < 0) {
    return 'just now';
  }

  if (diffSeconds < 60) {
    return `${diffSeconds} sec ago`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hr ago`;
  }

  const diffDays = Math.floor(diffHours / 24);

  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

export function formatIndiaDateTime(value) {
  const date = parseBackendDate(value);

  if (!date) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIME_ZONE,
    dateStyle: 'medium',
    timeStyle: 'medium',
  }).format(date);
}

export function formatMetricValue(value, suffix = '', fallback = '—') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  const displayValue = Number.isInteger(numberValue)
    ? numberValue
    : numberValue.toFixed(0);

  return `${displayValue}${suffix}`;
}

export function formatPercent(value) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return String(value);
  }

  return `${numberValue}%`;
}