import { useState } from 'react'
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

export default function ArtifactsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleCreateArtifact = async (data: ArtifactFormData) => {
    try {
      setIsUploading(true)
      
      let imageUrl = ''
      if (data.image) {
        imageUrl = await uploadService.uploadArtifactImage(data.image)
      }

      // Create artifact type
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

      <div className="bg-[#16202a] border border-[#233948] rounded-lg p-6">
        <p className="text-[#91b3ca]">Artifact types library will be here</p>
      </div>

      <CreateArtifactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateArtifact}
        isUploading={isUploading}
      />
    </div>
  )
}
