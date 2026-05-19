# routes/monitor.py

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, HttpUrl
from sqlalchemy.orm import Session

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


# Check service manually
@router.post("/services/{service_id}/check")
async def check_service(
    service_id: int,
    db: Session = Depends(get_db)
):

    # find service
    service = db.query(Service).filter(
        Service.id == service_id
    ).first()

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    # check URL
    result = await check_url(service.url)

    # save monitoring log
    log = Log(
        service_id=service.id,
        status_code=result.get("status_code"),
        latency=result.get("latency"),
        success=result.get("success"),
        error=result.get("error")
    )

    db.add(log)
    db.commit()

    return {
        "service": service.url,
        "result": result
    }


# Get logs for a service
@router.get("/services/{service_id}/logs")
async def get_logs(
    service_id: int,
    db: Session = Depends(get_db)
):

    service = db.query(Service).filter(
        Service.id == service_id
    ).first()

    if not service:
        raise HTTPException(
            status_code=404,
            detail="Service not found"
        )

    logs = db.query(Log).filter(
        Log.service_id == service_id
    ).all()

    return {
        "service": service.url,
        "logs": logs
    }

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()

    except:
        manager.disconnect(websocket)