import { useEffect, useState } from 'react'
import { api } from '../services/api'

interface PlayerStats {
  lives: number
  max_lives: number
  radiation: number
  balance: number
  reputation: number
  status: string
  faction: string
}

export default function MapPage() {
  const [stats, setStats] = useState<PlayerStats | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await api.get('/api/auth/me')
        setStats({
          lives: data.currentLives,
          max_lives: 4,
          radiation: data.currentRadiation,
          balance: data.balance,
          reputation: data.reputation,
          status: data.status,
          faction: data.faction
        })
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      }
    }
    fetchStats()
  }, [])

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-pda-phosphor font-pixel text-xl mb-4">MAP</h2>
      
      {stats && (
        <div className="bg-pda-case-dark border border-pda-primary/30 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-pda-text">STATUS</div>
              <div className="text-pda-highlight uppercase">{stats.status}</div>
            </div>
            <div>
              <div className="text-pda-text">FACTION</div>
              <div className="text-pda-highlight uppercase">{stats.faction}</div>
            </div>
            <div>
              <div className="text-pda-text">REPUTATION</div>
              <div className="text-pda-highlight">{stats.reputation}</div>
            </div>
            <div>
              <div className="text-pda-text">BALANCE</div>
              <div className="text-pda-amber">{stats.balance.toLocaleString()}</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-pda-case-dark border border-pda-primary/30 p-4 text-center">
        <p className="text-pda-text text-sm">Map view coming soon...</p>
        <p className="text-pda-text/50 text-xs mt-2">Leaflet integration in progress</p>
      </div>
    </div>
  )
}
