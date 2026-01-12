import { useState, useEffect } from 'react'
import { api } from '../services/api'

export interface QuestMarker {
  questId: string
  questTitle: string
  questType: string
  type: 'visit' | 'patrol_checkpoint' | 'artifact_area'
  lat: number
  lng: number
  radius: number
  visited?: boolean
  checkpointIndex?: number
}

export function useActiveQuests() {
  const [markers, setMarkers] = useState<QuestMarker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchQuests = async () => {
      try {
        const { data } = await api.get('/api/quests/active')
        const quests = data.quests || []
        
        const newMarkers: QuestMarker[] = []
        
        for (const quest of quests) {
          if (!quest.questData) continue
          
          // Visit quest - single marker
          if (quest.questType === 'visit' && quest.questData.target_lat) {
            newMarkers.push({
              questId: quest.id,
              questTitle: quest.title,
              questType: quest.questType,
              type: 'visit',
              lat: quest.questData.target_lat,
              lng: quest.questData.target_lng,
              radius: quest.questData.target_radius || 20,
              visited: quest.questData.visited
            })
          }
          
          // Patrol quest - multiple checkpoints
          if (quest.questType === 'patrol' && quest.questData.checkpoints) {
            quest.questData.checkpoints.forEach((cp: any, idx: number) => {
              newMarkers.push({
                questId: quest.id,
                questTitle: quest.title,
                questType: quest.questType,
                type: 'patrol_checkpoint',
                lat: cp.lat,
                lng: cp.lng,
                radius: cp.radius || 30,
                visited: cp.visited,
                checkpointIndex: idx + 1
              })
            })
          }
          
          // Delivery quest - destination marker
          if (quest.questType === 'delivery' && quest.questData.delivery_lat) {
            newMarkers.push({
              questId: quest.id,
              questTitle: quest.title,
              questType: quest.questType,
              type: 'visit',
              lat: quest.questData.delivery_lat,
              lng: quest.questData.delivery_lng,
              radius: quest.questData.delivery_radius || 10
            })
          }
        }
        
        setMarkers(newMarkers)
      } catch (error) {
        console.error('Failed to fetch active quests:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchQuests()
    const interval = setInterval(fetchQuests, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  return { markers, loading }
}
