from math import radians, cos, sin, asin, sqrt
from typing import Tuple

# GPS accuracy max buffers (meters) per mechanic type
GPS_ACCURACY_BUFFERS = {
    'artifact_detection': 15,
    'artifact_pickup': 5,
    'control_point': 10,
    'zone': 15,
    'quest_point': 10,
}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two points in meters using Haversine formula
    """
    # Convert to radians
    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    
    # Radius of earth in meters
    r = 6371000
    
    return c * r

def get_effective_radius(base_radius: float, accuracy: float, mechanic: str) -> float:
    """
    Calculate effective radius with GPS accuracy compensation.
    effective_radius = base_radius + min(accuracy, max_buffer)
    """
    max_buffer = GPS_ACCURACY_BUFFERS.get(mechanic, 10)
    buffer = min(accuracy, max_buffer) if accuracy and accuracy > 0 else 0
    return base_radius + buffer

def is_within_radius(lat1: float, lon1: float, lat2: float, lon2: float, 
                     radius: float, accuracy: float = 0, mechanic: str = None) -> bool:
    """Check if point is within radius of another point, with optional GPS accuracy compensation"""
    distance = haversine_distance(lat1, lon1, lat2, lon2)
    effective_radius = get_effective_radius(radius, accuracy, mechanic) if mechanic else radius
    return distance <= effective_radius

def point_in_circle(point_lat: float, point_lng: float, 
                    center_lat: float, center_lng: float, radius: float,
                    accuracy: float = 0, mechanic: str = 'zone') -> bool:
    """Check if point is inside circle (for radiation zones)"""
    return is_within_radius(point_lat, point_lng, center_lat, center_lng, radius, accuracy, mechanic)
