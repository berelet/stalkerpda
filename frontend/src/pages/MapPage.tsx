import { useState, useEffect } from 'react'
import { useGeolocation } from '../hooks/useGeolocation'
import { useLocationTracking } from '../hooks/useLocationTracking'
import StalkerMap from '../components/map/StalkerMap'
import GMMap from '../components/map/GMMap'
import { api } from '../services/api'
import { Faction } from '../utils/factions'

interface GMPlayer {
  id: string
  nickname: string
  faction: Faction
  location: {
    latitude: number
    longitude: number
  }
  lives: number
  radiation: number
}

export default function MapPage() {
  const { latitude, longitude, accuracy, error, loading } = useGeolocation(true)
  const [gmMode, setGmMode] = useState(false)
  const [players, setPlayers] = useState<GMPlayer[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [isGM, setIsGM] = useState(false)

  // Check if user is GM
  useEffect(() => {
    const checkGM = async () => {
      try {
        const { data } = await api.get('/api/auth/me')
        console.log('User data:', data)
        console.log('Is GM:', data.role === 'gm')
        setIsGM(data.role === 'gm')
      } catch (err) {
        console.error('Failed to check GM:', err)
        setIsGM(false)
      }
    }
    checkGM()
  }, [])

  // Send location to server every 15 seconds (always, even in GM mode)
  const { nearbyArtifacts } = useLocationTracking(
    latitude && longitude ? { latitude, longitude, accuracy } : null,
    true
  )

  // Fetch all players for GM
  useEffect(() => {
    if (!gmMode) return

    const fetchPlayers = async () => {
      try {
        const { data } = await api.get('/api/admin/locations')
        console.log('Fetched players:', data.players)
        console.log('Players with location:', data.players.filter((p: any) => p.location?.latitude))
        setPlayers(data.players || [])
        setLoadingPlayers(false)
      } catch (err) {
        console.error('Failed to fetch players:', err)
        setLoadingPlayers(false)
      }
    }

    // Initial load
    setLoadingPlayers(true)
    fetchPlayers()
    
    // Update every 30s without showing loading
    const interval = setInterval(fetchPlayers, 30000)

    return () => clearInterval(interval)
  }, [gmMode])

  const getSignalQuality = (acc: number | null) => {
    if (!acc) return { label: 'UNKNOWN', color: 'text-gray-500', bars: 0 }
    if (acc < 20) return { label: 'EXCELLENT', color: 'text-green-500', bars: 4 }
    if (acc < 50) return { label: 'GOOD', color: 'text-pda-highlight', bars: 3 }
    if (acc < 100) return { label: 'FAIR', color: 'text-yellow-500', bars: 2 }
    if (acc < 500) return { label: 'POOR', color: 'text-orange-500', bars: 1 }
    return { label: 'VERY POOR', color: 'text-red-500', bars: 1 }
  }

  const signal = getSignalQuality(accuracy)

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-pda-phosphor font-pixel text-xl">MAP</h2>
        <div className="flex items-center gap-3">
          {isGM && (
            <button
              onClick={() => setGmMode(!gmMode)}
              className={`px-3 py-1 text-xs border ${
                gmMode 
                  ? 'bg-pda-highlight/20 border-pda-highlight text-pda-highlight' 
                  : 'border-pda-primary/30 text-pda-text'
              }`}
            >
              {gmMode ? 'MY MAP' : 'ALL PLAYERS'}
            </button>
          )}
          {!loading && !error && !gmMode && (
            <div className="flex items-center gap-2 text-xs">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4].map(i => (
                  <div
                    key={i}
                    className={`w-1 ${i <= signal.bars ? signal.color : 'text-gray-700'}`}
                    style={{ height: `${i * 3}px` }}
                  >
                    <div className="w-full h-full bg-current"></div>
                  </div>
                ))}
              </div>
              <span className={signal.color}>{signal.label}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative h-[500px] border border-pda-primary/30">
        {gmMode ? (
          loadingPlayers ? (
            <div className="absolute inset-0 flex items-center justify-center bg-pda-case-dark z-10">
              <div className="text-pda-highlight animate-pulse">LOADING PLAYERS...</div>
            </div>
          ) : (
            <GMMap 
              players={players}
              center={latitude && longitude ? [latitude, longitude] : undefined}
            />
          )
        ) : (
          <>
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-pda-case-dark z-10">
                <div className="text-pda-highlight animate-pulse">ACQUIRING GPS SIGNAL...</div>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-pda-case-dark z-10">
                <div className="text-center p-4">
                  <div className="text-red-500 mb-2">GPS ERROR</div>
                  <div className="text-pda-text text-sm">{error}</div>
                </div>
              </div>
            )}

            {latitude && longitude && (
              <StalkerMap 
                latitude={latitude} 
                longitude={longitude} 
                accuracy={accuracy || undefined}
                nearbyArtifacts={nearbyArtifacts}
              />
            )}
          </>
        )}
      </div>

      {gmMode ? (
        <div className="bg-pda-case-dark/90 border border-pda-primary/30 p-3 text-xs space-y-2">
          <div className="text-pda-highlight">ACTIVE PLAYERS: {players.length}</div>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries({
              stalker: players.filter(p => p.faction === 'stalker').length,
              bandit: players.filter(p => p.faction === 'bandit').length,
              mercenary: players.filter(p => p.faction === 'mercenary').length,
              duty: players.filter(p => p.faction === 'duty').length,
              freedom: players.filter(p => p.faction === 'freedom').length,
            }).map(([faction, count]) => (
              <div key={faction} className="text-pda-text capitalize">
                {faction}: {count}
              </div>
            ))}
          </div>
        </div>
      ) : (
        latitude && longitude && (
          <div className="bg-pda-case-dark/90 border border-pda-primary/30 p-3 text-xs space-y-1">
            <div className="text-pda-highlight">COORDINATES</div>
            <div className="text-pda-text">LAT: {latitude.toFixed(6)}</div>
            <div className="text-pda-text">LNG: {longitude.toFixed(6)}</div>
            <div className="flex items-center justify-between">
              <span className="text-pda-text/70">ACCURACY:</span>
              <span className={signal.color}>±{accuracy?.toFixed(0)}m</span>
            </div>
          </div>
        )
      )}
    </div>
  )
}
