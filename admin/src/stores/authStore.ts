import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
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
    }),
    {
      name: 'admin-auth',
    }
  )
)
