import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import api from '../services/api'

// Fix Leaflet default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface ArtifactType {
  id: string
  name: string
  rarity: string
  imageUrl?: string
}

interface SpawnedArtifact {
  id: string
  typeId: string
  typeName: string
  latitude: number
  longitude: number
  state: string
  status: string
  collectedBy?: string
  collectedByPlayerId?: string
  spawnedAt: string
  expiresAt?: string
  extractedAt?: string
}

export default function SpawnArtifactsPage() {
  const [artifactTypes, setArtifactTypes] = useState<ArtifactType[]>([])
  const [spawnedArtifacts, setSpawnedArtifacts] = useState<SpawnedArtifact[]>([])
  const [loading, setLoading] = useState(true)
  
  // Spawn form state
  const [editingArtifactId, setEditingArtifactId] = useState<string | null>(null)
  const [selectedType, setSelectedType] = useState('')
  const [latitude, setLatitude] = useState(59.3293)
  const [longitude, setLongitude] = useState(18.0686)
  const [durationType, setDurationType] = useState<'hours' | 'exact'>('hours')
  const [durationHours, setDurationHours] = useState('24')
  const [startDateTime, setStartDateTime] = useState('')
  const [endDateTime, setEndDateTime] = useState('')
  const [spawning, setSpawning] = useState(false)
  const [markerPosition, setMarkerPosition] = useState<[number, number]>([59.3293, 18.0686])
  const [mapKey, setMapKey] = useState(0) // Force map re-render

  useEffect(() => {
    loadData()
    // Get user's location on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setLatitude(lat)
          setLongitude(lng)
          setMarkerPosition([lat, lng])
          setMapKey(prev => prev + 1) // Force map to re-center
        },
        () => {
          // Ignore errors, use default Stockholm coordinates
        }
      )
    }
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      console.log('Loading artifact types and spawned artifacts...')
      const [typesRes, spawnedRes] = await Promise.all([
        api.get('/api/admin/artifact-types'),
        api.get('/api/admin/artifacts/spawned')
      ])
      console.log('Artifact types response:', typesRes.data)
      console.log('Spawned artifacts response:', spawnedRes.data)
      setArtifactTypes(typesRes.data.artifacts || [])
      setSpawnedArtifacts(spawnedRes.data.artifacts || [])
    } catch (error: any) {
      console.error('Failed to load data:', error)
      if (error.response) {
        console.error('Error response:', error.response.data)
        console.error('Error status:', error.response.status)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSpawn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType || !latitude || !longitude) return

    try {
      setSpawning(true)
      
      let expiresAt: string | undefined
      if (durationType === 'hours' && durationHours) {
        expiresAt = new Date(Date.now() + parseInt(durationHours) * 60 * 60 * 1000).toISOString()
      } else if (durationType === 'exact' && endDateTime) {
        // Convert local datetime to ISO (UTC)
        expiresAt = new Date(endDateTime).toISOString()
      }
      
      if (editingArtifactId) {
        // Update existing artifact
        await api.delete(`/api/admin/artifacts/${editingArtifactId}`)
        await api.post('/api/admin/artifacts/spawn', {
          typeId: selectedType,
          latitude: typeof latitude === 'number' ? latitude : parseFloat(String(latitude)),
          longitude: typeof longitude === 'number' ? longitude : parseFloat(String(longitude)),
          expiresAt
        })
        console.log('Artifact updated successfully')
      } else {
        // Create new artifact
        await api.post('/api/admin/artifacts/spawn', {
          typeId: selectedType,
          latitude: typeof latitude === 'number' ? latitude : parseFloat(String(latitude)),
          longitude: typeof longitude === 'number' ? longitude : parseFloat(String(longitude)),
          expiresAt
        })
        console.log('Artifact spawned successfully')
      }
      
      // Reset form
      handleAddNew()
      
      // Reload spawned artifacts
      await loadData()
      console.log('List reloaded')
    } catch (error: any) {
      console.error('Failed to spawn artifact:', error)
      if (error.response) {
        console.error('Spawn error response:', error.response.data)
      }
    } finally {
      setSpawning(false)
    }
  }

  const handleMapClick = (lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
    setMarkerPosition([lat, lng])
  }

  // Map click handler component
  function MapClickHandler() {
    useMapEvents({
      click: (e) => {
        handleMapClick(e.latlng.lat, e.latlng.lng)
      },
    })
    return null
  }

  const handleEditArtifact = (artifact: SpawnedArtifact) => {
    setEditingArtifactId(artifact.id)
    setSelectedType(artifact.typeId)
    setLatitude(artifact.latitude)
    setLongitude(artifact.longitude)
    setMarkerPosition([artifact.latitude, artifact.longitude])
    setMapKey(prev => prev + 1)
    
    // Set expiration time
    if (artifact.expiresAt) {
      const expiresDate = new Date(artifact.expiresAt) // UTC time
      const now = new Date() // Local time
      
      // Calculate hours left
      const hoursLeft = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60))
      
      if (hoursLeft > 0 && hoursLeft <= 168) {
        setDurationType('hours')
        setDurationHours(String(hoursLeft))
      } else {
        setDurationType('exact')
        // Format for datetime-local input (YYYY-MM-DDTHH:mm)
        const formatDateTime = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          return `${year}-${month}-${day}T${hours}:${minutes}`
        }
        
        // Start time = now, End time = expires
        setStartDateTime(formatDateTime(now))
        setEndDateTime(formatDateTime(expiresDate))
      }
    }
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleResetToMap = async (artifactId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Return artifact to map? Player will keep copy in inventory.')) return

    try {
      await api.post(`/api/admin/artifacts/${artifactId}/reset`)
      await loadData()
    } catch (error) {
      console.error('Failed to reset artifact:', error)
      alert('Failed to reset artifact')
    }
  }

  const handleRemoveAndReset = async (artifactId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Remove from player inventory AND return to map?')) return

    try {
      await api.post(`/api/admin/artifacts/${artifactId}/remove-and-reset`)
      await loadData()
    } catch (error) {
      console.error('Failed to remove and reset artifact:', error)
      alert('Failed to remove and reset artifact')
    }
  }

  const handleDeleteArtifact = async (artifactId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete artifact spawn completely?')) return

    try {
      await api.delete(`/api/admin/artifacts/${artifactId}`)
      await loadData()
    } catch (error) {
      console.error('Failed to delete artifact:', error)
      alert('Failed to delete artifact')
    }
  }

  const handleAddNew = () => {
    setEditingArtifactId(null)
    setSelectedType('')
    setDurationHours('24')
    setStartDateTime('')
    setEndDateTime('')
    setDurationType('hours')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Spawn Artifacts</h1>
          <p className="text-[#91b3ca] mt-1">Place artifacts on the map with expiration time</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spawn Form */}
          <div className="bg-[#18242e] rounded-xl border border-[#233948] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">
                {editingArtifactId ? 'Edit Artifact' : 'Spawn New Artifact'}
              </h2>
              {editingArtifactId && (
                <button
                  type="button"
                  onClick={handleAddNew}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e9cf1] hover:bg-[#157abd] text-white text-sm font-medium transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  Add New
                </button>
              )}
            </div>
            
            <form onSubmit={handleSpawn} className="space-y-4">
              {/* Artifact Type - Visual Grid */}
              <div>
                <label className="block text-sm font-medium text-[#91b3ca] mb-2">
                  Select Artifact Type
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto p-2 bg-[#101b22] border border-[#233948] rounded-lg">
                  {loading ? (
                    <div className="col-span-2 text-center text-[#91b3ca] py-4">Loading...</div>
                  ) : artifactTypes.length === 0 ? (
                    <div className="col-span-2 text-center text-[#91b3ca] py-4">No artifacts available</div>
                  ) : (
                    artifactTypes.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setSelectedType(type.id)}
                        className={`p-3 rounded-lg border transition-all text-left ${
                          selectedType === type.id
                            ? 'border-[#1e9cf1] bg-[#1e9cf1]/10 shadow-[0_0_10px_rgba(30,156,241,0.3)]'
                            : 'border-[#233948] hover:border-[#1e9cf1]/50 hover:bg-[#233948]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {type.imageUrl && (
                            <img src={type.imageUrl} alt={type.name} className="w-8 h-8 object-cover rounded" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium truncate">{type.name}</div>
                            <div className="text-xs text-[#91b3ca] capitalize">{type.rarity}</div>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Map */}
              <div>
                <label className="block text-sm font-medium text-[#91b3ca] mb-2">
                  Location (click on map to select)
                </label>
                <div className="h-[300px] rounded-lg overflow-hidden border border-[#233948]">
                  <MapContainer
                    key={mapKey}
                    center={markerPosition}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    <Marker position={markerPosition} />
                    <MapClickHandler />
                  </MapContainer>
                </div>
              </div>

              {/* Coordinates Display */}
              <div className="bg-[#101b22] border border-[#233948] rounded-lg p-3">
                <div className="text-xs text-[#91b3ca] mb-1">Selected Coordinates:</div>
                <div className="font-mono text-sm text-white">
                  {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </div>
              </div>

              {/* Expiration Time */}
              <div>
                <label className="block text-sm font-medium text-[#91b3ca] mb-2">
                  Expiration Time
                </label>
                
                {/* Duration Type Toggle */}
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setDurationType('hours')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      durationType === 'hours'
                        ? 'bg-[#1e9cf1] text-white'
                        : 'bg-[#101b22] text-[#91b3ca] border border-[#233948] hover:text-white'
                    }`}
                  >
                    Duration (hours)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDurationType('exact')
                      // Auto-fill with current time and +24h if empty
                      if (!startDateTime || !endDateTime) {
                        const now = new Date()
                        const end = new Date(now.getTime() + 24 * 60 * 60 * 1000)
                        const formatDateTime = (date: Date) => {
                          const year = date.getFullYear()
                          const month = String(date.getMonth() + 1).padStart(2, '0')
                          const day = String(date.getDate()).padStart(2, '0')
                          const hours = String(date.getHours()).padStart(2, '0')
                          const minutes = String(date.getMinutes()).padStart(2, '0')
                          return `${year}-${month}-${day}T${hours}:${minutes}`
                        }
                        setStartDateTime(formatDateTime(now))
                        setEndDateTime(formatDateTime(end))
                      }
                    }}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      durationType === 'exact'
                        ? 'bg-[#1e9cf1] text-white'
                        : 'bg-[#101b22] text-[#91b3ca] border border-[#233948] hover:text-white'
                    }`}
                  >
                    Exact Time
                  </button>
                </div>

                {/* Hours Input */}
                {durationType === 'hours' && (
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="168"
                      value={durationHours}
                      onChange={(e) => setDurationHours(e.target.value)}
                      placeholder="24"
                      className="w-full bg-[#101b22] border border-[#233948] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1e9cf1] focus:ring-1 focus:ring-[#1e9cf1]"
                    />
                    <p className="text-xs text-[#91b3ca] mt-1">
                      Artifact will expire in {durationHours || '0'} hours
                    </p>
                  </div>
                )}

                {/* Exact DateTime Input - Time Range */}
                {durationType === 'exact' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#91b3ca] mb-1">
                        Start Time
                      </label>
                      <input
                        type="datetime-local"
                        value={startDateTime}
                        onChange={(e) => setStartDateTime(e.target.value)}
                        className="w-full bg-[#101b22] border border-[#233948] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1e9cf1] focus:ring-1 focus:ring-[#1e9cf1]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#91b3ca] mb-1">
                        End Time
                      </label>
                      <input
                        type="datetime-local"
                        value={endDateTime}
                        onChange={(e) => setEndDateTime(e.target.value)}
                        required={durationType === 'exact'}
                        className="w-full bg-[#101b22] border border-[#233948] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1e9cf1] focus:ring-1 focus:ring-[#1e9cf1]"
                      />
                    </div>
                    <p className="text-xs text-[#91b3ca]">
                      Time zone: Europe/Kyiv (UTC+2)
                    </p>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={spawning || !selectedType || !latitude || !longitude}
                className="w-full flex items-center justify-center gap-2 bg-[#1e9cf1] hover:bg-[#157abd] text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-[0_4px_14px_0_rgba(30,156,241,0.39)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]">
                  {editingArtifactId ? 'save' : 'add_location'}
                </span>
                {spawning 
                  ? (editingArtifactId ? 'Updating...' : 'Spawning...') 
                  : (editingArtifactId ? 'Update Artifact' : 'Spawn Artifact')
                }
              </button>
            </form>
          </div>

          {/* Active Artifacts List */}
          <div className="bg-[#18242e] rounded-xl border border-[#233948] overflow-hidden">
            <div className="p-6 border-b border-[#233948]">
              <h2 className="text-xl font-bold text-white">Active Artifacts</h2>
              <p className="text-sm text-[#91b3ca] mt-1">
                {spawnedArtifacts.length} artifact(s) on the map
              </p>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-[#91b3ca]">Loading...</div>
              ) : spawnedArtifacts.length === 0 ? (
                <div className="p-6 text-center text-[#91b3ca]">No artifacts spawned</div>
              ) : (
                <div className="divide-y divide-[#233948]">
                  {spawnedArtifacts.map((artifact) => (
                    <div
                      key={artifact.id}
                      onClick={() => handleEditArtifact(artifact)}
                      className={`p-4 hover:bg-white/[0.02] transition-colors cursor-pointer ${
                        isExpired(artifact.expiresAt) ? 'opacity-50' : ''
                      } ${editingArtifactId === artifact.id ? 'bg-[#1e9cf1]/10 border-l-2 border-[#1e9cf1]' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{artifact.typeName}</span>
                            {editingArtifactId === artifact.id && (
                              <span className="text-xs px-2 py-0.5 rounded bg-[#1e9cf1]/20 text-[#1e9cf1] border border-[#1e9cf1]/30">
                                Editing
                              </span>
                            )}
                            {isExpired(artifact.expiresAt) && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                Expired
                              </span>
                            )}
                            {artifact.state === 'extracted' && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                Collected{artifact.collectedBy ? ` by ${artifact.collectedBy}` : ''}
                              </span>
                            )}
                            {artifact.state === 'lost' && (
                              <span className="text-xs px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">
                                Lost
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#91b3ca] font-mono space-y-0.5">
                            <div>📍 {artifact.latitude.toFixed(6)}, {artifact.longitude.toFixed(6)}</div>
                            <div>🕐 Spawned: {formatDate(artifact.spawnedAt)}</div>
                            {artifact.expiresAt && (
                              <div>⏰ Expires: {formatDate(artifact.expiresAt)}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {artifact.state === 'extracted' && (
                            <>
                              <button
                                onClick={(e) => handleResetToMap(artifact.id, e)}
                                className="p-2 rounded-lg text-[#91b3ca] hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                                title="Reset to Map (player keeps copy)"
                              >
                                <span className="material-symbols-outlined text-[18px]">refresh</span>
                              </button>
                              <button
                                onClick={(e) => handleRemoveAndReset(artifact.id, e)}
                                className="p-2 rounded-lg text-[#91b3ca] hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors"
                                title="Remove from inventory & reset"
                              >
                                <span className="material-symbols-outlined text-[18px]">undo</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={(e) => handleDeleteArtifact(artifact.id, e)}
                            className="p-2 rounded-lg text-[#91b3ca] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Delete spawn"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
