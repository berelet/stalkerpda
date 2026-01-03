import { useState } from 'react'

interface CreateArtifactModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: ArtifactFormData) => void
  isUploading?: boolean
}

interface ArtifactFormData {
  name: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  value: number
  bonusLives: number
  radiationResist: number
  image?: File
}

export default function CreateArtifactModal({ isOpen, onClose, onSubmit, isUploading = false }: CreateArtifactModalProps) {
  const [formData, setFormData] = useState<ArtifactFormData>({
    name: '',
    rarity: 'rare',
    value: 5000,
    bonusLives: 0,
    radiationResist: 0,
  })
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
    onClose()
    setFormData({ name: '', rarity: 'rare', value: 5000, bonusLives: 0, radiationResist: 0 })
    setImagePreview(null)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData({ ...formData, image: file })
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-[800px] flex flex-col bg-[#111b22] rounded-xl shadow-2xl border border-[#233948] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#233948] bg-[#152028] px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">science</span>
              Create Artifact
            </h2>
            <p className="text-xs font-mono text-[#91b3ca] uppercase tracking-wider">// DATABASE ENTRY_ID: NEW</p>
          </div>
          <button onClick={onClose} className="text-[#91b3ca] hover:text-white transition-colors rounded-lg p-2 hover:bg-[#233948]">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto max-h-[80vh] p-6 space-y-8">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-xs font-mono font-medium text-[#91b3ca] uppercase tracking-widest ml-1">Artifact Name</label>
                <div className="relative">
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full h-12 rounded-lg bg-[#233948] border border-transparent focus:border-primary focus:ring-1 focus:ring-primary text-white placeholder-[#91b3ca] px-4 transition-all" placeholder="e.g. Moonlight, Soul, Fireball" required />
                  <span className="material-symbols-outlined absolute right-4 top-3 text-[#91b3ca]">edit</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-medium text-[#91b3ca] uppercase tracking-widest ml-1">Rarity Class</label>
                <div className="relative">
                  <select value={formData.rarity} onChange={(e) => setFormData({ ...formData, rarity: e.target.value as any })} className="w-full h-12 appearance-none rounded-lg bg-[#233948] border border-transparent focus:border-primary focus:ring-1 focus:ring-primary text-white px-4 pr-10 cursor-pointer transition-all">
                    <option value="common">Common</option>
                    <option value="uncommon">Uncommon</option>
                    <option value="rare">Rare</option>
                    <option value="legendary">Legendary</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-3 text-[#91b3ca] pointer-events-none">expand_more</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-medium text-[#91b3ca] uppercase tracking-widest ml-1">Market Value</label>
                <div className="relative">
                  <input type="number" value={formData.value} onChange={(e) => setFormData({ ...formData, value: parseInt(e.target.value) })} className="w-full h-12 rounded-lg bg-[#233948] border border-transparent focus:border-primary focus:ring-1 focus:ring-primary text-white placeholder-[#91b3ca] px-4 pl-10 transition-all font-mono" placeholder="0" required />
                  <span className="material-symbols-outlined absolute left-3 top-3 text-[#91b3ca]">payments</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-[#233948]">
              <span className="material-symbols-outlined text-primary text-sm">image</span>
              <h3 className="text-sm font-bold text-white tracking-widest font-mono uppercase">// Artifact Image</h3>
            </div>
            <div className="flex gap-4">
              <div className="w-32 h-32 rounded-lg bg-[#233948] border-2 border-dashed border-[#91b3ca]/30 flex items-center justify-center overflow-hidden">
                {imagePreview ? <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" /> : <span className="material-symbols-outlined text-[#91b3ca] text-4xl">photo_camera</span>}
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label className="text-xs font-mono font-medium text-[#91b3ca] uppercase tracking-widest ml-1">Upload Image</label>
                <label className="flex-1 flex flex-col items-center justify-center gap-2 px-4 py-6 bg-[#233948] border-2 border-dashed border-[#91b3ca]/30 rounded-lg hover:border-primary hover:bg-[#2c4659] transition-colors cursor-pointer">
                  <span className="material-symbols-outlined text-primary text-3xl">upload_file</span>
                  <span className="text-sm text-[#91b3ca]">Click to upload or drag and drop</span>
                  <span className="text-xs text-[#91b3ca]/60">PNG, JPG, WEBP (max 2MB)</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-2 border-b border-[#233948]">
              <span className="material-symbols-outlined text-primary text-sm">bolt</span>
              <h3 className="text-sm font-bold text-white tracking-widest font-mono uppercase">// Anomalous Properties</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-medium text-[#91b3ca] uppercase tracking-widest ml-1">Bonus Lives</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setFormData({ ...formData, bonusLives: Math.max(0, formData.bonusLives - 1) })} className="h-12 w-12 rounded-lg bg-[#233948] hover:bg-[#2c4659] text-white flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined">remove</span>
                  </button>
                  <input type="number" value={formData.bonusLives} onChange={(e) => setFormData({ ...formData, bonusLives: parseInt(e.target.value) || 0 })} className="flex-1 h-12 rounded-lg bg-[#233948] border border-transparent focus:border-primary focus:ring-1 focus:ring-primary text-white text-center font-mono text-lg" min="0" />
                  <button type="button" onClick={() => setFormData({ ...formData, bonusLives: formData.bonusLives + 1 })} className="h-12 w-12 rounded-lg bg-[#233948] hover:bg-[#2c4659] text-white flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined">add</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono font-medium text-[#91b3ca] uppercase tracking-widest ml-1">Radiation Resist (%)</label>
                <div className="flex items-center gap-2">
                  <input type="range" value={formData.radiationResist} onChange={(e) => setFormData({ ...formData, radiationResist: parseInt(e.target.value) })} className="flex-1 h-2 bg-[#233948] rounded-lg appearance-none cursor-pointer accent-primary" min="0" max="100" />
                  <div className="h-12 w-20 rounded-lg bg-[#233948] flex items-center justify-center">
                    <span className="text-white font-mono font-bold">{formData.radiationResist}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#233948]">
            <button type="button" onClick={onClose} disabled={isUploading} className="flex-1 h-12 rounded-lg bg-[#233948] hover:bg-[#2c4659] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={isUploading} className="flex-1 h-12 rounded-lg bg-primary hover:bg-[#1680c7] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold transition-colors flex items-center justify-center gap-2">
              {isUploading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Uploading...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">add_circle</span>
                  Create Artifact
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
