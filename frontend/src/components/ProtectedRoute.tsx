import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { getCookie } from '../utils/cookies'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { validateToken, clearAuth } = useAuthStore()
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const location = useLocation()

  useEffect(() => {
    const check = async () => {
      const token = getCookie('pda_token')
      if (!token) {
        clearAuth()
        setIsValid(false)
        return
      }
      const valid = await validateToken()
      setIsValid(valid)
    }
    check()
  }, [location.pathname, validateToken, clearAuth])

  if (isValid === null) return null
  if (!isValid) return <Navigate to="/login" replace />
  
  return <>{children}</>
}
