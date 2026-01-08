import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  nickname: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<boolean>
}

const API_URL = import.meta.env.VITE_API_URL

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: !!localStorage.getItem('token'),
  nickname: localStorage.getItem('nickname'),
  
  login: async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    
    if (!response.ok) throw new Error('Login failed')
    
    const data = await response.json()
    
    if (!data.is_gm) throw new Error('Not a GM')
    
    localStorage.setItem('token', data.token)
    localStorage.setItem('nickname', data.nickname)
    set({ isAuthenticated: true, nickname: data.nickname })
  },
  
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('nickname')
    set({ isAuthenticated: false, nickname: null })
  },
  
  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ isAuthenticated: false, nickname: null })
      return false
    }
    
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (!response.ok) {
        localStorage.removeItem('token')
        localStorage.removeItem('nickname')
        set({ isAuthenticated: false, nickname: null })
        return false
      }

      const data = await response.json()
      if (data.role !== 'gm') {
        localStorage.removeItem('token')
        localStorage.removeItem('nickname')
        set({ isAuthenticated: false, nickname: null })
        return false
      }
      
      set({ isAuthenticated: true, nickname: data.nickname })
      return true
    } catch {
      set({ isAuthenticated: false, nickname: null })
      return false
    }
  }
}))
