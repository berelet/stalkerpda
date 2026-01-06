import { create } from 'zustand'
import { setCookie, getCookie, deleteCookie } from '../utils/cookies'

interface AuthState {
  token: string | null
  playerId: string | null
  nickname: string | null
  setAuth: (token: string, playerId: string, nickname: string) => void
  clearAuth: () => void
  initAuth: () => void
  validateToken: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  playerId: null,
  nickname: null,
  
  setAuth: (token, playerId, nickname) => {
    setCookie('pda_token', token, 7)
    setCookie('pda_player_id', playerId, 7)
    setCookie('pda_nickname', nickname, 7)
    set({ token, playerId, nickname })
  },
  
  clearAuth: () => {
    deleteCookie('pda_token')
    deleteCookie('pda_player_id')
    deleteCookie('pda_nickname')
    set({ token: null, playerId: null, nickname: null })
  },
  
  initAuth: () => {
    const token = getCookie('pda_token')
    const playerId = getCookie('pda_player_id')
    const nickname = getCookie('pda_nickname')
    if (token && playerId && nickname) {
      set({ token, playerId, nickname })
    }
  },

  validateToken: async () => {
    const token = get().token
    if (!token) return false

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (!response.ok) {
        get().clearAuth()
        return false
      }
      
      return true
    } catch {
      get().clearAuth()
      return false
    }
  }
}))
