import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const API_URL = import.meta.env.VITE_API_URL || 'https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().clearAuth()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Inventory API
export const inventoryApi = {
  getInventory: () => api.get('/api/inventory'),
  equipItem: (itemId: string, itemType: 'equipment' | 'artifact') => 
    api.post('/api/inventory/equip', { itemId, itemType }),
  unequipItem: (itemId: string, itemType: 'equipment' | 'artifact') => 
    api.post('/api/inventory/unequip', { itemId, itemType }),
  useConsumable: (itemId: string) => 
    api.post('/api/inventory/use', { itemId }),
  dropItem: (itemId: string, itemType: 'equipment' | 'artifact') => 
    api.post('/api/inventory/drop', { itemId, itemType }),
  sellItem: (itemId: string, itemType: 'equipment' | 'artifact') => 
    api.post('/api/inventory/sell', { itemId, itemType }),
}
