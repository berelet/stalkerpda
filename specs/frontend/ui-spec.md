# Frontend Specification v1.0

Based on Game Mechanics, Database Schema, and API Specification

**Framework:** React 18 + TypeScript + Vite  
**Styling:** TailwindCSS  
**State:** Zustand  
**Routing:** React Router  
**Maps:** Leaflet + OpenStreetMap  
**UI Theme:** S.T.A.L.K.E.R. PDA (green monochrome, scanlines, glitch effects)

---

## Design System

### Color Palette
```css
--pda-green: #00ff41;
--pda-green-dark: #00cc33;
--pda-green-dim: #008822;
--pda-bg: #0a0e0a;
--pda-bg-light: #1a1e1a;
--pda-border: #00ff4133;
--pda-text: #00ff41;
--pda-text-dim: #00cc33aa;
--pda-danger: #ff4444;
--pda-warning: #ffaa00;
```

### Typography
- **Font:** Monospace (Courier New, Consolas)
- **Sizes:** 12px (small), 14px (body), 16px (heading), 20px (title)
- **Effects:** Text shadow, scanline overlay

### UI Effects
- **Scanlines:** Horizontal lines overlay
- **CRT Curvature:** Subtle screen curve
- **Glitch:** Random flicker on state changes
- **Noise:** Static background texture
- **Beep sounds:** On button clicks

---

## Component Hierarchy

```
App
├── AuthLayout
│   ├── LoginScreen
│   └── RegisterScreen
│
└── GameLayout (authenticated)
    ├── Header
    │   ├── PlayerStatus (lives, radiation, balance)
    │   └── ConnectionIndicator
    │
    ├── Navigation (bottom tabs)
    │   ├── MapTab
    │   ├── InventoryTab
    │   ├── ContractsTab
    │   ├── ShopTab
    │   └── ProfileTab
    │
    └── Content
        ├── MapView
        │   ├── PlayerMarker
        │   ├── ArtifactMarkers
        │   ├── ZoneOverlays (radiation, control)
        │   ├── OtherPlayersMarkers (GM only)
        │   └── ActionButtons (scan, extract, capture)
        │
        ├── InventoryView
        │   ├── ArtifactsList
        │   ├── EquipmentList (armor, rings)
        │   ├── ConsumablesList
        │   └── QRCodeDisplay
        │
        ├── ContractsView
        │   ├── AvailableContracts
        │   ├── MyContracts
        │   ├── ContractDetails
        │   └── CreateContractForm
        │
        ├── ShopView
        │   ├── ShopInventory
        │   ├── PurchaseQRScanner
        │   └── TransactionHistory
        │
        ├── ProfileView
        │   ├── PlayerStats
        │   ├── ReputationBar
        │   └── Settings
        │
        └── AdminView (GM only)
            ├── LiveMap (all players)
            ├── SpawnArtifactForm
            ├── CreateZoneForm
            ├── BroadcastForm
            └── PlayerList
```

---

## Screens & Components

### 1. Authentication

#### LoginScreen
```typescript
interface LoginScreenProps {}

// Features:
- Email input
- Password input
- Login button
- Link to register
- PDA-styled form with scanlines
```

#### RegisterScreen
```typescript
interface RegisterScreenProps {}

// Features:
- Nickname input (unique)
- Email input
- Password input
- Faction selector (dropdown)
- Register button
- Link to login
```

---

### 2. Header

#### PlayerStatus
```typescript
interface PlayerStatusProps {
  lives: number;
  maxLives: number;
  radiation: number;
  balance: number;
  reputation: number;
}

// Display:
- Lives: ❤️ 3/4
- Radiation: ☢️ 45/100 (color: green<50, yellow<80, red>=80)
- Balance: 💰 10,250
- Reputation: ⭐ +25
```

#### ConnectionIndicator
```typescript
interface ConnectionIndicatorProps {
  isOnline: boolean;
  lastUpdate: Date;
}

// Display:
- Green dot: Online
- Red dot: Offline
- Last update: "2s ago"
```

---

### 3. MapView

#### Map Component
```typescript
interface MapViewProps {
  playerLocation: { lat: number; lng: number };
  artifacts: Artifact[];
  radiationZones: RadiationZone[];
  controlPoints: ControlPoint[];
  otherPlayers?: Player[];  // GM only
}

// Features:
- Leaflet map with OSM tiles (dark theme)
- Player marker (center, blue dot)
- Artifact markers (15m radius, pulsing)
- Radiation zones (red circles with opacity)
- Control points (flags with faction colors)
- Other players (GM: colored dots by faction)
- Zoom controls
- Recenter button
```

#### ArtifactMarker
```typescript
interface ArtifactMarkerProps {
  artifact: Artifact;
  distance: number;
  onExtract: () => void;
}

// Display:
- Icon: 💎 (color by rarity)
- Distance: "12.3m"
- Click: Show details + Extract button
```

#### ActionButtons (Floating)
```typescript
interface ActionButtonsProps {
  nearbyArtifact?: Artifact;
  nearbyControlPoint?: ControlPoint;
  isExtracting: boolean;
  isCapturing: boolean;
  extractProgress: number;  // 0-100
  captureProgress: number;  // 0-100
}

// Buttons:
- Extract Artifact (hold 30s) - shows progress ring
- Capture Point (hold 30s) - shows progress ring
- Cancel action
```

---

### 4. InventoryView

#### ArtifactsList
```typescript
interface ArtifactsListProps {
  artifacts: Artifact[];
  onDrop: (id: string) => void;
}

// Display:
- Grid of artifact cards
- Name, rarity (color-coded)
- Effects (icons + text)
- Value
- Drop button (confirmation modal)
```

#### EquipmentList
```typescript
interface EquipmentListProps {
  armor?: Equipment;
  rings: Equipment[];
  totalRadiationResist: number;
}

// Display:
- Armor slot (visual slot)
- 3 ring slots (visual slots)
- Total radiation resist: 50%
- Bonus wounds: +3
```

#### ConsumablesList
```typescript
interface ConsumablesListProps {
  consumables: Consumable[];
  currentRadiation: number;
  onUse: (id: string) => void;
}

// Display:
- List of consumables
- Quantity
- Effect (e.g., "Removes 50% radiation")
- Use button
- Confirmation: "Remove 40 radiation? (80 → 40)"
```

#### QRCodeDisplay
```typescript
interface QRCodeDisplayProps {
  qrCode: string;
  nickname: string;
}

// Display:
- Large QR code (for looting)
- Player nickname
- Warning: "Show this to looters only when dead"
```

---

### 5. ContractsView

#### AvailableContracts
```typescript
interface AvailableContractsProps {
  contracts: Contract[];
  onAccept: (id: string) => void;
}

// Display:
- List of contracts
- Type icon + title
- Reward (💰)
- Faction restriction badge
- Expires in: "2h 30m"
- Accept button
```

#### MyContracts
```typescript
interface MyContractsProps {
  activeContracts: Contract[];
  completedContracts: Contract[];
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
}

// Display:
- Tabs: Active / Completed
- Contract cards with progress
- Complete button (with proof input)
- Cancel button
```

#### ContractDetails
```typescript
interface ContractDetailsProps {
  contract: Contract;
}

// Display:
- Full description
- Objective details
- Target info (if applicable)
- Map marker (if location-based)
- Status
- Reward
```

#### CreateContractForm
```typescript
interface CreateContractFormProps {
  onSubmit: (data: ContractData) => void;
}

// Fields:
- Type selector
- Title
- Description
- Reward (with balance check)
- Type-specific fields:
  - Elimination: Target player selector
  - Escort: Destination picker (map)
  - Delivery: From/To players, item
  - Artifact: Artifact type
  - Zone Control: Zone selector, duration
- Expiry time
- Submit (with escrow warning)
```

---

### 6. ShopView

#### ShopInventory
```typescript
interface ShopInventoryProps {
  items: ShopItem[];
  playerBalance: number;
  playerReputation: number;
}

// Display:
- Grid of items
- Name, description
- Base price (strikethrough if reputation discount)
- Your price (with reputation)
- Stock count
- Category badges
- Add to cart button
```

#### PurchaseQRScanner
```typescript
interface PurchaseQRScannerProps {
  onScan: (qrCode: string) => void;
}

// Features:
- Camera view (or file upload)
- QR code scanner
- Manual code input
- Scan result: Show items + total
- Confirm purchase button
```

#### TransactionHistory
```typescript
interface TransactionHistoryProps {
  transactions: Transaction[];
}

// Display:
- List of past purchases
- Date, items, amount
- Bartender name
```

---

### 7. ProfileView

#### PlayerStats
```typescript
interface PlayerStatsProps {
  player: Player;
}

// Display:
- Nickname, faction badge
- Lives: 3/4
- Balance: 💰 10,250
- Reputation: ⭐ +25
- Stats:
  - Kills: 5
  - Deaths: 2
  - K/D: 2.5
  - Artifacts found: 12
  - Contracts completed: 8
```

#### ReputationBar
```typescript
interface ReputationBarProps {
  reputation: number;  // -100 to +100
}

// Display:
- Progress bar (-100 to +100)
- Current value
- Price modifier: "-15% prices"
```

#### Settings
```typescript
interface SettingsProps {}

// Options:
- Sound effects: On/Off
- Location update interval: 10s/20s/30s
- Map theme: Dark/Light
- Logout button
```

---

### 8. AdminView (GM Only)

#### LiveMap
```typescript
interface LiveMapProps {
  players: Player[];
  onPlayerClick: (id: string) => void;
}

// Features:
- Map with all players
- Color-coded by faction
- Click player: Show details + history
- Real-time updates via WebSocket
- Filter by faction
- Search by nickname
```

#### SpawnArtifactForm
```typescript
interface SpawnArtifactFormProps {
  artifactTypes: ArtifactType[];
  onSpawn: (typeId: string, lat: number, lng: number) => void;
}

// Features:
- Artifact type selector
- Map picker for location
- Or manual lat/lng input
- Spawn button
```

#### CreateZoneForm
```typescript
interface CreateZoneFormProps {
  onCreateRadiation: (data: RadiationZoneData) => void;
  onCreateControl: (data: ControlPointData) => void;
}

// Tabs: Radiation Zone / Control Point

// Radiation Zone:
- Name
- Center (map picker)
- Radius (slider)
- Radiation level (10-100)

// Control Point:
- Name
- Location (map picker)
```

#### BroadcastForm
```typescript
interface BroadcastFormProps {
  players: Player[];
  onSend: (message: string, targetId?: string) => void;
}

// Features:
- Message input
- Target: All / Specific player
- Send button
```

#### PlayerList
```typescript
interface PlayerListProps {
  players: Player[];
  onViewHistory: (id: string) => void;
}

// Display:
- Table of players
- Nickname, faction, status
- Lives, radiation
- Last seen
- Actions: View on map, View history
```

---

## State Management (Zustand)

### Auth Store
```typescript
interface AuthStore {
  user: Player | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
```

### Location Store
```typescript
interface LocationStore {
  currentLocation: Location | null;
  nearbyArtifacts: Artifact[];
  currentZones: {
    radiationZones: RadiationZone[];
    controlPoints: ControlPoint[];
  };
  updateLocation: (lat: number, lng: number) => Promise<void>;
  startTracking: () => void;
  stopTracking: () => void;
}
```

### Inventory Store
```typescript
interface InventoryStore {
  artifacts: Artifact[];
  equipment: {
    armor?: Equipment;
    rings: Equipment[];
    consumables: Consumable[];
  };
  fetchInventory: () => Promise<void>;
  dropArtifact: (id: string) => Promise<void>;
  useConsumable: (id: string) => Promise<void>;
}
```

### Contracts Store
```typescript
interface ContractsStore {
  availableContracts: Contract[];
  myContracts: Contract[];
  fetchContracts: () => Promise<void>;
  acceptContract: (id: string) => Promise<void>;
  completeContract: (id: string, proof?: string) => Promise<void>;
  confirmContract: (id: string) => Promise<void>;
  cancelContract: (id: string) => Promise<void>;
  createContract: (data: ContractData) => Promise<void>;
}
```

### Shop Store
```typescript
interface ShopStore {
  inventory: ShopItem[];
  fetchInventory: (bartenderId?: string) => Promise<void>;
  scanPurchaseQR: (qrCode: string) => Promise<void>;
}
```

### WebSocket Store
```typescript
interface WebSocketStore {
  isConnected: boolean;
  connect: (token: string) => void;
  disconnect: () => void;
  on: (event: string, handler: Function) => void;
  off: (event: string, handler: Function) => void;
}
```

---

## Routing

```typescript
const routes = [
  {
    path: '/login',
    component: LoginScreen,
    public: true
  },
  {
    path: '/register',
    component: RegisterScreen,
    public: true
  },
  {
    path: '/',
    component: GameLayout,
    protected: true,
    children: [
      { path: '/map', component: MapView },
      { path: '/inventory', component: InventoryView },
      { path: '/contracts', component: ContractsView },
      { path: '/contracts/:id', component: ContractDetails },
      { path: '/shop', component: ShopView },
      { path: '/profile', component: ProfileView },
      { path: '/admin', component: AdminView, gmOnly: true }
    ]
  }
];
```

---

## Key Features

### Hold Button Component
```typescript
interface HoldButtonProps {
  duration: number;  // milliseconds
  onComplete: () => void;
  onCancel: () => void;
  label: string;
}

// Features:
- Press and hold for X seconds
- Progress ring animation
- Release = cancel
- Haptic feedback (mobile)
- Sound effect on complete
```

### QR Scanner Component
```typescript
interface QRScannerProps {
  onScan: (code: string) => void;
  onError: (error: string) => void;
}

// Features:
- Camera access
- QR code detection
- Manual input fallback
- Scan history
```

### Notification System
```typescript
interface NotificationProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

// Features:
- Toast notifications
- PDA-styled
- Auto-dismiss
- Sound effects
```

---

## Responsive Design

### Mobile First (320px - 768px)
- Single column layout
- Bottom navigation tabs
- Full-screen map
- Swipe gestures
- Touch-optimized buttons

### Tablet (768px - 1024px)
- Two column layout
- Side navigation
- Split view (map + details)

### Desktop (1024px+)
- Multi-column layout
- Sidebar navigation
- Dashboard view
- Keyboard shortcuts

---

## Performance Optimizations

1. **Lazy Loading:** Route-based code splitting
2. **Memoization:** React.memo for expensive components
3. **Virtual Lists:** For long lists (contracts, transactions)
4. **Debouncing:** Location updates, search inputs
5. **Image Optimization:** WebP format, lazy loading
6. **Service Worker:** Offline support, cache API responses

---

## Accessibility

- **Keyboard Navigation:** All interactive elements
- **Screen Reader:** ARIA labels
- **Color Contrast:** WCAG AA compliant (even with green theme)
- **Focus Indicators:** Visible focus states
- **Alt Text:** All images and icons

---

## PWA Features

- **Manifest:** App icon, splash screen
- **Service Worker:** Offline mode
- **Install Prompt:** Add to home screen
- **Push Notifications:** Contract updates, broadcasts
- **Background Sync:** Queue location updates when offline

---

## Testing Strategy

### Unit Tests
- Components (Jest + React Testing Library)
- Stores (Zustand)
- Utilities

### Integration Tests
- User flows (login, accept contract, extract artifact)
- API integration

### E2E Tests
- Critical paths (Playwright)
- Mobile scenarios

---

## Next Steps

1. ✅ Game mechanics defined
2. ✅ Database schema designed
3. ✅ API specification complete
4. ✅ Frontend specification complete
5. ⏭️ Implementation
   - Backend Lambda handlers
   - Database migrations
   - Frontend components
