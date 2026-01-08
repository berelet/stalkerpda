import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { api } from '../services/api'

interface PlayerData {
  nickname: string
  email: string
  faction: string
  status: string
  balance: number
  reputation: number
  currentLives: number
  currentRadiation: number
  qrCode: string
  stats: {
    kills: number
    deaths: number
    artifactsFound: number
    contractsCompleted: number
  }
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { clearAuth } = useAuthStore()
  const [player, setPlayer] = useState<PlayerData | null>(null)

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const { data } = await api.get('/api/auth/me')
        setPlayer(data)
      } catch (error) {
        console.error('Failed to fetch player:', error)
      }
    }
    fetchPlayer()
  }, [])

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  if (!player) {
    return (
      <div className="p-4">
        <div className="text-pda-text text-center py-8">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-pda-phosphor font-pixel text-xl mb-4">PROFILE</h2>
      
      <div className="bg-pda-case-dark border border-pda-primary/30 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-pda-text">NICKNAME</div>
            <div className="text-pda-highlight">{player.nickname}</div>
          </div>
          <div>
            <div className="text-pda-text">FACTION</div>
            <div className="text-pda-highlight uppercase">{player.faction}</div>
          </div>
          <div>
            <div className="text-pda-text">STATUS</div>
            <div className="text-pda-highlight uppercase">{player.status}</div>
          </div>
          <div>
            <div className="text-pda-text">REPUTATION</div>
            <div className="text-pda-highlight">{player.reputation}</div>
          </div>
        </div>
      </div>

      <div className="bg-pda-case-dark border border-pda-primary/30 p-4">
        <div className="text-pda-text text-sm mb-3">STATISTICS</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-pda-text/70">Kills</div>
            <div className="text-pda-highlight">{player.stats.kills}</div>
          </div>
          <div>
            <div className="text-pda-text/70">Deaths</div>
            <div className="text-pda-highlight">{player.stats.deaths}</div>
          </div>
          <div>
            <div className="text-pda-text/70">Artifacts</div>
            <div className="text-pda-highlight">{player.stats.artifactsFound}</div>
          </div>
          <div>
            <div className="text-pda-text/70">Contracts</div>
            <div className="text-pda-highlight">{player.stats.contractsCompleted}</div>
          </div>
        </div>
      </div>

      <div className="bg-pda-case-dark border border-pda-primary/30 p-4">
        <div className="text-pda-text text-sm mb-2">QR CODE</div>
        <div className="text-pda-highlight font-mono text-xs">{player.qrCode}</div>
      </div>
      
      <button
        onClick={handleLogout}
        className="w-full bg-pda-danger hover:bg-red-700 text-white font-pixel py-2 transition-colors"
      >
        LOGOUT
      </button>
    </div>
  )
}
