import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'

interface Quest {
  id: string
  title: string
  description: string
  questType: string
  reward: number
  rewardReputation: number
  rewardItemId: string | null
  rewardItemName: string | null
  expiresAt: string | null
  objectives: any
}

export default function TraderQuestsPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const traderId = searchParams.get('trader')
  const traderName = searchParams.get('name') || 'Trader'
  
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [expandedQuest, setExpandedQuest] = useState<string | null>(null)

  useEffect(() => {
    if (!traderId) {
      navigate('/map')
      return
    }
    loadQuests()
  }, [traderId])

  const loadQuests = async () => {
    try {
      const { data } = await api.get(`/api/traders/${traderId}/quests`)
      setQuests(data.quests || [])
    } catch (err) {
      console.error('Failed to load quests:', err)
    } finally {
      setLoading(false)
    }
  }

  const acceptQuest = async (questId: string) => {
    setAccepting(questId)
    try {
      await api.post(`/api/quests/${questId}/accept`)
      setQuests(quests.filter(q => q.id !== questId))
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to accept quest')
    } finally {
      setAccepting(null)
    }
  }

  const getQuestTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      artifact_collection: '💎',
      delivery: '📦',
      protection: '🛡️',
      visit: '📍',
      patrol: '🚶',
      manual: '📋',
      item_delivery: '🎒'
    }
    return icons[type] || '📜'
  }

  const getQuestTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      artifact_collection: 'Collect Artifacts',
      delivery: 'Delivery',
      protection: 'Protection',
      visit: 'Visit Location',
      patrol: 'Patrol Area',
      manual: 'Special Task',
      item_delivery: 'Bring Item'
    }
    return labels[type] || type
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/map')}
          className="w-10 h-10 flex items-center justify-center bg-[#1a2e3b] border border-[#3a5a6a] rounded"
        >
          ←
        </button>
        <div>
          <h1 className="text-lg font-bold text-[#4a9eff]">{traderName}</h1>
          <p className="text-xs text-[#7a9aaa]">Available Quests</p>
        </div>
      </div>

      {/* Quest List */}
      {loading ? (
        <div className="text-center py-8 text-[#7a9aaa]">Loading quests...</div>
      ) : quests.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📭</div>
          <div className="text-[#7a9aaa]">No quests available</div>
          <div className="text-xs text-[#5a7a8a] mt-1">Check back later</div>
        </div>
      ) : (
        <div className="space-y-3">
          {quests.map(quest => (
            <div
              key={quest.id}
              className="bg-[#1a2e3b] border border-[#3a5a6a] rounded-lg overflow-hidden"
            >
              {/* Quest Header */}
              <div
                className="p-3 cursor-pointer"
                onClick={() => setExpandedQuest(expandedQuest === quest.id ? null : quest.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">{getQuestTypeIcon(quest.questType)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-[#e0e0e0] truncate">{quest.title}</div>
                    <div className="text-xs text-[#7a9aaa]">{getQuestTypeLabel(quest.questType)}</div>
                    
                    {/* Rewards */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {quest.reward > 0 && (
                        <span className="text-xs bg-[#2a3e4b] px-2 py-0.5 rounded text-yellow-400">
                          💰 {quest.reward.toLocaleString()}
                        </span>
                      )}
                      {quest.rewardReputation > 0 && (
                        <span className="text-xs bg-[#2a3e4b] px-2 py-0.5 rounded text-blue-400">
                          ⭐ +{quest.rewardReputation}
                        </span>
                      )}
                      {quest.rewardItemName && (
                        <span className="text-xs bg-[#2a3e4b] px-2 py-0.5 rounded text-green-400">
                          🎁 {quest.rewardItemName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[#5a7a8a]">
                    {expandedQuest === quest.id ? '▲' : '▼'}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedQuest === quest.id && (
                <div className="px-3 pb-3 border-t border-[#3a5a6a]">
                  <p className="text-sm text-[#a0b0c0] py-3">{quest.description || 'No description'}</p>
                  
                  {quest.expiresAt && (
                    <div className="text-xs text-[#7a9aaa] mb-3">
                      ⏰ Expires: {new Date(quest.expiresAt).toLocaleString()}
                    </div>
                  )}

                  <button
                    onClick={() => acceptQuest(quest.id)}
                    disabled={accepting === quest.id}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded transition-colors"
                  >
                    {accepting === quest.id ? 'Accepting...' : 'ACCEPT QUEST'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
