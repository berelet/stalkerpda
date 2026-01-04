export interface EquipmentItem {
  id: string
  typeId: string
  name: string
  category: 'armor' | 'addon' | 'consumable'
  itemType: 'equipment'
  bonusWounds?: number
  radiationResist?: number
  radiationRemoval?: number
  basePrice: number
  slotPosition?: number
}

export interface ArtifactItem {
  id: string
  typeId: string
  name: string
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  itemType: 'artifact'
  value: number
  effects: {
    bonusLives?: number
    radiationResist?: number
  }
}

export type InventoryItem = EquipmentItem | ArtifactItem

export interface EquippedItems {
  armor: EquipmentItem | null
  addons: EquipmentItem[]
  artifact: ArtifactItem | null
}

export interface Inventory {
  equipped: EquippedItems
  backpack: InventoryItem[]
  capacity: {
    current: number
    max: number
  }
  totalBonuses: {
    wounds: number
    radiationResist: number
    bonusLives: number
  }
}
