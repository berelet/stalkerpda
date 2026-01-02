import { useEffect, useState } from 'react'
import { api } from '../services/api'

interface Artifact {
  id: string
  name: string
  rarity: string
  value: number
}

export default function InventoryPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchArtifacts = async () => {
      try {
        const { data } = await api.get('/api/artifacts')
        setArtifacts(data.artifacts || [])
      } catch (error) {
        console.error('Failed to fetch artifacts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchArtifacts()
  }, [])

  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common': return 'text-gray-400'
      case 'uncommon': return 'text-green-400'
      case 'rare': return 'text-blue-400'
      case 'epic': return 'text-purple-400'
      case 'legendary': return 'text-pda-amber'
      default: return 'text-pda-text'
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-pda-phosphor font-pixel text-xl mb-4">INVENTORY</h2>
      
      {loading ? (
        <div className="text-pda-text text-center py-8">Loading...</div>
      ) : artifacts.length === 0 ? (
        <div className="bg-pda-case-dark border border-pda-primary/30 p-4 text-center">
          <p className="text-pda-text">No artifacts in inventory</p>
          <p className="text-pda-text/50 text-sm mt-2">Go explore the Zone!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {artifacts.map((artifact) => (
            <div key={artifact.id} className="bg-pda-case-dark border border-pda-primary/30 p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-pda-highlight font-medium">{artifact.name}</div>
                  <div className={`text-xs ${getRarityColor(artifact.rarity)} uppercase`}>
                    {artifact.rarity}
                  </div>
                </div>
                <div className="text-pda-amber">{artifact.value}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
