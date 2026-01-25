# Death & Respawn UI Specification

**Date:** 2026-01-25  
**Status:** Draft  
**Related:** `radiation-system-SUMMARY.md`, `specs/game-mechanics/FINAL-SPEC.md`

---

## 1. Overview

When player dies (radiation reaches 100% or killed by another player), they enter "dead" state with restricted interactions until respawn.

---

## 2. Death State

### 2.1 Trigger Conditions
- Radiation reaches 100%
- Killed by another player (marked via QR loot)

### 2.2 Death Effects (Backend - already implemented)
- `status = 'dead'`
- `current_lives -= 1`
- `current_radiation = 0`
- All active quests fail

---

## 3. Death Banner UI

### 3.1 Full-Screen Overlay
When `player.status === 'dead'`, show overlay on ALL pages:

```
┌─────────────────────────────────────────────────┐
│                                                 │
│              💀 YOU ARE DEAD 💀                 │
│                                                 │
│     Respawn at a resurrection zone              │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │ While dead, the following is disabled:   │  │
│  │                                           │  │
│  │ • Artifact pickup                         │  │
│  │ • Trading                                 │  │
│  │ • Quest interactions                      │  │
│  │ • Zone capture                            │  │
│  │                                           │  │
│  │ Only respawn is available.               │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│         Lives remaining: 3 ❤️                   │
│              - or -                             │
│         No lives remaining ☠️                   │
│         (Equip items with bonus lives)          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3.2 Banner Behavior
- **Position:** Top of map page, above map
- **Style:** Dark background with red border, semi-transparent
- **Visibility:** Always visible when dead (cannot be dismissed)
- **Content changes based on lives:**
  - `lives > 0`: "Lives remaining: X" + instructions to go to respawn zone
  - `lives === 0`: "No lives remaining" + hint about bonus lives items

---

## 4. Respawn Zones on Map

### 4.1 Visual Display
- **Shape:** Circle with dashed green border
- **Fill:** Semi-transparent green (`rgba(0, 255, 0, 0.1)`)
- **Icon:** Green cross or respawn icon at center
- **Label:** Zone name (e.g., "Safe Zone")

### 4.2 Zone Data (from API)
```typescript
interface RespawnZone {
  id: string
  name: string
  centerLat: number
  centerLng: number
  radius: number  // meters
  respawnTimeSeconds: number
}
```

### 4.3 Player Inside Zone Detection
- API returns `resurrectionUpdate.insideZone: boolean`
- When inside: show respawn progress/button

---

## 5. Respawn Mechanics

### 5.1 Respawn Button
**Conditions to show:**
- `player.status === 'dead'`
- `player.currentLives > 0`
- `resurrectionUpdate.insideZone === true`

**Button UI:**
```
┌─────────────────────────────────┐
│     🔄 RESPAWN                  │
│     Hold for 5 seconds          │
│     [=====>        ] 45%        │
└─────────────────────────────────┘
```

### 5.2 Respawn Progress
- **Timer-based:** Player must stay in zone for `respawnTimeSeconds`
- **Progress bar:** Shows accumulated time vs required time
- **Auto-respawn:** When progress reaches 100%, player auto-resurrects
- **Progress persists:** If player leaves zone, progress is saved (not reset)

### 5.3 No Lives State
When `currentLives === 0`:
- Respawn button disabled/hidden
- Show message: "No lives remaining. Equip items with bonus lives to respawn."
- Player can still access inventory to equip life-giving items

---

## 6. Restricted Actions When Dead

### 6.1 Blocked Actions
| Action | Behavior |
|--------|----------|
| Artifact pickup | Button disabled, show "Cannot pickup while dead" |
| Trading | Trade button disabled |
| Quest accept/complete | Buttons disabled |
| Zone capture | Capture button disabled |
| Looting others | Disabled |

### 6.2 Allowed Actions
| Action | Behavior |
|--------|----------|
| View map | Allowed (to navigate to respawn) |
| View inventory | Allowed (to equip bonus life items) |
| Equip/unequip items | Allowed |
| View profile | Allowed |
| Respawn | Allowed (if lives > 0 and in zone) |

---

## 7. API Integration

### 7.1 Location Update Response
```json
{
  "resurrectionUpdate": {
    "insideZone": true,
    "zoneName": "Safe Zone",
    "progress": 120,
    "required": 300,
    "progressPercent": 40
  }
}
```

### 7.2 Respawn Endpoint
```
POST /api/player/respawn
```
- Validates: `status === 'dead'`, `currentLives > 0`, inside respawn zone, progress complete
- Sets: `status = 'alive'`, resets resurrection progress

---

## 8. Implementation Checklist

### Frontend
- [ ] Death banner component (full-width, above map)
- [ ] Respawn zones on map (green circles)
- [ ] Respawn progress bar (when in zone)
- [ ] Disable artifact pickup button when dead
- [ ] Disable trade buttons when dead
- [ ] Update header to show dead state

### Backend
- [ ] Verify respawn endpoint exists and works
- [ ] Verify resurrection progress tracking works

---

## 9. UI Text (English)

**Death Banner:**
- Title: "YOU ARE DEAD"
- Subtitle: "Respawn at a resurrection zone"
- Restrictions box title: "While dead, the following is disabled:"
- Restrictions list:
  - "Artifact pickup"
  - "Trading"
  - "Quest interactions"
  - "Zone capture"
- Footer: "Only respawn is available."
- Lives text: "Lives remaining: X" or "No lives remaining"
- No lives hint: "Equip items with bonus lives to respawn"

**Respawn Button:**
- Label: "RESPAWN"
- Progress: "Hold for X seconds"
- Disabled: "Cannot respawn (no lives)"

**Map Zone Label:**
- "Respawn Zone: {name}"

---

**End of Specification**
