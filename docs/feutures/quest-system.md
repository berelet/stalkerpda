# Quest System - Feature Overview

**Status:** Specification complete, ready for implementation  
**Date:** 2026-01-11  
**Full specs:** `specs/quest-system-spec.md`, `specs/artifact-respawn-spec.md`

---

## What is Quest System?

**Quests = Enhanced Contracts** with automatic progress tracking, reputation rewards, and failure conditions.

### Key Features

1. **5 Quest Types:**
   - Elimination (kill N players of faction X)
   - Artifact Collection (collect N artifacts of type Y)
   - Delivery (deliver item to NPC/coordinates)
   - Patrol (visit N checkpoints + spend M minutes)
   - Visit (reach specific coordinates)

2. **Automatic Progress Tracking:**
   - System tracks kills, pickups, location visits
   - Real-time progress updates
   - Quest markers on map

3. **Reputation System:**
   - Earn reputation with NPCs or factions
   - Reputation reduces trading commissions
   - 1% discount per 100 reputation (max 100% at 10,000 rep)

4. **Quest Failure:**
   - Death fails ALL active quests
   - Quest timeout (expires_at)
   - Manual cancellation

5. **Quest Creation:**
   - GM creates quests in Admin panel (full control)
   - Live Bartenders create quests in PDA (simplified)
   - NPC traders receive quests assigned by GM

6. **Artifact Respawn:**
   - Artifacts can auto-respawn after pickup
   - Configurable delay (minutes) and random radius (meters)
   - Enables repeatable artifact collection quests

---

## Implementation Status

**Specification:** ✅ Complete  
**Database:** ⏳ Pending (migrations ready)  
**Backend:** ⏳ Pending  
**Frontend:** ⏳ Pending  
**Admin:** ⏳ Pending

**Estimated time:** 1 week (26 hours)

---

## Critical Decisions (Confirmed)

1. ✅ **Patrol time:** Total time across ALL checkpoints (not per checkpoint)
2. ✅ **Artifact collection:** Just pick up (can sell/drop after)
3. ✅ **Elimination:** Must LOOT victim (QR scan required)
4. ✅ **Reputation scale:** -10,000 to +10,000 (1% per 100 rep)
5. ✅ **Bartender creation:** Live bartenders can create; NPCs cannot
6. ✅ **Artifact respawn:** Enabled per spawn, configurable delay/radius

---

## Next Steps

1. Review full specs: `specs/quest-system-spec.md`
2. Create database migrations (Phase 1)
3. Implement backend core (Phase 2)
4. Build frontend UI (Phase 5)

See `specs/quest-system-SUMMARY.md` for implementation checklist.
