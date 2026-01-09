import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../services/api'

interface PlayerData {
  lives: number
  max_lives: number
  radiation: number
  balance: number
}

// Custom event for balance refresh
export const refreshPlayerData = () => {
  window.dispatchEvent(new CustomEvent('refreshPlayerData'))
}

export default function PDAHeader() {
  const { nickname } = useAuthStore()
  const [player, setPlayer] = useState<PlayerData | null>(null)

  const fetchPlayer = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me')
      setPlayer(data)
    } catch (error) {
      console.error('Failed to fetch player data:', error)
    }
  }, [])

  useEffect(() => {
    fetchPlayer()
    const interval = setInterval(fetchPlayer, 30000)
    
    // Listen for refresh events
    const handleRefresh = () => fetchPlayer()
    window.addEventListener('refreshPlayerData', handleRefresh)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('refreshPlayerData', handleRefresh)
    }
  }, [fetchPlayer])

  const getRadiationColor = (rad: number) => {
    if (rad < 50) return 'text-pda-phosphor'
    if (rad < 80) return 'text-pda-amber'
    return 'text-pda-danger'
  }

  return (
    <header className="bg-pda-case-dark border-b border-pda-primary/30 p-3">
      <div className="flex items-center justify-between text-xs">
        <div className="text-pda-highlight font-pixel text-lg">
          PDA v3.0
        </div>
        <div className="flex items-center gap-2">
          <Link 
            to="/wiki" 
            className="text-2xl text-pda-text hover:text-pda-highlight transition-colors p-1"
            title="Game Wiki"
          >
            📖
          </Link>
          <div className="text-pda-text">
            {nickname || 'STALKER'}
          </div>
        </div>
      </div>
      
      {player && (
        <div className="flex items-center justify-between mt-2 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-pda-danger">
              ❤️ {player.lives}/{player.max_lives}
            </span>
            <span className={getRadiationColor(player.radiation)}>
              ☢️ {player.radiation}
            </span>
          </div>
          <div className="text-pda-amber">
            💰 {player.balance.toLocaleString()}
          </div>
        </div>
      )}
    </header>
  )
}
