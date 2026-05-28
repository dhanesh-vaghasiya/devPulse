from dotenv import load_dotenv
import os

load_dotenv()


class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL")
    ALLOWED_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]

    MONITOR_INTERVAL = 30
    FAILURE_THRESHOLD = 3
    REQUEST_TIMEOUT = 10
    RETENTION_PERIOD = 120  # in seconds (1 hours)

settings = Settings()