import { useEffect, useState } from 'react'
import { inventoryApi } from '../services/api'
import { Inventory, InventoryItem } from '../types/inventory'
import EquipmentSlots from '../components/inventory/EquipmentSlots'
import ItemCard from '../components/inventory/ItemCard'
import ItemContextMenu from '../components/inventory/ItemContextMenu'
import ItemDetailsModal from '../components/inventory/ItemDetailsModal'
import BonusesDisplay from '../components/inventory/BonusesDisplay'

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [loading, setLoading] = useState(true)
  const [contextMenu, setContextMenu] = useState<{
    item: InventoryItem
    isEquipped: boolean
    position: { x: number; y: number }
  } | null>(null)
  const [detailsModal, setDetailsModal] = useState<InventoryItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchInventory = async () => {
    try {
      const { data } = await inventoryApi.getInventory()
      setInventory(data)
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const handleItemClick = (item: InventoryItem, isEquipped: boolean, e: React.MouseEvent) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    
    setContextMenu({
      item,
      isEquipped,
      position: { 
        x: rect.left, 
        y: rect.top
      },
    })
  }

  const closeContextMenu = () => setContextMenu(null)

  const handleEquip = async () => {
    if (!contextMenu) return
    setActionLoading(true)
    try {
      await inventoryApi.equipItem(contextMenu.item.id, contextMenu.item.itemType)
      await fetchInventory()
      closeContextMenu()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to equip item')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnequip = async () => {
    if (!contextMenu) return
    setActionLoading(true)
    try {
      await inventoryApi.unequipItem(contextMenu.item.id, contextMenu.item.itemType)
      await fetchInventory()
      closeContextMenu()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to unequip item')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUse = async () => {
    if (!contextMenu) return
    if (!confirm('Use this consumable?')) return
    setActionLoading(true)
    try {
      const { data } = await inventoryApi.useConsumable(contextMenu.item.id)
      alert(`Radiation removed: ${data.radiationRemoved}% (${data.radiationBefore} → ${data.radiationAfter})`)
      await fetchInventory()
      closeContextMenu()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to use item')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDrop = async () => {
    if (!contextMenu) return
    if (!confirm(`Drop ${contextMenu.item.name}? This action is permanent!`)) return
    setActionLoading(true)
    try {
      await inventoryApi.dropItem(contextMenu.item.id, contextMenu.item.itemType)
      await fetchInventory()
      closeContextMenu()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to drop item')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSell = async () => {
    if (!contextMenu) return
    const price = contextMenu.item.itemType === 'artifact' ? contextMenu.item.value : contextMenu.item.basePrice
    if (!confirm(`Sell ${contextMenu.item.name} for 💰 ${price}?`)) return
    setActionLoading(true)
    try {
      const { data } = await inventoryApi.sellItem(contextMenu.item.id, contextMenu.item.itemType)
      alert(`Sold for 💰 ${data.priceReceived}. New balance: 💰 ${data.newBalance}`)
      await fetchInventory()
      closeContextMenu()
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to sell item')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-pda-text text-center py-8">Loading inventory...</div>
      </div>
    )
  }

  if (!inventory) {
    return (
      <div className="p-4">
        <div className="text-pda-danger text-center py-8">Failed to load inventory</div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-20">
      <h2 className="text-pda-phosphor font-pixel text-xl mb-4">INVENTORY</h2>

      {/* Total Bonuses */}
      <BonusesDisplay
        wounds={inventory.totalBonuses.wounds}
        radiationResist={inventory.totalBonuses.radiationResist}
        bonusLives={inventory.totalBonuses.bonusLives}
      />

      {/* Equipment Slots */}
      <EquipmentSlots
        equipped={inventory.equipped}
        onItemClick={(item, e) => handleItemClick(item, true, e)}
      />

      {/* Backpack */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-pda-phosphor font-bold">BACKPACK</h3>
          <div className={`text-sm ${inventory.capacity.current >= inventory.capacity.max ? 'text-pda-danger' : 'text-pda-text'}`}>
            {inventory.capacity.current}/{inventory.capacity.max}
          </div>
        </div>

        {inventory.backpack.length === 0 ? (
          <div className="bg-pda-case-dark border border-pda-primary/30 p-4 text-center">
            <p className="text-pda-text/70">Backpack is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {inventory.backpack.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={(e) => handleItemClick(item, false, e)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && !actionLoading && (
        <ItemContextMenu
          item={contextMenu.item}
          isEquipped={contextMenu.isEquipped}
          onDetails={() => {
            setDetailsModal(contextMenu.item)
            closeContextMenu()
          }}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
          onUse={handleUse}
          onDrop={handleDrop}
          onSell={handleSell}
          onClose={closeContextMenu}
          position={contextMenu.position}
        />
      )}

      {/* Details Modal */}
      {detailsModal && (
        <ItemDetailsModal
          item={detailsModal}
          onClose={() => setDetailsModal(null)}
        />
      )}

      {/* Loading overlay */}
      {actionLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="text-pda-text text-xl">Processing...</div>
        </div>
      )}
    </div>
  )
}

