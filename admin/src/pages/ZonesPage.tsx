import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet'
import api from '../services/api'
import 'leaflet/dist/leaflet.css'

interface Zone {
  id: string
  name: string
  centerLat: number
  centerLng: number
  radius: number
  radiationLevel?: number
  respawnTimeSeconds?: number
  activeFrom?: string
  activeTo?: string
  isActive: boolean
}

interface ZoneForm {
  id?: string
  name: string
  centerLat: number
  centerLng: number
  radius: number
  radiationLevel: number
  respawnTimeSeconds: number
  isActive: boolean
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) })
  return null
}

export default function ZonesPage() {
  const [zoneType, setZoneType] = useState<'radiation' | 'respawn'>('radiation')
  const [zones, setZones] = useState<Zone[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [form, setForm] = useState<ZoneForm>({
    name: '', centerLat: 34.7071, centerLng: 33.0226, radius: 100,
    radiationLevel: 50, respawnTimeSeconds: 300, isActive: true
  })
  const [mapKey, setMapKey] = useState(0)
  const [geoStatus, setGeoStatus] = useState<string>('detecting...')

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setUserLocation({ lat, lng })
          setForm(prev => ({ ...prev, centerLat: lat, centerLng: lng }))
          setMapKey(k => k + 1)
          setGeoStatus(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        },
        (err) => {
          console.error('Geolocation error:', err)
          setGeoStatus('failed: ' + err.message)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    } else {
      setGeoStatus('not supported')
    }
  }, [])

  useEffect(() => { loadZones() }, [zoneType])

  const loadZones = async () => {
    try {
      const res = await api.get(`/api/admin/zones/${zoneType}`)
      setZones(res.data.zones || [])
    } catch (e) { console.error('Failed to load zones:', e) }
  }

  const handleEdit = (zone: Zone) => {
    setEditing(true)
    setForm({
      id: zone.id, name: zone.name, centerLat: zone.centerLat, centerLng: zone.centerLng,
      radius: zone.radius, radiationLevel: zone.radiationLevel || 50,
      respawnTimeSeconds: zone.respawnTimeSeconds || 300, isActive: zone.isActive
    })
  }

  const handleCancel = () => {
    setEditing(false)
    const loc = userLocation || { lat: form.centerLat, lng: form.centerLng }
    setForm({
      name: '', centerLat: loc.lat, centerLng: loc.lng, radius: 100,
      radiationLevel: 50, respawnTimeSeconds: 300, isActive: true
    })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this zone?')) return
    try {
      await api.delete(`/api/admin/zones/${zoneType}/${id}`)
      loadZones()
    } catch (e: any) {
      alert('Failed: ' + (e.response?.data?.error?.message || e.message))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        name: form.name, centerLat: form.centerLat, centerLng: form.centerLng, radius: form.radius,
        ...(zoneType === 'radiation' ? { radiationLevel: form.radiationLevel } : { respawnTimeSeconds: form.respawnTimeSeconds }),
        isActive: form.isActive
      }

      if (editing && form.id) {
        await api.put(`/api/admin/zones/${zoneType}/${form.id}`, payload)
      } else {
        await api.post(`/api/admin/zones/${zoneType}`, payload)
      }
      setForm({
        name: '', centerLat: userLocation?.lat || form.centerLat, centerLng: userLocation?.lng || form.centerLng, radius: 100,
        radiationLevel: 50, respawnTimeSeconds: 300, isActive: true
      })
      setEditing(false)
      loadZones()
    } catch (e: any) {
      alert('Failed: ' + (e.response?.data?.error?.message || e.message))
    } finally { setLoading(false) }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Zones Management</h1>
        <p className="text-[#91b3ca] text-sm">Your location: {geoStatus}</p>
      </div>

      <div className="flex gap-4">
        <button onClick={() => { setZoneType('radiation'); handleCancel() }}
          className={`px-6 py-2 rounded ${zoneType === 'radiation' ? 'bg-red-600 text-white' : 'bg-[#16202a] text-[#91b3ca] border border-[#233948]'}`}>
          Radiation Zones
        </button>
        <button onClick={() => { setZoneType('respawn'); handleCancel() }}
          className={`px-6 py-2 rounded ${zoneType === 'respawn' ? 'bg-green-600 text-white' : 'bg-[#16202a] text-[#91b3ca] border border-[#233948]'}`}>
          Respawn Zones
        </button>
      </div>

      {/* Zones List */}
      <div className="bg-[#16202a] border border-[#233948] rounded-lg p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            {zoneType === 'radiation' ? 'Radiation' : 'Respawn'} Zones ({zones.length})
          </h2>
          {editing && (
            <button onClick={handleCancel} className="px-4 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-sm">
              + Add New Zone
            </button>
          )}
        </div>
        {zones.length === 0 ? (
          <p className="text-[#91b3ca]">No zones created yet</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {zones.map(z => (
              <div key={z.id} className={`flex items-center justify-between p-3 rounded ${editing && form.id === z.id ? 'bg-[#233948]' : 'bg-[#0d1419]'}`}>
                <div>
                  <span className="text-white font-medium">{z.name}</span>
                  <span className="text-[#91b3ca] text-sm ml-3">
                    {z.radius}m • {zoneType === 'radiation' ? `${z.radiationLevel}% rad` : `${z.respawnTimeSeconds}s`}
                  </span>
                  {!z.isActive && <span className="text-yellow-500 text-sm ml-2">(inactive)</span>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(z)} className="text-blue-400 hover:text-blue-300 px-2">✎</button>
                  <button onClick={() => handleDelete(z.id)} className="text-red-500 hover:text-red-400 px-2">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-4">
          <h2 className="text-xl font-bold text-white mb-4">Map</h2>
          <div className="h-[400px] rounded overflow-hidden">
            <MapContainer key={mapKey} center={[form.centerLat, form.centerLng]} zoom={15} className="h-full w-full">
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <MapClickHandler onMapClick={(lat, lng) => setForm({ ...form, centerLat: lat, centerLng: lng })} />
              <Circle center={[form.centerLat, form.centerLng]} radius={form.radius}
                pathOptions={{ color: '#00d4ff', fillOpacity: 0.4 }} />
              {zones.filter(z => z.id !== form.id).map(z => (
                <Circle key={z.id} center={[z.centerLat, z.centerLng]} radius={z.radius}
                  pathOptions={{ color: zoneType === 'radiation' ? '#ef4444' : '#10b981', fillOpacity: 0.2 }} />
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Form */}
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-4">
          <h2 className="text-xl font-bold text-white mb-4">
            {editing ? 'Edit' : 'Create'} {zoneType === 'radiation' ? 'Radiation' : 'Respawn'} Zone
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#91b3ca] mb-1">Zone Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#91b3ca] mb-1">Latitude</label>
                <input type="number" step="0.000001" value={form.centerLat}
                  onChange={(e) => setForm({ ...form, centerLat: parseFloat(e.target.value) })}
                  className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded" required />
              </div>
              <div>
                <label className="block text-sm text-[#91b3ca] mb-1">Longitude</label>
                <input type="number" step="0.000001" value={form.centerLng}
                  onChange={(e) => setForm({ ...form, centerLng: parseFloat(e.target.value) })}
                  className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded" required />
              </div>
            </div>
            <div>
              <label className="block text-sm text-[#91b3ca] mb-1">Radius (meters)</label>
              <input type="number" value={form.radius} onChange={(e) => setForm({ ...form, radius: parseInt(e.target.value) })}
                className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded" required />
            </div>
            {zoneType === 'radiation' ? (
              <div>
                <label className="block text-sm text-[#91b3ca] mb-1">Radiation Level (per 5 min)</label>
                <input type="number" min="10" max="100" value={form.radiationLevel}
                  onChange={(e) => setForm({ ...form, radiationLevel: parseInt(e.target.value) })}
                  className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded" required />
              </div>
            ) : (
              <div>
                <label className="block text-sm text-[#91b3ca] mb-1">Respawn Time (seconds)</label>
                <input type="number" value={form.respawnTimeSeconds}
                  onChange={(e) => setForm({ ...form, respawnTimeSeconds: parseInt(e.target.value) })}
                  className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded" required />
              </div>
            )}
            {editing && (
              <label className="flex items-center gap-2 text-[#91b3ca]">
                <input type="checkbox" checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-4 h-4" />
                Active
              </label>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={loading}
                className="flex-1 bg-[#00d4ff] hover:bg-[#00b8e6] text-[#0d1419] font-bold py-2 px-4 rounded disabled:opacity-50">
                {loading ? 'Saving...' : editing ? 'Update Zone' : 'Create Zone'}
              </button>
              {editing && (
                <button type="button" onClick={handleCancel}
                  className="px-4 py-2 bg-[#233948] text-white rounded hover:bg-[#2d4a5e]">
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
