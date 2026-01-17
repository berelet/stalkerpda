import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { NearbyArtifact } from '../../hooks/useLocationTracking'
import { useActiveQuests } from '../../hooks/useActiveQuests'
import ArtifactModal from '../artifacts/ArtifactModal'
import TraderMarkers from './TraderMarkers'
import QuestMarkers from './QuestMarkers'

interface MapProps {
  latitude: number
  longitude: number
  accuracy?: number
  zoom?: number
  nearbyArtifacts?: NearbyArtifact[]
  respawnZones?: any[]
}

const playerIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMDBmZjAwIiBzdHJva2U9IiMwMDgwMDAiIHN0cm9rZS13aWR0aD0iMiIvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIGZpbGw9IiMwMDgwMDAiLz4KPC9zdmc+',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
  zIndexOffset: -100
})

const artifactIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cG9seWdvbiBwb2ludHM9IjEyLDIgMTgsMTAgMTIsMTggNiwxMCIgZmlsbD0iI2ZmZmYwMCIgc3Ryb2tlPSIjZmY4ODAwIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEwIiByPSIyIiBmaWxsPSIjZmY4ODAwIi8+Cjwvc3ZnPg==',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
  zIndexOffset: 100
})

const artifactIconHighlighted = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cG9seWdvbiBwb2ludHM9IjI0LDQgMzYsMjAgMjQsMzYgMTIsMjAiIGZpbGw9IiMwMGZmMDAiIHN0cm9rZT0iIzAwODAwMCIgc3Ryb2tlLXdpZHRoPSIzIi8+CiAgPGNpcmNsZSBjeD0iMjQiIGN5PSIyMCIgcj0iNCIgZmlsbD0iIzAwODAwMCIvPgogIDxhbmltYXRlIGF0dHJpYnV0ZU5hbWU9Im9wYWNpdHkiIHZhbHVlcz0iMTswLjU7MSIgZHVyPSIxcyIgcmVwZWF0Q291bnQ9ImluZGVmaW5pdGUiLz4KPC9zdmc+',
  iconSize: [48, 48],
  iconAnchor: [24, 24],
  popupAnchor: [0, -24],
  zIndexOffset: 1000
})

export default function StalkerMap({ 
  latitude, 
  longitude, 
  accuracy, 
  zoom = 16, 
  nearbyArtifacts = [],
  respawnZones = []
}: MapProps) {
  const [selectedArtifact, setSelectedArtifact] = useState<NearbyArtifact | null>(null)
  const [hiddenArtifacts, setHiddenArtifacts] = useState<Set<string>>(new Set())
  const { markers: questMarkers } = useActiveQuests()

  const handleExtracted = (artifactId: string) => {
    setHiddenArtifacts(prev => new Set(prev).add(artifactId))
  }

  const visibleArtifacts = nearbyArtifacts.filter(a => !hiddenArtifacts.has(a.id))

  return (
    <>
      <MapContainer
        center={[latitude, longitude]}
        zoom={zoom}
        className="h-full w-full"
        style={{ background: '#0a0a0a' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          className="map-tiles"
        />
        
        {/* Player marker */}
        <Marker position={[latitude, longitude]} icon={playerIcon}>
          <Popup>
            <div className="text-xs">
              <div className="font-bold text-green-600">YOUR POSITION</div>
              <div>Lat: {latitude.toFixed(6)}</div>
              <div>Lng: {longitude.toFixed(6)}</div>
              {accuracy && <div>Accuracy: ±{accuracy.toFixed(0)}m</div>}
            </div>
          </Popup>
        </Marker>

        {/* Accuracy circle */}
        {accuracy && (
          <Circle
            center={[latitude, longitude]}
            radius={accuracy}
            pathOptions={{
              color: '#00ff00',
              fillColor: '#00ff00',
              fillOpacity: 0.1,
              weight: 1
            }}
          />
        )}

        {/* Trader markers */}
        <TraderMarkers />

        {/* Quest markers */}
        <QuestMarkers markers={questMarkers} />

        {/* Respawn zones */}
        {respawnZones.map(zone => (
          <Circle
            key={zone.id}
            center={[zone.centerLat, zone.centerLng]}
            radius={zone.radius}
            pathOptions={{
              color: '#00ff00',
              fillColor: '#00ff00',
              fillOpacity: 0.2,
              weight: 2
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold text-green-600">RESPAWN ZONE</div>
                <div>{zone.name}</div>
                <div>Respawn time: {zone.respawnTimeSeconds}s</div>
                {zone.insideZone && (
                  <div className="text-green-600 font-bold mt-1">YOU ARE INSIDE</div>
                )}
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Artifact markers */}
        {visibleArtifacts.map(artifact => (
          <Marker
            key={artifact.id}
            position={[artifact.latitude, artifact.longitude]}
            icon={artifact.canPickup ? artifactIconHighlighted : artifactIcon}
            eventHandlers={{
              click: () => setSelectedArtifact(artifact)
            }}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold text-yellow-600">{artifact.name}</div>
                <div>Distance: {artifact.distance.toFixed(1)}m</div>
                <div className="text-blue-600 cursor-pointer hover:underline mt-1"
                     onClick={() => setSelectedArtifact(artifact)}>
                  Click for details
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Artifact modal */}
      {selectedArtifact && (
        <ArtifactModal
          artifact={selectedArtifact}
          onClose={() => setSelectedArtifact(null)}
          onExtracted={() => handleExtracted(selectedArtifact.id)}
        />
      )}
    </>
  )
}
