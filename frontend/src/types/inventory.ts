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

export interface ConsumableItem {
  id: string
  typeId: string
  name: string
  category: 'medicine' | 'ammunition' | 'food' | 'drink'
  itemType: 'consumable'
  quantity: number
  isStackable: boolean
  extraLives?: number
  imageUrl?: string
  description?: string
  basePrice: number
}

export type InventoryItem = EquipmentItem | ArtifactItem | ConsumableItem

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
