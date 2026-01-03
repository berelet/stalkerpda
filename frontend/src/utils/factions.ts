export const FACTION_CONFIG = {
  stalker: {
    name: 'Stalker',
    color: '#4CAF50',
    icon: '●',
    description: 'Нейтрал'
  },
  bandit: {
    name: 'Bandit',
    color: '#C62828',
    icon: '▲',
    description: 'Угроза'
  },
  mercenary: {
    name: 'Mercenary',
    color: '#1565C0',
    icon: '■',
    description: 'Контракты'
  },
  duty: {
    name: 'Duty',
    color: '#F57C00',
    icon: '⬣',
    description: 'Контроль'
  },
  freedom: {
    name: 'Freedom',
    color: '#6A1B9A',
    icon: '✕',
    description: 'Хаос'
  }
} as const

export type Faction = keyof typeof FACTION_CONFIG
