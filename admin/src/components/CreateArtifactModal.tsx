import { useState } from 'react'

interface CreateArtifactModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ArtifactFormData) => void
}

interface ArtifactFormData {
  name: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  value: number
  bonusLives: number
  radiationResist: number
}

export default function CreateArtifactModal({ isOpen, onClose, onSubmit }: CreateArtifactModalProps) {
  const [formData, setFormData] = useState<ArtifactFormData>({
    name: '',
    rarity: 'rare',
    value: 5000,
    bonusLives: 0,
    radiationResist: 0,
  })

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[800px] flex flex-col bg-[#111b22] rounded-xl shadow-2xl border border-[#233948] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#233948] bg-[#152028] px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">science</span>
              Create Artifact
            </h2>
            <p className="text-xs font-mono text-[#91b3ca] uppercase tracking-wider">// DATABASE ENTRY_ID: NEW</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#91b3ca] hover:text-white transition-colors rounded-lg p-2 hover:bg-[#233948]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[80vh] p-6 space-y-8">
          {/* Identification */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-mono font-medium text-[#91b3ca] uppercase tracking-widest ml-1">
                  Artifact Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full h-12 rounded-lg bg-[#233948] border border-transparent focus:border-primary focus:ring-1 focus:ring-primary text-white placeholder-[#91b3ca] px-4 transition-all"
                    placeholder="e.g. Moonlight, Soul, Fireball"
                    required
                  />
                  <span className="material-symbols-outlined absolute right-4 top-3 text-[#91b3ca]">edit</span>
                </div>
              </div>

              {/* Rarity */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-medium text-[#91b3ca] uppercase tracking-widest ml-1">
                  Rarity Class
                </label>
                <div className="relative">
                  <select
                    value={formData.rarity}
                    onChange={(e) => setFormData({ ...formData, rarity: e.target.value as any })}
                    className="w-full h-12 appearance-none rounded-lg bg-[#233948] border border-transparent focus:border-primary focus:ring-1 focus:ring-primary text-white px-4 pr-10 cursor-pointer transition-all"
                  >
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="legendary">Legendary</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-3 text-[#91b3ca] pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Value */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-medium text-[#91b3ca] uppercase tracking-widest ml-1">
                  Market Value
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) })}
                    className="w-full h-12 rounded-lg bg-[#233948] border border-transparent focus:border-primary focus:ring-1 focus:ring-primary text-white placeholder-[#91b3ca] px-4 pl-10 transition-all font-mono"
                    placeholder="0"
                    required
                  />
                  <span className="material-symbols-outlined absolute left-3 top-3 text-[#91b3ca]">payments</span>
                </div>
              </div>
            </div>
          </div>

          {/* Anomalous Properties */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-[#233948]">
              <span className="material-symbols-outlined text-primary text-sm">bolt</span>
              <h3 className="text-sm font-bold text-white tracking-widest font-mono uppercase">
                // Anomalous Properties
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Bonus Lives */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-medium text-[#91b3ca] uppercase tracking-widest ml-1">
                  Bonus Lives
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, bonusLives: Math.max(0, formData.bonusLives - 1) })}
                    className="h-12 w-12 rounded-lg bg-[#233948] hover:bg-[#2c4659] text-white flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <input
                    type="number"
                    value={formData.bonusLives}
                    onChange={(e) => setFormData({ ...formData, bonusLives: parseInt(e.target.value) || 0 })}
                    className="flex-1 h-12 rounded-lg bg-[#233948] border border-transparent focus:border-primary focus:ring-1 focus:ring-primary text-white text-center font-mono text-lg"
                    min="0"
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, bonusLives: formData.bonusLives + 1 })}
                    className="h-12 w-12 rounded-lg bg-[#233948] hover:bg-[#2c4659] text-white flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>

              {/* Radiation Resist */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-medium text-[#91b3ca] uppercase tracking-widest ml-1">
                  Radiation Resist (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    value={formData.radiationResist}
                    onChange={(e) => setFormData({ ...formData, radiationResist: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-[#233948] rounded-lg appearance-none cursor-pointer accent-primary"
                    min="0"
                    max="100"
                  />
                  <div className="h-12 w-20 rounded-lg bg-[#233948] flex items-center justify-center">
                    <span className="text-white font-mono font-bold">{formData.radiationResist}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#233948]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-lg bg-[#233948] hover:bg-[#2c4659] text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 h-12 rounded-lg bg-primary hover:bg-[#1680c7] text-white font-bold transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Create Artifact
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
