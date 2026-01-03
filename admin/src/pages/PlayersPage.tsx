import { useState, useEffect } from 'react'
import api from '../services/api'

interface Player {
  id: string
  nickname: string
  email: string
  faction: string
  status: string
  lives: number
  radiation: number
  isGm?: boolean
  isBartender?: boolean
  location?: {
    latitude: number
    longitude: number
    updatedAt: string
  }
  createdAt: string
  lastOnline?: string
}

interface EditPlayerData {
  faction: string
  isGm: boolean
  isBartender: boolean
}

const FACTION_COLORS: Record<string, string> = {
  stalker: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500',
  duty: 'border-red-500/20 bg-red-500/10 text-red-500',
  freedom: 'border-green-500/20 bg-green-500/10 text-green-500',
  ecologist: 'border-blue-400/20 bg-blue-400/10 text-blue-400',
  bandit: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
  military: 'border-gray-500/20 bg-gray-500/10 text-gray-500',
}

const FACTIONS = [
  { value: 'stalker', label: 'Loner' },
  { value: 'duty', label: 'Duty' },
  { value: 'freedom', label: 'Freedom' },
  { value: 'ecologist', label: 'Ecologist' },
  { value: 'bandit', label: 'Bandit' },
  { value: 'military', label: 'Military' },
]

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'alive' | 'dead'>('all')
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [editData, setEditData] = useState<EditPlayerData>({ faction: '', isGm: false, isBartender: false })

  useEffect(() => {
    loadPlayers()
  }, [])

  const loadPlayers = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/admin/players')
      setPlayers(response.data.players || [])
    } catch (error) {
      console.error('Failed to load players:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePlayerStatus = async (playerId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'alive' ? 'dead' : 'alive'
    try {
      await api.put(`/api/admin/players/${playerId}`, { status: newStatus })
      setPlayers(players.map(p => p.id === playerId ? { ...p, status: newStatus } : p))
    } catch (error) {
      console.error('Failed to update player status:', error)
    }
  }

  const openEditModal = (player: Player) => {
    setEditingPlayer(player)
    setEditData({
      faction: player.faction,
      isGm: player.isGm || false,
      isBartender: player.isBartender || false,
    })
  }

  const closeEditModal = () => {
    setEditingPlayer(null)
    setEditData({ faction: '', isGm: false, isBartender: false })
  }

  const savePlayerChanges = async () => {
    if (!editingPlayer) return
    
    try {
      await api.put(`/api/admin/players/${editingPlayer.id}`, editData)
      setPlayers(players.map(p => 
        p.id === editingPlayer.id 
          ? { ...p, faction: editData.faction, isGm: editData.isGm, isBartender: editData.isBartender }
          : p
      ))
      closeEditModal()
    } catch (error) {
      console.error('Failed to update player:', error)
    }
  }

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.email?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || player.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    return date.toLocaleString('en-GB', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).replace(',', ' |')
  }

  return (
    <div className="p-6 lg:p-10">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">All Players</h1>
            <p className="text-[#91b3ca] mt-1">Manage registration, status, and player profiles.</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-[#18242e] rounded-xl border border-[#233948] p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#91b3ca]">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#101b22] border border-[#233948] text-white pl-10 pr-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1e9cf1] focus:ring-1 focus:ring-[#1e9cf1] placeholder:text-gray-600 transition-all font-mono text-sm"
              placeholder="Search by nickname, ID or email..."
            />
          </div>

          {/* Status Filter */}
          <div className="flex bg-[#101b22] p-1 rounded-lg border border-[#233948]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                statusFilter === 'all' 
                  ? 'bg-[#18242e] text-white shadow-sm border border-[#233948]/50' 
                  : 'text-[#91b3ca] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('alive')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                statusFilter === 'alive' 
                  ? 'bg-[#18242e] text-white shadow-sm border border-[#233948]/50' 
                  : 'text-[#91b3ca] hover:text-white'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('dead')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                statusFilter === 'dead' 
                  ? 'bg-[#18242e] text-white shadow-sm border border-[#233948]/50' 
                  : 'text-[#91b3ca] hover:text-white'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-[#18242e] rounded-xl border border-[#233948] overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-[#91b3ca]">Loading players...</div>
          ) : filteredPlayers.length === 0 ? (
            <div className="p-12 text-center text-[#91b3ca]">No players found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#151f28] border-b border-[#233948]">
                    <th className="px-6 py-4 text-xs font-bold text-[#91b3ca] uppercase tracking-wider w-[30%]">
                      Nickname / ID
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#91b3ca] uppercase tracking-wider">
                      Faction
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#91b3ca] uppercase tracking-wider">
                      Roles
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#91b3ca] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#91b3ca] uppercase tracking-wider">
                      Last Online
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#91b3ca] uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#233948]">
                  {filteredPlayers.map((player) => (
                    <tr key={player.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#233948] border border-[#233948] flex items-center justify-center text-white font-bold">
                            {player.nickname.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-white font-medium">{player.nickname}</span>
                            <span className="text-xs text-[#91b3ca] font-mono">
                              ID: {player.id.slice(0, 12)}...
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-medium capitalize ${
                          FACTION_COLORS[player.faction] || FACTION_COLORS.stalker
                        }`}>
                          {player.faction}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {player.isGm && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded border border-purple-500/20 bg-purple-500/10 text-purple-400 text-xs font-medium">
                              GM
                            </span>
                          )}
                          {player.isBartender && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-medium">
                              Bartender
                            </span>
                          )}
                          {!player.isGm && !player.isBartender && (
                            <span className="text-[#91b3ca] text-xs">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            player.status === 'alive' 
                              ? 'bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.5)]' 
                              : 'bg-[#91b3ca]/50'
                          }`} />
                          <span className={player.status === 'alive' ? 'text-white' : 'text-[#91b3ca]'}>
                            {player.status === 'alive' ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[#91b3ca] text-sm font-mono">
                          {formatDate(player.location?.updatedAt || player.createdAt)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(player)}
                            className="p-2 rounded-lg text-[#91b3ca] hover:text-white hover:bg-[#233948] transition-colors"
                            title="Edit Player"
                          >
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => togglePlayerStatus(player.id, player.status)}
                            className={`p-2 rounded-lg transition-colors ${
                              player.status === 'alive'
                                ? 'text-[#1e9cf1] hover:bg-[#1e9cf1]/10'
                                : 'text-[#91b3ca] hover:text-[#1e9cf1] hover:bg-[#1e9cf1]/10'
                            }`}
                            title="Toggle Status"
                          >
                            <span className="material-symbols-outlined text-[20px]">
                              {player.status === 'alive' ? 'toggle_on' : 'toggle_off'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {!loading && filteredPlayers.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-[#233948] bg-[#18242e]">
              <span className="text-sm text-[#91b3ca]">
                Showing <span className="text-white font-medium">{filteredPlayers.length}</span> of{' '}
                <span className="text-white font-medium">{players.length}</span> players
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Edit Player Modal */}
      {editingPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#18242e] border border-[#233948] rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Edit Player</h2>
              <button
                onClick={closeEditModal}
                className="text-[#91b3ca] hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              {/* Player Info */}
              <div className="bg-[#101b22] border border-[#233948] rounded-lg p-4">
                <div className="text-sm text-[#91b3ca]">Player</div>
                <div className="text-white font-medium">{editingPlayer.nickname}</div>
                <div className="text-xs text-[#91b3ca] font-mono">{editingPlayer.email}</div>
              </div>

              {/* Faction Select */}
              <div>
                <label className="block text-sm font-medium text-[#91b3ca] mb-2">
                  Faction
                </label>
                <select
                  value={editData.faction}
                  onChange={(e) => setEditData({ ...editData, faction: e.target.value })}
                  className="w-full bg-[#101b22] border border-[#233948] text-white px-4 py-2.5 rounded-lg focus:outline-none focus:border-[#1e9cf1] focus:ring-1 focus:ring-[#1e9cf1]"
                >
                  {FACTIONS.map((faction) => (
                    <option key={faction.value} value={faction.value}>
                      {faction.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Roles */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#91b3ca]">
                  Roles
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.isGm}
                    onChange={(e) => setEditData({ ...editData, isGm: e.target.checked })}
                    className="w-5 h-5 rounded border-[#233948] bg-[#101b22] text-[#1e9cf1] focus:ring-[#1e9cf1] focus:ring-offset-0"
                  />
                  <div>
                    <div className="text-white font-medium">Game Master</div>
                    <div className="text-xs text-[#91b3ca]">Full admin access to GM panel</div>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editData.isBartender}
                    onChange={(e) => setEditData({ ...editData, isBartender: e.target.checked })}
                    className="w-5 h-5 rounded border-[#233948] bg-[#101b22] text-[#1e9cf1] focus:ring-[#1e9cf1] focus:ring-offset-0"
                  />
                  <div>
                    <div className="text-white font-medium">Bartender</div>
                    <div className="text-xs text-[#91b3ca]">Can manage contracts and trading</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={closeEditModal}
                className="flex-1 px-4 py-2.5 rounded-lg border border-[#233948] text-[#91b3ca] hover:text-white hover:bg-[#233948] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={savePlayerChanges}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#1e9cf1] hover:bg-[#157abd] text-white font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
