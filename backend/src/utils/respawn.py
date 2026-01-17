"""
Artifact and zone respawn utilities
"""
import math
import random
import json
from datetime import datetime, timedelta
from typing import Tuple
from src.utils.geo import point_in_circle

def random_point_in_radius(center_lat: float, center_lng: float, 
                          radius_meters: int) -> Tuple[float, float]:
    """
    Generate random point within radius from center.
    Uses uniform distribution in circle.
    """
    if radius_meters <= 0:
        return center_lat, center_lng
    
    # Cap radius at 500m
    radius_meters = min(radius_meters, 500)
    
    # Earth radius in meters
    EARTH_RADIUS = 6371000
    
    # Random distance (sqrt for uniform distribution in circle)
    distance = math.sqrt(random.random()) * radius_meters
    
    # Random angle (0 to 2π)
    angle = random.random() * 2 * math.pi
    
    # Convert to lat/lng offset
    lat_offset = (distance * math.cos(angle)) / EARTH_RADIUS * (180 / math.pi)
    lng_offset = (distance * math.sin(angle)) / EARTH_RADIUS * (180 / math.pi) / math.cos(center_lat * math.pi / 180)
    
    return center_lat + lat_offset, center_lng + lng_offset


def set_artifact_respawning(cursor, artifact_id: str):
    """
    Set artifact to respawning state after pickup.
    Calculates new spawn time and random location.
    """
    # Get artifact respawn config
    cursor.execute("""
        SELECT respawn_enabled, respawn_delay_minutes, respawn_radius_meters,
               original_latitude, original_longitude, latitude, longitude
        FROM artifacts WHERE id = %s
    """, (artifact_id,))
    
    artifact = cursor.fetchone()
    if not artifact or not artifact['respawn_enabled']:
        return False
    
    # Use original location if set, otherwise current location
    orig_lat = artifact['original_latitude'] or artifact['latitude']
    orig_lng = artifact['original_longitude'] or artifact['longitude']
    
    # Calculate new random location
    new_lat, new_lng = random_point_in_radius(
        float(orig_lat), float(orig_lng),
        artifact['respawn_radius_meters'] or 50
    )
    
    # Calculate respawn time
    delay = artifact['respawn_delay_minutes'] or 30
    respawn_at = datetime.utcnow() + timedelta(minutes=delay)
    
    # Update artifact
    cursor.execute("""
        UPDATE artifacts SET
            state = 'respawning',
            pickup_count = pickup_count + 1,
            last_pickup_at = NOW(),
            spawned_at = %s,
            latitude = %s,
            longitude = %s,
            original_latitude = COALESCE(original_latitude, %s),
            original_longitude = COALESCE(original_longitude, %s),
            owner_id = NULL,
            extracting_by = NULL,
            extraction_started_at = NULL
        WHERE id = %s
    """, (respawn_at, new_lat, new_lng, orig_lat, orig_lng, artifact_id))
    
    return True


def activate_respawned_artifacts(cursor) -> int:
    """
    Activate artifacts that are ready to respawn.
    Returns count of activated artifacts.
    """
    cursor.execute("""
        UPDATE artifacts
        SET state = 'hidden'
        WHERE state = 'respawning'
          AND spawned_at <= NOW()
          AND (expires_at IS NULL OR expires_at > NOW())
    """)
    return cursor.rowcount


# ============================================
# Respawn Zones
# ============================================

# Global cache for respawn zones
_respawn_zones_cache = {
    'data': None,
    'version': None
}


def get_active_respawn_zones(cursor, now):
    """Get active respawn zones with cache"""
    global _respawn_zones_cache
    
    # Check cache version
    cursor.execute("SELECT version FROM cache_versions WHERE cache_key = 'respawn_zones'")
    result = cursor.fetchone()
    current_version = result['version'] if result else 0
    
    # Return cached if valid
    if (_respawn_zones_cache['data'] is not None and 
        _respawn_zones_cache['version'] == current_version):
        return _respawn_zones_cache['data']
    
    # Query active zones
    cursor.execute("""
        SELECT id, name, center_lat, center_lng, radius, respawn_time_seconds
        FROM respawn_zones
        WHERE active = TRUE
          AND (active_from IS NULL OR active_from <= %s)
          AND (active_to IS NULL OR active_to > %s)
    """, (now, now))
    
    zones = cursor.fetchall()
    
    # Update cache
    _respawn_zones_cache['data'] = zones
    _respawn_zones_cache['version'] = current_version
    
    return zones


def update_resurrection_progress(cursor, player, location, now):
    """
    Update resurrection timer for dead players
    
    Args:
        cursor: Database cursor
        player: Player dict with resurrection fields
        location: Current location dict {'lat': float, 'lng': float}
        now: Current datetime
        
    Returns:
        Dict with resurrection progress info
    """
    # Get active respawn zones
    zones = get_active_respawn_zones(cursor, now)
    
    # Check if inside any zone
    inside_zone = None
    for zone in zones:
        if point_in_circle(
            location['lat'], location['lng'],
            float(zone['center_lat']), float(zone['center_lng']),
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
    zone_name = None
    
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
            zone_name = inside_zone['name']
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
        'progress': round(new_progress, 1),
        'required': inside_zone['respawn_time_seconds'] if inside_zone else None,
        'insideZone': inside_zone is not None,
        'resurrected': resurrected,
        'zoneName': zone_name,
        'progressPercent': round((new_progress / inside_zone['respawn_time_seconds'] * 100), 1) if inside_zone else 0
    }
