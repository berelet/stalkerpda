export type QuestType = 'artifact_collection' | 'delivery' | 'patrol' | 'visit' | 'protection'
export type QuestStatus = 'available' | 'accepted' | 'in_progress' | 'completed' | 'failed'

export interface QuestIssuer {
  id: string
  nickname: string
}

export interface QuestObjective {
  artifact_type_id?: string
  artifact_type_ids?: string[]
  target_faction?: string
  exclude_faction?: string
  target_player_id?: string
  target_count?: number
  current_count?: number
  target_counts?: Record<string, number>
  current_counts?: Record<string, number>
  target_lat?: number
  target_lng?: number
  target_radius?: number
  visited?: boolean
  checkpoints?: Array<{
    lat: number
    lng: number
    radius: number
    visited: boolean
  }>
  required_time_minutes?: number
  accumulated_time_seconds?: number
  item_id?: string
  delivery_lat?: number
  delivery_lng?: number
  delivery_radius?: number
}

export interface Quest {
  id: string
  type: string
  questType: QuestType
  title: string
  description: string
  reward: number
  status: QuestStatus
  failed: boolean
  failedReason?: string
  autoComplete: boolean
  questData: QuestObjective
  issuer: QuestIssuer
  factionRestriction?: string
  expiresAt?: string
  acceptedAt?: string
  createdAt: string
}
