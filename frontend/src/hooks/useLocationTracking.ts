import { useEffect, useRef, useState } from 'react'
import { api } from '../services/api'
import { logger } from '../utils/logger'

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number | null
}

export interface NearbyArtifact {
  id: string
  typeId: string
  name: string
  description: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  value: number
  imageUrl: string
  effects: {
    bonusLives?: number
    radiationResist?: number
  }
  latitude: number
  longitude: number
  distance: number
  canPickup: boolean
}

interface LocationResponse {
  success: boolean
  nearbyArtifacts: NearbyArtifact[]
  currentZones: {
    radiationZones: any[]
    respawnZones: any[]
    controlPoints: any[]
  }
  radiationUpdate?: {
    current: number
    delta: number
    resist: number
  }
  resurrectionUpdate?: {
    progress: number
    required: number | null
    insideZone: boolean
    resurrected: boolean
  }
  death?: {
    died: boolean
    reason?: string
  }
}

export const useLocationTracking = (location: LocationData | null, enabled = true) => {
  const intervalRef = useRef<number>()
  const [nearbyArtifacts, setNearbyArtifacts] = useState<NearbyArtifact[]>([])
  const [radiationZones, setRadiationZones] = useState<any[]>([])
  const [respawnZones, setRespawnZones] = useState<any[]>([])
  const [controlPoints, setControlPoints] = useState<any[]>([])
  const [radiationUpdate, setRadiationUpdate] = useState<any>(null)
  const [resurrectionUpdate, setResurrectionUpdate] = useState<any>(null)

  useEffect(() => {
    if (!enabled || !location?.latitude || !location?.longitude) {
      return
    }

    const sendLocation = async () => {
      try {
        const { data } = await api.post<LocationResponse>('/api/location', {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        })
        
        setNearbyArtifacts(data.nearbyArtifacts || [])
        setRadiationZones(data.currentZones?.radiationZones || [])
        setRespawnZones(data.currentZones?.respawnZones || [])
        setControlPoints(data.currentZones?.controlPoints || [])
        setRadiationUpdate(data.radiationUpdate || null)
        setResurrectionUpdate(data.resurrectionUpdate || null)
        
        // Debug logging
        if (data.radiationUpdate) {
          console.log('[RADIATION]', data.radiationUpdate)
        }
        
        // Refresh header stats
        window.dispatchEvent(new CustomEvent('refreshPlayerData'))
        
        // Handle death
        if (data.death?.died) {
          // Reload player data
          window.location.reload()
        }
      } catch (error: any) {
        logger.error('Location failed', { 
          status: error.response?.status,
          message: error.response?.data?.error?.message || error.message
        })
      }
    }

    // Send immediately
    sendLocation()

    // Then every 15 seconds
    intervalRef.current = window.setInterval(sendLocation, 15000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [location?.latitude, location?.longitude, location?.accuracy, enabled])

  return { 
    nearbyArtifacts, 
    radiationZones, 
    respawnZones,
    controlPoints,
    radiationUpdate,
    resurrectionUpdate
  }
}
