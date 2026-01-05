import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { api } from '../services/api'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegister, setIsRegister] = useState(false)
  const [nickname, setNickname] = useState('')
  const [faction, setFaction] = useState<string>('stalker')
  const { setAuth } = useAuthStore()

  const factions = [
    { value: 'stalker', label: 'Stalker' },
    { value: 'loner', label: 'Loner' },
    { value: 'duty', label: 'Duty' },
    { value: 'freedom', label: 'Freedom' },
    { value: 'bandit', label: 'Bandit' },
    { value: 'mercenary', label: 'Mercenary' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const payload = isRegister 
        ? { email, password, nickname, faction }
        : { email, password }
      
      console.log('Sending request to:', endpoint, payload)
      const { data } = await api.post(endpoint, payload)
      console.log('Response:', data)
      setAuth(data.token, data.id, data.nickname)
    } catch (err: any) {
      console.error('Error:', err.response || err)
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || (isRegister ? 'Registration failed' : 'Login failed')
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-pda-bg p-4">
      <div className="fixed inset-0 scanlines pointer-events-none z-50" />
      <div className="fixed inset-0 crt-overlay pointer-events-none z-40" />
      
      <div className="w-full max-w-md bg-pda-case shadow-case-inset p-6 relative z-10">
        <div className="bg-pda-screen-bg shadow-crt p-6">
          <h1 className="text-2xl font-pixel text-pda-phosphor text-glow mb-2 text-center">
            S.T.A.L.K.E.R. PDA
          </h1>
          <p className="text-pda-text text-xs text-center mb-6">
            {isRegister ? 'NEW STALKER REGISTRATION' : 'ENTER THE ZONE'}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-pda-text text-sm mb-1">NICKNAME</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-pda-bg border border-pda-primary/30 text-pda-highlight px-3 py-2 focus:outline-none focus:border-pda-phosphor"
                  required
                  minLength={3}
                  maxLength={20}
                />
              </div>
            )}

            <div>
              <label className="block text-pda-text text-sm mb-1">EMAIL</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-pda-bg border border-pda-primary/30 text-pda-highlight px-3 py-2 focus:outline-none focus:border-pda-phosphor"
                required
              />
            </div>
            
            <div>
              <label className="block text-pda-text text-sm mb-1">PASSWORD</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-pda-bg border border-pda-primary/30 text-pda-highlight px-3 py-2 focus:outline-none focus:border-pda-phosphor"
                required
                minLength={6}
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-pda-text text-sm mb-1">FACTION</label>
                <select
                  value={faction}
                  onChange={(e) => setFaction(e.target.value)}
                  className="w-full bg-pda-bg border border-pda-primary/30 text-pda-highlight px-3 py-2 focus:outline-none focus:border-pda-phosphor"
                >
                  {factions.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            )}
            
            {error && (
              <div className="text-pda-danger text-sm border border-pda-danger/30 p-2">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-pda-primary hover:bg-pda-highlight text-pda-bg font-pixel text-lg py-2 transition-colors disabled:opacity-50"
            >
              {loading ? 'CONNECTING...' : (isRegister ? 'REGISTER' : 'LOGIN')}
            </button>

            {!isRegister && (
              <div className="text-center">
                <Link
                  to="/forgot-password"
                  className="text-pda-text hover:text-pda-highlight text-sm transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister)
                setError('')
              }}
              className="w-full text-pda-text hover:text-pda-highlight text-sm transition-colors"
            >
              {isRegister ? '← Already have account?' : 'No account? Register →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
