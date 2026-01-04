import { EquippedItems } from '../../types/inventory'
import ItemCard from './ItemCard'

interface EquipmentSlotsProps {
  equipped: EquippedItems
  onItemClick: (item: any, e: React.MouseEvent) => void
}

export default function EquipmentSlots({ equipped, onItemClick }: EquipmentSlotsProps) {
  return (
    <div className="mb-6">
      <h3 className="text-pda-phosphor font-bold mb-3">EQUIPPED</h3>
      
      {/* Armor */}
      <div className="mb-3">
        <div className="text-pda-text/70 text-xs mb-1">ARMOR</div>
        {equipped.armor ? (
          <ItemCard
            item={equipped.armor}
            isEquipped
            onClick={(e) => onItemClick(equipped.armor, e)}
          />
        ) : (
          <div className="bg-pda-case-dark/50 border-2 border-dashed border-pda-primary/20 p-2 text-center text-pda-text/50 text-xs">
            Empty
          </div>
        )}
      </div>

      {/* Artifact */}
      <div className="mb-3">
        <div className="text-pda-text/70 text-xs mb-1">ARTIFACT</div>
        {equipped.artifact ? (
          <ItemCard
            item={equipped.artifact}
            isEquipped
            onClick={(e) => onItemClick(equipped.artifact, e)}
          />
        ) : (
          <div className="bg-pda-case-dark/50 border-2 border-dashed border-pda-primary/20 p-2 text-center text-pda-text/50 text-xs">
            Empty
          </div>
        )}
      </div>

      {/* Addons */}
      <div>
        <div className="text-pda-text/70 text-xs mb-1">ARMOR ADDONS (2 max)</div>
        <div className="grid grid-cols-2 gap-2">
          {[0, 1].map((index) => {
            const addon = equipped.addons[index]
            return (
              <div key={index}>
                {addon ? (
                  <ItemCard
                    item={addon}
                    isEquipped
                    onClick={(e) => onItemClick(addon, e)}
                  />
                ) : (
                  <div className="bg-pda-case-dark/50 border-2 border-dashed border-pda-primary/20 p-2 text-center text-pda-text/50 text-xs">
                    Addon {index + 1}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
