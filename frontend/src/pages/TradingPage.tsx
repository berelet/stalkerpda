import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../services/api'
import { useGeolocation } from '../hooks/useGeolocation'

interface Trader {
  id: string
  name: string
  type: 'npc' | 'bartender'
  latitude?: number
  longitude?: number
  interaction_radius?: number
  commission_buy_pct: number
  commission_sell_pct: number
}

interface TradeItem {
  item_def_id: string
  item_id?: string
  name: string
  description: string
  image_url: string | null
  type: string
  base_price: number
  buy_price?: number
  sell_price?: number
  is_sellable?: boolean
  is_stackable: boolean
  is_physical?: boolean
  quantity: number
  extra_lives?: number
  wounds_protection?: number
  radiation_resistance?: number
  anti_radiation?: number
}

interface TradeSession {
  trade_session_id: string
  trader: Trader
  expires_at: string
}

function ItemDetailsModal({ item, onClose }: { item: TradeItem; onClose: () => void }) {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'medicine': return 'text-green-400'
      case 'ammunition': return 'text-yellow-400'
      case 'food': return 'text-orange-400'
      case 'drink': return 'text-purple-400'
      default: return 'text-pda-text'
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-pda-case border-2 border-pda-primary max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-2 right-2 text-pda-text hover:text-pda-primary text-2xl">×</button>

        {item.image_url && (
          <div className="mb-4">
            <img src={item.image_url} alt={item.name} className="w-full aspect-square object-cover border border-pda-primary/30" />
          </div>
        )}

        <h3 className="text-pda-highlight text-xl font-bold mb-2">{item.name}</h3>
        <span className={`text-sm uppercase ${getTypeColor(item.type)}`}>{item.type}</span>

        {item.description && (
          <div className="mt-3 text-pda-text/80 text-sm">{item.description}</div>
        )}

        <div className="space-y-2 mt-4 border-t border-pda-primary/30 pt-4">
          {item.extra_lives && item.extra_lives > 0 && (
            <div className="flex justify-between text-pda-text">
              <span>Extra Lives:</span>
              <span className="text-green-400">+{item.extra_lives}</span>
            </div>
          )}
          {item.wounds_protection && item.wounds_protection > 0 && (
            <div className="flex justify-between text-pda-text">
              <span>Wounds Protection:</span>
              <span className="text-blue-400">+{item.wounds_protection}</span>
            </div>
          )}
          {item.radiation_resistance && item.radiation_resistance > 0 && (
            <div className="flex justify-between text-pda-text">
              <span>Radiation Resist:</span>
              <span className="text-purple-400">+{item.radiation_resistance}%</span>
            </div>
          )}
          {item.anti_radiation && item.anti_radiation > 0 && (
            <div className="flex justify-between text-pda-text">
              <span>Anti-Radiation:</span>
              <span className="text-cyan-400">-{item.anti_radiation}%</span>
            </div>
          )}
          <div className="flex justify-between text-pda-text">
            <span>Base Price:</span>
            <span className="text-pda-amber">💰 {item.base_price.toLocaleString()}</span>
          </div>
          {item.is_stackable && (
            <div className="flex justify-between text-pda-text">
              <span>Stackable:</span>
              <span className="text-blue-400">Yes</span>
            </div>
          )}
          {item.is_physical && (
            <div className="flex justify-between text-pda-text">
              <span>Physical Item:</span>
              <span className="text-yellow-400">Yes</span>
            </div>
          )}
        </div>

        <button onClick={onClose} className="w-full mt-4 bg-pda-primary/20 hover:bg-pda-primary/30 text-pda-text py-2 border border-pda-primary">
          Close
        </button>
      </div>
    </div>
  )
}

export default function TradingPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const traderId = searchParams.get('trader')
  
  const { latitude, longitude } = useGeolocation(true)
  const [session, setSession] = useState<TradeSession | null>(null)
  const [tab, setTab] = useState<'buy' | 'sell'>('buy')
  const [catalog, setCatalog] = useState<TradeItem[]>([])
  const [backpack, setBackpack] = useState<TradeItem[]>([])
  const [cart, setCart] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  const [selectedItem, setSelectedItem] = useState<TradeItem | null>(null)

  // Start trade session
  useEffect(() => {
    if (!traderId || !latitude || !longitude) return

    const startSession = async () => {
      try {
        setLoading(true)
        const { data } = await api.post('/api/trade/session/start', {
          trader_id: traderId,
          latitude,
          longitude
        })
        setSession(data)
        setError('')
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to start session')
        setTimeout(() => navigate('/map'), 2000)
      } finally {
        setLoading(false)
      }
    }

    startSession()
  }, [traderId, latitude, longitude, navigate])

  // Load catalog or backpack
  useEffect(() => {
    if (!session) return

    const loadItems = async () => {
      try {
        if (tab === 'buy') {
          const { data } = await api.get(`/api/trade/catalog?trade_session_id=${session.trade_session_id}`)
          setCatalog(data.items)
        } else {
          const { data } = await api.get(`/api/trade/backpack?trade_session_id=${session.trade_session_id}`)
          setBackpack(data.items)
        }
      } catch (err: any) {
        if (err.response?.data?.error === 'SESSION_EXPIRED') {
          setError('Session expired')
          setTimeout(() => navigate('/map'), 2000)
        }
      }
    }

    loadItems()
  }, [session, tab, navigate])

  // Clear cart on tab change
  useEffect(() => {
    setCart({})
  }, [tab])

  // Countdown timer
  useEffect(() => {
    if (!session) return

    const expiresAt = new Date(session.expires_at).getTime()
    
    const interval = setInterval(() => {
      const now = Date.now()
      const left = Math.max(0, Math.floor((expiresAt - now) / 1000))
      setTimeLeft(left)
      
      if (left === 0) {
        setError('Session expired')
        setTimeout(() => navigate('/map'), 2000)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [session, navigate])

  const updateCart = (itemId: string, delta: number) => {
    setCart(prev => {
      const current = prev[itemId] || 0
      const newValue = Math.max(0, current + delta)
      
      if (newValue === 0) {
        const { [itemId]: _, ...rest } = prev
        return rest
      }
      
      return { ...prev, [itemId]: newValue }
    })
  }

  const cartTotal = useMemo(() => {
    const items = tab === 'buy' ? catalog : backpack
    let total = 0
    
    Object.entries(cart).forEach(([itemId, qty]) => {
      const item = items.find(i => (tab === 'buy' ? i.item_def_id : i.item_id) === itemId)
      if (item) {
        const price = tab === 'buy' ? item.buy_price! : item.sell_price!
        total += price * qty
      }
    })
    
    return total
  }, [cart, catalog, backpack, tab])

  const executeTrade = async () => {
    if (!session || Object.keys(cart).length === 0) return

    try {
      setLoading(true)
      const items = Object.entries(cart).map(([id, quantity]) => ({
        [tab === 'buy' ? 'item_def_id' : 'item_id']: id,
        quantity
      }))

      const endpoint = tab === 'buy' ? '/api/trade/buy' : '/api/trade/sell'
      const { data } = await api.post(endpoint, {
        trade_session_id: session.trade_session_id,
        items
      })

      alert(`${tab === 'buy' ? 'Purchase' : 'Sale'} successful! New balance: ${data.new_balance}`)
      navigate('/inventory')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !session) {
    return (
      <div className="p-4 text-center">
        <div className="text-pda-phosphor font-pixel">CONNECTING TO TRADER...</div>
      </div>
    )
  }

  if (error && !session) {
    return (
      <div className="p-4 text-center">
        <div className="text-red-500 font-pixel">{error}</div>
      </div>
    )
  }

  if (!session) return null

  const items = tab === 'buy' ? catalog : backpack

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-pda-phosphor font-pixel text-xl">TRADING</h2>
          <button
            onClick={() => navigate('/map')}
            className="px-3 py-1 text-xs border border-pda-primary/30 text-pda-text hover:bg-pda-primary/10"
          >
            CLOSE
          </button>
        </div>
        
        <div className="text-sm text-pda-text/70">
          <div>Trader: {session.trader.name}</div>
          <div>Time left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('buy')}
          className={`flex-1 py-2 text-sm font-pixel border ${
            tab === 'buy'
              ? 'bg-pda-highlight/20 border-pda-highlight text-pda-highlight'
              : 'border-pda-primary/30 text-pda-text'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => setTab('sell')}
          className={`flex-1 py-2 text-sm font-pixel border ${
            tab === 'sell'
              ? 'bg-pda-highlight/20 border-pda-highlight text-pda-highlight'
              : 'border-pda-primary/30 text-pda-text'
          }`}
        >
          SELL
        </button>
      </div>

      {/* Cart Summary - Always visible at top */}
      <div className="border border-pda-highlight/50 bg-pda-highlight/10 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-pixel text-pda-text text-sm">CART:</span>
          <span className="font-pixel text-pda-highlight">{Object.keys(cart).length} item(s)</span>
        </div>
        {Object.keys(cart).length > 0 && (
          <>
            <div className="flex items-center justify-between text-lg">
              <span className="font-pixel text-pda-text">TOTAL:</span>
              <span className="font-pixel text-pda-highlight">💰 {cartTotal.toLocaleString()}</span>
            </div>
            
            {error && (
              <div className="text-red-500 text-sm text-center">{error}</div>
            )}

            <button
              onClick={executeTrade}
              disabled={loading}
              className="w-full py-2 bg-pda-highlight/20 border border-pda-highlight text-pda-highlight font-pixel hover:bg-pda-highlight/30 disabled:opacity-50"
            >
              {loading ? 'PROCESSING...' : `CONFIRM ${tab.toUpperCase()}`}
            </button>
          </>
        )}
      </div>

      {/* Items list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center text-pda-text/50 py-8">
            {tab === 'buy' ? 'No items available' : 'Your backpack is empty'}
          </div>
        ) : (
          items.map(item => {
            const itemId = tab === 'buy' ? item.item_def_id : item.item_id!
            const qty = cart[itemId] || 0
            const price = tab === 'buy' ? item.buy_price! : item.sell_price!

            return (
              <div key={itemId} className="border border-pda-primary/30 p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <button
                      onClick={() => setSelectedItem(item)}
                      className="text-pda-phosphor font-pixel hover:text-pda-highlight underline text-left"
                    >
                      {item.name}
                    </button>
                    <div className="text-xs text-pda-text/70">{item.description}</div>
                    {item.extra_lives && item.extra_lives > 0 && (
                      <div className="text-xs text-green-500">+{item.extra_lives} lives</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-pda-highlight font-pixel">💰 {price}</div>
                    {tab === 'sell' && (
                      <div className="text-xs text-pda-text/50">x{item.quantity} available</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCart(itemId, -1)}
                      disabled={qty === 0}
                      className="w-8 h-8 border border-pda-primary/30 text-pda-text disabled:opacity-30"
                    >
                      −
                    </button>
                    <span className="w-12 text-center font-pixel text-pda-phosphor">{qty}</span>
                    <button
                      onClick={() => updateCart(itemId, 1)}
                      disabled={tab === 'sell' && qty >= item.quantity}
                      className="w-8 h-8 border border-pda-primary/30 text-pda-text disabled:opacity-30"
                    >
                      +
                    </button>
                  </div>
                  {qty > 0 && (
                    <div className="text-sm text-pda-highlight">
                      Subtotal: 💰 {price * qty}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <ItemDetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      )}
    </div>
  )
}
