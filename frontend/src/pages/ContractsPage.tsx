import { useEffect, useState } from 'react'
import { api } from '../services/api'

interface Contract {
  id: string
  title: string
  description: string
  reward: number
  status: string
  type: string
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchContracts = async () => {
      try {
        const { data } = await api.get('/api/contracts')
        setContracts(data.contracts || [])
      } catch (error) {
        console.error('Failed to fetch contracts:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchContracts()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available': return 'text-pda-phosphor'
      case 'active': return 'text-pda-amber'
      case 'completed': return 'text-green-400'
      case 'failed': return 'text-pda-danger'
      default: return 'text-pda-text'
    }
  }

  return (
    <div className="p-4">
      <h2 className="text-pda-phosphor font-pixel text-xl mb-4">CONTRACTS</h2>
      
      {loading ? (
        <div className="text-pda-text text-center py-8">Loading...</div>
      ) : contracts.length === 0 ? (
        <div className="bg-pda-case-dark border border-pda-primary/30 p-4 text-center">
          <p className="text-pda-text">No contracts available</p>
          <p className="text-pda-text/50 text-sm mt-2">Check back later</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contracts.map((contract) => (
            <div key={contract.id} className="bg-pda-case-dark border border-pda-primary/30 p-3">
              <div className="flex justify-between items-start mb-2">
                <div className="text-pda-highlight font-medium">{contract.title}</div>
                <div className="text-pda-amber text-sm">{contract.reward}</div>
              </div>
              <p className="text-pda-text text-sm mb-2">{contract.description}</p>
              <div className="flex justify-between items-center text-xs">
                <span className="text-pda-text/70 uppercase">{contract.type}</span>
                <span className={`${getStatusColor(contract.status)} uppercase`}>
                  {contract.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
