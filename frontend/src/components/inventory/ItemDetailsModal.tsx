import { InventoryItem, ConsumableItem, ArtifactItem, EquipmentItem } from '../../types/inventory'

interface ItemDetailsModalProps {
  item: InventoryItem
  onClose: () => void
}

export default function ItemDetailsModal({ item, onClose }: ItemDetailsModalProps) {
  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common': return 'text-gray-400'
      case 'uncommon': return 'text-green-400'
      case 'rare': return 'text-blue-400'
      case 'legendary': return 'text-pda-amber'
      default: return 'text-pda-text'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'medicine': return 'text-green-400'
      case 'ammunition': return 'text-yellow-400'
      case 'food': return 'text-orange-400'
      case 'drink': return 'text-purple-400'
      case 'armor': return 'text-blue-400'
      case 'addon': return 'text-cyan-400'
      default: return 'text-pda-text'
    }
  }

  // Get image URL based on item type
  const getImageUrl = () => {
    if (item.itemType === 'artifact') {
      return (item as any).imageUrl
    }
    if (item.itemType === 'consumable') {
      return (item as ConsumableItem).imageUrl
    }
    return null
  }

  const imageUrl = getImageUrl()

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
        {/* Modal */}
        <div
          className="bg-pda-case border-2 border-pda-primary max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-pda-text hover:text-pda-primary text-2xl"
          >
            ×
          </button>

          {/* Item image */}
          {imageUrl && (
            <div className="mb-4">
              <img 
                src={imageUrl} 
                alt={item.name}
                className="w-full aspect-square object-cover border border-pda-primary/30"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Item name */}
          <h3 className="text-pda-highlight text-xl font-bold mb-2">{item.name}</h3>

          {/* Item type badge */}
          <div className="mb-4">
            {item.itemType === 'artifact' && (
              <span className={`text-sm uppercase ${getRarityColor((item as ArtifactItem).rarity)}`}>
                {(item as ArtifactItem).rarity} Artifact
              </span>
            )}
            {item.itemType === 'equipment' && (
              <span className={`text-sm uppercase ${getTypeColor((item as EquipmentItem).category)}`}>
                {(item as EquipmentItem).category}
              </span>
            )}
            {item.itemType === 'consumable' && (
              <span className={`text-sm uppercase ${getTypeColor((item as ConsumableItem).type || (item as ConsumableItem).category)}`}>
                {(item as ConsumableItem).type || (item as ConsumableItem).category}
              </span>
            )}
          </div>

          {/* Description */}
          {item.itemType === 'consumable' && (item as ConsumableItem).description && (
            <div className="mb-4 text-pda-text/80 text-sm">
              {(item as ConsumableItem).description}
            </div>
          )}

          {/* Stats */}
          <div className="space-y-2 mb-4 border-t border-pda-primary/30 pt-4">
            {/* Equipment stats */}
            {item.itemType === 'equipment' && (
              <>
                {(item as EquipmentItem).bonusWounds !== undefined && (item as EquipmentItem).bonusWounds! > 0 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Wounds Protection:</span>
                    <span className="text-blue-400">+{(item as EquipmentItem).bonusWounds}</span>
                  </div>
                )}
                {(item as EquipmentItem).radiationResist !== undefined && (item as EquipmentItem).radiationResist! > 0 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Radiation Resist:</span>
                    <span className="text-purple-400">{(item as EquipmentItem).radiationResist}%</span>
                  </div>
                )}
                {(item as EquipmentItem).radiationRemoval !== undefined && (item as EquipmentItem).radiationRemoval! > 0 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Anti-Radiation:</span>
                    <span className="text-cyan-400">-{(item as EquipmentItem).radiationRemoval}%</span>
                  </div>
                )}
                <div className="flex justify-between text-pda-text">
                  <span>Base Price:</span>
                  <span className="text-pda-amber">💰 {(item as EquipmentItem).basePrice.toLocaleString()}</span>
                </div>
              </>
            )}

            {/* Artifact stats */}
            {item.itemType === 'artifact' && (
              <>
                {(item as ArtifactItem).effects.bonusLives !== undefined && (item as ArtifactItem).effects.bonusLives! > 0 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Bonus Lives:</span>
                    <span className="text-green-400">+{(item as ArtifactItem).effects.bonusLives}</span>
                  </div>
                )}
                {(item as ArtifactItem).effects.radiationResist !== undefined && (item as ArtifactItem).effects.radiationResist! > 0 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Radiation Resist:</span>
                    <span className="text-purple-400">{(item as ArtifactItem).effects.radiationResist}%</span>
                  </div>
                )}
                <div className="flex justify-between text-pda-text">
                  <span>Value:</span>
                  <span className="text-pda-amber">💰 {(item as ArtifactItem).value.toLocaleString()}</span>
                </div>
              </>
            )}

            {/* Consumable stats */}
            {item.itemType === 'consumable' && (
              <>
                {(item as ConsumableItem).extraLives !== undefined && (item as ConsumableItem).extraLives! > 0 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Extra Lives:</span>
                    <span className="text-green-400">+{(item as ConsumableItem).extraLives}</span>
                  </div>
                )}
                {(item as ConsumableItem).quantity > 1 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Quantity:</span>
                    <span className="text-pda-highlight">x{(item as ConsumableItem).quantity}</span>
                  </div>
                )}
                <div className="flex justify-between text-pda-text">
                  <span>Base Price:</span>
                  <span className="text-pda-amber">💰 {(item as ConsumableItem).basePrice.toLocaleString()}</span>
                </div>
                {(item as ConsumableItem).isStackable && (
                  <div className="flex justify-between text-pda-text">
                    <span>Stackable:</span>
                    <span className="text-blue-400">Yes</span>
                  </div>
                )}
                {(item as ConsumableItem).isPhysical && (
                  <div className="flex justify-between text-pda-text">
                    <span>Physical Item:</span>
                    <span className="text-yellow-400">Yes</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full bg-pda-primary/20 hover:bg-pda-primary/30 text-pda-text py-2 border border-pda-primary"
          >
            Close
          </button>
        </div>
      </div>
    </>
  )
}
