# Radiation & Death System - Implementation Summary

**Full Specification:** See `radiation-system-implementation.md` (Parts 1-4)

---

## Quick Overview

**What we're building:**
- ✅ Radiation accumulation from zones (tick-based, 15 sec)
- ✅ Instant radiation from artifact pickup
- ✅ Death at 100 radiation (atomic: lives-1, rad=0, item loss, quest fail)
- ✅ Respawn zones with resurrection timer
- ✅ Equipment-based resurrection (bonus lives)
- ✅ Looting system (QR scan, 1-5% equipment, 1-3% artifacts)
- ✅ Zone respawn mechanics (auto-respawn after expiration)
- ✅ Admin UI for zone management
- ✅ PDA UI for radiation display and death state
- ✅ AWS EventBridge cron for offline radiation calculation

---

## Database Changes

**New tables:**
- `respawn_zones` - resurrection zones
- `loot_events` - track looting (prevent double-loot)

**Modified tables:**
- `players` - add 6 fields (radiation tracking, respawn progress, wounds)
- `artifacts` - add 5 fields (pickup radiation, respawn settings)
- `radiation_zones` - add 6 fields (time window, respawn settings)
- `cache_versions` - add keys: `radiation_zones`, `respawn_zones`

**Migration:** `database/migrations/008_radiation_system.sql`

---

## Backend Changes

**New files:**
- `src/utils/radiation.py` - radiation calculation logic
- `src/utils/qr.py` - QR code generation
- `src/handlers/cron.py` - EventBridge cron handler

**Modified files:**
- `src/handlers/location.py` - add radiation + respawn calculation
- `src/handlers/players.py` - modify death handler, add loot handler
- `src/handlers/auth.py` - add QR code to profile
- `src/handlers/admin.py` - add zone management endpoints
- `src/utils/respawn.py` - extend with respawn zones

**New endpoints:**
- `POST /api/player/loot` - loot dead player via QR
- `POST /api/admin/zones/radiation` - create radiation zone
- `POST /api/admin/zones/respawn` - create respawn zone
- `POST /api/admin/players/{id}/resurrect` - GM resurrect player

**Dependencies:**
- `qrcode==7.4.2`
- `Pillow==10.2.0`

---

## Frontend Changes

**Modified pages:**
- `MapPage.tsx` - death banner, respawn zones, resurrection progress
- `ProfilePage.tsx` - QR code display
- `Header.tsx` - radiation display with colors

**New pages:**
- `LootingPage.tsx` - QR scanner for looting

**Dependencies:**
- `react-qr-reader`

---

## Admin Panel Changes

**Modified pages:**
- `ZonesPage.tsx` - add time window + respawn settings
- `ArtifactsPage.tsx` - add pickup radiation field
- `DashboardPage.tsx` - add resurrect button to player popup

**New pages:**
- `RespawnZonesPage.tsx` - manage respawn zones

---

## Key Algorithms

### Radiation Accumulation
```
1. Get active zones (cache)
2. Calculate delta_t = now - last_calc
3. Handle untracked period (1 m/s assumption)
4. Select zone (first-entered rule, no stacking)
5. Calculate time_inside = segment_in_circle(P0, P1, zone)
6. Apply radiation: delta_rad = (zone_level / 300) * (1 - resist%) * time_inside
7. Update: radiation = min(100, radiation + delta_rad)
8. Check death: if radiation >= 100 → trigger_death()
```

### Death
```
1. Decrement lives (max 0)
2. Reset radiation = 0
3. Clear current_radiation_zone_id
4. Set status = 'dead' if lives == 0
5. Record dead_at timestamp
6. Item loss: 1-10% all items (equipment + artifacts)
7. Fail active quests
8. Complete elimination quests targeting this player
```

### Looting
```
1. Parse QR code → victim_id
2. Check: victim is dead, not already looted
3. Loot items:
   - Equipment: 1-5% per item
   - Artifacts: 1-3% per item
4. Transfer to looter's backpack
5. Record loot event (prevent double-loot)
```

### Respawn
```
1. Check: player is dead, lives > 0, inside respawn zone
2. Calculate delta_t = now - last_calc
3. Update: progress += delta_t
4. If progress >= required_time:
   - Set status = 'alive'
   - Reset progress = 0
   - Clear dead_at
```

---

## Testing Checklist

**Unit tests:**
- [ ] `test_radiation.py` - time in zone, resist calculation

**Integration tests:**
- [ ] `test_radiation_flow.sh` - full flow (zone → death → respawn)

**Manual tests:**
- [ ] Radiation accumulation (enter/exit zone)
- [ ] Death at 100 radiation
- [ ] Item loss (1-10%)
- [ ] Looting (QR scan)
- [ ] Respawn timer
- [ ] Equipment bonus lives
- [ ] Admin zone creation
- [ ] Cron job (offline radiation)

---

## Deployment Steps

```bash
# 1. Database migration
mysql -h <RDS_HOST> -u pda_admin -p pda_zone < database/migrations/008_radiation_system.sql

# 2. Backend (sam sync)
source .env.local
./sync.sh
# Wait for auto-deploy

# 3. Frontend
cd frontend
npm install react-qr-reader
npm run build
make deploy-fe ENVIRONMENT=dev
aws cloudfront create-invalidation --distribution-id E1LX6WLS4JUEVL --paths "/*" --profile stalker

# 4. Admin
cd admin
npm run build
make deploy-admin ENVIRONMENT=dev
aws cloudfront create-invalidation --distribution-id E3FHC7M1Y2KICX --paths "/*" --profile stalker

# 5. Verify
./tests/integration/test_radiation_flow.sh
```

---

## AWS Free Tier Usage

**EventBridge Cron:**
- 1 invocation/minute = 43,200/month
- Free tier: 1M events/month
- **Cost: $0**

**Lambda:**
- 43,200 invocations/month
- ~100ms execution time
- Free tier: 1M requests + 400,000 GB-seconds
- **Cost: $0**

**RDS:**
- Additional queries: ~43,200/month
- Indexed queries: <10ms each
- **Cost: $0 (within free tier)**

---

## Rollback Plan

```bash
# 1. Disable cron
aws events disable-rule --name pda-zone-radiation-tick-dev --profile stalker

# 2. Revert database
mysql -h <RDS_HOST> -u pda_admin -p pda_zone < database/migrations/008_radiation_system_rollback.sql

# 3. Revert code
git revert <commit-hash>
sam build && sam deploy
cd frontend && npm run build && make deploy-fe
cd admin && npm run build && make deploy-admin
```

---

## Success Metrics

- [ ] Radiation accumulates at correct rate
- [ ] Death triggers at 100 radiation
- [ ] Respawn timer works
- [ ] Looting works (QR scan)
- [ ] No performance degradation (<500ms API response)
- [ ] Cron runs without errors (check CloudWatch logs)

---

## Time Estimate

- **Week 1:** Database + Backend (radiation, death, respawn)
- **Week 2:** Frontend PDA (UI, QR, looting)
- **Week 3:** Admin Panel + Testing + Deployment

**Total: 2-3 weeks**

---

## Questions Resolved

1. ✅ Resist only from equipped items (armor + 2 addons + artifact)
2. ✅ Death loss: 1-10% all items, Looting: additional 1-5% equipment, 1-3% artifacts
3. ✅ Keep `wounded` enum for future, default wounds = 1
4. ✅ Add 6 fields to `players` (snake_case naming)
5. ✅ Radiation zones (not respawn zones) have time window + respawn
6. ✅ `pickup_radiation` on artifact spawn level (±30% variance)
7. ✅ Separate cache keys: `radiation_zones`, `respawn_zones`
8. ✅ Full implementation: Backend + Frontend + Admin
9. ✅ EventBridge cron for offline radiation (free tier)
10. ✅ No special GM debug commands (manage via admin UI)

---

**Ready to start implementation!** 🚀
