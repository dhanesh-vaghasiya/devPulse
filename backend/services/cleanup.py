from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Log

async def cleanup_old_logs():
    db: Session = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(days=30)
        deleted = db.query(Log).filter(
            Log.created_at < cutoff
        ).delete(synchronize_session=False)
        db.commit()
        print(f"Deleted {deleted} old logs")

    except Exception as e:

        print("Cleanup Error:", e)

    finally:

        db.close()