export const FACTION_CONFIG = {
  stalker: {
    name: 'Stalker',
    color: '#22c55e',
    icon: '🔰',
    description: 'Нейтрал'
  },
  bandit: {
    name: 'Bandit',
    color: '#ef4444',
    icon: '💀',
    description: 'Угроза'
  },
  mercenary: {
    name: 'Mercenary',
    color: '#3b82f6',
    icon: '💰',
    description: 'Контракты'
  },
  duty: {
    name: 'Duty',
    color: '#dc2626',
    icon: '🛡️',
    description: 'Контроль'
  },
  freedom: {
    name: 'Freedom',
    color: '#22d3ee',
    icon: '✊',
    description: 'Хаос'
  }
} as const

export type Faction = keyof typeof FACTION_CONFIG
