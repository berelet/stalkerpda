import { useEffect, useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'

interface Trader {
  id: string
  name: string
  type: 'npc' | 'bartender'
  latitude: number
  longitude: number
  interaction_radius: number
  is_active: boolean
}

const traderIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <text x="12" y="16" text-anchor="middle" fill="#a855f7" font-size="12" font-weight="bold">$</text>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
})

export default function TraderMarkers({ playerDead = false }: { playerDead?: boolean }) {
  const [traders, setTraders] = useState<Trader[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    const fetchTraders = async () => {
      try {
        const { data } = await api.get('/api/traders')
        setTraders(data.traders || [])
      } catch (err) {
        console.error('Failed to fetch traders:', err)
      }
    }
    fetchTraders()
  }, [])

  return (
    <>
      {traders.map(trader => (
        <Marker
          key={trader.id}
          position={[trader.latitude, trader.longitude]}
          icon={traderIcon}
        >
          <Popup minWidth={200}>
            <div className="text-sm">
              <div className="font-bold text-yellow-600 text-base mb-1">{trader.name}</div>
              <div className="text-xs text-gray-500 mb-3">
                {trader.type === 'npc' ? 'NPC Trader' : 'Bartender'}
              </div>
              
              {playerDead ? (
                <div className="text-red-500 text-xs text-center py-2 border border-red-500 rounded">
                  ☠️ Available after respawn
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => navigate(`/trade?trader=${trader.id}`)}
                    className="w-full px-3 py-2 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 flex items-center justify-center gap-2"
                  >
                    <span>💰</span> TRADE
                  </button>
                  <button
                    onClick={() => navigate(`/trader-quests?trader=${trader.id}&name=${encodeURIComponent(trader.name)}`)}
                    className="w-full px-3 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <span>📜</span> QUESTS
                  </button>
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}
