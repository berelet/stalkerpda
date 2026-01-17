# Radiation & Death System - Implementation Spec

**Date:** 2026-01-17  
**Status:** Ready for Development  
**Based on:** `docs/features/radiation-death-respawn.md`, `specs/game-mechanics/FINAL-SPEC.md`

---

## 1. Overview

### 1.1 Scope

**Implementing:**
- ✅ Radiation accumulation from zones (continuous, tick-based)
- ✅ Radiation from artifact pickup (instant)
- ✅ Death by radiation (threshold 100)
- ✅ Respawn zones with resurrection timer
- ✅ Equipment-based resurrection (bonus lives)
- ✅ Item loss on death (1-10% all items)
- ✅ Looting system (QR scan, additional loss)
- ✅ Admin UI for radiation zones management
- ✅ Admin UI for respawn zones management
- ✅ PDA UI for radiation display and death state
- ✅ Zone respawn mechanics (auto-respawn after expiration)

**Out of Scope (Future):**
- ❌ Wounded state tracking
- ❌ Real-time WebSocket notifications (no cron jobs in MVP)
- ❌ Faction-specific respawn zones

### 1.2 Key Principles

1. **Tick-based tracking:** Location updates every 15 seconds
2. **Linear movement model:** Player moves in straight line P0→P1 between ticks
3. **No zone stacking:** Only first-entered zone applies radiation
4. **Resist from equipped items only:** Armor + 2 addons + artifact
5. **1 m/s assumption:** For untracked periods (phone off, no signal)
6. **Death = atomic transaction:** Lives decrement, radiation reset, item loss, quest failures
7. **Looting = additional loss:** Death loss (1-10%) + looting (1-5% equipment, 1-3% artifacts)

---

## 2. Database Schema Changes

### 2.1 Extend `players` Table

```sql
-- Migration: 008_radiation_system.sql

ALTER TABLE players
  -- Radiation tracking
  ADD COLUMN current_radiation_zone_id VARCHAR(36) NULL 
    COMMENT 'First-entered zone ID (no stacking)',
  ADD COLUMN last_radiation_calc_at TIMESTAMP NULL 
    COMMENT 'Last time radiation was calculated',
  
  -- Respawn tracking
  ADD COLUMN resurrection_progress_seconds FLOAT DEFAULT 0 
    COMMENT 'Time accumulated in respawn zone',
  ADD COLUMN last_resurrection_calc_at TIMESTAMP NULL 
    COMMENT 'Last time resurrection progress was updated',
  ADD COLUMN dead_at TIMESTAMP NULL 
    COMMENT 'When player died (for analytics)',
  
  -- Wounds (future feature)
  ADD COLUMN current_wounds INT DEFAULT 1 
    COMMENT 'Wound counter (default 1, not used in MVP)',
  
  -- Indexes
  ADD INDEX idx_radiation_zone (current_radiation_zone_id),
  ADD INDEX idx_status_lives (status, current_lives);
```

### 2.2 Extend `artifacts` Table

```sql
ALTER TABLE artifacts
  ADD COLUMN pickup_radiation INT DEFAULT 0 
    COMMENT 'Radiation applied on pickup (0-100)',
  
  ADD COLUMN pickup_radiation_variance INT DEFAULT 30 
    COMMENT 'Random variance % for pickup radiation (±30%)',
  
  -- Respawn mechanics (from artifact-respawn-spec.md)
  ADD COLUMN respawn_enabled BOOLEAN DEFAULT FALSE 
    COMMENT 'Auto-respawn after pickup',
  
  ADD COLUMN respawn_delay_seconds INT NULL 
    COMMENT 'Delay before respawn (seconds)',
  
  ADD COLUMN respawn_radius_meters INT NULL 
    COMMENT 'Respawn within radius from original spawn',
  
  ADD COLUMN last_respawn_at TIMESTAMP NULL 
    COMMENT 'Last respawn timestamp',
  
  ADD INDEX idx_respawn (respawn_enabled, state);
```

### 2.3 Extend `radiation_zones` Table

```sql
ALTER TABLE radiation_zones
  -- Time window (like artifacts)
  ADD COLUMN active_from TIMESTAMP NULL 
    COMMENT 'Zone becomes active at this time',
  
  ADD COLUMN active_to TIMESTAMP NULL 
    COMMENT 'Zone expires at this time',
  
  -- Respawn mechanics
  ADD COLUMN respawn_enabled BOOLEAN DEFAULT FALSE 
    COMMENT 'Auto-respawn zone after expiration',
  
  ADD COLUMN respawn_delay_seconds INT NULL 
    COMMENT 'Delay before zone respawns',
  
  ADD COLUMN respawn_radius_meters INT NULL 
    COMMENT 'Respawn within radius from center',
  
  ADD COLUMN last_respawn_at TIMESTAMP NULL 
    COMMENT 'Last respawn timestamp',
  
  ADD INDEX idx_active_time (active_from, active_to),
  ADD INDEX idx_respawn (respawn_enabled, active);
```

### 2.4 Create `respawn_zones` Table

```sql
CREATE TABLE respawn_zones (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  
  -- Location
  center_lat DECIMAL(10, 8) NOT NULL,
  center_lng DECIMAL(11, 8) NOT NULL,
  radius INT NOT NULL COMMENT 'Meters',
  
  -- Respawn settings
  respawn_time_seconds INT NOT NULL 
    COMMENT 'Required time inside zone to resurrect',
  
  -- Time window
  active_from TIMESTAMP NULL 
    COMMENT 'Zone becomes active at this time',
  active_to TIMESTAMP NULL 
    COMMENT 'Zone expires at this time',
  
  -- Respawn mechanics
  respawn_enabled BOOLEAN DEFAULT FALSE 
    COMMENT 'Auto-respawn zone after expiration',
  respawn_delay_seconds INT NULL 
    COMMENT 'Delay before zone respawns',
  respawn_radius_meters INT NULL 
    COMMENT 'Respawn within radius from center',
  last_respawn_at TIMESTAMP NULL 
    COMMENT 'Last respawn timestamp',
  
  -- Metadata
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE,
  
  FOREIGN KEY (created_by) REFERENCES players(id) ON DELETE CASCADE,
  
  INDEX idx_active (active),
  INDEX idx_active_time (active_from, active_to),
  INDEX idx_respawn (respawn_enabled, active),
  SPATIAL INDEX idx_location (center_lat, center_lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2.5 Extend `cache_versions` Table

```sql
-- Add new cache keys
INSERT INTO cache_versions (cache_key, version) 
VALUES 
  ('radiation_zones', 1),
  ('respawn_zones', 1)
ON DUPLICATE KEY UPDATE version = version;
```

---

## 3. Game Mechanics

### 3.1 Radiation Accumulation (Zone-based)

**Trigger:** Every location update (15 sec tick)

**Algorithm:**
```python
def calculate_radiation_accrual(player, P0, P1, now):
    """
    P0 = last location (lat, lng, timestamp)
    P1 = current location (lat, lng, timestamp)
    now = server timestamp
    """
    
    # 1. Get active radiation zones (cache)
    zones = get_active_radiation_zones(now)
    
    # 2. Calculate delta time
    if player.last_radiation_calc_at:
        delta_t = (now - player.last_radiation_calc_at).total_seconds()
    else:
        # First tick - no accrual
        player.last_radiation_calc_at = now
        return 0
    
    # 3. Calculate path distance
    path_meters = haversine_distance(P0, P1)
    
    # 4. Handle untracked period (1 m/s assumption)
    if path_meters > delta_t:
        # Player was not tracking (phone off)
        # Assume 1 m/s movement speed
        delta_t = max(delta_t, path_meters / 1.0)
    
    # 5. Zone selection (first-entered rule)
    if player.current_radiation_zone_id:
        # Check if still inside zone
        zone = get_zone_by_id(player.current_radiation_zone_id)
        if not zone or not is_segment_in_zone(P0, P1, zone):
            # Exited zone
            player.current_radiation_zone_id = None
    
    if not player.current_radiation_zone_id:
        # Find first-entered zone
        for zone in zones:
            entry_time = get_segment_entry_time(P0, P1, zone, delta_t)
            if entry_time is not None:
                player.current_radiation_zone_id = zone.id
                break
    
    # 6. Calculate time inside zone
    if player.current_radiation_zone_id:
        zone = get_zone_by_id(player.current_radiation_zone_id)
        time_inside = calculate_time_in_zone(P0, P1, zone, delta_t)
        
        # 7. Apply radiation with resist
        base_rate = zone.radiation_level / 300.0  # per second
        resist_pct = get_player_radiation_resist(player)  # from equipped items
        effective_rate = base_rate * (1 - resist_pct / 100.0)
        
        delta_rad = effective_rate * time_inside
        player.current_radiation = min(100, player.current_radiation + delta_rad)
    
    # 8. Update timestamp
    player.last_radiation_calc_at = now
    
    return player.current_radiation
```

**Key Functions:**
- `get_active_radiation_zones(now)` - cached, checks `active_from <= now < active_to`
- `is_segment_in_zone(P0, P1, zone)` - checks if any part of segment is inside circle
- `get_segment_entry_time(P0, P1, zone, delta_t)` - calculates when segment enters zone
- `calculate_time_in_zone(P0, P1, zone, delta_t)` - calculates time spent inside zone
- `get_player_radiation_resist(player)` - sums resist from equipped items (armor + addons + artifact)

### 3.2 Radiation from Artifact Pickup

**Trigger:** Artifact pickup (POST `/api/artifacts/{id}/pickup`)

**Algorithm:**
```python
def apply_artifact_radiation(player, artifact):
    """Apply instant radiation from artifact pickup"""
    
    # 1. Get base radiation with random variance
    base_radiation = artifact.pickup_radiation
    variance_pct = artifact.pickup_radiation_variance  # default 30%
    
    # Random: ±variance%
    import random
    variance = random.uniform(-variance_pct, variance_pct) / 100.0
    actual_radiation = base_radiation * (1 + variance)
    
    # 2. Apply resist
    resist_pct = get_player_radiation_resist(player)
    effective_radiation = actual_radiation * (1 - resist_pct / 100.0)
    
    # 3. Add to current radiation
    player.current_radiation = min(100, player.current_radiation + effective_radiation)
    
    # 4. Check death
    if player.current_radiation >= 100:
        trigger_death(player, reason='radiation_artifact')
    
    return effective_radiation
```

### 3.3 Death by Radiation

**Trigger:** `current_radiation >= 100`

**Effects (atomic transaction):**
```python
def trigger_death(player, reason='radiation_zone'):
    """
    Atomic death transaction
    reason: 'radiation_zone' | 'radiation_artifact' | 'player_kill'
    """
    
    # 1. Decrement lives
    player.current_lives = max(0, player.current_lives - 1)
    
    # 2. Reset radiation
    player.current_radiation = 0
    
    # 3. Clear radiation zone tracking
    player.current_radiation_zone_id = None
    
    # 4. Set status
    if player.current_lives == 0:
        player.status = 'dead'
    else:
        player.status = 'alive'  # Can respawn
    
    # 5. Record death time
    player.dead_at = now()
    
    # 6. Item loss (1-10% all items)
    lost_items = process_death_item_loss(player)
    
    # 7. Fail active quests
    failed_quests = fail_player_quests(player, reason='player_death')
    
    # 8. Complete elimination quests targeting this player
    completed_eliminations = complete_elimination_quests_for_target(player)
    
    # 9. Create death event
    create_game_event('death', player.id, {
        'reason': reason,
        'livesRemaining': player.current_lives,
        'itemsLost': lost_items,
        'questsFailed': failed_quests
    })
    
    return {
        'livesRemaining': player.current_lives,
        'outOfLives': player.current_lives == 0,
        'itemsLost': lost_items,
        'questsFailed': failed_quests
    }
```

**Item Loss Logic:**
```python
def process_death_item_loss(player):
    """1-10% chance to lose each item (equipment + artifacts)"""
    import random
    
    lost_items = []
    
    # Equipment (all slots including backpack)
    for equipment in player.equipment:
        if random.randint(1, 100) <= 10:  # 1-10% chance
            # If equipped, remove bonuses first
            if equipment.slot_type != 'backpack':
                unequip_item(player, equipment)
            
            # Delete item
            delete_equipment(equipment.id)
            lost_items.append({'type': 'equipment', 'id': equipment.id, 'name': equipment.name})
    
    # Artifacts (all - equipped + backpack)
    for artifact in player.artifacts:
        if random.randint(1, 100) <= 10:  # 1-10% chance
            # If equipped, remove bonuses first
            if artifact.slot_type == 'artifact':
                unequip_artifact(player, artifact)
            
            # Mark as lost
            artifact.state = 'lost'
            artifact.owner_id = None
            lost_items.append({'type': 'artifact', 'id': artifact.id, 'name': artifact.name})
    
    return lost_items
```

---

## 4. Respawn System

### 4.1 Resurrection Timer

**Trigger:** Every location update (15 sec tick) for dead players

**Conditions:**
- `player.status == 'dead'`
- `player.current_lives > 0` (eligible to respawn)
- Player inside active respawn zone

**Algorithm:**
```python
def update_resurrection_progress(player, location, now):
    """Update resurrection timer for dead players"""
    
    # Only for dead players with lives > 0
    if player.status != 'dead' or player.current_lives <= 0:
        return None
    
    # Get active respawn zones (cache)
    zones = get_active_respawn_zones(now)
    
    # Check if inside any respawn zone
    inside_zone = None
    for zone in zones:
        if point_in_circle(location, zone.center, zone.radius):
            inside_zone = zone
            break
    
    # Calculate delta time
    if player.last_resurrection_calc_at:
        delta_t = (now - player.last_resurrection_calc_at).total_seconds()
    else:
        delta_t = 0
    
    # Update progress
    if inside_zone:
        player.resurrection_progress_seconds += delta_t
        
        # Check completion
        if player.resurrection_progress_seconds >= inside_zone.respawn_time_seconds:
            # Resurrect!
            player.status = 'alive'
            player.resurrection_progress_seconds = 0
            player.dead_at = None
            
            create_game_event('resurrection', player.id, {
                'zone_id': inside_zone.id,
                'zone_name': inside_zone.name
            })
            
            return {'resurrected': True, 'zone': inside_zone.name}
    
    # Update timestamp
    player.last_resurrection_calc_at = now
    
    return {
        'progress': player.resurrection_progress_seconds,
        'required': inside_zone.respawn_time_seconds if inside_zone else None,
        'insideZone': inside_zone is not None
    }
```

### 4.2 Equipment-based Resurrection

**Trigger:** Equipping item with `bonus_lives > 0` while dead

**Logic:**
```python
def equip_item(player, item):
    """Equip item and apply bonuses"""
    
    # ... normal equip logic ...
    
    # Apply bonus lives
    if item.bonus_lives > 0:
        player.current_lives += item.bonus_lives
        
        # Check resurrection
        if player.status == 'dead' and player.current_lives > 0:
            # Player becomes eligible to respawn
            # (still needs to go to respawn zone)
            create_game_event('lives_restored', player.id, {
                'item_id': item.id,
                'item_name': item.name,
                'lives': player.current_lives
            })
```

**Unequip Logic:**
```python
def unequip_item(player, item):
    """Unequip item and remove bonuses"""
    
    # Remove bonus lives
    if item.bonus_lives > 0:
        player.current_lives -= item.bonus_lives
        
        # Check death
        if player.current_lives <= 0:
            player.status = 'dead'
            player.dead_at = now()
            
            create_game_event('death_by_unequip', player.id, {
                'item_id': item.id,
                'item_name': item.name,
                'lives': player.current_lives
            })
    
    # ... normal unequip logic ...
```

---

## 5. Looting System

### 5.1 QR Code Generation

**Current:** Players have `qr_code` field (unique string)  
**Need:** Generate actual QR code image

**Implementation:**
```python
import qrcode
import io
import base64

def generate_qr_code(player_id):
    """Generate QR code for player looting"""
    
    # QR data: player ID
    qr_data = f"STALKER_LOOT:{player_id}"
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"
```

### 5.2 Looting Process

**Endpoint:** `POST /api/player/loot`  
**Body:** `{ "victimQrCode": "STALKER_LOOT:uuid" }`

**Algorithm:**
```python
def loot_player(looter_id, victim_qr_code):
    """Loot dead player via QR scan"""
    
    # 1. Parse QR code
    if not victim_qr_code.startswith('STALKER_LOOT:'):
        return error('INVALID_QR')
    
    victim_id = victim_qr_code.split(':')[1]
    
    # 2. Get victim
    victim = get_player(victim_id)
    if not victim:
        return error('PLAYER_NOT_FOUND')
    
    # 3. Check if victim is dead
    if victim.status != 'dead':
        return error('PLAYER_NOT_DEAD')
    
    # 4. Check if already looted
    if check_already_looted(victim_id, victim.dead_at):
        return error('ALREADY_LOOTED')
    
    # 5. Loot items (additional loss)
    looted_items = []
    
    # Equipment: 1-5% chance per item
    for equipment in victim.equipment:
        if random.randint(1, 100) <= 5:
            # Transfer to looter
            equipment.player_id = looter_id
            equipment.slot_type = 'backpack'  # Goes to backpack
            looted_items.append({'type': 'equipment', 'name': equipment.name})
    
    # Artifacts: 1-3% chance per item
    for artifact in victim.artifacts:
        if random.randint(1, 100) <= 3:
            # Transfer to looter
            artifact.owner_id = looter_id
            artifact.slot_type = 'backpack'  # Goes to backpack
            looted_items.append({'type': 'artifact', 'name': artifact.name})
    
    # 6. Record looting event
    create_game_event('looting', looter_id, {
        'victim_id': victim_id,
        'items_looted': looted_items
    })
    
    # 7. Mark as looted (prevent double-looting)
    create_loot_record(victim_id, looter_id, victim.dead_at)
    
    return {
        'success': True,
        'itemsLooted': looted_items
    }
```

**Loot Tracking Table:**
```sql
CREATE TABLE loot_events (
  id VARCHAR(36) PRIMARY KEY,
  victim_id VARCHAR(36) NOT NULL,
  looter_id VARCHAR(36) NOT NULL,
  death_timestamp TIMESTAMP NOT NULL,
  looted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (victim_id) REFERENCES players(id),
  FOREIGN KEY (looter_id) REFERENCES players(id),
  
  UNIQUE KEY unique_loot (victim_id, death_timestamp),
  INDEX idx_victim (victim_id)
) ENGINE=InnoDB;
```

---

**Continue in Part 2: Backend API, Frontend UI, Admin Panel...**
