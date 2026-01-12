"""
Reputation system utilities
"""
from typing import Optional

def get_reputation(cursor, player_id: str, npc_id: Optional[str] = None, 
                  faction: Optional[str] = None) -> int:
    """Get player's reputation with NPC or faction"""
    if npc_id:
        cursor.execute("""
            SELECT reputation FROM npc_reputation 
            WHERE player_id = %s AND npc_id = %s
        """, (player_id, npc_id))
    elif faction:
        cursor.execute("""
            SELECT reputation FROM npc_reputation 
            WHERE player_id = %s AND faction = %s AND npc_id IS NULL
        """, (player_id, faction))
    else:
        return 0
    
    row = cursor.fetchone()
    return row['reputation'] if row else 0


def add_reputation(cursor, player_id: str, amount: int, 
                  npc_id: Optional[str] = None, faction: Optional[str] = None):
    """Add reputation to player (NPC-specific or faction-wide)"""
    import uuid
    
    if npc_id:
        cursor.execute("""
            INSERT INTO npc_reputation (id, player_id, npc_id, reputation)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE reputation = reputation + %s
        """, (str(uuid.uuid4()), player_id, npc_id, amount, amount))
    elif faction:
        cursor.execute("""
            INSERT INTO npc_reputation (id, player_id, faction, reputation)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE reputation = reputation + %s
        """, (str(uuid.uuid4()), player_id, faction, amount, amount))


def calculate_discount(reputation: int) -> int:
    """
    Calculate commission discount based on reputation.
    1% discount per 100 reputation, max 100% at 10,000 rep.
    """
    return min(100, max(0, reputation // 100))


def get_trader_discount(cursor, player_id: str, trader_id: str) -> int:
    """Get discount for player when trading with specific trader"""
    # Check NPC-specific reputation first
    npc_rep = get_reputation(cursor, player_id, npc_id=trader_id)
    if npc_rep > 0:
        return calculate_discount(npc_rep)
    
    # Check faction-wide reputation
    cursor.execute("SELECT faction FROM traders WHERE id = %s", (trader_id,))
    row = cursor.fetchone()
    if row and row['faction']:
        faction_rep = get_reputation(cursor, player_id, faction=row['faction'])
        return calculate_discount(faction_rep)
    
    return 0
