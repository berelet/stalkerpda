import { useEffect, useRef } from 'react'
import { api } from '../services/api'

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number | null
}

export const useLocationTracking = (location: LocationData | null, enabled = true) => {
  const intervalRef = useRef<number>()

  useEffect(() => {
    if (!enabled || !location?.latitude || !location?.longitude) {
      return
    }

    const sendLocation = async () => {
      try {
        await api.post('/api/location', {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy
        })
      } catch (error) {
        console.error('Failed to send location:', error)
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
}
