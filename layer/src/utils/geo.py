from math import radians, cos, sin, asin, sqrt
from typing import Tuple

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

def is_within_radius(lat1: float, lon1: float, lat2: float, lon2: float, radius: float) -> bool:
    """Check if point is within radius of another point"""
    distance = haversine_distance(lat1, lon1, lat2, lon2)
    return distance <= radius

def point_in_circle(point_lat: float, point_lng: float, 
                    center_lat: float, center_lng: float, radius: float) -> bool:
    """Check if point is inside circle (for radiation zones)"""
    return is_within_radius(point_lat, point_lng, center_lat, center_lng, radius)
