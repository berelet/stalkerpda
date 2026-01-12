import { NavLink } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'MAP', icon: '🗺️' },
  { path: '/inventory', label: 'INV', icon: '🎒' },
  { path: '/quests', label: 'QUESTS', icon: '🎯' },
  { path: '/profile', label: 'PROF', icon: '👤' },
]

export default function PDAFooter() {
  return (
    <footer className="bg-pda-case-dark border-t border-pda-primary/30">
      <nav className="flex items-center justify-around p-2">
        {navItems.map(({ path, label, icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors ${
                isActive
                  ? 'text-pda-phosphor text-glow'
                  : 'text-pda-text hover:text-pda-highlight'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            <span className="font-pixel">{label}</span>
          </NavLink>
        ))}
      </nav>
    </footer>
  )
}
