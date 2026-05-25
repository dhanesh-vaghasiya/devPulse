import asyncio
from datetime import datetime
from sqlalchemy.orm import Session

from database import SessionLocal
from models import Alert, Service, Log
from services.checker import check_url
async def check_and_store(service, db):
    from websocket_manager import manager
    result = await check_url(service.url)
    log = Log(
        service_id=service.id,
        status_code=result.get("status_code"),
        latency=result.get("latency"),
        success=result.get("success"),
        error=result.get("error")
    )

    # ---------- SERVICE HEALTH LOGIC ---------- #

    if result["success"]:
        service.is_up = True
        service.failure_count = 0

    else:
        service.failure_count += 1

        # threshold crossed
        if service.failure_count >= 3 and service.is_up:
            service.is_up = False
            alert = Alert(
                service_id=service.id,
                message=f"{service.url} is DOWN",
                created_at=datetime.utcnow()
            )
            db.add(alert)
            # ALERT EVENT
            await manager.broadcast({
                "type": "ALERT",
                "service": service.url,
                "message": "Service DOWN"
            })

    # ---------- UPDATE CURRENT STATE ---------- #
    service.last_latency = result.get("latency")
    service.last_status_code = result.get("status_code")
    service.last_checked = datetime.utcnow()
    db.add(log)

    # ---------- REGULAR STATUS UPDATE ---------- #

    await manager.broadcast({
        "type": "STATUS_UPDATE",
        "service": service.url,
        "is_up": service.is_up,
        "latency": service.last_latency,
        "status_code": service.last_status_code,
        "failure_count": service.failure_count
    })

async def monitor_services():
    while True:
        db: Session = SessionLocal()
        try:
            services = db.query(Service).all()
            tasks = [
                check_and_store(service, db)
                for service in services
            ]
            await asyncio.gather(*tasks)
            db.commit()
            print(f"Checked {len(services)} services")
        except Exception as e:
            print("Monitor Error:", e)
        finally:
            db.close()
        await asyncio.sleep(30)