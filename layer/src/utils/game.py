import random
from src.config import config

def calculate_loot_money(victim_balance: float) -> float:
    """Calculate money stolen from victim"""
    if victim_balance <= 0:
        return 0
    
    chance = random.randint(config.LOOT_MONEY_MIN, config.LOOT_MONEY_MAX)
    return round(victim_balance * (chance / 100), 2)

def should_loot_item(item_type: str) -> bool:
    """Determine if item should be looted based on probability"""
    if item_type == 'equipment':
        chance = random.randint(1, 100)
        return chance <= config.LOOT_EQUIPMENT_CHANCE
    elif item_type == 'artifact':
        chance = random.randint(1, 100)
        return chance <= config.LOOT_ARTIFACT_CHANCE
    return False

def should_lose_item_on_death() -> bool:
    """Determine if item is lost on death (1-20% chance)"""
    chance = random.randint(config.DEATH_ITEM_LOSS_MIN, config.DEATH_ITEM_LOSS_MAX)
    roll = random.randint(1, 100)
    return roll <= chance

def calculate_price_with_reputation(base_price: float, reputation: int) -> float:
    """Calculate price with reputation modifier"""
    # reputation: -100 to +100
    # modifier: -30% to +30%
    modifier = 1 + (reputation / 100) * 0.3
    return round(base_price * modifier, 2)
