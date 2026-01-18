"""
Quest progress tracking utilities
"""
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List


def update_artifact_collection_progress(quest_data: Dict, artifact_type_id: str) -> tuple[Dict, bool]:
    """
    Update artifact collection quest progress when player picks up artifact.
    Supports multiple artifact types with individual target counts.
    Returns (updated_quest_data, is_completed)
    """
    # New format: multiple types with target_counts dict
    if 'target_counts' in quest_data:
        target_counts = quest_data.get('target_counts', {})
        if artifact_type_id not in target_counts:
            return quest_data, False
        
        current_counts = quest_data.setdefault('current_counts', {})
        current_counts[artifact_type_id] = current_counts.get(artifact_type_id, 0) + 1
        
        # Check if ALL types have reached their targets
        completed = all(
            current_counts.get(type_id, 0) >= count
            for type_id, count in target_counts.items()
        )
        return quest_data, completed
    
    # Legacy format: single artifact_type_id
    if quest_data.get('artifact_type_id') != artifact_type_id:
        return quest_data, False
    
    quest_data['current_count'] = quest_data.get('current_count', 0) + 1
    completed = quest_data['current_count'] >= quest_data.get('target_count', 1)
    return quest_data, completed


def update_visit_progress(quest_data: Dict, player_lat: float, player_lng: float,
                         accuracy: float = 0) -> tuple[Dict, bool]:
    """
    Update visit quest progress when player reaches target location.
    Returns (updated_quest_data, is_completed)
    """
    from src.utils.geo import is_within_radius
    
    if quest_data.get('visited'):
        return quest_data, True
    
    target_lat = quest_data.get('target_lat')
    target_lng = quest_data.get('target_lng')
    radius = quest_data.get('target_radius', 20)
    
    if is_within_radius(player_lat, player_lng, target_lat, target_lng, radius, accuracy, 'quest_point'):
        quest_data['visited'] = True
        quest_data['visited_at'] = datetime.utcnow().isoformat() + 'Z'
        return quest_data, True
    
    return quest_data, False


def update_patrol_progress(quest_data: Dict, player_lat: float, player_lng: float, 
                          delta_time_seconds: int, accuracy: float = 0) -> tuple[Dict, bool]:
    """
    Update patrol quest progress.
    Returns (updated_quest_data, is_completed)
    """
    from src.utils.geo import is_within_radius
    
    checkpoints = quest_data.get('checkpoints', [])
    required_time = quest_data.get('required_time_minutes', 0) * 60
    
    # Check if player is in any checkpoint
    in_checkpoint = False
    for i, cp in enumerate(checkpoints):
        if is_within_radius(player_lat, player_lng, cp['lat'], cp['lng'], cp.get('radius', 30), accuracy, 'quest_point'):
            in_checkpoint = True
            if not cp.get('visited'):
                cp['visited'] = True
                visits = quest_data.setdefault('checkpoint_visits', [])
                visits.append({
                    'checkpoint_index': i,
                    'visited_at': datetime.utcnow().isoformat() + 'Z'
                })
            break
    
    # Accumulate time if in any checkpoint
    if in_checkpoint:
        quest_data['accumulated_time_seconds'] = quest_data.get('accumulated_time_seconds', 0) + delta_time_seconds
    
    # Check completion
    all_visited = all(cp.get('visited') for cp in checkpoints)
    time_met = quest_data.get('accumulated_time_seconds', 0) >= required_time
    
    return quest_data, all_visited and time_met


def check_delivery_conditions(quest_data: Dict, player_lat: float, player_lng: float,
                             player_items: List[str]) -> bool:
    """
    Check if delivery quest conditions are met (player at location with item).
    Does NOT auto-complete - requires manual confirmation.
    """
    from src.utils.geo import is_within_radius
    
    # Check location
    delivery_lat = quest_data.get('delivery_lat')
    delivery_lng = quest_data.get('delivery_lng')
    radius = quest_data.get('delivery_radius', 10)
    
    if not is_within_radius(player_lat, player_lng, delivery_lat, delivery_lng, radius):
        return False
    
    # Check item in inventory
    item_id = quest_data.get('item_id')
    return item_id in player_items


def log_quest_event(cursor, quest_id: str, player_id: str, event_type: str,
                   progress_data: Optional[Dict] = None, reason: Optional[str] = None):
    """Log quest progress event for analytics"""
    cursor.execute("""
        INSERT INTO quest_progress_events (id, quest_id, player_id, event_type, progress_data, event_reason)
        VALUES (%s, %s, %s, %s, %s, %s)
    """, (str(uuid.uuid4()), quest_id, player_id, event_type,
          json.dumps(progress_data) if progress_data else None, reason))


def fail_player_quests(cursor, player_id: str, reason: str = 'player_death'):
    """Fail all active quests for player (called on death)"""
    cursor.execute("""
        UPDATE contracts 
        SET failed = TRUE, 
            failed_reason = %s,
            status = 'failed'
        WHERE accepted_by = %s 
          AND status = 'accepted'
          AND failed = 0
    """, (reason, player_id))
    return cursor.rowcount


def fail_artifact_quests_for_others(cursor, artifact_type_id: str, picker_player_id: str):
    """
    Fail artifact_collection quests for OTHER players when someone picks up the artifact.
    Called when artifact is picked up.
    """
    cursor.execute("""
        UPDATE contracts 
        SET failed = TRUE, 
            failed_reason = 'artifact_taken_by_other',
            status = 'failed'
        WHERE quest_type = 'artifact_collection'
          AND status = 'accepted'
          AND failed = 0
          AND accepted_by != %s
          AND JSON_EXTRACT(quest_data, '$.artifact_type_id') = %s
    """, (picker_player_id, artifact_type_id))
    return cursor.rowcount


def fail_protection_quests(cursor, dead_player_id: str):
    """
    Fail protection quests when the protected player dies.
    Called from death handler.
    """
    cursor.execute("""
        UPDATE contracts 
        SET failed = TRUE, 
            failed_reason = 'protected_player_died',
            status = 'failed'
        WHERE quest_type = 'protection'
          AND status = 'accepted'
          AND failed = 0
          AND target_player_id = %s
    """, (dead_player_id,))
    return cursor.rowcount
