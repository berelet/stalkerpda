import { useEffect, useState } from 'react'
import { api } from '../services/api'

interface Quest {
  id: string
  title: string
  description: string
  reward: number
  status: string
  questType: string
  questData: {
    target_faction?: string
    exclude_faction?: string
    target_count?: number
    current_count?: number
    target_counts?: Record<string, number>
    current_counts?: Record<string, number>
    artifact_type_id?: string
    artifact_type_ids?: string[]
    target_lat?: number
    target_lng?: number
    target_radius?: number
    visited?: boolean
    checkpoints?: { lat: number; lng: number; radius: number; visited: boolean }[]
    required_time_minutes?: number
    accumulated_time_seconds?: number
  } | null
  failed: boolean
  failedReason: string | null
  autoComplete: boolean
  issuer: { id: string; nickname: string }
  expiresAt: string | null
  acceptedAt: string | null
}

type Tab = 'available' | 'active' | 'history'
type HistoryFilter = 'all' | 'completed' | 'failed'

export default function QuestsPage() {
  const [tab, setTab] = useState<Tab>('available')
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  // History pagination & filter
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchQuests = async () => {
    setLoading(true)
    try {
      let endpoint = '/api/quests'
      if (tab === 'active') endpoint = '/api/quests/active'
      else if (tab === 'history') endpoint = `/api/quests/completed?page=${page}&filter=${historyFilter}`
      
      const { data } = await api.get(endpoint)
      setQuests(data.quests || [])
      if (data.pagination) {
        setTotalPages(data.pagination.pages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch quests:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuests()
  }, [tab, page, historyFilter])

  useEffect(() => {
    setPage(1) // Reset page when changing tab or filter
  }, [tab, historyFilter])

  const handleAccept = async (questId: string) => {
    setActionLoading(true)
    try {
      await api.post(`/api/quests/${questId}/accept`)
      setSelectedQuest(null)
      setTab('active')
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to accept quest')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async (questId: string) => {
    if (!confirm('Cancel this quest? Progress will be lost.')) return
    setActionLoading(true)
    try {
      await api.post(`/api/quests/${questId}/cancel`)
      setSelectedQuest(null)
      fetchQuests()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to cancel quest')
    } finally {
      setActionLoading(false)
    }
  }

  const handleClaim = async (questId: string) => {
    setActionLoading(true)
    try {
      await api.post(`/api/quests/${questId}/claim`)
      alert('Completion claimed! Awaiting confirmation.')
      fetchQuests()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to claim')
    } finally {
      setActionLoading(false)
    }
  }

  const getQuestIcon = (type: string) => {
    switch (type) {
      case 'artifact_collection': return '💎'
      case 'delivery': return '📦'
      case 'patrol': return '🚶'
      case 'visit': return '📍'
      default: return '📋'
    }
  }

  const getProgress = (q: Quest) => {
    if (!q.questData) return null
    const { current_count, target_count, target_counts, current_counts, checkpoints, accumulated_time_seconds, required_time_minutes, visited } = q.questData
    
    // Multiple artifact types
    if (target_counts && current_counts) {
      const total = Object.values(target_counts as Record<string, number>).reduce((a, b) => a + b, 0)
      const current = Object.values(current_counts as Record<string, number>).reduce((a, b) => a + b, 0)
      return `${current}/${total}`
    }
    if (target_count) return `${current_count || 0}/${target_count}`
    if (checkpoints) {
      const visitedCount = checkpoints.filter((c: any) => c.visited).length
      const timeProgress = Math.floor((accumulated_time_seconds || 0) / 60)
      return `${visitedCount}/${checkpoints.length} pts, ${timeProgress}/${required_time_minutes}min`
    }
    if (visited !== undefined) return visited ? '✓ Visited' : 'Not visited'
    return null
  }

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return null
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const hours = Math.floor(diff / 3600000)
    const mins = Math.floor((diff % 3600000) / 60000)
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  return (
    <div className="p-4">
      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(['available', 'active', 'history'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-pixel uppercase transition-colors ${
              tab === t
                ? 'bg-pda-primary/30 text-pda-phosphor border border-pda-primary'
                : 'bg-pda-case-dark text-pda-text border border-pda-primary/30 hover:text-pda-highlight'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* History filters */}
      {tab === 'history' && (
        <div className="flex gap-1 mb-3">
          {(['all', 'completed', 'failed'] as HistoryFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setHistoryFilter(f)}
              className={`px-3 py-1 text-xs transition-colors ${
                historyFilter === f
                  ? 'bg-pda-highlight/20 text-pda-highlight border border-pda-highlight/50'
                  : 'bg-pda-case-dark text-pda-text/70 border border-pda-primary/20'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Quest List */}
      {loading ? (
        <div className="text-pda-text text-center py-8">Loading...</div>
      ) : quests.length === 0 ? (
        <div className="bg-pda-case-dark border border-pda-primary/30 p-4 text-center">
          <p className="text-pda-text">No {tab} quests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {quests.map(quest => (
            <div
              key={quest.id}
              onClick={() => setSelectedQuest(quest)}
              className="bg-pda-case-dark border border-pda-primary/30 p-3 cursor-pointer hover:border-pda-primary/60"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span>{getQuestIcon(quest.questType)}</span>
                  <span className="text-pda-highlight font-medium text-sm">{quest.title}</span>
                </div>
                <span className="text-pda-amber text-sm">💰 {quest.reward.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-pda-text/70">From: {quest.issuer.nickname}</span>
                {tab === 'active' && getProgress(quest) && (
                  <span className="text-pda-phosphor">{getProgress(quest)}</span>
                )}
                {quest.failed && <span className="text-pda-danger">FAILED</span>}
                {quest.status === 'completed' && <span className="text-green-400">✓</span>}
                {quest.expiresAt && tab === 'available' && (
                  <span className="text-pda-text/50">{formatExpiry(quest.expiresAt)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination for history */}
      {tab === 'history' && totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-pda-case-dark border border-pda-primary/30 text-pda-text text-xs disabled:opacity-30"
          >
            ←
          </button>
          <span className="px-3 py-1 text-pda-text text-xs">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 bg-pda-case-dark border border-pda-primary/30 text-pda-text text-xs disabled:opacity-30"
          >
            →
          </button>
        </div>
      )}

      {/* Quest Details Modal */}
      {selectedQuest && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedQuest(null)}>
          <div className="bg-pda-case border border-pda-primary w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{getQuestIcon(selectedQuest.questType)}</span>
                <h3 className="text-pda-phosphor font-pixel text-lg">{selectedQuest.title}</h3>
              </div>
              
              <p className="text-pda-text/70 text-xs mb-3">From: {selectedQuest.issuer.nickname}</p>
              <p className="text-pda-text text-sm mb-4">{selectedQuest.description}</p>

              {/* Objectives */}
              {selectedQuest.questData && (
                <div className="bg-pda-case-dark p-2 mb-3 text-sm">
                  <div className="text-pda-highlight text-xs mb-1">OBJECTIVES:</div>
                  {selectedQuest.questType === 'artifact_collection' && selectedQuest.questData?.target_counts && (
                    <div className="text-pda-text space-y-1">
                      {Object.entries(selectedQuest.questData.target_counts as Record<string, number>).map(([typeId, count]) => (
                        <div key={typeId}>
                          Collect {count} artifacts (type)
                          {tab === 'active' && <span className="text-pda-phosphor ml-2">({selectedQuest.questData?.current_counts?.[typeId] || 0}/{count})</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedQuest.questType === 'artifact_collection' && !selectedQuest.questData.target_counts && (
                    <div className="text-pda-text">
                      Collect {selectedQuest.questData.target_count} artifacts
                      {tab === 'active' && <span className="text-pda-phosphor ml-2">({selectedQuest.questData.current_count || 0}/{selectedQuest.questData.target_count})</span>}
                    </div>
                  )}
                  {selectedQuest.questType === 'visit' && (
                    <div className="text-pda-text">
                      Reach target location ({selectedQuest.questData.target_radius}m radius)
                      {tab === 'active' && selectedQuest.questData.visited && <span className="text-pda-phosphor ml-2">✓</span>}
                    </div>
                  )}
                  {selectedQuest.questType === 'patrol' && (
                    <div className="text-pda-text">
                      Visit {selectedQuest.questData.checkpoints?.length} checkpoints, spend {selectedQuest.questData.required_time_minutes} min
                      {tab === 'active' && <span className="text-pda-phosphor ml-2">{getProgress(selectedQuest)}</span>}
                    </div>
                  )}
                  {selectedQuest.questType === 'delivery' && (
                    <div className="text-pda-text">Deliver item to destination</div>
                  )}
                </div>
              )}

              {/* Rewards */}
              <div className="bg-pda-case-dark p-2 mb-4 text-sm">
                <div className="text-pda-highlight text-xs mb-1">REWARDS:</div>
                <div className="text-pda-amber">💰 {selectedQuest.reward.toLocaleString()} credits</div>
              </div>

              {selectedQuest.expiresAt && (
                <div className="text-pda-text/50 text-xs mb-4">
                  Expires: {formatExpiry(selectedQuest.expiresAt)}
                </div>
              )}

              {selectedQuest.failed && (
                <div className="text-pda-danger text-sm mb-4">
                  Failed: {selectedQuest.failedReason || 'Unknown reason'}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {tab === 'available' && (
                  <button
                    onClick={() => handleAccept(selectedQuest.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-pda-primary/30 border border-pda-primary text-pda-phosphor py-2 text-sm font-pixel hover:bg-pda-primary/50 disabled:opacity-50"
                  >
                    {actionLoading ? '...' : 'ACCEPT'}
                  </button>
                )}
                {tab === 'active' && !selectedQuest.autoComplete && (
                  <button
                    onClick={() => handleClaim(selectedQuest.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-pda-primary/30 border border-pda-primary text-pda-phosphor py-2 text-sm font-pixel hover:bg-pda-primary/50 disabled:opacity-50"
                  >
                    {actionLoading ? '...' : 'CLAIM'}
                  </button>
                )}
                {tab === 'active' && (
                  <button
                    onClick={() => handleCancel(selectedQuest.id)}
                    disabled={actionLoading}
                    className="flex-1 bg-pda-danger/20 border border-pda-danger text-pda-danger py-2 text-sm font-pixel hover:bg-pda-danger/30 disabled:opacity-50"
                  >
                    CANCEL
                  </button>
                )}
                <button
                  onClick={() => setSelectedQuest(null)}
                  className="px-4 bg-pda-case-dark border border-pda-primary/30 text-pda-text py-2 text-sm font-pixel hover:text-pda-highlight"
                >
                  CLOSE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
