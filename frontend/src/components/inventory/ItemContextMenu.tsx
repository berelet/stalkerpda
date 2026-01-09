import { InventoryItem } from '../../types/inventory'

interface ItemContextMenuProps {
  item: InventoryItem
  isEquipped: boolean
  onDetails: () => void
  onEquip: () => void
  onUnequip: () => void
  onUse: () => void
  onDrop: () => void
  onClose: () => void
  position: { x: number; y: number }
}

export default function ItemContextMenu({
  item,
  isEquipped,
  onDetails,
  onEquip,
  onUnequip,
  onUse,
  onDrop,
  onClose,
  position,
}: ItemContextMenuProps) {
  const isConsumable = item.itemType === 'equipment' && item.category === 'consumable'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      
      {/* Menu */}
      <div
        className="fixed z-50 bg-pda-case border-2 border-pda-primary shadow-lg min-w-[160px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
      >
        <button
          onClick={onDetails}
          className="w-full px-4 py-2 text-left text-pda-text hover:bg-pda-primary/20 border-b border-pda-primary/30"
        >
          📋 Details
        </button>

        {!isConsumable && (
          <>
            {isEquipped ? (
              <button
                onClick={onUnequip}
                className="w-full px-4 py-2 text-left text-pda-text hover:bg-pda-primary/20 border-b border-pda-primary/30"
              >
                ⬇️ Unequip
              </button>
            ) : (
              <button
                onClick={onEquip}
                className="w-full px-4 py-2 text-left text-pda-text hover:bg-pda-primary/20 border-b border-pda-primary/30"
              >
                ⬆️ Equip
              </button>
            )}
          </>
        )}

        {isConsumable && !isEquipped && (
          <button
            onClick={onUse}
            className="w-full px-4 py-2 text-left text-pda-text hover:bg-pda-primary/20 border-b border-pda-primary/30"
          >
            💊 Use
          </button>
        )}

        <button
          onClick={onDrop}
          className="w-full px-4 py-2 text-left text-pda-danger hover:bg-pda-danger/20"
        >
          🗑️ Drop
        </button>
      </div>
    </>
  )
}
