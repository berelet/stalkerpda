"""
Artifact respawn utilities
"""
import math
import random
from datetime import datetime, timedelta
from typing import Tuple

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
