# Game Mechanics Specification v1.0 - FINAL

## Game Format

- **Session Duration:** 6-8 hours per game
- **Players:** 10-20 (scalable to 50)
- **Persistence:** Balance, equipment, reputation saved between games
- **Lives:** Reset to default (4) at start of each game
- **Territory:** Park/abandoned area/forest (limited area)
- **Language:** All UI in English

---

## 1. Player System

### 1.1 Player States
- **alive** - Active player, can perform all actions
- **wounded** - Can self-heal with bandages or be healed by others (not tracked in PDA in MVP)
- **dead** - Must go to spawn, loses 1 life, 15 min respawn timer (physical, not tracked)
- **out of lives** - Can only stay at bar, no zone activities (trade, quests, artifacts, looting disabled)

### 1.2 Factions
- **stalker** - Independent explorers
- **bandit** - Hostile faction
- **mercenary** - Hired guns (special contracts available)
- **duty** - Military faction
- **freedom** - Anarchist faction
- **loner** - Solo faction (artifact-focused contracts)

**Faction Mechanics:**
- Different contract types available per faction
- Faction relations not regulated by PDA (physical gameplay)
- Loners can capture control points
- Control points contested between two factions

### 1.3 Player Attributes
```typescript
interface Player {
  id: string;
  nickname: string;
  faction: Faction;
  status: PlayerStatus;
  balance: number;              // Persists between games
  reputation: number;           // -100 to +100, affects prices
  lives: number;                // Default 4, resets each game
  currentLives: number;         // Current lives in session
  radiation: number;            // 0-100, resets on death, not saved between games
  qrCode: string;               // For looting
  location: {
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: Date;
  };
  inventory: {
    artifacts: Artifact[];
    equipment: Equipment[];
    consumables: Consumable[];
  };
  stats: {
    kills: number;
    deaths: number;
    artifactsFound: number;
    contractsCompleted: number;
  };
}
```

### 1.4 Lives System
- **Default:** 4 lives per game
- **Artifacts can increase lives** (bonus lives for current game only)
- **Death triggers:**
  - Killed by another player
  - Radiation reaches 100%
- **On death:**
  1. Can be looted once (QR scan)
  2. Player goes to spawn (physical, 15 min)
  3. Marks death in PDA
  4. Loses 1 life
  5. All remaining artifacts lost (not looted = gone forever)
  6. Radiation reset to 0
  7. Each equipment item has 1-20% chance to be lost forever
  8. Respawns with remaining lives

---

## 2. Artifact System

### 2.1 Artifact States
- **hidden** - Placed by GM or random spawn
- **visible** - Within 15m of player (shows exact location)
- **extracting** - Player holding pickup button (30 sec)
- **extracted** - In player's inventory
- **lost** - Dropped/destroyed, removed from game

### 2.2 Artifact Rarity & Effects
```typescript
interface Artifact {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  value: number;
  effects: {
    bonusLives?: number;
    radiationResist?: number;  // %
    otherBonuses?: any;
    negativeEffects?: any;
  };
  location: {
    lat: number;
    lng: number;
  };
  state: ArtifactState;
  ownerId?: string;
  spawnedAt: Date;
  extractedAt?: Date;
}
```

### 2.3 Scanning & Detection
- **Automatic detection:** Artifacts visible within 15m radius
- **Shows exact location** on map
- **Quest highlight:** Can show approximate area (100m radius) for quest artifacts

### 2.4 Extraction (Pickup)
- **Range:** Must be within 2m of artifact
- **Action:** Hold "Pick Up" button for 30 seconds
- **Interruption:** If finger released (combat, distraction), timer resets to 0
- **Success:** Artifact added to inventory

### 2.5 Artifact Lifecycle
- **Sell:** To bartender for money
- **Transfer:** Via looting only (cannot trade directly)
- **Drop:** Lost forever from game
- **Death:** All artifacts lost (looted or gone)
- **Looting:** 1-3% chance per artifact to be stolen

---

## 3. Equipment System

### 3.1 Equipment Types

**Armor:**
- **Effect:** +1 to +3 wounds (editable parameter)
- **Radiation resist:** Optional bonus
- **Slots:** 1 armor max
- **Persistence:** Saved between games
- **Loss:** 1-5% on looting, 1-20% on death

**Rings:**
- **Effect:** 10-30% radiation resistance each
- **Stacking:** Yes, resistances add up
- **Slots:** Max 3 rings
- **Persistence:** Saved between games
- **Loss:** 1-5% on looting, 1-20% on death

**Anti-Radiation Elixirs:**
- **Effect:** Remove 10-100% radiation (multiple types)
- **Usage:** Consumable
- **Persistence:** Saved between games

### 3.2 Ammunition (Balls)
- **Purchase:** Individual units from bartender
- **Usage:** Physical only (not tracked in PDA)
- **Rule:** Players must buy ammo, cannot use own

---

## 4. Radiation System

### 4.1 Radiation Zones
- **Created by GM** before game (points with radius)
- **Levels:** 10-100 (radiation per 5 minutes)
- **Detection:** When player sends coordinates (online check)

### 4.2 Radiation Mechanics
```typescript
interface RadiationZone {
  id: string;
  center: { lat: number; lng: number };
  radius: number;  // meters
  level: number;   // 10-100 (radiation per 5 min)
  createdBy: string; // GM id
}
```

**Accumulation:**
- Player enters zone (detected by coordinate check)
- Every 5 minutes in zone: `playerRadiation += zoneLevel`
- Resistances reduce accumulation: `actual = zoneLevel * (1 - totalResist%)`
- Max radiation: 100 = death

**Exit:**
- Player must be online
- Coordinates checked, if outside zone → stops accumulating
- Radiation persists until death or anti-rad used

**Death:**
- At 100 radiation → player dies (loses 1 life)
- Radiation reset to 0 after death
- Not saved between games

---

## 5. Looting System

### 5.1 QR Code System
- **Physical card:** Issued before game
- **Digital:** Available in PDA
- **Usage:** Victim shows QR to looter

### 5.2 Looting Process
1. Player killed
2. Killer scans victim's QR code
3. System calculates loot:
   - **Money:** 1-50% chance to steal random amount
   - **Equipment:** 1-5% per item
   - **Artifacts:** 1-3% per artifact
4. Looted items transferred to killer
5. **Limit:** Can only loot once per death

### 5.3 Death Item Loss
- After looting, victim marks death in PDA
- Each remaining item: 1-20% chance to be lost forever
- All remaining artifacts lost forever
- Lost items cannot be recovered

---

## 6. Economy & Trading

### 6.1 Currency
- **Starting balance:** 1000 credits (configurable)
- **Persistence:** Saved between games
- **Sources:** Contracts, artifact sales, looting
- **Sinks:** Equipment, ammo, consumables

### 6.2 Reputation System
```typescript
reputation: number; // -100 to +100

// Price modifier
priceMultiplier = 1 + (reputation / 100) * 0.3;
// Example: +50 rep = 15% discount, -50 rep = 15% markup
```

**Reputation changes:**
- Contract completion: +10
- Artifact extraction: +5
- Killing same faction: -20
- Killing enemy faction: +10

### 6.3 Bartender (NPC Trader)
- **Role:** Physical player with trader permission
- **Multiple bartenders:** Supported
- **GM can be bartender:** Yes

**Trading Process:**
1. Bartender creates purchase list in app
2. Generates QR code
3. Player scans QR
4. Money deducted if sufficient
5. Virtual items auto-transferred
6. Physical items (ammo, food) handed physically

**Inventory Types:**
- **Virtual:** Equipment, artifacts, consumables (in PDA)
- **Physical:** Ammo, food, drinks (real items)

### 6.4 Player-to-Player Trading
- **Not allowed** in MVP
- Cannot transfer items or money directly

---

## 7. Contract System

### 7.1 Contract Types

**Escort:**
```typescript
{
  type: 'escort',
  client: playerId,      // Person being escorted
  destination: { lat, lng },
  reward: number,
  failCondition: 'client death' // Auto-fail if client dies
}
```

**Delivery:**
```typescript
{
  type: 'delivery',
  from: playerId,        // Sender
  to: playerId,          // Recipient
  item: itemId,
  reward: number,
  verification: 'recipient confirms'
}
```

**Artifact Extraction:**
```typescript
{
  type: 'artifact_extraction',
  artifactId: string,
  highlightRadius: 100,  // Show approximate area
  reward: number
}
```

**Zone Control:**
```typescript
{
  type: 'zone_control',
  zoneId: string,
  duration: number,      // seconds to hold
  reward: number
}
```

### 7.2 Contract Lifecycle

**Creation:**
- Created by GM before game (can be time-gated)
- Created by players during game
- Player contracts: money deducted immediately, held in escrow

**Acceptance:**
- Player accepts contract
- Faction restrictions apply (some contracts only for specific factions)

**Completion:**
1. Executor marks "completed"
2. Issuer/GM/Bartender confirms
3. Money transferred to executor
4. If not confirmed: money frozen until contract cancelled

**Failure:**
- Expired (time limit)
- Failed condition (e.g., escort client died)
- Cancelled by issuer
- Money returned to issuer

**Permissions:**
- GM/Bartender: Can confirm system contracts
- Player issuer: Can confirm own contracts
- Cannot confirm other players' contracts

---

## 8. Zone System

### 8.1 Zone Types

**Radiation Zones:**
- See Radiation System section
- Created by GM before game

**Control Points:**
- Temporary capture objectives
- Between two factions
- Not permanent ownership

### 8.2 Control Point Mechanics

**Capture:**
1. Player approaches point (within 2m)
2. Holds "Capture" button for 30 seconds
3. If released, timer resets to 0
4. Success: Point captured for faction

**Liberation:**
1. Enemy player approaches (within 2m)
2. Holds "Liberate" button for 30 seconds
3. If released, timer resets to 0
4. Success: Point freed/captured for their faction

**Rewards:**
- Contract-based (zone control contracts)
- No automatic bonuses in MVP

---

## 9. Game Master Functions

### 9.1 Pre-Game Setup
- Create radiation zones (OSM polygons)
- Create control points
- Create system contracts (with time gates)
- Set up artifact spawn schedule
- Configure equipment shop inventory
- Assign bartender permissions

### 9.2 During Game
- **Real-time map:** See all players' locations
- **Spawn artifacts:** Place at specific coordinates
- **Create contracts:** Add new contracts mid-game
- **Confirm contracts:** Approve system contract completions
- **Broadcast messages:** Send to all or specific players
- **Monitor stats:** View player stats, inventory, radiation

### 9.3 Bartender Functions
- Create purchase transactions
- Generate QR for sales
- Confirm system contracts (if GM)
- Multiple bartenders supported

---

## 10. MVP Feature Priority

### Must Have (MVP)
✅ **Authentication:**
- Player registration/login
- QR code generation

✅ **Geolocation:**
- Real-time player tracking
- Map display
- Zone detection (radiation, control points)

✅ **Artifacts:**
- GM spawn (manual placement)
- Auto-detection within 15m
- 30-second pickup with hold button
- Inventory management

✅ **Lives & Death:**
- Life counter (4 default)
- Death marking
- Radiation tracking
- Item loss calculation

✅ **Looting:**
- QR scanning
- Probability-based loot transfer
- Once per death limit

✅ **Equipment:**
- Armor, rings, consumables
- Shop inventory
- Bartender trading (QR-based)

✅ **Contracts:**
- All 4 types (escort, delivery, artifact, zone control)
- Creation, acceptance, completion flow
- Escrow system

✅ **Radiation:**
- Zone creation
- Accumulation tracking
- Resistance calculation
- Death at 100

✅ **Economy:**
- Balance tracking
- Reputation system
- Price modifiers

✅ **Game Master:**
- Real-time player map
- Artifact spawning
- Contract management
- Zone creation

### Future Enhancements (Post-MVP)
- Wounded state tracking with debuffs
- Player-to-player trading
- Automatic artifact spawning (scheduled)
- Advanced statistics and leaderboards
- Push notifications
- Offline mode support

---

## 11. Technical Constraints

### Geolocation
- Update interval: 10-30 seconds
- Minimum accuracy: 10m
- Detection ranges:
  - Artifact visibility: 15m
  - Pickup range: 2m
  - Control point range: 2m
  - Quest highlight: 100m

### Timers
- Artifact pickup: 30 seconds (hold button)
- Control point capture: 30 seconds (hold button)
- Respawn: 15 minutes (physical, not tracked)

### Probabilities
- Looting money: 1-50%
- Looting equipment: 1-5% per item
- Looting artifacts: 1-3% per item
- Death item loss: 1-20% per item

### Limits
- Max rings: 3
- Max armor: 1
- Lives per game: 4 (default, can be increased by artifacts)
- Max radiation: 100
- Radiation zones: 10-100 level

---

## Next Steps

1. ✅ Game mechanics defined
2. ⏭️ Database schema design
3. ⏭️ API specification
4. ⏭️ Frontend component design
