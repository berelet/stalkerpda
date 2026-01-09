import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import { Icon } from 'leaflet'
import api from '../services/api'
import 'leaflet/dist/leaflet.css'

interface Trader {
  id: string
  name: string
  type: 'npc' | 'bartender'
  player_id: string | null
  latitude: number | null
  longitude: number | null
  interaction_radius: number
  commission_buy_pct: number
  commission_sell_pct: number
  is_active: boolean
}

interface ItemDef {
  id: string
  name: string
  type: string
  base_price: number
  image_url: string | null
}

const traderIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

function LocationPicker({ position, onSelect }: { position: [number, number] | null; onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng)
    },
  })
  return position ? <Marker position={position} icon={traderIcon} /> : null
}

export default function TradersPage() {
  const [traders, setTraders] = useState<Trader[]>([])
  const [items, setItems] = useState<ItemDef[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTrader, setEditingTrader] = useState<Trader | null>(null)
  const [inventoryModal, setInventoryModal] = useState<Trader | null>(null)
  const [traderItems, setTraderItems] = useState<string[]>([])

  const loadTraders = async () => {
    try {
      const { data } = await api.get('/api/admin/traders')
      setTraders(data.traders)
    } catch (error) {
      console.error('Error loading traders:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadItems = async () => {
    try {
      const { data } = await api.get('/api/admin/items')
      setItems(data.items)
    } catch (error) {
      console.error('Error loading items:', error)
    }
  }

  useEffect(() => {
    loadTraders()
    loadItems()
  }, [])

  const handleDelete = async (trader: Trader) => {
    if (!confirm(`Delete trader "${trader.name}"?`)) return
    try {
      await api.delete(`/api/admin/traders/${trader.id}`)
      loadTraders()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to delete')
    }
  }

  const handleEditInventory = async (trader: Trader) => {
    try {
      const { data } = await api.get(`/api/admin/traders/${trader.id}/inventory`)
      setTraderItems(data.items.map((i: any) => i.item_def_id))
      setInventoryModal(trader)
    } catch (error) {
      console.error('Error loading inventory:', error)
    }
  }

  const saveInventory = async () => {
    if (!inventoryModal) return
    try {
      await api.put(`/api/admin/traders/${inventoryModal.id}/inventory`, { item_ids: traderItems })
      alert('Inventory updated!')
      setInventoryModal(null)
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to update')
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Traders</h1>
          <p className="text-[#91b3ca]">Manage NPC traders and bartenders</p>
        </div>
        <button
          onClick={() => { setEditingTrader(null); setIsModalOpen(true) }}
          className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-[#1680c7] text-white font-bold rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Add Trader
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {traders.map((trader) => (
          <div key={trader.id} className="bg-[#16202a] border border-[#233948] rounded-lg p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-bold text-lg">{trader.name}</h3>
                <span className={`text-xs uppercase ${trader.type === 'npc' ? 'text-yellow-400' : 'text-blue-400'}`}>
                  {trader.type}
                </span>
              </div>
              {!trader.is_active && (
                <span className="px-2 py-0.5 bg-red-900/30 border border-red-500/30 text-red-400 rounded text-xs">Inactive</span>
              )}
            </div>

            <div className="space-y-1 text-sm mb-4">
              {trader.latitude && trader.longitude && (
                <div className="text-[#91b3ca]">📍 {trader.latitude.toFixed(6)}, {trader.longitude.toFixed(6)}</div>
              )}
              <div className="text-[#91b3ca]">Radius: {trader.interaction_radius}m</div>
              <div className="text-[#91b3ca]">Buy +{trader.commission_buy_pct}% / Sell -{trader.commission_sell_pct}%</div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setEditingTrader(trader); setIsModalOpen(true) }}
                className="flex-1 h-9 rounded-lg bg-[#233948] hover:bg-primary/20 border border-primary/30 hover:border-primary text-primary font-medium transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                Edit
              </button>
              <button
                onClick={() => handleEditInventory(trader)}
                className="flex-1 h-9 rounded-lg bg-[#233948] hover:bg-yellow-500/20 border border-yellow-500/30 hover:border-yellow-500 text-yellow-500 font-medium transition-colors flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">inventory_2</span>
                Items
              </button>
              <button
                onClick={() => handleDelete(trader)}
                className="h-9 px-3 rounded-lg bg-[#233948] hover:bg-red-500/20 border border-red-500/30 hover:border-red-500 text-red-500 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Trader Modal */}
      {isModalOpen && (
        <TraderModal
          trader={editingTrader}
          onClose={() => setIsModalOpen(false)}
          onSave={loadTraders}
        />
      )}

      {/* Inventory Modal */}
      {inventoryModal && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111b22] border border-[#233948] rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">{inventoryModal.name} - Inventory</h2>
            <p className="text-[#91b3ca] text-sm mb-4">Select items this trader will sell:</p>
            
            <div className="grid grid-cols-2 gap-2 mb-4 max-h-[400px] overflow-y-auto">
              {items.map((item) => (
                <label key={item.id} className="flex items-center gap-2 p-2 bg-[#233948] rounded cursor-pointer hover:bg-[#2c4659]">
                  <input
                    type="checkbox"
                    checked={traderItems.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTraderItems([...traderItems, item.id])
                      } else {
                        setTraderItems(traderItems.filter(id => id !== item.id))
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-white text-sm">{item.name}</span>
                  <span className="text-[#91b3ca] text-xs ml-auto">💰 {item.base_price}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={saveInventory} className="flex-1 py-2 bg-primary hover:bg-[#1680c7] text-white rounded-lg">
                Save Inventory
              </button>
              <button onClick={() => setInventoryModal(null)} className="flex-1 py-2 bg-[#233948] hover:bg-[#2c4659] text-white rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TraderModal({ trader, onClose, onSave }: { trader: Trader | null; onClose: () => void; onSave: () => void }) {
  const [form, setForm] = useState({
    name: trader?.name || '',
    type: trader?.type || 'npc',
    latitude: trader?.latitude || null,
    longitude: trader?.longitude || null,
    interaction_radius: trader?.interaction_radius || 20,
    commission_buy_pct: trader?.commission_buy_pct || 10,
    commission_sell_pct: trader?.commission_sell_pct || 20,
    is_active: trader?.is_active ?? true,
  })
  const [saving, setSaving] = useState(false)

  const mapCenter: [number, number] = form.latitude && form.longitude 
    ? [form.latitude, form.longitude] 
    : [34.766848, 32.433766]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (trader) {
        await api.put(`/api/admin/traders/${trader.id}`, form)
      } else {
        await api.post('/api/admin/traders', form)
      }
      onSave()
      onClose()
    } catch (error: any) {
      alert(error.response?.data?.error?.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111b22] border border-[#233948] rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">{trader ? 'Edit Trader' : 'Add Trader'}</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[#91b3ca] text-sm mb-1">Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#233948] border border-[#233948] rounded text-white"
                required
              />
            </div>
            <div>
              <label className="block text-[#91b3ca] text-sm mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as 'npc' | 'bartender' })}
                className="w-full px-3 py-2 bg-[#233948] border border-[#233948] rounded text-white"
              >
                <option value="npc">NPC</option>
                <option value="bartender">Bartender</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#91b3ca] text-sm mb-1">Location (click on map)</label>
            <div className="h-64 rounded overflow-hidden border border-[#233948]">
              <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <LocationPicker
                  position={form.latitude && form.longitude ? [form.latitude, form.longitude] : null}
                  onSelect={(lat, lng) => setForm({ ...form, latitude: lat, longitude: lng })}
                />
              </MapContainer>
            </div>
            {form.latitude && form.longitude && (
              <div className="text-xs text-[#91b3ca] mt-1">
                📍 {form.latitude.toFixed(6)}, {form.longitude.toFixed(6)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[#91b3ca] text-sm mb-1">Radius (m)</label>
              <input
                type="number"
                value={form.interaction_radius}
                onChange={(e) => setForm({ ...form, interaction_radius: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-[#233948] border border-[#233948] rounded text-white"
              />
            </div>
            <div>
              <label className="block text-[#91b3ca] text-sm mb-1">Buy Commission %</label>
              <input
                type="number"
                value={form.commission_buy_pct}
                onChange={(e) => setForm({ ...form, commission_buy_pct: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-[#233948] border border-[#233948] rounded text-white"
              />
            </div>
            <div>
              <label className="block text-[#91b3ca] text-sm mb-1">Sell Commission %</label>
              <input
                type="number"
                value={form.commission_sell_pct}
                onChange={(e) => setForm({ ...form, commission_sell_pct: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-[#233948] border border-[#233948] rounded text-white"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-white">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            Active
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-primary hover:bg-[#1680c7] text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-[#233948] hover:bg-[#2c4659] text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
