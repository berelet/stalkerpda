import { useState } from 'react'
import { api } from '../services/api'

export default function LootingPage() {
  const [manualInput, setManualInput] = useState('')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleLoot = async (qrCode: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { data } = await api.post('/api/player/loot', {
        victimQrCode: qrCode
      })
      
      setResult(data)
      setManualInput('')
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to loot player'
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualInput.trim()) {
      handleLoot(manualInput.trim())
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
    setManualInput('')
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-pda-phosphor font-pixel text-xl">LOOT PLAYER</h2>

      {!result && !error && (
        <div className="bg-pda-case-dark border border-pda-primary/30 p-4 space-y-4">
          <div className="text-pda-text text-sm mb-3">
            Scan victim's QR code or enter manually
          </div>

          {/* Manual Input */}
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="STALKER_LOOT:player-id"
              className="w-full bg-pda-case border border-pda-primary/30 text-pda-text px-3 py-2 text-sm font-mono"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={!manualInput.trim() || loading}
              className="w-full bg-pda-highlight hover:bg-pda-highlight/80 text-pda-case font-pixel py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'LOOTING...' : 'LOOT'}
            </button>
          </form>

          <div className="text-xs text-pda-text/50 text-center">
            QR code format: STALKER_LOOT:player-uuid
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-500 p-4 space-y-3">
          <div className="text-red-500 font-bold">LOOTING FAILED</div>
          <div className="text-red-400 text-sm">{error}</div>
          <button
            onClick={reset}
            className="w-full bg-pda-primary hover:bg-pda-primary/80 text-pda-text font-pixel py-2 transition-colors"
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="bg-green-900/20 border border-green-500 p-4 space-y-4">
          <div className="text-green-400 font-bold text-lg">LOOTING SUCCESSFUL!</div>

          <div className="bg-pda-case-dark border border-pda-primary/30 p-3">
            <div className="text-pda-text text-sm mb-1">Victim:</div>
            <div className="text-pda-highlight">{result.victimName}</div>
          </div>

          <div className="bg-pda-case-dark border border-pda-primary/30 p-3">
            <div className="text-pda-text text-sm mb-2">Items Looted:</div>
            {result.itemsLooted && result.itemsLooted.length > 0 ? (
              <ul className="space-y-1">
                {result.itemsLooted.map((item: any, i: number) => (
                  <li key={i} className="text-pda-highlight text-sm flex items-center gap-2">
                    <span>{item.type === 'artifact' ? '💎' : '🛡️'}</span>
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-pda-text/50 text-sm">No items looted (bad luck)</div>
            )}
          </div>

          <button
            onClick={reset}
            className="w-full bg-pda-highlight hover:bg-pda-highlight/80 text-pda-case font-pixel py-2 transition-colors"
          >
            LOOT ANOTHER PLAYER
          </button>
        </div>
      )}
    </div>
  )
}
