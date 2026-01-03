import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError('Invalid credentials or not a GM')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-admin-bg">
      <div className="bg-admin-surface p-8 rounded-lg shadow-xl w-full max-w-md border border-admin-border">
        <h1 className="text-3xl font-bold mb-6 text-center text-admin-primary">
          PDA Zone Admin
        </h1>
        
        {error && (
          <div className="bg-admin-danger/20 border border-admin-danger text-admin-danger px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-admin-bg border border-admin-border rounded focus:outline-none focus:border-admin-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-admin-bg border border-admin-border rounded focus:outline-none focus:border-admin-primary"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-admin-primary hover:bg-blue-600 text-white font-bold py-2 px-4 rounded transition"
          >
            Login as GM
          </button>
        </form>
      </div>
    </div>
  )
}
