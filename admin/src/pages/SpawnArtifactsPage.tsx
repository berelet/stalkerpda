import { useState, useEffect } from 'react'
import api from '../services/api'

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
  spawnedAt: string
  expiresAt?: string
}

export default function SpawnArtifactsPage() {
  const [artifactTypes, setArtifactTypes] = useState<ArtifactType[]>([])
  const [spawnedArtifacts, setSpawnedArtifacts] = useState<SpawnedArtifact[]>([])
  const [loading, setLoading] = useState(true)
  
  // Spawn form state
  const [selectedType, setSelectedType] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [duration, setDuration] = useState('24') // hours
  const [spawning, setSpawning] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [typesRes, spawnedRes] = await Promise.all([
        api.get('/api/admin/artifact-types'),
        api.get('/api/admin/artifacts/spawned')
      ])
      setArtifactTypes(typesRes.data.artifacts || [])
      setSpawnedArtifacts(spawnedRes.data.artifacts || [])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSpawn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedType || !latitude || !longitude) return

    try {
      setSpawning(true)
      const expiresAt = duration ? new Date(Date.now() + parseInt(duration) * 60 * 60 * 1000).toISOString() : undefined
      
      await api.post('/api/admin/artifacts/spawn', {
        typeId: selectedType,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        expiresAt
      })

      // Reset form
      setSelectedType('')
      setLatitude('')
      setLongitude('')
      setDuration('24')
      
      // Reload spawned artifacts
      loadData()
    } catch (error) {
      console.error('Failed to spawn artifact:', error)
    } finally {
      setSpawning(false)
    }
  }

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toFixed(6))
          setLongitude(position.coords.longitude.toFixed(6))
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }

  const handleRemoveArtifact = async (artifactId: string) => {
    if (!confirm('Remove this artifact from the map?')) return
    
    try {
      await api.delete(`/api/admin/artifacts/${artifactId}`)
      loadData()
    } catch (error) {
      console.error('Failed to remove artifact:', error)
    }
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
            <h2 className="text-xl font-bold text-white mb-4">Spawn New Artifact</h2>
            
            <form onSubmit={handleSpawn} className="space-y-4">
              {/* Artifact Type */}
              <div>
                <label className="block text-sm font-medium text-[#91b3ca] mb-2">
                  Artifact Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  required
                  className="w-full bg-[#101b22] border border-[#233948] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1e9cf1] focus:ring-1 focus:ring-[#1e9cf1]"
                >
                  <option value="">Select artifact type...</option>
                  {artifactTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.rarity})
                    </option>
                  ))}
                </select>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#91b3ca] mb-2">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                    placeholder="59.329323"
                    className="w-full bg-[#101b22] border border-[#233948] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1e9cf1] focus:ring-1 focus:ring-[#1e9cf1] font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#91b3ca] mb-2">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                    placeholder="18.068581"
                    className="w-full bg-[#101b22] border border-[#233948] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1e9cf1] focus:ring-1 focus:ring-[#1e9cf1] font-mono text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGetCurrentLocation}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#233948] text-[#91b3ca] hover:text-white hover:bg-[#233948] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">my_location</span>
                Use My Current Location
              </button>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-[#91b3ca] mb-2">
                  Active Duration (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="168"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="24"
                  className="w-full bg-[#101b22] border border-[#233948] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1e9cf1] focus:ring-1 focus:ring-[#1e9cf1]"
                />
                <p className="text-xs text-[#91b3ca] mt-1">
                  Leave empty for permanent artifact
                </p>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={spawning || !selectedType || !latitude || !longitude}
                className="w-full flex items-center justify-center gap-2 bg-[#1e9cf1] hover:bg-[#157abd] text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-[0_4px_14px_0_rgba(30,156,241,0.39)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]">add_location</span>
                {spawning ? 'Spawning...' : 'Spawn Artifact'}
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
                      className={`p-4 hover:bg-white/[0.02] transition-colors ${
                        isExpired(artifact.expiresAt) ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-medium">{artifact.typeName}</span>
                            {isExpired(artifact.expiresAt) && (
                              <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                                Expired
                              </span>
                            )}
                            {artifact.state === 'extracted' && (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">
                                Collected
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
                        <button
                          onClick={() => handleRemoveArtifact(artifact.id)}
                          className="p-2 rounded-lg text-[#91b3ca] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove"
                        >
                          <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
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
