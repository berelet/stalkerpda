import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  validateToken: () => Promise<boolean>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        
        if (!response.ok) throw new Error('Login failed')
        
        const data = await response.json()
        
        // Check if user is GM
        if (!data.is_gm) {
          throw new Error('Not a GM')
        }
        
        set({ token: data.token, isAuthenticated: true })
      },
      logout: () => {
        set({ token: null, isAuthenticated: false })
      },
      validateToken: async () => {
        const token = get().token
        if (!token) {
          set({ isAuthenticated: false })
          return false
        }

        try {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          
          if (!response.ok) {
            set({ token: null, isAuthenticated: false })
            return false
          }

          const data = await response.json()
          if (!data.is_gm) {
            set({ token: null, isAuthenticated: false })
            return false
          }
          
          return true
        } catch {
          set({ token: null, isAuthenticated: false })
          return false
        }
      }
    }),
    {
      name: 'admin-auth',
    }
  )
)
