import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Circle, useMapEvents } from 'react-leaflet'
import api from '../services/api'
import 'leaflet/dist/leaflet.css'

interface ZoneForm {
  name: string
  centerLat: number
  centerLng: number
  radius: number
  radiationLevel: number
  respawnTimeSeconds: number
  timeMode: 'permanent' | 'duration' | 'exact'
  durationHours: number
  activeFrom: string
  activeTo: string
  respawnEnabled: boolean
  respawnDelaySeconds: number
  respawnRadiusMeters: number
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

export default function ZonesPage() {
  const [zoneType, setZoneType] = useState<'radiation' | 'respawn'>('radiation')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [form, setForm] = useState<ZoneForm>({
    name: '',
    centerLat: 50.4501,
    centerLng: 30.5234,
    radius: 100,
    radiationLevel: 50,
    respawnTimeSeconds: 300,
    timeMode: 'permanent',
    durationHours: 1,
    activeFrom: '',
    activeTo: '',
    respawnEnabled: false,
    respawnDelaySeconds: 600,
    respawnRadiusMeters: 50
  })
  const [loading, setLoading] = useState(false)

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setUserLocation({ lat, lng })
          setForm(prev => ({ ...prev, centerLat: lat, centerLng: lng }))
        },
        (error) => {
          console.error('Geolocation error:', error)
        }
      )
    }
  }, [])

  const handleMapClick = (lat: number, lng: number) => {
    setForm({ ...form, centerLat: lat, centerLng: lng })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Calculate timestamps
      let activeFrom = null
      let activeTo = null

      if (form.timeMode === 'duration') {
        activeFrom = new Date().toISOString()
        activeTo = new Date(Date.now() + form.durationHours * 60 * 60 * 1000).toISOString()
      } else if (form.timeMode === 'exact') {
        activeFrom = form.activeFrom ? new Date(form.activeFrom).toISOString() : null
        activeTo = form.activeTo ? new Date(form.activeTo).toISOString() : null
      }

      const payload = {
        name: form.name,
        centerLat: form.centerLat,
        centerLng: form.centerLng,
        radius: form.radius,
        ...(zoneType === 'radiation' ? {
          radiationLevel: form.radiationLevel
        } : {
          respawnTimeSeconds: form.respawnTimeSeconds
        }),
        activeFrom,
        activeTo,
        respawnEnabled: form.respawnEnabled,
        respawnDelaySeconds: form.respawnEnabled ? form.respawnDelaySeconds : null,
        respawnRadiusMeters: form.respawnEnabled ? form.respawnRadiusMeters : null
      }

      const endpoint = zoneType === 'radiation' 
        ? '/api/admin/zones/radiation'
        : '/api/admin/zones/respawn'

      await api.post(endpoint, payload)
      
      alert(`${zoneType === 'radiation' ? 'Radiation' : 'Respawn'} zone created!`)
      
      // Reset form
      setForm({
        ...form,
        name: '',
        centerLat: 50.4501,
        centerLng: 30.5234
      })
    } catch (error: any) {
      alert('Failed to create zone: ' + (error.response?.data?.error?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Zones Management</h1>
        <p className="text-[#91b3ca]">Create and manage radiation and respawn zones</p>
      </div>

      {/* Zone Type Selector */}
      <div className="flex gap-4">
        <button
          onClick={() => setZoneType('radiation')}
          className={`px-6 py-2 rounded ${
            zoneType === 'radiation'
              ? 'bg-red-600 text-white'
              : 'bg-[#16202a] text-[#91b3ca] border border-[#233948]'
          }`}
        >
          Radiation Zones
        </button>
        <button
          onClick={() => setZoneType('respawn')}
          className={`px-6 py-2 rounded ${
            zoneType === 'respawn'
              ? 'bg-green-600 text-white'
              : 'bg-[#16202a] text-[#91b3ca] border border-[#233948]'
          }`}
        >
          Respawn Zones
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-4">
          <h2 className="text-xl font-bold text-white mb-4">Map (Click to place zone)</h2>
          <div className="h-[500px] rounded overflow-hidden">
            <MapContainer
              center={[userLocation?.lat || form.centerLat, userLocation?.lng || form.centerLng]}
              zoom={13}
              className="h-full w-full"
              key={`${userLocation?.lat}-${userLocation?.lng}`}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              <MapClickHandler onMapClick={handleMapClick} />
              
              {/* Preview circle */}
              {form.centerLat && form.centerLng && (
                <Circle
                  center={[form.centerLat, form.centerLng]}
                  radius={form.radius}
                  pathOptions={{
                    color: zoneType === 'radiation' ? '#ef4444' : '#10b981',
                    fillColor: zoneType === 'radiation' ? '#ef4444' : '#10b981',
                    fillOpacity: 0.3
                  }}
                />
              )}
            </MapContainer>
          </div>
        </div>

        {/* Form */}
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-4">
          <h2 className="text-xl font-bold text-white mb-4">
            Create {zoneType === 'radiation' ? 'Radiation' : 'Respawn'} Zone
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-[#91b3ca] mb-1">Zone Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-[#91b3ca] mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.centerLat}
                  onChange={(e) => setForm({ ...form, centerLat: parseFloat(e.target.value) })}
                  className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-[#91b3ca] mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.centerLng}
                  onChange={(e) => setForm({ ...form, centerLng: parseFloat(e.target.value) })}
                  className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-[#91b3ca] mb-1">Radius (meters)</label>
              <input
                type="number"
                value={form.radius}
                onChange={(e) => setForm({ ...form, radius: parseInt(e.target.value) })}
                className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
                required
              />
            </div>

            {zoneType === 'radiation' ? (
              <div>
                <label className="block text-sm text-[#91b3ca] mb-1">
                  Radiation Level (per 5 min)
                </label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={form.radiationLevel}
                  onChange={(e) => setForm({ ...form, radiationLevel: parseInt(e.target.value) })}
                  className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
                  required
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm text-[#91b3ca] mb-1">
                  Respawn Time (seconds)
                </label>
                <input
                  type="number"
                  value={form.respawnTimeSeconds}
                  onChange={(e) => setForm({ ...form, respawnTimeSeconds: parseInt(e.target.value) })}
                  className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
                  required
                />
              </div>
            )}

            {/* Time Mode */}
            <div>
              <label className="block text-sm text-[#91b3ca] mb-1">Time Mode</label>
              <select
                value={form.timeMode}
                onChange={(e) => setForm({ ...form, timeMode: e.target.value as any })}
                className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
              >
                <option value="permanent">Permanent</option>
                <option value="duration">Duration (hours from now)</option>
                <option value="exact">Exact time range</option>
              </select>
            </div>

            {form.timeMode === 'duration' && (
              <div>
                <label className="block text-sm text-[#91b3ca] mb-1">Duration (hours)</label>
                <input
                  type="number"
                  value={form.durationHours}
                  onChange={(e) => setForm({ ...form, durationHours: parseInt(e.target.value) })}
                  className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
                />
              </div>
            )}

            {form.timeMode === 'exact' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#91b3ca] mb-1">Active From</label>
                  <input
                    type="datetime-local"
                    value={form.activeFrom}
                    onChange={(e) => setForm({ ...form, activeFrom: e.target.value })}
                    className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#91b3ca] mb-1">Active To</label>
                  <input
                    type="datetime-local"
                    value={form.activeTo}
                    onChange={(e) => setForm({ ...form, activeTo: e.target.value })}
                    className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
                  />
                </div>
              </div>
            )}

            {/* Respawn Settings */}
            <div className="border-t border-[#233948] pt-4">
              <label className="flex items-center gap-2 text-[#91b3ca] mb-3">
                <input
                  type="checkbox"
                  checked={form.respawnEnabled}
                  onChange={(e) => setForm({ ...form, respawnEnabled: e.target.checked })}
                  className="w-4 h-4"
                />
                Enable auto-respawn after expiration
              </label>

              {form.respawnEnabled && (
                <div className="space-y-3 ml-6">
                  <div>
                    <label className="block text-sm text-[#91b3ca] mb-1">
                      Respawn Delay (seconds)
                    </label>
                    <input
                      type="number"
                      value={form.respawnDelaySeconds}
                      onChange={(e) => setForm({ ...form, respawnDelaySeconds: parseInt(e.target.value) })}
                      className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-[#91b3ca] mb-1">
                      Respawn Radius (meters)
                    </label>
                    <input
                      type="number"
                      value={form.respawnRadiusMeters}
                      onChange={(e) => setForm({ ...form, respawnRadiusMeters: parseInt(e.target.value) })}
                      className="w-full bg-[#0d1419] border border-[#233948] text-white px-3 py-2 rounded"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#00d4ff] hover:bg-[#00b8e6] text-[#0d1419] font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Creating...' : `Create ${zoneType === 'radiation' ? 'Radiation' : 'Respawn'} Zone`}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
