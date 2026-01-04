"""
Inventory utilities for equipment slots and backpack management
"""
from typing import Dict, List, Optional, Tuple


def calculate_total_bonuses(player_id: str, conn) -> Dict:
    """Calculate total wounds, rad resist, bonus lives from equipped items"""
    cursor = conn.cursor()
    
    # Get equipment bonuses
    cursor.execute("""
        SELECT 
            COALESCE(SUM(et.bonus_wounds), 0) as total_wounds,
            COALESCE(SUM(et.radiation_resist), 0) as total_equipment_rad_resist
        FROM player_equipment pe
        JOIN equipment_types et ON pe.equipment_type_id = et.id
        WHERE pe.player_id = %s AND pe.slot_type != 'backpack'
    """, (player_id,))
    
    equipment_bonuses = cursor.fetchone()
    
    # Get artifact bonuses from player_inventory
    cursor.execute("""
        SELECT 
            COALESCE(SUM(at.radiation_resist), 0) as total_artifact_rad_resist,
            COALESCE(SUM(at.bonus_lives), 0) as total_bonus_lives
        FROM player_inventory pi
        JOIN artifact_types at ON pi.item_id = at.id
        WHERE pi.player_id = %s AND pi.item_type = 'artifact' AND pi.slot_type = 'artifact'
    """, (player_id,))
    
    artifact_bonuses = cursor.fetchone()
    
    return {
        'wounds': int(equipment_bonuses['total_wounds']),
        'radiationResist': int(equipment_bonuses['total_equipment_rad_resist'] + artifact_bonuses['total_artifact_rad_resist']),
        'bonusLives': int(artifact_bonuses['total_bonus_lives'])
    }


def get_equipped_items(player_id: str, conn) -> Dict:
    """Get all equipped items (armor, rings, artifact)"""
    cursor = conn.cursor()
    
    # Get equipment
    cursor.execute("""
        SELECT 
            pe.id,
            pe.equipment_type_id,
            et.name,
            et.category,
            pe.slot_type,
            pe.slot_position,
            et.bonus_wounds,
            et.radiation_resist,
            et.base_price
        FROM player_equipment pe
        JOIN equipment_types et ON pe.equipment_type_id = et.id
        WHERE pe.player_id = %s AND pe.slot_type != 'backpack'
        ORDER BY pe.slot_type, pe.slot_position
    """, (player_id,))
    
    equipment = cursor.fetchall()
    
    # Get equipped artifact from player_inventory
    cursor.execute("""
        SELECT 
            pi.id,
            pi.item_id as type_id,
            at.name,
            at.rarity,
            at.base_value,
            at.bonus_lives,
            at.radiation_resist
        FROM player_inventory pi
        JOIN artifact_types at ON pi.item_id = at.id
        WHERE pi.player_id = %s AND pi.item_type = 'artifact' AND pi.slot_type = 'artifact'
    """, (player_id,))
    
    artifact = cursor.fetchone()
    
    # Organize by slots
    result = {
        'armor': None,
        'addons': [],
        'artifact': None
    }
    
    for item in equipment:
        if item['slot_type'] == 'armor':
            result['armor'] = {
                'id': item['id'],
                'typeId': item['equipment_type_id'],
                'name': item['name'],
                'category': 'armor',
                'itemType': 'equipment',
                'bonusWounds': item['bonus_wounds'],
                'radiationResist': item['radiation_resist'],
                'basePrice': float(item['base_price'])
            }
        elif item['slot_type'] == 'addon':
            result['addons'].append({
                'id': item['id'],
                'typeId': item['equipment_type_id'],
                'name': item['name'],
                'category': 'addon',
                'itemType': 'equipment',
                'radiationResist': item['radiation_resist'],
                'slotPosition': item['slot_position'],
                'basePrice': float(item['base_price'])
            })
    
    if artifact:
        result['artifact'] = {
            'id': artifact['id'],
            'typeId': artifact['type_id'],
            'name': artifact['name'],
            'rarity': artifact['rarity'],
            'itemType': 'artifact',
            'value': float(artifact['base_value']),
            'effects': {
                'bonusLives': artifact['bonus_lives'],
                'radiationResist': artifact['radiation_resist']
            }
        }
    
    return result


def get_backpack_items(player_id: str, conn) -> Tuple[List[Dict], int]:
    """Get all backpack items with count"""
    cursor = conn.cursor()
    
    # Get equipment in backpack
    cursor.execute("""
        SELECT 
            pe.id,
            pe.equipment_type_id as type_id,
            et.name,
            et.category,
            et.bonus_wounds,
            et.radiation_resist,
            et.radiation_removal,
            et.base_price,
            'equipment' as item_type
        FROM player_equipment pe
        JOIN equipment_types et ON pe.equipment_type_id = et.id
        WHERE pe.player_id = %s AND pe.slot_type = 'backpack'
    """, (player_id,))
    
    equipment_items = cursor.fetchall()
    
    # Get artifacts from player_inventory (each as separate record)
    cursor.execute("""
        SELECT 
            pi.id,
            pi.item_id as type_id,
            at.name,
            at.rarity,
            at.base_value as base_price,
            at.bonus_lives,
            at.radiation_resist,
            at.image_url,
            at.description,
            'artifact' as item_type
        FROM player_inventory pi
        JOIN artifact_types at ON pi.item_id = at.id
        WHERE pi.player_id = %s AND pi.item_type = 'artifact' AND pi.slot_type = 'backpack'
    """, (player_id,))
    
    artifact_items = cursor.fetchall()
    
    # Combine and format
    backpack = []
    
    for item in equipment_items:
        backpack.append({
            'id': item['id'],
            'typeId': item['type_id'],
            'name': item['name'],
            'category': item['category'],
            'itemType': 'equipment',
            'bonusWounds': item['bonus_wounds'],
            'radiationResist': item['radiation_resist'],
            'radiationRemoval': item['radiation_removal'],
            'basePrice': float(item['base_price'])
        })
    
    # Each artifact is a separate record
    for item in artifact_items:
        backpack.append({
            'id': item['id'],  # Real player_inventory.id
            'typeId': item['type_id'],
            'name': item['name'],
            'rarity': item['rarity'],
            'itemType': 'artifact',
            'value': float(item['base_price']),
            'imageUrl': item['image_url'],
            'description': item['description'],
            'effects': {
                'bonusLives': item['bonus_lives'],
                'radiationResist': item['radiation_resist']
            }
        })
    
    return backpack, len(backpack)


def check_backpack_capacity(player_id: str, conn) -> Tuple[int, int, bool]:
    """Check if backpack has free space. Returns (current, max, has_space)"""
    cursor = conn.cursor()
    
    # Get current count
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM player_equipment
        WHERE player_id = %s AND slot_type = 'backpack'
    """, (player_id,))
    
    equipment_count = cursor.fetchone()['count']
    
    cursor.execute("""
        SELECT COUNT(*) as count
        FROM player_inventory
        WHERE player_id = %s AND item_type = 'artifact' AND slot_type = 'backpack'
    """, (player_id,))
    
    artifact_count = cursor.fetchone()['count']
    
    # Get capacity
    cursor.execute("""
        SELECT backpack_capacity
        FROM players
        WHERE id = %s
    """, (player_id,))
    
    capacity = cursor.fetchone()['backpack_capacity']
    
    current = equipment_count + artifact_count
    has_space = current < capacity
    
    return current, capacity, has_space


def equip_item(player_id: str, item_id: str, item_type: str, conn) -> Dict:
    """
    Equip item logic with slot replacement
    Returns: {'success': bool, 'equipped': dict, 'replaced': dict or None, 'error': str or None}
    """
    cursor = conn.cursor()
    
    if item_type == 'equipment':
        # Get item details
        cursor.execute("""
            SELECT pe.id, pe.equipment_type_id, et.category
            FROM player_equipment pe
            JOIN equipment_types et ON pe.equipment_type_id = et.id
            WHERE pe.id = %s AND pe.player_id = %s AND pe.slot_type = 'backpack'
        """, (item_id, player_id))
        
        item = cursor.fetchone()
        if not item:
            return {'success': False, 'error': 'Item not found in backpack'}
        
        category = item['category']
        
        # Determine target slot
        if category == 'armor':
            slot_type = 'armor'
            slot_position = 0
        elif category == 'addon':
            # Find empty ring slot or replace ring1
            cursor.execute("""
                SELECT slot_position
                FROM player_equipment
                WHERE player_id = %s AND slot_type = 'addon'
                ORDER BY slot_position
            """, (player_id,))
            
            occupied_slots = [row['slot_position'] for row in cursor.fetchall()]
            
            if 1 not in occupied_slots:
                slot_position = 1
            elif 2 not in occupied_slots:
                slot_position = 2
            else:
                slot_position = 1  # Replace ring1
            
            slot_type = 'addon'
        elif category == 'consumable':
            return {'success': False, 'error': 'Consumables cannot be equipped'}
        else:
            return {'success': False, 'error': 'Unknown item category'}
        
        # Check if slot occupied
        cursor.execute("""
            SELECT id
            FROM player_equipment
            WHERE player_id = %s AND slot_type = %s AND slot_position = %s
        """, (player_id, slot_type, slot_position))
        
        occupied = cursor.fetchone()
        replaced_item = None
        
        if occupied:
            # Move to backpack
            current, capacity, has_space = check_backpack_capacity(player_id, conn)
            if not has_space:
                return {'success': False, 'error': 'Backpack is full'}
            
            cursor.execute("""
                UPDATE player_equipment
                SET slot_type = 'backpack', slot_position = 0
                WHERE id = %s
            """, (occupied['id'],))
            
            replaced_item = {'id': occupied['id']}
        
        # Equip item
        cursor.execute("""
            UPDATE player_equipment
            SET slot_type = %s, slot_position = %s
            WHERE id = %s
        """, (slot_type, slot_position, item_id))
        
        conn.commit()
        
        return {
            'success': True,
            'equipped': {'id': item_id, 'slot': slot_type, 'position': slot_position},
            'replaced': replaced_item
        }
    
    elif item_type == 'artifact':
        # Check if artifact in player_inventory with slot_type='backpack'
        cursor.execute("""
            SELECT id, item_id
            FROM player_inventory
            WHERE id = %s AND player_id = %s AND item_type = 'artifact' AND slot_type = 'backpack'
        """, (item_id, player_id))
        
        artifact = cursor.fetchone()
        if not artifact:
            return {'success': False, 'error': 'Artifact not found in backpack'}
        
        # Check if artifact slot occupied
        cursor.execute("""
            SELECT id
            FROM player_inventory
            WHERE player_id = %s AND item_type = 'artifact' AND slot_type = 'artifact'
        """, (player_id,))
        
        occupied = cursor.fetchone()
        replaced_item = None
        
        if occupied:
            # Move to backpack
            current, capacity, has_space = check_backpack_capacity(player_id, conn)
            if not has_space:
                return {'success': False, 'error': 'Backpack is full'}
            
            cursor.execute("""
                UPDATE player_inventory
                SET slot_type = 'backpack'
                WHERE id = %s
            """, (occupied['id'],))
            
            replaced_item = {'id': occupied['id']}
        
        # Equip artifact
        cursor.execute("""
            UPDATE player_inventory
            SET slot_type = 'artifact'
            WHERE id = %s
        """, (item_id,))
        
        conn.commit()
        
        return {
            'success': True,
            'equipped': {'id': item_id, 'slot': 'artifact'},
            'replaced': replaced_item
        }
    
    return {'success': False, 'error': 'Invalid item type'}


def unequip_item(player_id: str, item_id: str, item_type: str, conn) -> Dict:
    """
    Unequip item logic with lives check
    Returns: {'success': bool, 'unequipped': dict, 'error': str or None}
    """
    cursor = conn.cursor()
    
    # Check backpack space
    current, capacity, has_space = check_backpack_capacity(player_id, conn)
    if not has_space:
        return {'success': False, 'error': 'Backpack is full'}
    
    if item_type == 'equipment':
        # Check if equipped
        cursor.execute("""
            SELECT id, slot_type
            FROM player_equipment
            WHERE id = %s AND player_id = %s AND slot_type != 'backpack'
        """, (item_id, player_id))
        
        item = cursor.fetchone()
        if not item:
            return {'success': False, 'error': 'Item not equipped'}
        
        # Unequip
        cursor.execute("""
            UPDATE player_equipment
            SET slot_type = 'backpack', slot_position = 0
            WHERE id = %s
        """, (item_id,))
        
        conn.commit()
        
        return {
            'success': True,
            'unequipped': {'id': item_id, 'slot': item['slot_type']}
        }
    
    elif item_type == 'artifact':
        # Check if equipped in player_inventory
        cursor.execute("""
            SELECT id, item_id
            FROM player_inventory
            WHERE id = %s AND player_id = %s AND item_type = 'artifact' AND slot_type = 'artifact'
        """, (item_id, player_id))
        
        artifact = cursor.fetchone()
        if not artifact:
            return {'success': False, 'error': 'Artifact not equipped'}
        
        # Get bonus lives before unequipping
        cursor.execute("""
            SELECT bonus_lives
            FROM artifact_types
            WHERE id = %s
        """, (artifact['item_id'],))
        
        bonus_lives = cursor.fetchone()['bonus_lives']
        
        # Unequip
        cursor.execute("""
            UPDATE player_inventory
            SET slot_type = 'backpack'
            WHERE id = %s
        """, (item_id,))
        
        # Update player lives
        if bonus_lives > 0:
            cursor.execute("""
                UPDATE players
                SET current_lives = current_lives - %s
                WHERE id = %s
            """, (bonus_lives, player_id))
            
            # Check if player died
            cursor.execute("""
                SELECT current_lives, status
                FROM players
                WHERE id = %s
            """, (player_id,))
            
            player = cursor.fetchone()
            
            if player['current_lives'] <= 0:
                cursor.execute("""
                    UPDATE players
                    SET status = 'dead'
                    WHERE id = %s
                """, (player_id,))
        
        conn.commit()
        
        return {
            'success': True,
            'unequipped': {'id': item_id, 'slot': 'artifact', 'bonusLivesRemoved': bonus_lives}
        }
    
    return {'success': False, 'error': 'Invalid item type'}


def update_player_lives_from_equipment(player_id: str, conn):
    """Recalculate currentLives based on equipped items with bonusLives"""
    bonuses = calculate_total_bonuses(player_id, conn)
    
    cursor = conn.cursor()
    
    # Get base lives (this should be tracked separately, for now we'll just update)
    # Note: This is a simplified version. In production, track base_lives separately
    cursor.execute("""
        SELECT current_lives
        FROM players
        WHERE id = %s
    """, (player_id,))
    
    current = cursor.fetchone()['current_lives']
    
    # Lives are managed by equip/unequip operations
    # This function is mainly for validation/recalculation if needed
    
    return bonuses['bonusLives']


def update_cached_bonuses(player_id: str, conn):
    """
    Recalculate and update cached bonuses in players table
    Called after: equip, unequip, drop (if equipped), death, looting
    """
    cursor = conn.cursor()
    
    # Calculate equipment bonuses
    cursor.execute("""
        SELECT 
            COALESCE(SUM(et.bonus_wounds), 0) as total_wounds,
            COALESCE(SUM(et.radiation_resist), 0) as total_equipment_rad_resist
        FROM player_equipment pe
        JOIN equipment_types et ON pe.equipment_type_id = et.id
        WHERE pe.player_id = %s AND pe.slot_type != 'backpack'
    """, (player_id,))
    
    equipment = cursor.fetchone()
    
    # Calculate artifact bonuses
    cursor.execute("""
        SELECT 
            COALESCE(SUM(at.radiation_resist), 0) as total_artifact_rad_resist,
            COALESCE(SUM(at.bonus_lives), 0) as total_bonus_lives
        FROM player_inventory pi
        JOIN artifact_types at ON pi.item_id = at.id
        WHERE pi.player_id = %s AND pi.item_type = 'artifact' AND pi.slot_type = 'artifact'
    """, (player_id,))
    
    artifacts = cursor.fetchone()
    
    # Update cache
    cursor.execute("""
        UPDATE players
        SET cached_bonus_wounds = %s,
            cached_radiation_resist = %s,
            cached_bonus_lives = %s
        WHERE id = %s
    """, (
        int(equipment['total_wounds']),
        int(equipment['total_equipment_rad_resist'] + artifacts['total_artifact_rad_resist']),
        int(artifacts['total_bonus_lives']),
        player_id
    ))
    
    conn.commit()

