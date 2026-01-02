import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { api } from '../../services/api'

interface PlayerData {
  lives: number
  max_lives: number
  radiation: number
  balance: number
}

export default function PDAHeader() {
  const { nickname } = useAuthStore()
  const [player, setPlayer] = useState<PlayerData | null>(null)

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const { data } = await api.get('/api/auth/me')
        setPlayer(data)
      } catch (error) {
        console.error('Failed to fetch player data:', error)
      }
    }
    fetchPlayer()
    const interval = setInterval(fetchPlayer, 30000)
    return () => clearInterval(interval)
  }, [])

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
        <div className="text-pda-text">
          {nickname || 'STALKER'}
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
