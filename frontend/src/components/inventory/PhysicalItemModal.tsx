import { ConsumableItem } from '../../types/inventory'

interface PhysicalItemModalProps {
  item: ConsumableItem
  onConfirm: () => void
  onCancel: () => void
  isLoading?: boolean
  redeemCode?: string
}

export default function PhysicalItemModal({ item, onConfirm, onCancel, isLoading, redeemCode }: PhysicalItemModalProps) {
  const getIcon = () => {
    switch (item.type) {
      case 'ammunition': return '🎯'
      case 'food': return '🍖'
      case 'drink': return '🍺'
      default: return '📦'
    }
  }

  const getMessage = () => {
    switch (item.type) {
      case 'ammunition':
        return 'You can now equip your weapon with these BBs. Show this screen to the game master if needed.'
      case 'food':
      case 'drink':
        return 'Show this screen to the bartender to receive your item.'
      default:
        return 'This is a physical item. Follow the game rules to use it.'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-pda-case border-2 border-pda-primary max-w-sm w-full relative overflow-hidden">
        {/* Header */}
        <div className="bg-pda-primary/20 border-b border-pda-primary p-4 text-center">
          <div className="text-6xl mb-2">{getIcon()}</div>
          <h2 className="text-pda-highlight text-xl font-bold">{item.name}</h2>
          <div className="text-pda-text/70 text-sm uppercase">{item.type}</div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Image */}
          {item.imageUrl && (
            <div className="flex justify-center">
              <img 
                src={item.imageUrl} 
                alt={item.name}
                className="w-32 h-32 object-cover border border-pda-primary/30"
              />
            </div>
          )}

          {/* Redeem Code (after confirmation) */}
          {redeemCode ? (
            <div className="space-y-4">
              <div className="bg-pda-highlight/20 border border-pda-highlight p-4 text-center">
                <div className="text-pda-text/70 text-xs uppercase mb-1">Redeem Code</div>
                <div className="text-pda-highlight text-3xl font-mono font-bold tracking-wider">
                  {redeemCode}
                </div>
              </div>
              
              <div className="text-pda-text text-center text-sm">
                {getMessage()}
              </div>

              <div className="bg-pda-danger/20 border border-pda-danger/50 p-3 text-center">
                <div className="text-pda-danger text-xs">
                  ⚠️ Item has been consumed from your inventory
                </div>
              </div>

              <button
                onClick={onCancel}
                className="w-full py-3 bg-pda-primary/30 hover:bg-pda-primary/50 text-pda-text border border-pda-primary font-bold"
              >
                CLOSE
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-pda-text text-center">
                {getMessage()}
              </div>

              <div className="bg-pda-amber/20 border border-pda-amber/50 p-3 text-center">
                <div className="text-pda-amber text-xs">
                  ⚠️ This will consume the item from your inventory
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onCancel}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-pda-case border border-pda-primary/50 text-pda-text hover:bg-pda-primary/20 disabled:opacity-50"
                >
                  CANCEL
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-pda-highlight/30 hover:bg-pda-highlight/50 text-pda-highlight border border-pda-highlight font-bold disabled:opacity-50"
                >
                  {isLoading ? 'USING...' : 'USE ITEM'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none bg-scanlines opacity-10"></div>
      </div>
    </div>
  )
}
