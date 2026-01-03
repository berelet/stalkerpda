import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import { Icon } from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MapProps {
  latitude: number
  longitude: number
  accuracy?: number
  zoom?: number
}

const playerIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI4IiBmaWxsPSIjMDBmZjAwIiBzdHJva2U9IiMwMDgwMDAiIHN0cm9rZS13aWR0aD0iMiIvPgogIDxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjMiIGZpbGw9IiMwMDgwMDAiLz4KPC9zdmc+',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
})

export default function StalkerMap({ latitude, longitude, accuracy, zoom = 16 }: MapProps) {
  return (
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
    </MapContainer>
  )
}
