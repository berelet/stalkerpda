import os
from typing import Optional

class Config:
    # Database
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = int(os.getenv('DB_PORT', 3306))
    DB_NAME = os.getenv('DB_NAME', 'pda_zone')
    DB_USER = os.getenv('DB_USER', 'pda_admin')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    
    # JWT
    JWT_SECRET = os.getenv('JWT_SECRET', 'change-me-in-production')
    JWT_ALGORITHM = 'HS256'
    JWT_EXPIRATION_HOURS = 24 * 7  # 7 days
    
    # Game Settings
    DEFAULT_LIVES = 4
    DEFAULT_BALANCE = 1000.0
    ARTIFACT_DETECTION_RADIUS = 15  # meters
    ARTIFACT_PICKUP_RADIUS = 2  # meters
    CONTROL_POINT_RADIUS = 2  # meters
    EXTRACTION_DURATION = 30  # seconds
    CAPTURE_DURATION = 30  # seconds
    
    # Looting Probabilities
    LOOT_MONEY_MIN = 1
    LOOT_MONEY_MAX = 50
    LOOT_EQUIPMENT_CHANCE = 5  # 1-5%
    LOOT_ARTIFACT_CHANCE = 3  # 1-3%
    DEATH_ITEM_LOSS_MIN = 1
    DEATH_ITEM_LOSS_MAX = 20  # 1-20%
    
    # Radiation
    MAX_RADIATION = 100
    RADIATION_CHECK_INTERVAL = 300  # 5 minutes in seconds

config = Config()
