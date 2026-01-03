import { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAuthStore((state) => state.logout)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const menuItems = [
    { path: '/', icon: 'dashboard', label: 'Dashboard' },
    { path: '/players', icon: 'group', label: 'Players' },
    { path: '/artifacts', icon: 'auto_awesome', label: 'Artifact Library' },
    { path: '/spawn-artifacts', icon: 'add_location', label: 'Spawn Artifacts' },
    { path: '/zones', icon: 'location_on', label: 'Zones' },
    { path: '/contracts', icon: 'description', label: 'Contracts' },
  ]

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#101b22]">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 flex-shrink-0 flex flex-col border-r border-[#233948] bg-[#111b22] transition-all z-30">
        {/* User Profile */}
        <div className="p-4 border-b border-[#233948] flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="bg-[#233948] rounded-full size-10 border-2 border-[#233948] flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl">person</span>
            </div>
            <div className="absolute bottom-0 right-0 size-3 bg-[#22c55e] rounded-full border-2 border-[#111b22]" />
          </div>
          <div className="hidden lg:flex flex-col overflow-hidden">
            <h1 className="text-white text-sm font-bold leading-tight truncate">GAME MASTER</h1>
            <p className="text-[#91b3ca] text-xs font-normal leading-normal truncate">Zone Control</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-primary/20 text-primary'
                    : 'text-[#91b3ca] hover:bg-[#233948] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="hidden lg:block text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-2 border-t border-[#233948]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-[#91b3ca] hover:bg-[#233948] hover:text-white transition-colors group"
          >
            <span className="material-symbols-outlined group-hover:scale-110 transition-transform">
              logout
            </span>
            <span className="hidden lg:block text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto custom-scrollbar">
        {children}
      </main>
    </div>
  )
}
