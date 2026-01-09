import { useState, useEffect } from 'react'

const STORAGE_KEY = 'pda_last_location'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
  isFromCache: boolean
}

const saveLocation = (lat: number, lng: number) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ lat, lng, timestamp: Date.now() }))
}

const getLastLocation = (): { lat: number; lng: number } | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      // Use cached location if less than 24 hours old
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return { lat: parsed.lat, lng: parsed.lng }
      }
    }
  } catch {}
  return null
}

export const useGeolocation = (watch = true) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
    isFromCache: false
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      const cached = getLastLocation()
      if (cached) {
        setState({ latitude: cached.lat, longitude: cached.lng, accuracy: null, error: 'Geolocation not supported (using cached)', loading: false, isFromCache: true })
      } else {
        setState(prev => ({ ...prev, error: 'Geolocation not supported', loading: false }))
      }
      return
    }

    const onSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude, accuracy } = position.coords
      saveLocation(latitude, longitude)
      setState({ latitude, longitude, accuracy, error: null, loading: false, isFromCache: false })
    }

    const onError = (error: GeolocationPositionError) => {
      const cached = getLastLocation()
      if (cached) {
        setState({ latitude: cached.lat, longitude: cached.lng, accuracy: null, error: `GPS Error: ${error.message} (using cached)`, loading: false, isFromCache: true })
      } else {
        setState(prev => ({ ...prev, error: error.message, loading: false }))
      }
    }

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    if (watch) {
      const watchId = navigator.geolocation.watchPosition(onSuccess, onError, options)
      return () => navigator.geolocation.clearWatch(watchId)
    } else {
      navigator.geolocation.getCurrentPosition(onSuccess, onError, options)
    }
  }, [watch])

  return state
}
