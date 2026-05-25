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