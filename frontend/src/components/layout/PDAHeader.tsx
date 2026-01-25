import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../services/api'

interface PlayerData {
  currentLives: number
  currentRadiation: number
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
    const interval = setInterval(fetchPlayer, 15000) // Match location tick
    
    // Listen for refresh events
    const handleRefresh = () => fetchPlayer()
    window.addEventListener('refreshPlayerData', handleRefresh)
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('refreshPlayerData', handleRefresh)
    }
  }, [fetchPlayer])

  const getRadiationColor = (rad: number) => {
    if (rad <= 20) return 'text-green-400'
    if (rad <= 70) return 'text-yellow-400'
    return 'text-red-500'
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
            <span className="text-red-500">
              ❤️ {player.currentLives}
            </span>
            <span className={getRadiationColor(player.currentRadiation)}>
              ☢️ {Math.round(player.currentRadiation)}%
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
