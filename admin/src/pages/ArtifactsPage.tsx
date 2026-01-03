import { useState } from 'react'
import CreateArtifactModal from '../components/CreateArtifactModal'

interface ArtifactFormData {
  name: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  value: number
  bonusLives: number
  radiationResist: number
}

export default function ArtifactsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCreateArtifact = (data: ArtifactFormData) => {
    console.log('Creating artifact:', data)
    // TODO: API call to create artifact
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
      />
    </div>
  )
}
