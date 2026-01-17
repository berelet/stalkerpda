# Quest System - Comprehensive Analysis

**Date:** 2026-01-17

---

## 1. SPECIFICATION SUMMARY

### Quest Types

| Type | Objective | Auto-track | Completion | Map Marker |
|------|-----------|------------|------------|------------|
| artifact_collection | Collect specific artifact | ✅ Pickup | Manual confirm | 50m radius |
| delivery | Deliver item to coords | ❌ Manual | Manual confirm | Exact coords |
| patrol | Visit N checkpoints + M min | ✅ Location | Auto-complete | Multiple 30m circles |
| visit | Reach coordinates | ✅ Location | Auto-complete | Exact coords |
| protection | Protect player B | ❌ Manual | Manual confirm | None |

### Quest Lifecycle

```
GM Creates → Available → Player Accepts → Active → Complete/Fail
```

---

## 2. OWNER DECISIONS

| Decision | Answer |
|----------|--------|
| Quest Model | Single-use (not templates) |
| Cancel Behavior | Quest available again at same trader |
| Artifact Failure | By specific artifact_id (instance), NOT type |
| Protection Quest | GM creates, death of protected player fails quest |
| Reputation | Keep as reward, discounts NOT in scope |
| Expiration | None in MVP, GM closes manually |
| Delivery Validation | Validate on claim click |
| Frontend | Add "Show on Map" + artifact markers |

---

## 3. CODE vs SPEC COMPARISON

| # | Area | Required | Current Code | Status |
|---|------|----------|--------------|--------|
| 1 | Quest Accept | UPDATE original (single-use) | INSERT copy (template) | ❌ FIX |
| 2 | Cancel Quest | Available again | Available again | ✅ OK |
| 3 | Artifact Failure | By artifact_id | By artifact_type_id | ❌ FIX |
| 4 | Artifact Progress | By artifact_id | By artifact_type_id | ❌ FIX |
| 5 | Death Fails Quests | Yes | Yes | ✅ OK |
| 6 | Protection Quest | Death fails | Implemented | ✅ OK |
| 7 | Delivery Validation | Validate on claim | Not implemented | ❌ ADD |
| 8 | Show on Map | Required | Not implemented | ❌ ADD |
| 9 | Artifact Markers | 50m radius | Not implemented | ❌ ADD |

---

## 4. REQUIRED CHANGES

### Backend

**A. Quest Accept (quests.py - accept_handler)**
- Change from INSERT (copy) to UPDATE (single-use)

**B. Artifact Quest - Specific Instance**
- Store `artifact_id` instead of `artifact_type_id`
- Update progress tracking to match artifact_id
- Update failure logic to match artifact_id

**C. Delivery Validation (quests.py - claim_handler)**
- Add location + item validation on claim

### Frontend

**D. Show on Map Button (QuestsPage.tsx)**
- Add button in quest details modal

**E. Artifact Markers (useActiveQuests.ts)**
- Add artifact_collection markers (50m radius)
- Requires artifact location in quest_data

---

## 5. PRIORITY

1. **HIGH:** Quest Accept Logic (single-use)
2. **HIGH:** Artifact Quest by specific instance
3. **MEDIUM:** Delivery validation
4. **MEDIUM:** Show on Map button
5. **MEDIUM:** Artifact markers on map
