import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/api/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (error) {
      // Always show success for security
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-screen-black flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* CRT Effects */}
          <div className="fixed inset-0 z-10 scanlines opacity-40 pointer-events-none"></div>
          <div className="fixed inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,10,0,0.4)_100%)] pointer-events-none"></div>

          <div className="relative z-20 bg-[#112211]/90 border-2 border-primary/30 rounded-lg p-8 box-glow">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 border border-primary/40 flex items-center justify-center rounded-lg bg-primary/5 box-glow">
                <span className="material-symbols-outlined text-5xl text-primary text-glow">mark_email_read</span>
              </div>
              
              <h2 className="text-primary text-2xl font-bold tracking-widest mb-4 uppercase text-glow-strong">
                :: TRANSMISSION_SENT ::
              </h2>
              
              <p className="text-primary/80 text-sm font-mono leading-relaxed mb-6">
                If your frequency exists in our database, we've transmitted recovery coordinates to it.
                <br /><br />
                Check your email for further instructions.
              </p>

              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-primary hover:text-white transition-colors text-sm font-mono"
              >
                <span className="material-symbols-outlined text-lg">arrow_back</span>
                Return to access terminal
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-screen-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* CRT Effects */}
        <div className="fixed inset-0 z-10 scanlines opacity-40 pointer-events-none"></div>
        <div className="fixed inset-0 z-10 bg-[radial-gradient(circle_at_center,transparent_60%,rgba(0,10,0,0.4)_100%)] pointer-events-none"></div>

        <div className="relative z-20">
          {/* Header */}
          <div className="flex items-center bg-[#112211]/90 p-4 pb-2 justify-between border-b border-primary/30 rounded-t-lg">
            <Link
              to="/login"
              className="text-primary hover:text-white transition-colors flex size-10 shrink-0 items-center justify-center active:scale-95"
            >
              <span className="material-symbols-outlined text-glow">arrow_back_ios_new</span>
            </Link>
            <div className="flex flex-col items-end">
              <h2 className="text-primary text-sm font-bold leading-tight tracking-[0.1em] text-glow">&gt; SYS_RECOVERY</h2>
              <span className="text-[10px] text-primary/60 tracking-widest font-mono">V.2.0.4_BETA</span>
            </div>
          </div>

          {/* Content */}
          <div className="bg-[#112211]/90 border-2 border-primary/30 border-t-0 rounded-b-lg p-8 box-glow">
            <div className="text-center mb-8">
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="w-full h-full border border-primary/40 flex items-center justify-center rounded-lg bg-primary/5 box-glow relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/50 animate-[ping_2s_linear_infinite] shadow-[0_0_10px_#13ec1a]"></div>
                  <span className="material-symbols-outlined text-5xl text-primary text-glow">lock_open</span>
                </div>
                <div className="absolute -bottom-3 -right-3 bg-black border border-primary px-1.5 py-0.5">
                  <span className="text-[10px] font-bold text-primary font-mono tracking-wider">ERR_403</span>
                </div>
              </div>

              <h2 className="text-white tracking-widest text-2xl font-bold leading-tight px-4 pb-2 uppercase text-glow-strong">
                :: IDENTITY_LOSS ::
              </h2>

              <div className="flex items-center gap-2 w-full max-w-[200px] mx-auto mb-6 opacity-70">
                <div className="h-[1px] bg-primary/50 flex-1"></div>
                <div className="text-primary/50 text-[10px] tracking-[0.2em] font-mono">RESTORE</div>
                <div className="h-[1px] bg-primary/50 flex-1"></div>
              </div>

              <p className="text-primary/80 text-sm font-normal leading-relaxed font-mono">
                // CRITICAL FAILURE.<br />
                Enter registered comms frequency to re-establish neural link.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline px-1">
                  <label className="text-primary text-xs font-bold tracking-widest uppercase">Target Frequency</label>
                  <span className="text-primary/40 text-[10px] font-mono animate-pulse">[ AWAITING_INPUT ]</span>
                </div>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/50 material-symbols-outlined text-lg">alternate_email</span>
                  <input
                    className="form-input flex w-full rounded-md text-white focus:outline-0 focus:ring-1 focus:ring-primary border-2 border-[#326734] bg-[#051005] focus:border-primary h-14 placeholder:text-[#326734] pl-12 pr-4 text-base font-mono tracking-wide transition-all shadow-inner uppercase"
                    placeholder="STALKER@PDA.NET"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary pointer-events-none"></div>
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary pointer-events-none"></div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative w-full cursor-pointer group overflow-hidden rounded-md h-14 bg-primary hover:bg-[#32ff39] active:bg-[#0eb814] transition-all duration-200 shadow-[0_0_20px_rgba(19,236,26,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="relative z-10 flex items-center justify-center gap-3 h-full px-5 text-background-dark font-bold text-lg tracking-[0.1em] uppercase">
                  <span className="material-symbols-outlined animate-pulse-fast">
                    {loading ? 'sync' : 'wifi_tethering'}
                  </span>
                  <span>{loading ? '[ TRANSMITTING... ]' : '[ TRANSMIT ]'}</span>
                </div>
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xIDFoMXYxSDF6IiBmaWxsPSIjMDAwMDAwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')] opacity-30 pointer-events-none"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="bg-[#0d1a0d] border-2 border-t-0 border-[#326734] rounded-b-lg p-3 flex justify-center items-center text-[10px] font-mono text-primary/60 uppercase">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">satellite_alt</span>
              <span>SYSTEM RECOVERY MODE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
