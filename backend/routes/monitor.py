# routes/monitor.py

from zoneinfo import ZoneInfo
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from database import SessionLocal
from models import Service, Log
from services.checker import check_url
from fastapi import WebSocket
from websocket_manager import manager

router = APIRouter()


# ---------------- DATABASE DEPENDENCY ---------------- #

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------- SCHEMAS ---------------- #

class ServiceCreate(BaseModel):
    url: HttpUrl


# ---------------- ROUTES ---------------- #

# Add monitored service
@router.post("/services")
async def add_service(
    data: ServiceCreate,
    db: Session = Depends(get_db)
):

    from services.validator import validate_service_url

    # check duplicate
    existing = db.query(Service).filter(
        Service.url == str(data.url)
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="URL already exists"
        )

    validation = await validate_service_url(
        str(data.url)
    )

    if not validation["valid"]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid or unreachable URL: {validation['error']}"
        )

    service = Service(
        url=str(data.url)
    )

    db.add(service)
    db.commit()
    db.refresh(service)

    return {
        "message": "Service added successfully",
        "service": {
            "id": service.id,
            "url": service.url
        }
    }


# Get all monitored services
@router.get("/services")
async def get_services(
    db: Session = Depends(get_db)
):

    services = db.query(Service).all()

    return services

@router.get("/metrics")
async def get_metrics(
    hours: int = 24,
    db: Session = Depends(get_db)
):
    time_threshold = datetime.now(ZoneInfo("Asia/Kolkata")) - timedelta(hours=hours)
    recent_logs = db.query(Log).filter(
        Log.created_at >= time_threshold
    )
    total_services = db.query(Service).count()
    healthy_services = db.query(Service).filter(
        Service.is_up == True
    ).count()
    down_services = db.query(Service).filter(
        Service.is_up == False
    ).count()

    total_logs = recent_logs.count()
    success_logs = recent_logs.filter(
        Log.success == True
    ).count()
    failed_logs = recent_logs.filter(
        Log.success == False
    ).count()

    avg_latency = recent_logs.with_entities(
        func.avg(Log.latency)
    ).scalar()

    max_latency = recent_logs.with_entities(
        func.max(Log.latency)
    ).scalar()

    min_latency = recent_logs.with_entities(
        func.min(Log.latency)
    ).scalar()

    success_rate = 0
    if total_logs > 0:
        success_rate = round(
            (success_logs / total_logs) * 100,
            2
        )
    return {
        "time_window_hours": hours,
        "services": {
            "total": total_services,
            "healthy": healthy_services,
            "down": down_services
        },
        "logs": {
            "total": total_logs,
            "successful": success_logs,
            "failed": failed_logs
        },
        "latency": {
            "average_ms": round(avg_latency, 2)
            if avg_latency else 0,
            "max_ms": round(max_latency, 2)
            if max_latency else 0,
            "min_ms": round(min_latency, 2)
            if min_latency else 0
        },
        "uptime": {
            "success_rate_percent": success_rate
        }
    }

@router.get("/services/{service_id}/logs")
async def get_logs(
    service_id: int,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):

    logs = db.query(Log).filter(
        Log.service_id == service_id
    ).order_by(
        Log.created_at.desc()
    ).offset(offset).limit(limit).all()

    return logs


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except:
        manager.disconnect(websocket)