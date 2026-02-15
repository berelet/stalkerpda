import { Circle, Marker, Popup } from 'react-leaflet'
import { Icon, DivIcon } from 'leaflet'
import { QuestMarker } from '../../hooks/useActiveQuests'

interface Props {
  markers: QuestMarker[]
}

const questIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzAwYmZmZiIgc3Ryb2tlPSIjMDA4MGZmIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxMiIgeT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+ITwvdGV4dD4KPC9zdmc+',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
})

const visitedIcon = new Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iIzAwZmYwMCIgc3Ryb2tlPSIjMDA4MDAwIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8dGV4dCB4PSIxMiIgeT0iMTYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXNpemU9IjEyIiBmb250LXdlaWdodD0iYm9sZCI+4pyTPC90ZXh0Pgo8L3N2Zz4=',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
})

function createCheckpointIcon(index: number, status: 'visited' | 'active' | 'future') {
  const colors = {
    visited: { bg: '#00ff00', border: '#008000' },
    active:  { bg: '#ffcc00', border: '#cc8800' },
    future:  { bg: '#555555', border: '#333333' }
  }
  const { bg, border } = colors[status]
  const label = status === 'visited' ? '✓' : index
  return new DivIcon({
    html: `<div style="
      width: 24px; height: 24px; 
      background: ${bg}; 
      border: 2px solid ${border}; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      opacity: ${status === 'future' ? '0.5' : '1'};
    ">${label}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    className: ''
  })
}

export default function QuestMarkers({ markers }: Props) {
  return (
    <>
      {markers.map((marker, idx) => (
        <div key={`${marker.questId}-${idx}`}>
          {/* Quest radius circle */}
          <Circle
            center={[marker.lat, marker.lng]}
            radius={marker.radius}
            pathOptions={{
              color: marker.visited ? '#00ff00' : marker.isNext ? '#ffcc00' : '#555555',
              fillColor: marker.visited ? '#00ff00' : marker.isNext ? '#ffcc00' : '#555555',
              fillOpacity: marker.isNext ? 0.2 : 0.1,
              weight: marker.isNext ? 3 : 2,
              dashArray: marker.visited ? undefined : '5, 5'
            }}
          />
          
          {/* Quest marker */}
          <Marker
            position={[marker.lat, marker.lng]}
            icon={
              marker.type === 'patrol_checkpoint'
                ? createCheckpointIcon(
                    marker.checkpointIndex || 0,
                    marker.visited ? 'visited' : marker.isNext ? 'active' : 'future'
                  )
                : marker.visited ? visitedIcon : questIcon
            }
          >
            <Popup>
              <div className="text-xs">
                <div className="font-bold text-blue-600">{marker.questTitle}</div>
                <div className="text-gray-600 capitalize">{marker.questType.replace('_', ' ')}</div>
                {marker.type === 'patrol_checkpoint' && (
                  <div>Checkpoint {marker.checkpointIndex}</div>
                )}
                <div>Radius: {marker.radius}m</div>
                {marker.visited && <div className="text-green-600">✓ Visited</div>}
              </div>
            </Popup>
          </Marker>
        </div>
      ))}
    </>
  )
}
