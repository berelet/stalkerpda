import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      navigate('/forgot-password');
    } else {
      setToken(tokenParam);
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reset link is invalid or expired');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-screen-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="fixed inset-0 z-10 scanlines opacity-40 pointer-events-none"></div>
          <div className="fixed inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,10,0,0.4)_100%)] pointer-events-none"></div>

          <div className="relative z-20 bg-[#112211]/90 border-2 border-primary/30 rounded-lg p-8 box-glow">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 border border-primary flex items-center justify-center rounded-lg bg-primary/20 shadow-glow">
                <span className="material-symbols-outlined text-5xl text-primary">check_circle</span>
              </div>

              <h2 className="text-primary text-2xl font-bold tracking-widest mb-4 uppercase text-glow-strong">
                PROTOCOL UPDATED
              </h2>

              <p className="text-primary/80 text-sm font-mono leading-relaxed mb-6">
                Security credentials synchronized.
                <br /><br />
                Redirecting to access terminal...
              </p>

              <div className="flex items-center justify-center gap-2 text-primary/60 text-xs font-mono">
                <span className="animate-pulse">_</span>
                <span>INITIALIZING</span>
                <span className="animate-pulse">_</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-screen-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="fixed inset-0 z-10 scanlines opacity-40 pointer-events-none"></div>
        <div className="fixed inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,10,0,0.4)_100%)] pointer-events-none"></div>

        <div className="relative z-20">
          {/* Header */}
          <div className="flex justify-between items-center px-5 pt-3 pb-2 border-b border-primary/20 bg-primary/5 rounded-t-lg">
            <p className="text-primary/70 text-xs font-medium tracking-widest font-mono">NET_VER: 1.0.4 [OFFLINE MODE]</p>
            <span className="material-symbols-outlined text-alert text-base animate-pulse">wifi_off</span>
          </div>

          {/* Content */}
          <div className="bg-screen-bg border-2 border-primary/30 border-t-0 p-8 box-glow">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-primary/10 border border-primary/30 shadow-glow">
                <span className="material-symbols-outlined text-primary text-3xl">lock_reset</span>
              </div>

              <h2 className="text-primary text-2xl tracking-widest font-bold leading-tight uppercase text-glow animate-flicker mb-4">
                &gt; SYSTEM RECOVERY // RESET_PWD
              </h2>

              <p className="text-primary/80 text-sm font-normal leading-relaxed font-mono">
                SECURITY OVERRIDE DETECTED.<br />
                Input new security key to re-establish network link functionality.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* New Password */}
              <div className="flex flex-col gap-1">
                <label className="text-primary text-xs font-bold tracking-wider pl-1 uppercase flex items-center gap-2">
                  <span className="w-1 h-1 bg-primary rounded-full"></span>
                  ENTER_NEW_CODE
                </label>
                <div className="relative flex items-center">
                  <input
                    className="w-full bg-[#0c1f0c] border-2 border-primary/40 focus:border-primary text-primary placeholder:text-primary/30 h-14 px-4 rounded-lg outline-none ring-0 focus:ring-0 focus:shadow-glow transition-all duration-200 font-mono tracking-widest text-lg"
                    placeholder="_ _ _ _ _ _"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <div className="absolute right-4 text-primary/50 pointer-events-none">
                    <span className="material-symbols-outlined text-sm">key</span>
                  </div>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1">
                <label className="text-primary text-xs font-bold tracking-wider pl-1 uppercase flex items-center gap-2">
                  <span className="w-1 h-1 bg-primary rounded-full"></span>
                  CONFIRM_CODE
                </label>
                <div className="relative flex items-center">
                  <input
                    className="w-full bg-[#0c1f0c] border-2 border-primary/40 focus:border-primary text-primary placeholder:text-primary/30 h-14 px-4 rounded-lg outline-none ring-0 focus:ring-0 focus:shadow-glow transition-all duration-200 font-mono tracking-widest text-lg"
                    placeholder="_ _ _ _ _ _"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <div className="absolute right-4 text-primary/50 pointer-events-none">
                    <span className="material-symbols-outlined text-sm">lock</span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="w-full bg-red-900/20 border-2 border-red-600 p-3 rounded flex items-start gap-3">
                  <span className="material-symbols-outlined text-red-500 text-lg mt-0.5">warning</span>
                  <div className="flex flex-col">
                    <span className="text-red-500 text-xs font-bold tracking-wider uppercase">&gt;&gt; ERR: CHECKSUM INVALID</span>
                    <span className="text-red-400 text-[10px] font-mono">{error}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full h-14 mt-4 bg-primary/10 hover:bg-primary/20 active:bg-primary/30 border border-primary text-primary font-bold uppercase tracking-[0.2em] rounded transition-all duration-200 flex items-center justify-center overflow-hidden shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                <span className="relative z-10 flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">
                    {loading ? 'sync' : 'terminal'}
                  </span>
                  {loading ? 'PATCHING...' : 'INITIALIZE PATCH'}
                </span>
                <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary"></div>
              </button>
            </form>

            {/* Footer */}
            <div className="mt-12 pt-8 flex flex-col items-center gap-2 opacity-60">
              <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
              <div className="flex justify-between w-full max-w-[280px]">
                <span className="text-[10px] text-primary font-mono">MEM: 64KB OK</span>
                <span className="text-[10px] text-primary font-mono">ZONE.NET // LOST</span>
              </div>
              <Link
                to="/forgot-password"
                className="text-[10px] text-primary/40 hover:text-primary/60 uppercase tracking-widest transition-colors"
              >
                Request new link
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
