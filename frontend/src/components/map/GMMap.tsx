import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { DivIcon } from 'leaflet'
import { FACTION_CONFIG, Faction } from '../../utils/factions'
import 'leaflet/dist/leaflet.css'

interface Player {
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

interface GMMapProps {
  players: Player[]
  center?: [number, number]
  zoom?: number
}

const createFactionIcon = (faction: Faction) => {
  const config = FACTION_CONFIG[faction]
  return new DivIcon({
    html: `<div style="
      color: ${config.color};
      font-size: 24px;
      text-shadow: 0 0 3px #000, 0 0 5px ${config.color};
      line-height: 1;
      text-align: center;
    ">${config.icon}</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  })
}

export default function GMMap({ players, center, zoom = 14 }: GMMapProps) {
  const playersWithLocation = players.filter(p => p.location?.latitude && p.location?.longitude)
  
  console.log('GMMap render:', { 
    totalPlayers: players.length, 
    withLocation: playersWithLocation.length,
    players: playersWithLocation 
  })
  
  // Calculate center from players if not provided
  const mapCenter: [number, number] = center || (
    playersWithLocation.length > 0
      ? [playersWithLocation[0].location.latitude, playersWithLocation[0].location.longitude]
      : [34.707, 33.022]
  )

  return (
    <MapContainer
      center={mapCenter}
      zoom={zoom}
      className="h-full w-full"
      style={{ background: '#0a0a0a' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap'
        className="map-tiles"
      />
      
      {playersWithLocation.map(player => {
        const config = FACTION_CONFIG[player.faction]
        return (
          <Marker
            key={player.id}
            position={[player.location.latitude, player.location.longitude]}
            icon={createFactionIcon(player.faction)}
          >
            <Popup>
              <div className="text-xs" style={{ color: config.color }}>
                <div className="font-bold text-sm mb-1">{config.icon} {player.nickname}</div>
                <div className="text-gray-300">Faction: {config.name}</div>
                <div className="text-gray-300">Lives: {player.lives}</div>
                <div className="text-gray-300">Radiation: {player.radiation}</div>
                <div className="text-gray-400 text-[10px] mt-1">
                  {player.location.latitude.toFixed(6)}, {player.location.longitude.toFixed(6)}
                </div>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
