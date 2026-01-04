import { InventoryItem } from '../../types/inventory'

interface ItemCardProps {
  item: InventoryItem
  isEquipped?: boolean
  onClick: (e: React.MouseEvent) => void
}

export default function ItemCard({ item, isEquipped, onClick }: ItemCardProps) {
  const getRarityColor = (rarity: string) => {
    switch (rarity.toLowerCase()) {
      case 'common': return 'border-gray-400'
      case 'uncommon': return 'border-green-400'
      case 'rare': return 'border-blue-400'
      case 'legendary': return 'border-pda-amber'
      default: return 'border-pda-primary'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'armor': return '🛡️'
      case 'addon': return '⚙️'
      case 'consumable': return '💊'
      default: return '📦'
    }
  }

  return (
    <div
      onClick={onClick}
      className={`
        bg-pda-case-dark border-2 p-3 cursor-pointer
        hover:bg-pda-primary/10 transition-colors
        ${isEquipped ? 'border-pda-highlight shadow-lg' : 'border-pda-primary/30'}
        ${item.itemType === 'artifact' ? getRarityColor(item.rarity) : ''}
      `}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {item.itemType === 'equipment' && (
              <span className="text-lg">{getCategoryIcon(item.category)}</span>
            )}
            {item.itemType === 'artifact' && <span className="text-lg">💎</span>}
            <div className="text-pda-highlight font-medium text-sm">{item.name}</div>
          </div>
          
          {item.itemType === 'artifact' && (
            <div className={`text-xs uppercase mt-1 ${getRarityColor(item.rarity).replace('border-', 'text-')}`}>
              {item.rarity}
            </div>
          )}
          
          {item.itemType === 'equipment' && (
            <div className="text-xs text-pda-text/70 uppercase mt-1">
              {item.category}
            </div>
          )}
        </div>

        {!isEquipped && (
          <div className="text-pda-amber text-sm">
            💰 {item.itemType === 'artifact' ? item.value : item.basePrice}
          </div>
        )}
      </div>

      {isEquipped && (
        <div className="mt-2 text-xs text-pda-highlight">
          ✓ Equipped
        </div>
      )}
    </div>
  )
}
