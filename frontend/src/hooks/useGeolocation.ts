import { useState, useEffect } from 'react'

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  accuracy: number | null
  error: string | null
  loading: boolean
}

export const useGeolocation = (watch = true) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true
  })

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation not supported', loading: false }))
      return
    }

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: null,
        loading: false
      })
    }

    const onError = (error: GeolocationPositionError) => {
      setState(prev => ({ ...prev, error: error.message, loading: false }))
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
