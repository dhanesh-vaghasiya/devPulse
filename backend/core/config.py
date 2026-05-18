from dotenv import load_dotenv
import os

load_dotenv()


class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL")

    REQUEST_TIMEOUT = 10

    MONITOR_INTERVAL = 30


settings = Settings()