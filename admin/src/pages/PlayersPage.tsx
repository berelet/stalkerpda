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
  location?: {
    latitude: number
    longitude: number
    updatedAt: string
  }
  createdAt: string
  lastOnline?: string
}

const FACTION_COLORS: Record<string, string> = {
  stalker: 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500',
  duty: 'border-red-500/20 bg-red-500/10 text-red-500',
  freedom: 'border-green-500/20 bg-green-500/10 text-green-500',
  ecologist: 'border-blue-400/20 bg-blue-400/10 text-blue-400',
  bandit: 'border-orange-500/20 bg-orange-500/10 text-orange-500',
  military: 'border-gray-500/20 bg-gray-500/10 text-gray-500',
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'alive' | 'dead'>('all')

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
                    <th className="px-6 py-4 text-xs font-bold text-[#91b3ca] uppercase tracking-wider w-[35%]">
                      Nickname / ID
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#91b3ca] uppercase tracking-wider">
                      Faction
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
    </div>
  )
}
