import { useState, useEffect } from 'react'
import { NearbyArtifact } from '../../hooks/useLocationTracking'
import { api } from '../../services/api'

interface ArtifactModalProps {
  artifact: NearbyArtifact
  onClose: () => void
  onExtracted?: () => void
}

export default function ArtifactModal({ artifact, onClose, onExtracted }: ArtifactModalProps) {
  const [extracting, setExtracting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [holdTimer, setHoldTimer] = useState<number | null>(null)
  const [progressInterval, setProgressInterval] = useState<number | null>(null)

  useEffect(() => {
    return () => {
      if (holdTimer) clearTimeout(holdTimer)
      if (progressInterval) clearInterval(progressInterval)
    }
  }, [holdTimer, progressInterval])

  const startExtraction = async () => {
    if (!artifact.canPickup) return
    
    setExtracting(true)
    setProgress(0)
    setError(null)

    try {
      // Start extraction
      await api.post('/api/artifacts/extract/start', {
        artifactId: artifact.id
      })

      // Progress bar animation
      const interval = window.setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval)
            return 100
          }
          return prev + (100 / 30) // 30 seconds
        })
      }, 1000)
      setProgressInterval(interval)

      // Complete after 30 seconds
      const timer = window.setTimeout(async () => {
        try {
          await api.post('/api/artifacts/extract/complete', {
            artifactId: artifact.id
          })
          setSuccess(true)
          setProgress(100)
          if (onExtracted) onExtracted()
          setTimeout(() => onClose(), 2000)
        } catch (err: any) {
          setError(err.response?.data?.error?.message || 'Failed to complete extraction')
          setExtracting(false)
          setProgress(0)
        }
      }, 30000)
      setHoldTimer(timer)

    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to start extraction')
      setExtracting(false)
      setProgress(0)
    }
  }

  const cancelExtraction = async () => {
    if (holdTimer) clearTimeout(holdTimer)
    if (progressInterval) clearInterval(progressInterval)

    try {
      await api.post('/api/artifacts/extract/cancel', {
        artifactId: artifact.id
      })
    } catch (err) {
      console.error('Failed to cancel extraction:', err)
    }

    setExtracting(false)
    setProgress(0)
    setError(null)
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400'
      case 'uncommon': return 'text-green-500'
      case 'rare': return 'text-blue-500'
      case 'legendary': return 'text-yellow-500'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/80 p-2 pt-4 select-none overflow-y-auto">
      <div className="bg-pda-case-dark border-2 border-pda-primary max-w-md w-full relative z-[10000] select-text">
        {/* Header */}
        <div className="bg-pda-primary/20 border-b border-pda-primary p-2 flex items-center justify-between">
          <h3 className="text-pda-phosphor font-pixel text-base">ARTIFACT</h3>
          <button
            onClick={onClose}
            className="text-pda-text hover:text-pda-highlight text-2xl leading-none px-2 py-1 -mr-1 relative z-10"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* Image */}
          {artifact.imageUrl && (
            <div className="w-full h-32 bg-pda-case-dark/50 border border-pda-primary/30 flex items-center justify-center">
              <img
                src={artifact.imageUrl}
                alt={artifact.name}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Name & Rarity */}
          <div>
            <h4 className="text-pda-phosphor font-pixel text-lg mb-0.5">{artifact.name}</h4>
            <p className={`text-xs uppercase font-bold ${getRarityColor(artifact.rarity)}`}>
              {artifact.rarity}
            </p>
          </div>

          {/* Description */}
          {artifact.description && (
            <p className="text-pda-text text-xs leading-relaxed">
              {artifact.description}
            </p>
          )}

          {/* Effects */}
          {(artifact.effects.bonusLives || artifact.effects.radiationResist) && (
            <div className="bg-pda-primary/10 border border-pda-primary/30 p-2 space-y-0.5">
              <div className="text-pda-highlight text-xs font-bold mb-1">EFFECTS:</div>
              {artifact.effects.bonusLives && (
                <div className="text-pda-text text-xs">
                  + {artifact.effects.bonusLives} Lives
                </div>
              )}
              {artifact.effects.radiationResist && (
                <div className="text-pda-text text-xs">
                  + {artifact.effects.radiationResist}% Radiation Resist
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-pda-text/70">Distance:</div>
              <div className="text-pda-phosphor">{artifact.distance.toFixed(1)}m</div>
            </div>
            <div>
              <div className="text-pda-text/70">Value:</div>
              <div className="text-pda-phosphor">💰 {artifact.value.toLocaleString()}</div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-900/20 border border-red-500 p-2 text-red-500 text-xs">
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="bg-green-900/20 border border-green-500 p-2 text-green-500 text-xs">
              Artifact extracted successfully!
            </div>
          )}

          {/* Action Button */}
          {artifact.canPickup ? (
            <button
              onMouseDown={extracting ? undefined : startExtraction}
              onMouseUp={extracting ? cancelExtraction : undefined}
              onMouseLeave={extracting ? cancelExtraction : undefined}
              onTouchStart={extracting ? undefined : startExtraction}
              onTouchEnd={extracting ? cancelExtraction : undefined}
              disabled={success}
              className="w-full py-2 bg-pda-highlight/20 border border-pda-highlight text-pda-highlight hover:bg-pda-highlight/30 transition-colors font-pixel disabled:opacity-50 disabled:cursor-not-allowed select-none text-sm"
            >
              HOLD TO PICK UP (30s)
            </button>
          ) : (
            <div className="w-full py-2 bg-pda-primary/10 border border-pda-primary/30 text-pda-text/70 text-center font-pixel select-none text-sm">
              MOVE CLOSER (within 2m)
            </div>
          )}

          {/* Progress Bar */}
          {extracting && (
            <div className="space-y-1">
              <div className="w-full h-5 bg-pda-case-dark border border-pda-primary/50 relative overflow-hidden">
                <div
                  className="h-full bg-pda-highlight/30 transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-pda-phosphor text-xs font-bold">
                  {Math.floor(progress)}%
                </div>
              </div>
              <div className="text-pda-text/70 text-xs text-center">
                Extracting... {30 - Math.floor(progress * 0.3)}s (release to cancel)
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
