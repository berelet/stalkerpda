import { InventoryItem } from '../../types/inventory'

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

          {/* Item image (artifacts only) */}
          {item.itemType === 'artifact' && (item as any).imageUrl && (
            <div className="mb-4">
              <img 
                src={(item as any).imageUrl} 
                alt={item.name}
                className="w-full aspect-square object-cover border border-pda-primary/30"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Item name */}
          <h3 className="text-pda-highlight text-xl font-bold mb-4">{item.name}</h3>

          {/* Item type badge */}
          <div className="mb-4">
            {item.itemType === 'artifact' ? (
              <span className={`text-sm uppercase ${getRarityColor(item.rarity)}`}>
                {item.rarity} Artifact
              </span>
            ) : (
              <span className="text-sm uppercase text-pda-text/70">
                {item.category}
              </span>
            )}
          </div>

          {/* Description (artifacts only) */}
          {item.itemType === 'artifact' && (item as any).description && (
            <div className="mb-4 text-pda-text/80 text-sm">
              {(item as any).description}
            </div>
          )}

          {/* Stats */}
          <div className="space-y-2 mb-4">
            {item.itemType === 'equipment' && (
              <>
                {item.bonusWounds !== undefined && item.bonusWounds > 0 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Bonus Wounds:</span>
                    <span className="text-pda-highlight">+{item.bonusWounds}</span>
                  </div>
                )}
                {item.radiationResist !== undefined && item.radiationResist > 0 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Radiation Resist:</span>
                    <span className="text-pda-highlight">{item.radiationResist}%</span>
                  </div>
                )}
                {item.radiationRemoval !== undefined && item.radiationRemoval > 0 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Radiation Removal:</span>
                    <span className="text-pda-highlight">{item.radiationRemoval}%</span>
                  </div>
                )}
                <div className="flex justify-between text-pda-text">
                  <span>Base Price:</span>
                  <span className="text-pda-amber">💰 {item.basePrice.toLocaleString()}</span>
                </div>
              </>
            )}

            {item.itemType === 'artifact' && (
              <>
                {item.effects.bonusLives !== undefined && item.effects.bonusLives > 0 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Bonus Lives:</span>
                    <span className="text-pda-highlight">+{item.effects.bonusLives}</span>
                  </div>
                )}
                {item.effects.radiationResist !== undefined && item.effects.radiationResist > 0 && (
                  <div className="flex justify-between text-pda-text">
                    <span>Radiation Resist:</span>
                    <span className="text-pda-highlight">{item.effects.radiationResist}%</span>
                  </div>
                )}
                <div className="flex justify-between text-pda-text">
                  <span>Value:</span>
                  <span className="text-pda-amber">💰 {item.value.toLocaleString()}</span>
                </div>
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
