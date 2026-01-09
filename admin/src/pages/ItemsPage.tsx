import { useState, useEffect } from 'react'
import api from '../services/api'
import { uploadService } from '../services/upload'

interface ItemDefinition {
  id: string
  name: string
  description: string
  image_url: string
  type: 'armor' | 'armor_addon' | 'medicine' | 'ammunition' | 'food' | 'drink'
  base_price: number
  is_sellable: boolean
  is_active: boolean
  is_stackable: boolean
  is_physical: boolean
  wounds_protection: number
  radiation_resistance: number
  extra_lives: number
  anti_radiation: number
  created_at: string
  updated_at: string
}

const itemTypeLabels = {
  armor: 'Armor',
  armor_addon: 'Armor Addon',
  medicine: 'Medicine',
  ammunition: 'Ammunition',
  food: 'Food',
  drink: 'Drink',
}

const itemTypeColors = {
  armor: 'text-blue-400',
  armor_addon: 'text-cyan-400',
  medicine: 'text-green-400',
  ammunition: 'text-yellow-400',
  food: 'text-orange-400',
  drink: 'text-purple-400',
}

export default function ItemsPage() {
  const [items, setItems] = useState<ItemDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemDefinition | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const loadItems = async () => {
    try {
      const { data } = await api.get('/api/admin/items')
      setItems(data.items)
    } catch (error) {
      console.error('Error loading items:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadItems()
  }, [])

  const handleDelete = async (item: ItemDefinition) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return

    try {
      await api.delete(`/api/admin/items/${item.id}`)
      alert('Item deleted!')
      loadItems()
    } catch (error: any) {
      // Check if item is in use
      if (error.response?.status === 409) {
        const data = error.response.data.error
        const message = `Item is used by:\n- ${data.trader_count} trader(s)\n- ${data.player_count} player(s)\n\nDelete anyway? This will remove it from all inventories!`
        
        if (confirm(message)) {
          try {
            await api.delete(`/api/admin/items/${item.id}?force=true`)
            alert(`Item deleted!\nRemoved from ${data.player_count} player(s) and ${data.trader_count} trader(s).`)
            loadItems()
          } catch (err: any) {
            alert(err.response?.data?.error?.message || 'Failed to delete item')
          }
        }
      } else {
        const errorMsg = error.response?.data?.error?.message || error.response?.data?.error || 'Failed to delete item'
        alert(errorMsg)
      }
    }
  }

  const handleEdit = (item: ItemDefinition) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-green-400 text-xl">Loading items...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Shop Items</h1>
          <p className="text-[#91b3ca]">Manage shop inventory and prices</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#1680c7] text-white font-bold rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Create Item
        </button>
      </div>

      {loading ? (
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-12 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-[#16202a] border border-[#233948] rounded-lg p-12 text-center">
          <span className="material-symbols-outlined text-[#91b3ca] text-6xl mb-4">inventory_2</span>
          <p className="text-[#91b3ca] text-lg">No items created yet</p>
          <p className="text-[#91b3ca]/60 text-sm mt-2">Click "Create Item" to add your first shop item</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-[#16202a] border border-[#233948] rounded-lg overflow-hidden hover:border-primary/50 transition-colors"
            >
              {/* Image */}
              <div className="aspect-square bg-[#233948] flex items-center justify-center overflow-hidden">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[#91b3ca] text-6xl">photo_camera</span>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-white font-bold text-lg">{item.name}</h3>
                  <span className={`text-xs font-mono uppercase ${itemTypeColors[item.type]}`}>
                    {itemTypeLabels[item.type]}
                  </span>
                </div>

                {item.description && (
                  <p className="text-[#91b3ca] text-sm mb-3 line-clamp-2">{item.description}</p>
                )}

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[#91b3ca]">Price:</span>
                    <span className="text-yellow-400 font-mono">💰 {item.base_price}</span>
                  </div>
                  
                  {item.extra_lives > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#91b3ca]">Lives:</span>
                      <span className="text-green-400 font-mono">+{item.extra_lives}</span>
                    </div>
                  )}
                  
                  {item.wounds_protection > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#91b3ca]">Armor:</span>
                      <span className="text-blue-400 font-mono">+{item.wounds_protection}</span>
                    </div>
                  )}
                  
                  {item.radiation_resistance > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#91b3ca]">Rad Resist:</span>
                      <span className="text-purple-400 font-mono">+{item.radiation_resistance}</span>
                    </div>
                  )}
                  
                  {item.anti_radiation > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-[#91b3ca]">Anti-Rad:</span>
                      <span className="text-cyan-400 font-mono">-{item.anti_radiation}</span>
                    </div>
                  )}
                </div>

                {/* Badges */}
                {(item.is_sellable || item.is_stackable || item.is_physical || !item.is_active) && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.is_sellable && (
                      <span className="px-2 py-0.5 bg-green-900/30 border border-green-500/30 text-green-400 rounded text-xs">Sellable</span>
                    )}
                    {item.is_stackable && (
                      <span className="px-2 py-0.5 bg-blue-900/30 border border-blue-500/30 text-blue-400 rounded text-xs">Stackable</span>
                    )}
                    {item.is_physical && (
                      <span className="px-2 py-0.5 bg-yellow-900/30 border border-yellow-500/30 text-yellow-400 rounded text-xs">Physical</span>
                    )}
                    {!item.is_active && (
                      <span className="px-2 py-0.5 bg-red-900/30 border border-red-500/30 text-red-400 rounded text-xs">Inactive</span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(item)}
                    className="flex-1 h-9 rounded-lg bg-[#233948] hover:bg-primary/20 border border-primary/30 hover:border-primary text-primary font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="h-9 px-3 rounded-lg bg-[#233948] hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-500 font-medium transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <ItemModal
          item={editingItem}
          onClose={() => {
            setIsModalOpen(false)
            setEditingItem(null)
          }}
          onSave={loadItems}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
        />
      )}
    </div>
  )
}

interface ItemModalProps {
  item: ItemDefinition | null
  onClose: () => void
  onSave: () => void
  isUploading: boolean
  setIsUploading: (val: boolean) => void
}

function ItemModal({ item, onClose, onSave, isUploading, setIsUploading }: ItemModalProps) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    type: item?.type || 'medicine',
    base_price: item?.base_price || 0,
    is_sellable: item?.is_sellable ?? true,
    is_active: item?.is_active ?? true,
    is_stackable: item?.is_stackable ?? false,
    is_physical: item?.is_physical ?? false,
    wounds_protection: item?.wounds_protection || 0,
    radiation_resistance: item?.radiation_resistance || 0,
    extra_lives: item?.extra_lives || 0,
    anti_radiation: item?.anti_radiation || 0,
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState(item?.image_url || '')
  const [isDragging, setIsDragging] = useState(false)

  const handleImageChange = (file: File) => {
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageChange(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageChange(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsUploading(true)

      let image_url = item?.image_url || ''
      if (imageFile) {
        image_url = await uploadService.uploadArtifactImage(imageFile)
      }

      const payload = { ...formData, image_url }

      if (item) {
        await api.put(`/api/admin/items/${item.id}`, payload)
        alert('Item updated!')
      } else {
        await api.post('/api/admin/items', payload)
        alert('Item created!')
      }

      onSave()
      onClose()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save item')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-green-500 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-green-400 mb-4">
          {item ? 'Edit Item' : 'Create Item'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              >
                {Object.entries(itemTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-1">Base Price *</label>
              <input
                type="number"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-300 mb-1">Extra Lives</label>
              <input
                type="number"
                value={formData.extra_lives}
                onChange={(e) => setFormData({ ...formData, extra_lives: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1">Wounds Protection</label>
              <input
                type="number"
                value={formData.wounds_protection}
                onChange={(e) => setFormData({ ...formData, wounds_protection: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1">Radiation Resistance</label>
              <input
                type="number"
                value={formData.radiation_resistance}
                onChange={(e) => setFormData({ ...formData, radiation_resistance: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-1">Anti-Radiation</label>
              <input
                type="number"
                value={formData.anti_radiation}
                onChange={(e) => setFormData({ ...formData, anti_radiation: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                checked={formData.is_sellable}
                onChange={(e) => setFormData({ ...formData, is_sellable: e.target.checked })}
                className="mr-2"
              />
              Sellable
            </label>

            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                checked={formData.is_stackable}
                onChange={(e) => setFormData({ ...formData, is_stackable: e.target.checked })}
                className="mr-2"
              />
              Stackable
            </label>

            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                checked={formData.is_physical}
                onChange={(e) => setFormData({ ...formData, is_physical: e.target.checked })}
                className="mr-2"
              />
              Physical Item
            </label>

            <label className="flex items-center text-gray-300">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              Active
            </label>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Image</label>
            <div className="flex gap-4">
              {/* Preview */}
              <div className="w-32 h-32 rounded-lg bg-gray-800 border-2 border-dashed border-gray-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-500 text-4xl">📷</span>
                )}
              </div>

              {/* Upload Area */}
              <label
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex-1 flex flex-col items-center justify-center gap-2 px-4 py-6 bg-gray-800 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  isDragging
                    ? 'border-green-500 bg-green-900/20'
                    : 'border-gray-600 hover:border-green-500 hover:bg-gray-750'
                }`}
              >
                <span className="text-green-400 text-3xl">⬆️</span>
                <span className="text-sm text-gray-300">Click to upload or drag and drop</span>
                <span className="text-xs text-gray-500">PNG, JPG, WEBP (max 2MB)</span>
                <span className="text-xs text-gray-500">Auto-resize to 400x400</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={isUploading}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded disabled:opacity-50"
            >
              {isUploading ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
