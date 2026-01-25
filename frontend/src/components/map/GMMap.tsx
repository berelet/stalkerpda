import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import { DivIcon } from 'leaflet'
import { FACTION_CONFIG, Faction } from '../../utils/factions'
import TraderMarkers from './TraderMarkers'
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
  radiationZones?: any[]
  respawnZones?: any[]
}

const createFactionIcon = (faction: Faction, isDead: boolean = false) => {
  const config = FACTION_CONFIG[faction]
  const color = isDead ? '#6b7280' : config.color
  return new DivIcon({
    html: `<div style="
      color: ${color};
      font-size: 24px;
      text-shadow: 0 0 3px #000, 0 0 5px ${color};
      line-height: 1;
      text-align: center;
      ${isDead ? 'opacity: 0.6;' : ''}
    ">${config.icon}</div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  })
}

export default function GMMap({ players, center, zoom = 14, radiationZones = [], respawnZones = [] }: GMMapProps) {
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
        const isDead = (player as any).status === 'dead'
        return (
          <Marker
            key={player.id}
            position={[player.location.latitude, player.location.longitude]}
            icon={createFactionIcon(player.faction, isDead)}
          >
            <Popup>
              <div className="text-xs" style={{ color: isDead ? '#6b7280' : config.color }}>
                <div className="font-bold text-sm mb-1">{config.icon} {player.nickname} {isDead ? '💀' : ''}</div>
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

      {/* Trader markers */}
      <TraderMarkers />

      {/* Radiation zones */}
      {radiationZones.map(zone => (
        <Circle
          key={zone.id}
          center={[zone.centerLat, zone.centerLng]}
          radius={zone.radius}
          pathOptions={{
            color: '#eab308',
            fillColor: '#eab308',
            fillOpacity: 0.2,
            weight: 2
          }}
        >
          <Popup>
            <div className="text-xs">
              <div className="font-bold text-yellow-600">☢️ {zone.name}</div>
              <div>Level: {zone.radiationLevel}</div>
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Respawn zones */}
      {respawnZones.map(zone => (
        <Circle
          key={zone.id}
          center={[zone.centerLat, zone.centerLng]}
          radius={zone.radius}
          pathOptions={{
            color: '#22c55e',
            fillColor: '#22c55e',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '10, 10'
          }}
        >
          <Popup>
            <div className="text-xs">
              <div className="font-bold text-green-600">🔄 {zone.name}</div>
              <div>Respawn: {zone.respawnTimeSeconds}s</div>
            </div>
          </Popup>
        </Circle>
      ))}
    </MapContainer>
  )
}
