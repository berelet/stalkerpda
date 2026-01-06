import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { validateToken, logout } = useAuthStore()
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const location = useLocation()

  useEffect(() => {
    const check = async () => {
      const stored = localStorage.getItem('admin-auth')
      if (!stored) {
        logout()
        setIsValid(false)
        return
      }
      
      try {
        const data = JSON.parse(stored)
        if (!data.state?.token || !data.state?.isAuthenticated) {
          logout()
          setIsValid(false)
          return
        }
      } catch {
        logout()
        setIsValid(false)
        return
      }
      
      const valid = await validateToken()
      setIsValid(valid)
    }
    check()
  }, [location.pathname, validateToken, logout])

  if (isValid === null) return null
  if (!isValid) return <Navigate to="/login" replace />
  
  return <>{children}</>
}
