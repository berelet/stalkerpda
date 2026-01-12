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
    controlPoints: any[]
  }
}

export const useLocationTracking = (location: LocationData | null, enabled = true) => {
  const intervalRef = useRef<number>()
  const [nearbyArtifacts, setNearbyArtifacts] = useState<NearbyArtifact[]>([])
  const [radiationZones, setRadiationZones] = useState<any[]>([])
  const [controlPoints, setControlPoints] = useState<any[]>([])

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
        setControlPoints(data.currentZones?.controlPoints || [])
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

  return { nearbyArtifacts, radiationZones, controlPoints }
}
