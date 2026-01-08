import { useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      console.error('Login error:', err)
      setError('Invalid credentials or not a GM')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#221b10] overflow-hidden">
      {/* Background & Overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2670')] bg-cover bg-center opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#221b10] via-[#221b10]/80 to-[#221b10]/90" />
        {/* Scanline effect */}
        <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
          background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))',
          backgroundSize: '100% 4px'
        }} />
      </div>

      {/* Top Left Decoration */}
      <div className="absolute top-6 left-6 z-10 hidden md:flex flex-col gap-1 opacity-60">
        <div className="flex items-center gap-2 text-[#f2a736] text-xs tracking-[0.2em] font-bold">
          <span className="material-symbols-outlined text-[16px]">wifi</span>
          UPLINK_ESTABLISHED
        </div>
        <div className="h-[1px] w-24 bg-[#675232]" />
        <p className="text-[10px] text-[#cab391]">LATENCY: 24ms</p>
      </div>

      {/* Top Right Decoration */}
      <div className="absolute top-6 right-6 z-10 hidden md:flex flex-col items-end gap-1 opacity-60">
        <div className="flex items-center gap-2 text-[#f2a736] text-xs tracking-[0.2em] font-bold">
          SYS_VER 2.4.1
          <span className="material-symbols-outlined text-[16px]">verified_user</span>
        </div>
        <div className="h-[1px] w-24 bg-[#675232]" />
        <p className="text-[10px] text-[#cab391]">SECURE CONNECTION</p>
      </div>

      {/* Main Card */}
      <div className="relative z-20 w-full max-w-[480px] flex flex-col backdrop-blur-sm bg-[#2d2418]/80 border border-[#675232] rounded-xl shadow-2xl overflow-hidden">
        {/* Top Warning Stripe */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#f2a736] to-transparent opacity-80" />
        
        <div className="p-8 md:p-10 flex flex-col gap-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 h-16 w-16 rounded-full bg-[#f2a736]/10 border border-[#f2a736] flex items-center justify-center relative group">
              <div className="absolute inset-0 rounded-full border border-[#f2a736] opacity-50 animate-ping" />
              <span className="material-symbols-outlined text-[#f2a736] text-[32px]">radar</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-1">PDA ZONE</h1>
            <div className="flex items-center gap-2">
              <div className="h-[1px] w-8 bg-[#f2a736]" />
              <h2 className="text-sm font-bold tracking-[0.2em] text-[#f2a736] uppercase">Game Master Access</h2>
              <div className="h-[1px] w-8 bg-[#f2a736]" />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 mt-4">
            {/* Email Field */}
            <label className="flex flex-col gap-2">
              <span className="text-[#cab391] text-xs font-bold uppercase tracking-wider ml-1">Operator ID</span>
              <div className="relative flex w-full items-stretch rounded-lg group">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="peer flex-1 bg-[#342919] border border-[#675232] text-white placeholder-[#cab391]/50 text-base rounded-l-lg h-14 px-4 focus:outline-none focus:border-[#f2a736] focus:ring-1 focus:ring-[#f2a736] transition-colors"
                  placeholder="Enter callsign..."
                  required
                />
                <div className="flex items-center justify-center px-4 bg-[#342919] border-y border-r border-[#675232] rounded-r-lg text-[#cab391] peer-focus:border-[#f2a736] peer-focus:text-[#f2a736] transition-colors">
                  <span className="material-symbols-outlined">badge</span>
                </div>
              </div>
            </label>

            {/* Password Field */}
            <label className="flex flex-col gap-2">
              <span className="text-[#cab391] text-xs font-bold uppercase tracking-wider ml-1">Passcode</span>
              <div className="relative flex w-full items-stretch rounded-lg group">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="peer flex-1 bg-[#342919] border border-[#675232] text-white placeholder-[#cab391]/50 text-base rounded-l-lg h-14 px-4 focus:outline-none focus:border-[#f2a736] focus:ring-1 focus:ring-[#f2a736] transition-colors"
                  placeholder="Enter secure key..."
                  required
                />
                <div className="flex items-center justify-center px-4 bg-[#342919] border-y border-r border-[#675232] rounded-r-lg text-[#cab391] peer-focus:border-[#f2a736] peer-focus:text-[#f2a736] transition-colors">
                  <span className="material-symbols-outlined">lock</span>
                </div>
              </div>
            </label>

            {/* Actions Row */}
            <div className="flex flex-row items-center justify-between pt-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="peer appearance-none h-5 w-5 border-2 border-[#675232] rounded bg-transparent checked:bg-[#f2a736] checked:border-[#f2a736] focus:ring-0 focus:ring-offset-0 transition-all cursor-pointer"
                  />
                  <span className="material-symbols-outlined absolute text-[#221b10] pointer-events-none opacity-0 peer-checked:opacity-100 text-sm left-[2px] top-[2px]">check</span>
                </div>
                <span className="text-sm text-[#cab391] group-hover:text-white transition-colors select-none">Keep connection active</span>
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full h-14 bg-[#f2a736] hover:bg-[#ffb649] active:bg-[#d99026] disabled:bg-[#675232] disabled:cursor-not-allowed text-[#221b10] text-lg font-bold tracking-wide rounded-lg shadow-[0_0_15px_rgba(242,167,54,0.3)] hover:shadow-[0_0_25px_rgba(242,167,54,0.5)] transition-all flex items-center justify-center gap-2 group"
            >
              <span>{loading ? 'CONNECTING...' : 'INITIALIZE UPLINK'}</span>
              <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">login</span>
            </button>
          </form>
        </div>

        {/* Card Footer */}
        <div className="bg-[#1f1810] px-8 py-3 border-t border-[#675232] flex justify-between items-center text-[10px] text-[#cab391] uppercase tracking-wider">
          <span>ZONE_ID: Pripyat-04</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Online
          </span>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="absolute bottom-6 text-center z-10 opacity-40 hover:opacity-80 transition-opacity">
        <p className="text-[10px] text-[#cab391] uppercase tracking-[0.3em]">Restricted Access Area // Authorized Personnel Only</p>
      </div>
    </div>
  )
}
