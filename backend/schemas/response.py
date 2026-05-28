from pydantic import BaseModel
from datetime import datetime


class ServiceResponse(BaseModel):
    id: int
    url: str
    is_up: bool
    failure_count: int
    last_latency: float | None
    last_status_code: int | None
    last_checked: datetime | None

    class Config:
        from_attributes = True


class LogResponse(BaseModel):
    id: int
    service_id: int
    status_code: int | None
    latency: float | None
    success: bool
    error: str | None
    created_at: datetime | None

    class Config:
        from_attributes = True


class ServiceMetrics(BaseModel):
    total: int
    healthy: int
    down: int


class LogMetrics(BaseModel):
    total: int
    successful: int
    failed: int


class LatencyMetrics(BaseModel):
    average_ms: float
    max_ms: float
    min_ms: float


class UptimeMetrics(BaseModel):
    success_rate_percent: float


class MetricsResponse(BaseModel):
    time_window_hours: int
    services: ServiceMetrics
    logs: LogMetrics
    latency: LatencyMetrics
    uptime: UptimeMetrics