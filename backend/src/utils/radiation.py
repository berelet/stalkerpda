"""
Radiation calculation utilities
"""
from src.utils.geo import haversine_distance, point_in_circle
from datetime import datetime
import math

# Global cache for radiation zones (Lambda container reuse)
_radiation_zones_cache = {
    'data': None,
    'version': None
}


def get_active_radiation_zones(cursor, now):
    """Get active radiation zones with cache"""
    global _radiation_zones_cache
    
    # Check cache version
    cursor.execute("SELECT version FROM cache_versions WHERE cache_key = 'radiation_zones'")
    result = cursor.fetchone()
    current_version = result['version'] if result else 0
    
    # Return cached if valid
    if (_radiation_zones_cache['data'] is not None and 
        _radiation_zones_cache['version'] == current_version):
        return _radiation_zones_cache['data']
    
    # Query active zones
    cursor.execute("""
        SELECT id, name, center_lat, center_lng, radius, radiation_level
        FROM radiation_zones
        WHERE active = TRUE
          AND (active_from IS NULL OR active_from <= %s)
          AND (active_to IS NULL OR active_to > %s)
    """, (now, now))
    
    zones = cursor.fetchall()
    
    # Update cache
    _radiation_zones_cache['data'] = zones
    _radiation_zones_cache['version'] = current_version
    
    return zones


def get_player_radiation_resist(cursor, player_id):
    """
    Calculate total radiation resist from equipped items
    
    Args:
        cursor: Database cursor
        player_id: Player UUID
        
    Returns:
        Total radiation resist percentage (0-80, capped)
    """
    # Get equipped equipment (armor + addons)
    cursor.execute("""
        SELECT et.radiation_resist
        FROM player_equipment pe
        JOIN equipment_types et ON pe.equipment_type_id = et.id
        WHERE pe.player_id = %s AND pe.slot_type IN ('armor', 'addon1', 'addon2')
    """, (player_id,))
    
    equipment_resist = sum(row['radiation_resist'] or 0 for row in cursor.fetchall())
    
    # Get equipped artifact
    cursor.execute("""
        SELECT at.radiation_resist
        FROM artifacts a
        JOIN artifact_types at ON a.type_id = at.id
        WHERE a.owner_id = %s AND a.slot_type = 'artifact'
    """, (player_id,))
    
    artifact = cursor.fetchone()
    artifact_resist = artifact['radiation_resist'] if artifact and artifact['radiation_resist'] else 0
    
    total_resist = equipment_resist + artifact_resist
    
    # Cap at 80%
    return min(total_resist, 80)


def calculate_segment_in_circle(x1, y1, x2, y2, cx, cy, radius_meters):
    """
    Calculate length of line segment inside circle
    
    Uses geometric intersection algorithm
    
    Args:
        x1, y1: Start point (lat, lng)
        x2, y2: End point (lat, lng)
        cx, cy: Circle center (lat, lng)
        radius_meters: Circle radius in meters
        
    Returns:
        Length in meters of segment inside circle
    """
    # Convert radius to degrees (approximate)
    # 1 degree latitude ≈ 111km
    radius_deg = radius_meters / 111000.0
    
    # Vector from P0 to P1
    dx = x2 - x1
    dy = y2 - y1
    
    # Vector from P0 to circle center
    fx = x1 - cx
    fy = y1 - cy
    
    # Quadratic equation coefficients
    a = dx*dx + dy*dy
    b = 2*(fx*dx + fy*dy)
    c = (fx*fx + fy*fy) - radius_deg*radius_deg
    
    if a == 0:
        # No movement
        if point_in_circle(x1, y1, cx, cy, radius_meters):
            return 0  # Point inside, but no segment
        return 0
    
    discriminant = b*b - 4*a*c
    
    if discriminant < 0:
        # No intersection
        return 0
    
    # Calculate intersection points (parametric t values)
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


def calculate_time_in_zone(P0, P1, zone, delta_t):
    """
    Calculate time spent inside zone during movement P0→P1
    
    Args:
        P0: Previous location dict {'lat': float, 'lng': float} or None
        P1: Current location dict {'lat': float, 'lng': float}
        zone: Zone dict with center_lat, center_lng, radius
        delta_t: Time elapsed in seconds
        
    Returns:
        Seconds spent inside zone
    """
    if not P0:
        # First tick - check if P1 is inside
        if point_in_circle(P1['lat'], P1['lng'], 
                          float(zone['center_lat']), float(zone['center_lng']), 
                          zone['radius']):
            return delta_t
        return 0
    
    # Calculate path distance
    path_meters = haversine_distance(P0['lat'], P0['lng'], P1['lat'], P1['lng'])
    
    if path_meters == 0:
        # No movement - check if inside
        if point_in_circle(P1['lat'], P1['lng'], 
                          float(zone['center_lat']), float(zone['center_lng']), 
                          zone['radius']):
            return delta_t
        return 0
    
    # Calculate segment intersection with circle
    inside_meters = calculate_segment_in_circle(
        P0['lat'], P0['lng'],
        P1['lat'], P1['lng'],
        float(zone['center_lat']), float(zone['center_lng']),
        zone['radius']
    )
    
    # Time = (inside_meters / path_meters) * delta_t
    time_inside = delta_t * (inside_meters / path_meters) if path_meters > 0 else 0
    
    return time_inside


def calculate_radiation_accrual(cursor, player, P0, P1, now):
    """
    Main radiation calculation function
    
    Args:
        cursor: Database cursor
        player: Player dict with radiation fields
        P0: Previous location dict or None
        P1: Current location dict
        now: Current datetime
        
    Returns:
        Dict with radiation update info
    """
    # Get active zones
    zones = get_active_radiation_zones(cursor, now)
    
    # Calculate delta time
    if player['last_radiation_calc_at']:
        delta_t = (now - player['last_radiation_calc_at']).total_seconds()
    else:
        # First tick - initialize
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
            # Player was offline - assume 1 m/s movement
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
                if point_in_circle(P1['lat'], P1['lng'], 
                                  float(zone['center_lat']), float(zone['center_lng']), 
                                  zone['radius']):
                    current_zone = zone
                    current_zone_id = zone['id']
                    break
    
    # Calculate radiation
    delta_rad = 0
    resist_pct = get_player_radiation_resist(cursor, player['id'])
    
    if current_zone:
        time_inside = calculate_time_in_zone(P0, P1, current_zone, delta_t)
        
        # Base rate: radiation_level per 5 minutes (300 sec)
        base_rate = current_zone['radiation_level'] / 300.0
        
        # Apply resist
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
        'current': round(new_radiation, 1),
        'delta': round(delta_rad, 2),
        'resist': resist_pct,
        'zoneId': current_zone_id,
        'zoneName': current_zone['name'] if current_zone else None
    }
