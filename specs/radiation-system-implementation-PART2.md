# Radiation & Death System - Part 2: Backend API

---

## 6. Backend API Endpoints

### 6.1 Location Update (Modified)

**Endpoint:** `POST /api/location/update`  
**Handler:** `src/handlers/location.py::update_handler`

**Request:**
```json
{
  "latitude": 50.123456,
  "longitude": 30.654321,
  "accuracy": 10.5
}
```

**Response:**
```json
{
  "success": true,
  "currentZones": {
    "radiationZones": [
      {
        "id": "zone-uuid",
        "name": "Reactor #4",
        "radiationLevel": 50,
        "insideZone": true,
        "timeInside": 120
      }
    ],
    "respawnZones": [
      {
        "id": "respawn-uuid",
        "name": "Medical Bay",
        "respawnTimeSeconds": 300,
        "insideZone": true,
        "progress": 45,
        "progressPercent": 15
      }
    ],
    "controlPoints": [...]
  },
  "nearbyArtifacts": [...],
  "radiationUpdate": {
    "current": 45.5,
    "delta": 2.3,
    "resist": 35
  },
  "resurrectionUpdate": {
    "progress": 45,
    "required": 300,
    "insideZone": true,
    "resurrected": false
  },
  "death": {
    "died": false
  }
}
```

**Logic Changes:**
```python
@require_auth
def update_handler(event, context):
    """POST /api/location/update - Update location + radiation + respawn"""
    
    player_id = event['player']['player_id']
    body = json.loads(event.get('body', '{}'))
    
    latitude = body.get('latitude')
    longitude = body.get('longitude')
    accuracy = body.get('accuracy')
    
    with get_db() as conn:
        with conn.cursor() as cursor:
            # Get player data
            cursor.execute("""
                SELECT id, status, current_lives, current_radiation,
                       current_radiation_zone_id, last_radiation_calc_at,
                       resurrection_progress_seconds, last_resurrection_calc_at
                FROM players WHERE id = %s
            """, (player_id,))
            player = cursor.fetchone()
            
            # Get previous location
            cursor.execute("""
                SELECT latitude, longitude, updated_at
                FROM player_locations WHERE player_id = %s
            """, (player_id,))
            prev_location = cursor.fetchone()
            
            P0 = prev_location if prev_location else None
            P1 = {'lat': latitude, 'lng': longitude}
            now = datetime.utcnow()
            
            # === RADIATION CALCULATION ===
            radiation_update = None
            death_event = None
            
            if player['status'] == 'alive':
                radiation_update = calculate_radiation_accrual(
                    cursor, player, P0, P1, now
                )
                
                # Check death
                if player['current_radiation'] >= 100:
                    death_event = trigger_death(
                        cursor, player, reason='radiation_zone'
                    )
            
            # === RESPAWN CALCULATION ===
            respawn_update = None
            
            if player['status'] == 'dead' and player['current_lives'] > 0:
                respawn_update = update_resurrection_progress(
                    cursor, player, P1, now
                )
            
            # === UPDATE LOCATION ===
            cursor.execute("""
                INSERT INTO player_locations (player_id, latitude, longitude, accuracy)
                VALUES (%s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                    latitude = VALUES(latitude),
                    longitude = VALUES(longitude),
                    accuracy = VALUES(accuracy),
                    updated_at = CURRENT_TIMESTAMP
            """, (player_id, latitude, longitude, accuracy))
            
            # === GET ZONES ===
            radiation_zones = get_active_radiation_zones_for_location(
                cursor, latitude, longitude, now
            )
            
            respawn_zones = get_active_respawn_zones_for_location(
                cursor, latitude, longitude, now
            )
            
            # === ARTIFACT DETECTION ===
            nearby_artifacts = detect_nearby_artifacts(
                cursor, latitude, longitude
            )
            
            # === QUEST PROGRESS ===
            update_quest_progress(cursor, player_id, latitude, longitude, now)
    
    return {
        'statusCode': 200,
        'headers': cors_headers(),
        'body': json.dumps({
            'success': True,
            'currentZones': {
                'radiationZones': radiation_zones,
                'respawnZones': respawn_zones
            },
            'nearbyArtifacts': nearby_artifacts,
            'radiationUpdate': radiation_update,
            'resurrectionUpdate': respawn_update,
            'death': death_event
        })
    }
```

### 6.2 Death Handler (Modified)

**Endpoint:** `POST /api/player/death`  
**Handler:** `src/handlers/players.py::death_handler`

**Request:** `{}` (empty body, uses JWT player_id)

**Response:**
```json
{
  "success": true,
  "livesRemaining": 3,
  "radiationReset": true,
  "itemsLost": [
    {"type": "equipment", "id": "uuid", "name": "Heavy Armor"},
    {"type": "artifact", "id": "uuid", "name": "Moonlight"}
  ],
  "outOfLives": false,
  "questsFailed": 2
}
```

**Logic:** Already implemented, just ensure it:
- Resets `current_radiation = 0`
- Clears `current_radiation_zone_id = NULL`
- Sets `dead_at = NOW()`
- Processes 1-10% item loss
- Fails active quests

### 6.3 Looting Handler (NEW)

**Endpoint:** `POST /api/player/loot`  
**Handler:** `src/handlers/players.py::loot_handler`

**Request:**
```json
{
  "victimQrCode": "STALKER_LOOT:victim-uuid"
}
```

**Response:**
```json
{
  "success": true,
  "itemsLooted": [
    {"type": "equipment", "name": "Light Armor"},
    {"type": "artifact", "name": "Droplet"}
  ],
  "victimName": "Stalker123"
}
```

**Errors:**
- `400 INVALID_QR` - QR code format invalid
- `404 PLAYER_NOT_FOUND` - Victim not found
- `400 PLAYER_NOT_DEAD` - Victim is alive
- `400 ALREADY_LOOTED` - Already looted this death

### 6.4 Get Player Profile (Modified)

**Endpoint:** `GET /api/auth/me`  
**Handler:** `src/handlers/auth.py::me_handler`

**Response (add fields):**
```json
{
  "id": "uuid",
  "nickname": "Stalker",
  "faction": "loner",
  "status": "alive",
  "balance": 5000,
  "reputation": 25,
  "currentLives": 4,
  "currentRadiation": 45.5,
  "currentWounds": 1,
  "qrCode": "data:image/png;base64,...",
  "stats": {...},
  "equipment": {...},
  "resurrectionProgress": {
    "seconds": 120,
    "required": 300,
    "percent": 40
  }
}
```

**Add QR code generation:**
```python
from src.utils.qr import generate_qr_code

@require_auth
def me_handler(event, context):
    player_id = event['player']['player_id']
    
    with get_db() as conn:
        with conn.cursor() as cursor:
            # ... existing query ...
            
            # Generate QR code
            qr_code_image = generate_qr_code(player_id)
            
            response = {
                # ... existing fields ...
                'qrCode': qr_code_image,
                'resurrectionProgress': {
                    'seconds': player['resurrection_progress_seconds'],
                    'required': None,  # Fetch from zone if inside
                    'percent': 0
                }
            }
    
    return {...}
```

---

## 7. Backend Utilities

### 7.1 Radiation Calculation (`src/utils/radiation.py`)

**New file:** `backend/src/utils/radiation.py`

```python
from src.utils.geo import haversine_distance, point_in_circle
from datetime import datetime
import math

def get_active_radiation_zones(cursor, now):
    """Get active radiation zones with cache"""
    # Check cache version
    cursor.execute("SELECT version FROM cache_versions WHERE cache_key = 'radiation_zones'")
    current_version = cursor.fetchone()['version']
    
    # ... cache logic ...
    
    cursor.execute("""
        SELECT id, name, center_lat, center_lng, radius, radiation_level
        FROM radiation_zones
        WHERE active = TRUE
          AND (active_from IS NULL OR active_from <= %s)
          AND (active_to IS NULL OR active_to > %s)
    """, (now, now))
    
    return cursor.fetchall()

def get_player_radiation_resist(cursor, player_id):
    """Calculate total radiation resist from equipped items"""
    
    # Get equipped items
    cursor.execute("""
        SELECT et.radiation_resist
        FROM player_equipment pe
        JOIN equipment_types et ON pe.equipment_type_id = et.id
        WHERE pe.player_id = %s AND pe.slot_type IN ('armor', 'addon1', 'addon2')
    """, (player_id,))
    
    equipment_resist = sum(row['radiation_resist'] for row in cursor.fetchall())
    
    # Get equipped artifact
    cursor.execute("""
        SELECT at.radiation_resist
        FROM artifacts a
        JOIN artifact_types at ON a.type_id = at.id
        WHERE a.owner_id = %s AND a.slot_type = 'artifact'
    """, (player_id,))
    
    artifact = cursor.fetchone()
    artifact_resist = artifact['radiation_resist'] if artifact else 0
    
    total_resist = equipment_resist + artifact_resist
    
    # Cap at 80%
    return min(total_resist, 80)

def calculate_time_in_zone(P0, P1, zone, delta_t):
    """
    Calculate time spent inside zone during movement P0→P1
    
    Returns: seconds inside zone
    """
    if not P0:
        # First tick - check if P1 is inside
        if point_in_circle(P1['lat'], P1['lng'], zone['center_lat'], zone['center_lng'], zone['radius']):
            return delta_t
        return 0
    
    # Calculate path distance
    path_meters = haversine_distance(P0['lat'], P0['lng'], P1['lat'], P1['lng'])
    
    if path_meters == 0:
        # No movement - check if inside
        if point_in_circle(P1['lat'], P1['lng'], zone['center_lat'], zone['center_lng'], zone['radius']):
            return delta_t
        return 0
    
    # Calculate segment intersection with circle
    inside_meters = calculate_segment_in_circle(
        P0['lat'], P0['lng'],
        P1['lat'], P1['lng'],
        zone['center_lat'], zone['center_lng'],
        zone['radius']
    )
    
    # Time = (inside_meters / path_meters) * delta_t
    time_inside = delta_t * (inside_meters / path_meters)
    
    return time_inside

def calculate_segment_in_circle(x1, y1, x2, y2, cx, cy, radius):
    """
    Calculate length of line segment inside circle
    
    Uses geometric intersection algorithm
    Returns: meters inside circle
    """
    # Convert to meters (approximate)
    # This is simplified - use proper projection for accuracy
    
    # Vector from P0 to P1
    dx = x2 - x1
    dy = y2 - y1
    
    # Vector from P0 to circle center
    fx = x1 - cx
    fy = y1 - cy
    
    # Quadratic equation coefficients
    a = dx*dx + dy*dy
    b = 2*(fx*dx + fy*dy)
    c = (fx*fx + fy*fy) - radius*radius
    
    discriminant = b*b - 4*a*c
    
    if discriminant < 0:
        # No intersection
        return 0
    
    # Calculate intersection points
    discriminant = math.sqrt(discriminant)
    t1 = (-b - discriminant) / (2*a)
    t2 = (-b + discriminant) / (2*a)
    
    # Clamp to [0, 1] (segment bounds)
    t1 = max(0, min(1, t1))
    t2 = max(0, min(1, t2))
    
    # Length inside = (t2 - t1) * segment_length
    segment_length = haversine_distance(x1, y1, x2, y2)
    inside_length = (t2 - t1) * segment_length
    
    return inside_length

def calculate_radiation_accrual(cursor, player, P0, P1, now):
    """
    Main radiation calculation function
    
    Returns: {
        'current': float,
        'delta': float,
        'resist': int,
        'zoneId': str | None,
        'zoneName': str | None
    }
    """
    # Get active zones
    zones = get_active_radiation_zones(cursor, now)
    
    # Calculate delta time
    if player['last_radiation_calc_at']:
        delta_t = (now - player['last_radiation_calc_at']).total_seconds()
    else:
        # First tick
        cursor.execute(
            "UPDATE players SET last_radiation_calc_at = %s WHERE id = %s",
            (now, player['id'])
        )
        return {
            'current': player['current_radiation'],
            'delta': 0,
            'resist': get_player_radiation_resist(cursor, player['id']),
            'zoneId': None,
            'zoneName': None
        }
    
    # Handle untracked period (1 m/s assumption)
    if P0:
        path_meters = haversine_distance(P0['lat'], P0['lng'], P1['lat'], P1['lng'])
        if path_meters > delta_t:
            delta_t = max(delta_t, path_meters / 1.0)
    
    # Zone selection (first-entered rule)
    current_zone_id = player['current_radiation_zone_id']
    current_zone = None
    
    if current_zone_id:
        # Check if still inside
        zone = next((z for z in zones if z['id'] == current_zone_id), None)
        if zone and P0:
            time_inside = calculate_time_in_zone(P0, P1, zone, delta_t)
            if time_inside > 0:
                current_zone = zone
            else:
                # Exited zone
                current_zone_id = None
    
    if not current_zone_id:
        # Find first-entered zone
        for zone in zones:
            if P0:
                time_inside = calculate_time_in_zone(P0, P1, zone, delta_t)
                if time_inside > 0:
                    current_zone = zone
                    current_zone_id = zone['id']
                    break
            else:
                # First tick - check if inside
                if point_in_circle(P1['lat'], P1['lng'], zone['center_lat'], zone['center_lng'], zone['radius']):
                    current_zone = zone
                    current_zone_id = zone['id']
                    break
    
    # Calculate radiation
    delta_rad = 0
    
    if current_zone:
        time_inside = calculate_time_in_zone(P0, P1, current_zone, delta_t)
        
        # Base rate: radiation_level per 5 minutes (300 sec)
        base_rate = current_zone['radiation_level'] / 300.0
        
        # Apply resist
        resist_pct = get_player_radiation_resist(cursor, player['id'])
        effective_rate = base_rate * (1 - resist_pct / 100.0)
        
        delta_rad = effective_rate * time_inside
    
    # Update player
    new_radiation = min(100, player['current_radiation'] + delta_rad)
    
    cursor.execute("""
        UPDATE players
        SET current_radiation = %s,
            current_radiation_zone_id = %s,
            last_radiation_calc_at = %s
        WHERE id = %s
    """, (new_radiation, current_zone_id, now, player['id']))
    
    return {
        'current': new_radiation,
        'delta': delta_rad,
        'resist': get_player_radiation_resist(cursor, player['id']),
        'zoneId': current_zone_id,
        'zoneName': current_zone['name'] if current_zone else None
    }
```

### 7.2 Respawn Calculation (`src/utils/respawn.py`)

**Extend existing file:** `backend/src/utils/respawn.py`

```python
def get_active_respawn_zones(cursor, now):
    """Get active respawn zones with cache"""
    # Check cache version
    cursor.execute("SELECT version FROM cache_versions WHERE cache_key = 'respawn_zones'")
    current_version = cursor.fetchone()['version']
    
    # ... cache logic ...
    
    cursor.execute("""
        SELECT id, name, center_lat, center_lng, radius, respawn_time_seconds
        FROM respawn_zones
        WHERE active = TRUE
          AND (active_from IS NULL OR active_from <= %s)
          AND (active_to IS NULL OR active_to > %s)
    """, (now, now))
    
    return cursor.fetchall()

def update_resurrection_progress(cursor, player, location, now):
    """
    Update resurrection timer for dead players
    
    Returns: {
        'progress': float,
        'required': int | None,
        'insideZone': bool,
        'resurrected': bool,
        'zoneName': str | None
    }
    """
    # Get active respawn zones
    zones = get_active_respawn_zones(cursor, now)
    
    # Check if inside any zone
    inside_zone = None
    for zone in zones:
        if point_in_circle(
            location['lat'], location['lng'],
            zone['center_lat'], zone['center_lng'],
            zone['radius']
        ):
            inside_zone = zone
            break
    
    # Calculate delta time
    if player['last_resurrection_calc_at']:
        delta_t = (now - player['last_resurrection_calc_at']).total_seconds()
    else:
        delta_t = 0
    
    # Update progress
    new_progress = player['resurrection_progress_seconds']
    resurrected = False
    
    if inside_zone:
        new_progress += delta_t
        
        # Check completion
        if new_progress >= inside_zone['respawn_time_seconds']:
            # Resurrect!
            cursor.execute("""
                UPDATE players
                SET status = 'alive',
                    resurrection_progress_seconds = 0,
                    dead_at = NULL,
                    last_resurrection_calc_at = %s
                WHERE id = %s
            """, (now, player['id']))
            
            # Create event
            cursor.execute("""
                INSERT INTO game_events (type, player_id, data)
                VALUES ('resurrection', %s, %s)
            """, (player['id'], json.dumps({
                'zone_id': inside_zone['id'],
                'zone_name': inside_zone['name']
            })))
            
            resurrected = True
            new_progress = 0
        else:
            # Update progress
            cursor.execute("""
                UPDATE players
                SET resurrection_progress_seconds = %s,
                    last_resurrection_calc_at = %s
                WHERE id = %s
            """, (new_progress, now, player['id']))
    else:
        # Not inside zone - just update timestamp
        cursor.execute("""
            UPDATE players
            SET last_resurrection_calc_at = %s
            WHERE id = %s
        """, (now, player['id']))
    
    return {
        'progress': new_progress,
        'required': inside_zone['respawn_time_seconds'] if inside_zone else None,
        'insideZone': inside_zone is not None,
        'resurrected': resurrected,
        'zoneName': inside_zone['name'] if inside_zone else None
    }
```

### 7.3 QR Code Generation (`src/utils/qr.py`)

**New file:** `backend/src/utils/qr.py`

```python
import qrcode
import io
import base64

def generate_qr_code(player_id):
    """
    Generate QR code for player looting
    
    Returns: data:image/png;base64,... string
    """
    # QR data format
    qr_data = f"STALKER_LOOT:{player_id}"
    
    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    # Create image
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    
    return f"data:image/png;base64,{img_str}"

def parse_qr_code(qr_code):
    """
    Parse QR code and extract player ID
    
    Returns: player_id or None
    """
    if not qr_code or not qr_code.startswith('STALKER_LOOT:'):
        return None
    
    try:
        player_id = qr_code.split(':')[1]
        return player_id
    except:
        return None
```

**Add to requirements.txt:**
```
qrcode==7.4.2
Pillow==10.2.0
```

---

**Continue in Part 3: Frontend UI, Admin Panel, Testing...**
