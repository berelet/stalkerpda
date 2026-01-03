import { useState, useEffect } from 'react'
import CreateArtifactModal from '../components/CreateArtifactModal'
import { uploadService } from '../services/upload'
import api from '../services/api'

interface ArtifactFormData {
  name: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  value: number
  bonusLives: number
  radiationResist: number
  image?: File
}

interface ArtifactType {
  id: string
  name: string
  rarity: string
  value: number
  bonusLives: number
  radiationResist: number
  imageUrl: string
  createdAt: string
}

const rarityColors = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  legendary: 'text-yellow-400',
}

export default function ArtifactsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [artifacts, setArtifacts] = useState<ArtifactType[]>([])
  const [loading, setLoading] = useState(true)

  const loadArtifacts = async () => {
    try {
      const { data } = await api.get('/api/admin/artifact-types')
      setArtifacts(data.artifacts)
    } catch (error) {
      console.error('Error loading artifacts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadArtifacts()
  }, [])

  const handleCreateArtifact = async (data: ArtifactFormData) => {
    try {
      setIsUploading(true)
      
      let imageUrl = ''
      if (data.image) {
        imageUrl = await uploadService.uploadArtifactImage(data.image)
      }

      await api.post('/api/admin/artifact-types', {
        name: data.name,
        rarity: data.rarity,
        value: data.value,
        bonusLives: data.bonusLives,
        radiationResist: data.radiationResist,
        imageUrl,
      })

      alert('Artifact type created successfully!')
      setIsModalOpen(false)
      loadArtifacts()
      
    } catch (error: any) {
      console.error('Error creating artifact:', error)
      alert(error.response?.data?.error || 'Failed to create artifact')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Artifacts</h1>
          <p className="text-[#91b3ca]">Manage artifacts and spawning</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#1680c7] text-white font-bold rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Create Artifact Type
        </button>
      </div>

      {loading ? (
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-12 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-4xl animate-spin">progress_activity</span>
        </div>
      ) : artifacts.length === 0 ? (
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-12 text-center">
          <span className="material-symbols-outlined text-[#91b3ca] text-6xl mb-4">science</span>
          <p className="text-[#91b3ca] text-lg">No artifact types created yet</p>
          <p className="text-[#91b3ca]/60 text-sm mt-2">Click "Create Artifact Type" to add your first artifact</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="bg-[#16202a] border border-[#233948] rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
            >
              {/* Image */}
              <div className="aspect-square bg-[#233948] flex items-center justify-center overflow-hidden">
                {artifact.imageUrl ? (
                  <img src={artifact.imageUrl} alt={artifact.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[#91b3ca] text-6xl">photo_camera</span>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-bold text-lg">{artifact.name}</h3>
                  <span className={`text-xs font-mono uppercase ${rarityColors[artifact.rarity as keyof typeof rarityColors]}`}>
                    {artifact.rarity}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[#91b3ca]">Value:</span>
                    <span className="text-white font-mono">{artifact.value}</span>
                  </div>
                  
                  {artifact.bonusLives > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#91b3ca]">Bonus Lives:</span>
                      <span className="text-green-400 font-mono">+{artifact.bonusLives}</span>
                    </div>
                  )}
                  
                  {artifact.radiationResist > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#91b3ca]">Rad Resist:</span>
                      <span className="text-blue-400 font-mono">{artifact.radiationResist}%</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateArtifactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateArtifact}
        isUploading={isUploading}
      />
    </div>
  )
}
