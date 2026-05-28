import asyncio
from datetime import datetime
from sqlalchemy.orm import Session
import httpx

from services.cleanup import cleanup_old_logs
from core.config import settings
from database import SessionLocal
from models import Alert, Service, Log
from services.checker import check_url
from websocket.manager import manager


def apply_check_result(service, result, db):
    log = Log(
        service_id=service.id,
        status_code=result.get("status_code"),
        latency=result.get("latency"),
        success=result.get("success"),
        error=result.get("error")
    )
    
    service.last_latency = result.get("latency")
    service.last_status_code = result.get("status_code")
    service.last_checked = datetime.utcnow()
    db.add(log)

    if result["success"]:
        service.is_up = True
        service.failure_count = 0
    else:
        service.failure_count += 1

        if service.failure_count >= settings.FAILURE_THRESHOLD and service.is_up:
            service.is_up = False
            alert = Alert(
                service_id=service.id,
                message=f"{service.url} is DOWN",
                created_at=datetime.utcnow()
            )
            db.add(alert)

            return log, {
                "type": "ALERT",
                "service": service.url,
                "message": "Service DOWN"
            }, {
                "type": "STATUS_UPDATE",
                "service": service.url,
                "is_up": service.is_up,
                "latency": result.get("latency"),
                "status_code": result.get("status_code"),
                "failure_count": service.failure_count
            }

    return log, None, {
        "type": "STATUS_UPDATE",
        "service": service.url,
        "is_up": service.is_up,
        "latency": service.last_latency,
        "status_code": service.last_status_code,
        "failure_count": service.failure_count
    }

async def monitor_services():
    cleanup_counter = 0
    while True:
        db: Session = SessionLocal()
        try:
            services = db.query(Service).all()
            async with httpx.AsyncClient() as client:
                results = await asyncio.gather(
                    *[
                        check_url(service.url, client=client)
                        for service in services
                    ],
                    return_exceptions=True
                )

            for service, result in zip(services, results):
                if isinstance(result, Exception):
                    result = {
                        "success": False,
                        "error": str(result)
                    }

                _, alert_event, status_event = apply_check_result(service, result, db)

                if alert_event:
                    await manager.broadcast(alert_event)

                await manager.broadcast(status_event)

            db.commit()
            print(f"Checked {len(services)} services")
        except Exception as e:
            print("Monitor Error:", e)
        finally:
            db.close()


        cleanup_counter += 1
        if cleanup_counter >= settings.RETENTION_PERIOD:  # every 1 hour (120 * 30 sec)
            await cleanup_old_logs()
            cleanup_counter = 0

        
        await asyncio.sleep(settings.MONITOR_INTERVAL)
