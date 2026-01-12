import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
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

interface Quest {
  id: string
  title: string
  description: string
  reward: number
  status: string
  questType: string
  questData: any
  failed: boolean
  failedReason: string | null
  autoComplete: boolean
  issuer: { id: string; nickname: string }
  acceptedBy?: { id: string; nickname: string } | null
  expiresAt: string | null
  createdAt: string
}

interface Checkpoint {
  lat: number
  lng: number
  radius: number
}

const QUEST_TYPES = ['elimination', 'artifact_collection', 'visit', 'patrol', 'protection', 'manual']
const FACTIONS = ['stalker', 'bandit', 'mercenary', 'duty', 'freedom', 'loner']

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null)
  
  // Form state
  const [form, setForm] = useState({
    questType: 'elimination',
    title: '',
    description: '',
    reward: 1000,
    targetFaction: 'bandit',
    excludeFaction: '',
    factionMode: 'target' as 'target' | 'exclude',
    targetCount: 3,
    expiresInHours: 24,
    allowedFactions: [] as string[]
  })
  
  // Location state for visit/patrol
  const [visitLat, setVisitLat] = useState(50.45)
  const [visitLng, setVisitLng] = useState(30.52)
  const [visitRadius, setVisitRadius] = useState(20)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const [patrolTime, setPatrolTime] = useState(15)
  const [mapCenter, setMapCenter] = useState<[number, number]>([50.45, 30.52])

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude])
        setVisitLat(pos.coords.latitude)
        setVisitLng(pos.coords.longitude)
      })
    }
  }, [])

  const fetchQuests = async () => {
    try {
      const { data } = await api.get('/api/admin/quests')
      setQuests(data.quests || [])
    } catch (error) {
      console.error('Failed to fetch quests:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuests()
  }, [])

  const resetForm = () => {
    setForm({ questType: 'elimination', title: '', description: '', reward: 1000, targetFaction: 'bandit', excludeFaction: '', factionMode: 'target', targetCount: 3, expiresInHours: 24, allowedFactions: [] })
    setCheckpoints([])
    setEditingQuest(null)
  }

  const openEditModal = (quest: Quest) => {
    setEditingQuest(quest)
    const qd = quest.questData || {}
    setForm({
      questType: quest.questType,
      title: quest.title,
      description: quest.description || '',
      reward: quest.reward,
      targetFaction: qd.target_faction || 'bandit',
      excludeFaction: qd.exclude_faction || '',
      factionMode: qd.exclude_faction ? 'exclude' : 'target',
      targetCount: qd.target_count || 3,
      expiresInHours: 24,
      allowedFactions: []
    })
    if (quest.questType === 'visit' && qd.target_lat) {
      setVisitLat(qd.target_lat)
      setVisitLng(qd.target_lng)
      setVisitRadius(qd.target_radius || 20)
    }
    if (quest.questType === 'patrol' && qd.checkpoints) {
      setCheckpoints(qd.checkpoints.map((cp: any) => ({ lat: cp.lat, lng: cp.lng, radius: cp.radius || 30 })))
      setPatrolTime(qd.required_time_minutes || 15)
    }
    setShowCreate(true)
  }

  const handleSave = async () => {
    setCreating(true)
    try {
      let questData: any = {}
      if (form.questType === 'elimination') {
        questData = { 
          target_count: form.targetCount, 
          current_count: editingQuest?.questData?.current_count || 0,
          ...(form.factionMode === 'target' 
            ? { target_faction: form.targetFaction }
            : { exclude_faction: form.excludeFaction })
        }
      } else if (form.questType === 'artifact_collection') {
        questData = { target_count: form.targetCount, current_count: editingQuest?.questData?.current_count || 0 }
      } else if (form.questType === 'visit') {
        questData = { target_lat: visitLat, target_lng: visitLng, target_radius: visitRadius, visited: editingQuest?.questData?.visited || false }
      } else if (form.questType === 'patrol') {
        questData = { 
          checkpoints: checkpoints.map(cp => ({ lat: cp.lat, lng: cp.lng, radius: cp.radius, visited: false })),
          required_time_minutes: patrolTime,
          accumulated_time_seconds: editingQuest?.questData?.accumulated_time_seconds || 0,
          checkpoint_visits: editingQuest?.questData?.checkpoint_visits || []
        }
      }

      if (editingQuest) {
        await api.put(`/api/admin/quests/${editingQuest.id}`, {
          title: form.title,
          description: form.description,
          reward: form.reward,
          questData,
          factionRestrictions: form.allowedFactions.length > 0 ? form.allowedFactions : null,
          expiresAt: form.expiresInHours ? new Date(Date.now() + form.expiresInHours * 3600000).toISOString() : null
        })
      } else {
        const { data: me } = await api.get('/api/auth/me')
        await api.post('/api/admin/quests', {
          questType: form.questType,
          issuerId: me.id,
          title: form.title,
          description: form.description,
          reward: form.reward,
          questData,
          factionRestrictions: form.allowedFactions.length > 0 ? form.allowedFactions : null,
          autoComplete: form.questType === 'visit' || form.questType === 'patrol',
          expiresAt: form.expiresInHours ? new Date(Date.now() + form.expiresInHours * 3600000).toISOString() : null
        })
      }
      
      setShowCreate(false)
      resetForm()
      fetchQuests()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to save quest')
    } finally {
      setCreating(false)
    }
  }

  const handleConfirm = async (questId: string) => {
    if (!confirm('Confirm quest completion? Rewards will be distributed.')) return
    try {
      await api.post(`/api/admin/quests/${questId}/confirm`)
      fetchQuests()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to confirm')
    }
  }

  const handleDelete = async (questId: string) => {
    if (!confirm('Delete this quest?')) return
    try {
      await api.delete(`/api/admin/quests/${questId}`)
      fetchQuests()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to delete')
    }
  }

  const getStatusBadge = (q: Quest) => {
    if (q.failed) return <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">FAILED</span>
    if (q.status === 'completed') return <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">COMPLETED</span>
    if (q.status === 'in_progress') return <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded">AWAITING CONFIRM</span>
    if (q.status === 'accepted') return <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded">ACTIVE</span>
    return <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded">AVAILABLE</span>
  }

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('en-GB', { 
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Quests</h1>
          <p className="text-[#91b3ca]">Manage game quests and missions</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCreate(true) }}
          className="px-4 py-2 bg-[#00ff88] text-black font-medium rounded hover:bg-[#00cc6a]"
        >
          + Create Quest
        </button>
      </div>

      {/* Quest List */}
      {loading ? (
        <div className="text-[#91b3ca] text-center py-8">Loading...</div>
      ) : quests.length === 0 ? (
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-6 text-center">
          <p className="text-[#91b3ca]">No quests yet. Create one!</p>
        </div>
      ) : (
        <div className="bg-[#16202a] border border-[#233948] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#1a2836]">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-[#91b3ca] uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs text-[#91b3ca] uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs text-[#91b3ca] uppercase">Reward</th>
                <th className="px-4 py-3 text-left text-xs text-[#91b3ca] uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs text-[#91b3ca] uppercase">Created</th>
                <th className="px-4 py-3 text-left text-xs text-[#91b3ca] uppercase">Expires</th>
                <th className="px-4 py-3 text-left text-xs text-[#91b3ca] uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {quests.map(quest => (
                <tr key={quest.id} className="border-t border-[#233948] hover:bg-[#1a2836]">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{quest.title}</div>
                    <div className="text-[#91b3ca] text-xs">{quest.issuer.nickname}</div>
                  </td>
                  <td className="px-4 py-3 text-[#91b3ca] capitalize">{quest.questType?.replace('_', ' ')}</td>
                  <td className="px-4 py-3 text-[#00ff88]">💰 {quest.reward.toLocaleString()}</td>
                  <td className="px-4 py-3">{getStatusBadge(quest)}</td>
                  <td className="px-4 py-3 text-[#91b3ca] text-xs">{formatDateTime(quest.createdAt)}</td>
                  <td className="px-4 py-3 text-[#91b3ca] text-xs">{formatDateTime(quest.expiresAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {quest.status === 'available' && (
                        <button
                          onClick={() => openEditModal(quest)}
                          className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded hover:bg-blue-500/30"
                        >
                          Edit
                        </button>
                      )}
                      {quest.status === 'in_progress' && (
                        <button
                          onClick={() => handleConfirm(quest.id)}
                          className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded hover:bg-green-500/30"
                        >
                          Confirm
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(quest.id)}
                        className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#16202a] border border-[#233948] rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#233948]">
              <h2 className="text-xl font-bold text-white">{editingQuest ? 'Edit Quest' : 'Create Quest'}</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-[#91b3ca] text-sm mb-1">Quest Type</label>
                <select
                  value={form.questType}
                  onChange={e => setForm({ ...form, questType: e.target.value })}
                  disabled={!!editingQuest}
                  className="w-full bg-[#1a2836] border border-[#233948] rounded px-3 py-2 text-white disabled:opacity-50"
                >
                  {QUEST_TYPES.map(t => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[#91b3ca] text-sm mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full bg-[#1a2836] border border-[#233948] rounded px-3 py-2 text-white"
                  placeholder="Hunt the Bandits"
                />
              </div>
              <div>
                <label className="block text-[#91b3ca] text-sm mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full bg-[#1a2836] border border-[#233948] rounded px-3 py-2 text-white"
                  rows={2}
                  placeholder="Clear the area of bandit scum..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#91b3ca] text-sm mb-1">Reward</label>
                  <input
                    type="number"
                    value={form.reward}
                    onChange={e => setForm({ ...form, reward: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#1a2836] border border-[#233948] rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[#91b3ca] text-sm mb-1">Expires (hours)</label>
                  <input
                    type="number"
                    value={form.expiresInHours}
                    onChange={e => setForm({ ...form, expiresInHours: parseInt(e.target.value) || 0 })}
                    className="w-full bg-[#1a2836] border border-[#233948] rounded px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[#91b3ca] text-sm mb-1">Available for factions (empty = all)</label>
                <div className="flex flex-wrap gap-2">
                  {FACTIONS.map(f => (
                    <label key={f} className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.allowedFactions.includes(f)}
                        onChange={e => {
                          if (e.target.checked) {
                            setForm({ ...form, allowedFactions: [...form.allowedFactions, f] })
                          } else {
                            setForm({ ...form, allowedFactions: form.allowedFactions.filter(x => x !== f) })
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-white text-sm capitalize">{f}</span>
                    </label>
                  ))}
                </div>
              </div>
              {form.questType === 'elimination' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, factionMode: 'target' })}
                      className={`flex-1 px-3 py-2 rounded text-sm ${form.factionMode === 'target' ? 'bg-[#00ff88] text-black' : 'bg-[#1a2836] text-[#91b3ca] border border-[#233948]'}`}
                    >
                      Kill specific faction
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, factionMode: 'exclude' })}
                      className={`flex-1 px-3 py-2 rounded text-sm ${form.factionMode === 'exclude' ? 'bg-[#00ff88] text-black' : 'bg-[#1a2836] text-[#91b3ca] border border-[#233948]'}`}
                    >
                      Kill anyone except
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[#91b3ca] text-sm mb-1">
                        {form.factionMode === 'target' ? 'Target Faction' : 'Exclude Faction'}
                      </label>
                      <select
                        value={form.factionMode === 'target' ? form.targetFaction : form.excludeFaction}
                        onChange={e => setForm({ ...form, [form.factionMode === 'target' ? 'targetFaction' : 'excludeFaction']: e.target.value })}
                        className="w-full bg-[#1a2836] border border-[#233948] rounded px-3 py-2 text-white"
                      >
                        {['stalker', 'bandit', 'mercenary', 'duty', 'freedom', 'loner'].map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#91b3ca] text-sm mb-1">Kill Count</label>
                      <input
                        type="number"
                        value={form.targetCount}
                        onChange={e => setForm({ ...form, targetCount: parseInt(e.target.value) || 1 })}
                        className="w-full bg-[#1a2836] border border-[#233948] rounded px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
              {form.questType === 'artifact_collection' && (
                <div>
                  <label className="block text-[#91b3ca] text-sm mb-1">Artifact Count</label>
                  <input
                    type="number"
                    value={form.targetCount}
                    onChange={e => setForm({ ...form, targetCount: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#1a2836] border border-[#233948] rounded px-3 py-2 text-white"
                  />
                </div>
              )}
              {form.questType === 'visit' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[#91b3ca] text-sm mb-1">Target Location (click map)</label>
                    <div className="h-[200px] rounded border border-[#233948] overflow-hidden">
                      <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[visitLat, visitLng]} />
                        <Circle center={[visitLat, visitLng]} radius={visitRadius} pathOptions={{ color: '#00bfff', fillOpacity: 0.2 }} />
                        <MapClickHandler onClick={(lat, lng) => { setVisitLat(lat); setVisitLng(lng) }} />
                      </MapContainer>
                    </div>
                    <div className="text-xs text-[#91b3ca] mt-1">{visitLat.toFixed(6)}, {visitLng.toFixed(6)}</div>
                  </div>
                  <div>
                    <label className="block text-[#91b3ca] text-sm mb-1">Radius (meters)</label>
                    <input
                      type="number"
                      value={visitRadius}
                      onChange={e => setVisitRadius(parseInt(e.target.value) || 20)}
                      className="w-full bg-[#1a2836] border border-[#233948] rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}
              {form.questType === 'patrol' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-[#91b3ca] text-sm mb-1">Checkpoints (click map to add)</label>
                    <div className="h-[200px] rounded border border-[#233948] overflow-hidden">
                      <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {checkpoints.map((cp, i) => (
                          <div key={i}>
                            <Marker position={[cp.lat, cp.lng]} />
                            <Circle center={[cp.lat, cp.lng]} radius={cp.radius} pathOptions={{ color: '#00ff88', fillOpacity: 0.2 }} />
                          </div>
                        ))}
                        <MapClickHandler onClick={(lat, lng) => setCheckpoints([...checkpoints, { lat, lng, radius: 30 }])} />
                      </MapContainer>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs text-[#91b3ca]">{checkpoints.length} checkpoint(s)</span>
                      {checkpoints.length > 0 && (
                        <button type="button" onClick={() => setCheckpoints(checkpoints.slice(0, -1))} className="text-xs text-red-400 hover:text-red-300">Remove last</button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#91b3ca] text-sm mb-1">Required Time (minutes)</label>
                    <input
                      type="number"
                      value={patrolTime}
                      onChange={e => setPatrolTime(parseInt(e.target.value) || 15)}
                      className="w-full bg-[#1a2836] border border-[#233948] rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[#233948] flex gap-2 justify-end">
              <button
                onClick={() => { setShowCreate(false); resetForm() }}
                className="px-4 py-2 bg-[#233948] text-[#91b3ca] rounded hover:bg-[#2a4358]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={creating || !form.title || (form.questType === 'patrol' && checkpoints.length === 0)}
                className="px-4 py-2 bg-[#00ff88] text-black font-medium rounded hover:bg-[#00cc6a] disabled:opacity-50"
              >
                {creating ? 'Saving...' : (editingQuest ? 'Save Changes' : 'Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng)
  })
  return null
}
