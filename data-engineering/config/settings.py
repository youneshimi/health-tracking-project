"""
Configuration du module Data Engineering
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Charge .env
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings:
    """Configuration centralisée"""
    
    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '3306')
    DB_NAME = os.getenv('DB_NAME', 'health_db')
    DB_USER = os.getenv('DB_USER', 'app')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'app')
    
    # Data Generation
    NUM_USERS = int(os.getenv('NUM_USERS', 50))
    NUM_DAYS = int(os.getenv('NUM_DAYS', 30))
    
    # Thresholds
    HIGH_HR_THRESHOLD = int(os.getenv('HIGH_HR_THRESHOLD', 100))
    LOW_SLEEP_THRESHOLD = float(os.getenv('LOW_SLEEP_THRESHOLD', 6.0))
    LOW_ACTIVITY_THRESHOLD = int(os.getenv('LOW_ACTIVITY_THRESHOLD', 2000))
    
    # Paths
    DATA_RAW_PATH = BASE_DIR / 'data' / 'raw'
    DATA_PROCESSED_PATH = BASE_DIR / 'data' / 'processed'
    DATA_CLEANED_PATH = BASE_DIR / 'data' / 'cleaned'


settings = Settings()


if __name__ == "__main__":
    print(" Configuration Data Engineering")
    print("=" * 60)
    print(f"Database : {settings.DB_NAME}")
    print(f"Host     : {settings.DB_HOST}:{settings.DB_PORT}")
    print(f"Users    : {settings.NUM_USERS}")
    print(f"Days     : {settings.NUM_DAYS}")
    print("=" * 60)