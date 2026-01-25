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
  const [playerStatus, setPlayerStatus] = useState<'alive' | 'dead'>('alive')
  const [playerLives, setPlayerLives] = useState(0)

  // Debug geolocation
  useEffect(() => {
    console.log('[GEO]', { latitude, longitude, accuracy, error, loading })
  }, [latitude, longitude, accuracy, error, loading])

  // Check if user is GM and get player status
  useEffect(() => {
    const checkGM = async () => {
      try {
        const { data } = await api.get('/api/auth/me')
        console.log('User data:', data)
        console.log('Is GM:', data.role === 'gm')
        setIsGM(data.role === 'gm')
        setPlayerStatus(data.status)
        setPlayerLives(data.currentLives)
      } catch (err) {
        console.error('Failed to check GM:', err)
        setIsGM(false)
      }
    }
    checkGM()
  }, [])

  // Send location to server every 15 seconds (always, even in GM mode)
  const { nearbyArtifacts, respawnZones, resurrectionUpdate, radiationUpdate } = useLocationTracking(
    latitude && longitude ? { latitude, longitude, accuracy } : null,
    true
  )

  // Debug radiation
  useEffect(() => {
    console.log('[RADIATION STATE]', radiationUpdate)
  }, [radiationUpdate])

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

      {/* Death Banner - show when dead */}
      {playerStatus === 'dead' && !gmMode && (
        <div className="bg-black/95 border-2 border-red-600 rounded-lg p-4 mb-2">
          <div className="text-center mb-3">
            <div className="text-4xl mb-2">💀</div>
            <h2 className="text-red-500 text-2xl font-bold">YOU ARE DEAD</h2>
            <p className="text-gray-400 text-sm">Respawn at a resurrection zone</p>
          </div>
          
          <div className="bg-gray-900/80 border border-gray-700 rounded p-3 mb-3 text-xs">
            <div className="text-gray-400 mb-2">While dead, the following is disabled:</div>
            <ul className="text-gray-500 space-y-1 ml-2">
              <li>• Artifact pickup</li>
              <li>• Trading</li>
              <li>• Quest interactions</li>
              <li>• Zone capture</li>
            </ul>
            <div className="text-gray-400 mt-2">Only respawn is available.</div>
          </div>
          
          {playerLives > 0 ? (
            <div className="text-center space-y-3">
              <div className="text-yellow-400">Lives remaining: {playerLives} ❤️</div>
              
              {resurrectionUpdate?.insideZone ? (
                resurrectionUpdate?.canRespawn ? (
                  <button
                    onClick={async () => {
                      try {
                        await api.post('/api/player/respawn')
                        setPlayerStatus('alive')
                        window.dispatchEvent(new CustomEvent('refreshPlayerData'))
                      } catch (err: any) {
                        alert(err.response?.data?.message || 'Respawn failed')
                      }
                    }}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg text-lg transition-colors"
                  >
                    🔄 RESPAWN
                  </button>
                ) : (
                  <div className="text-yellow-400 text-sm">
                    ⏳ Respawn progress: {resurrectionUpdate?.progressPercent || 0}%
                  </div>
                )
              ) : (
                <div className="text-gray-500 text-sm">📍 Go to a green respawn zone</div>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="text-red-400">No lives remaining ☠️</div>
              <div className="text-gray-500 text-xs mt-1">Equip items with bonus lives to respawn</div>
            </div>
          )}
        </div>
      )}

      {/* Radiation Alert Banner - show when in radiation zone */}
      {radiationUpdate && radiationUpdate.zoneName && !gmMode && playerStatus === 'alive' && (
        <div className="bg-red-900/90 border border-red-500 rounded px-3 py-2 mb-2 animate-pulse">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☢️</span>
            <div className="flex-1">
              <div className="text-red-300 text-sm font-bold">RADIATION CONTAMINATION</div>
              <div className="text-red-400 text-xs">
                +{radiationUpdate.delta.toFixed(1)} rad • {radiationUpdate.zoneName}
              </div>
            </div>
            <div className="text-right">
              <div className="text-red-200 text-lg font-bold">{Math.round(radiationUpdate.current)}%</div>
              {radiationUpdate.resist > 0 && (
                <div className="text-green-400 text-xs">-{radiationUpdate.resist}% resist</div>
              )}
            </div>
          </div>
        </div>
      )}

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
              <>
                <StalkerMap 
                  latitude={latitude} 
                  longitude={longitude} 
                  accuracy={accuracy || undefined}
                  nearbyArtifacts={playerStatus === 'dead' ? [] : nearbyArtifacts}
                  respawnZones={respawnZones || []}
                  playerDead={playerStatus === 'dead'}
                />
              </>
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
