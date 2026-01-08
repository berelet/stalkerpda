import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { checkAuth, logout } = useAuthStore()
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const location = useLocation()

  useEffect(() => {
    const check = async () => {
      const valid = await checkAuth()
      setIsValid(valid)
      if (!valid) {
        logout()
      }
    }
    check()
  }, [location.pathname, checkAuth, logout])

  if (isValid === null) return null
  if (!isValid) return <Navigate to="/login" replace />
  
  return <>{children}</>
}
