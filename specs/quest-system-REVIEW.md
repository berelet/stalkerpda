# Quest System - Review Checklist

**Date:** 2026-01-11  
**Status:** Specification complete, awaiting approval

---

## 📋 What Was Created

### Specifications (3 files)
1. ✅ `specs/quest-system-spec.md` (50+ pages)
   - Complete quest system specification
   - 4 quest types with detailed mechanics
   - Database schema changes
   - API endpoints
   - UI/UX mockups
   - Implementation phases

2. ✅ `specs/artifact-respawn-spec.md` (20+ pages)
   - Artifact respawn mechanics
   - Admin configuration UI
   - Random location generation
   - Quest integration

3. ✅ `specs/quest-system-SUMMARY.md` (10 pages)
   - Quick implementation reference
   - Checklist for developers
   - Critical code snippets
   - Testing scenarios

### Documentation Updates
4. ✅ `AGENT_GUIDE.md` - Added quest system to required reading
5. ✅ `docs/feutures/quest-system.md` - Feature overview

---

## ✅ Confirmed Decisions

All critical questions answered:

| Question | Answer |
|----------|--------|
| Patrol time tracking | Total across ALL checkpoints |
| Artifact collection | Just pick up (can sell after) |
| Reputation scale | -10,000 to +10,000 (1% per 100 rep) |
| Max active quests | 5 per player |
| Quest expiration | Fails, no penalty |
| Bartender creation | Live bartenders YES, NPCs NO |
| Artifact respawn | Per-spawn config (delay + radius) |

---

## 🎯 What's NOT in MVP

Deferred to post-MVP:
- ❌ Multi-stage quests (quest chains)
- ❌ AI NPC dialogue
- ❌ Daily/weekly repeatable quests
- ❌ Quest prerequisites (unlock chains)
- ❌ Shared quests (multiplayer)
- ❌ Player-created quests (schema supports, UI not implemented)

---

## 📊 Implementation Estimate

| Phase | Component | Hours |
|-------|-----------|-------|
| 1 | Database migrations | 1 |
| 2 | Backend core (quest tracking) | 4 |
| 3 | Backend respawn | 2 |
| 4 | API endpoints | 3 |
| 5 | Frontend PDA | 8 |
| 6 | Admin panel | 4 |
| 7 | Testing | 4 |
| **Total** | | **26 hours** |

**Realistic timeline:** 1 week (full-time) or 2 weeks (part-time)

---

## 🚨 Critical for MVP

### Must Have:
1. ✅ Artifact collection quests (pickup tracking)
2. ✅ Visit quests (location tracking)
3. ✅ Death fails all quests
4. ✅ Reputation system (NPC + faction)
5. ✅ Artifact respawn (for repeatable quests)
6. ✅ Bartender quest creation (PDA)
7. ✅ GM quest management (Admin)

### Nice to Have (can defer):
- ⏳ Delivery quests (manual confirmation)
- ⏳ Patrol quests (complex time tracking)
- ⏳ Quest notifications (WebSocket)
- ⏳ Quest leaderboards

---

## 🔍 What to Review

### 1. Quest Types (Section 2 in spec)
- Are 5 types sufficient for MVP?
- Any missing objective types?

### 2. Reputation Formula (Section 5.2)
```python
discount_pct = min(100, reputation / 100)
# 1% per 100 rep, max 100% at 10,000 rep
```
- Is progression too slow/fast?
- Should max discount be 100% or lower (e.g., 50%)?

### 3. Artifact Respawn (artifact-respawn-spec.md)
- Default delay: 30 minutes - OK?
- Default radius: 50 meters - OK?
- Max radius: 500 meters - OK?

### 4. Quest Failure (Section 4.5)
- Death fails ALL quests - too harsh?
- Should some quests survive death?

### 5. Bartender Creation (Section 4.1)
- Simplified form in PDA - sufficient?
- Should bartenders have more control?

---

## 📝 Action Items

### For You (Product Owner):
- [ ] Review full spec: `specs/quest-system-spec.md`
- [ ] Review respawn spec: `specs/artifact-respawn-spec.md`
- [ ] Confirm reputation formula is balanced
- [ ] Confirm quest failure on death is acceptable
- [ ] Approve implementation plan

### For Development:
- [ ] Create database migrations (005, 006)
- [ ] Implement backend core
- [ ] Build frontend UI
- [ ] Test with real gameplay scenarios

---

## 🎮 Example Gameplay Flow

### Scenario: "Collect Artifacts" Quest

1. **GM creates quest:**
   - Type: Artifact Collection
   - Target: Moonlight artifacts
   - Count: 3
   - Reward: 1,500 credits + 100 reputation (Loner faction)

2. **Player accepts quest:**
   - Quest appears in "Active Quests"
   - Progress: 0/3

3. **Player collects artifacts:**
   - Pickup 1 → Progress: 1/3
   - Pickup 2 → Progress: 2/3
   - Kill 3 → Loot QR code → Progress: 3/5

4. **Player dies:**
   - Quest fails automatically
   - Progress lost
   - Must accept quest again (if still available)

5. **Player accepts again:**
   - Progress resets to 0/5
   - Kills 5 bandits successfully
   - Progress: 5/5

6. **Player claims completion:**
   - Clicks "Claim Completion" in PDA
   - GM sees notification

7. **GM confirms:**
   - Reviews quest in Admin
   - Clicks "Confirm Completion"

8. **Rewards distributed:**
   - Player receives 1,500 credits
   - Player receives +100 reputation (Loner faction)
   - Reputation now: 100 → 1% discount at all Loner traders

---

## 🤔 Open Questions (if any)

None - all critical questions answered.

---

## ✅ Ready to Implement?

If you approve the specs, we can start with:

**Phase 1: Database Migrations (1 hour)**
- Create `005_quest_system.sql`
- Create `006_artifact_respawn.sql`
- Run on RDS

**Phase 2: Backend Core (4 hours)**
- Quest progress tracking
- Reputation system
- Death handler integration

**Phase 3: Simple Quest Test (2 hours)**
- Implement artifact collection quest
- Test full lifecycle
- Verify death fails quest

Then continue with remaining phases.

---

**Questions? Concerns? Ready to start?**
