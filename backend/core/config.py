from dotenv import load_dotenv
import os

load_dotenv()


class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL")

    MONITOR_INTERVAL = 30
    FAILURE_THRESHOLD = 3
    REQUEST_TIMEOUT = 10
    RETENTION_PERIOD = 120  # in seconds (1 hours)

settings = Settings()