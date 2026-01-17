# Quest Feature - Development Guide

**Branch:** `feature/quest-frontend`  
**Status:** Backend 100% complete, Frontend 0%

---

## Quick Start

```bash
# You're already on the feature branch
git status  # Should show: On branch feature/quest-frontend

# Start frontend dev server
cd frontend
npm run dev

# Or admin panel
cd admin
npm run dev
```

---

## What's Already Done (Backend)

✅ All API endpoints working
✅ Quest progress auto-tracking (artifacts, kills, location)
✅ Reward distribution (money, reputation, items)
✅ Quest failure on death
✅ Database schema complete

**Test backend:**
```bash
# List available quests
curl https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev/api/quests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## What You Need to Build (Frontend)

### 1. PDA - Quests Page
**File:** `frontend/src/pages/QuestsPage.tsx`

**Features:**
- 3 tabs: Available, Active, Completed
- Quest list with cards
- Accept/Cancel/Claim buttons
- Progress indicators (2/5 kills, 3/3 artifacts)

### 2. Quest Details Modal
**File:** `frontend/src/components/QuestDetailsModal.tsx`

**Shows:**
- Title, description, issuer
- Objectives with progress
- Rewards (money, reputation, items)
- Map button (show quest markers)
- Accept/Cancel/Claim actions

### 3. Map Integration
**File:** `frontend/src/pages/MapPage.tsx`

**Add:**
- Quest markers (different colors per type)
- Click marker → open quest details
- Show radius circles for objectives

### 4. Admin - Quest Management
**File:** `admin/src/pages/QuestsPage.tsx`

**Features:**
- List all quests (table)
- Create quest form (all 5 types)
- Confirm completion button
- View player progress

---

## API Endpoints (Ready to Use)

### Player:
```typescript
GET    /api/quests                    // List available
GET    /api/quests/active             // List active
GET    /api/quests/completed          // List completed
GET    /api/quests/{id}               // Details
POST   /api/quests/{id}/accept        // Accept
POST   /api/quests/{id}/claim         // Claim completion
POST   /api/quests/{id}/cancel        // Cancel
```

### Admin:
```typescript
GET    /api/admin/quests              // List all
POST   /api/admin/quests              // Create
PUT    /api/admin/quests/{id}         // Edit
DELETE /api/admin/quests/{id}         // Delete
POST   /api/admin/quests/{id}/confirm // Confirm & reward
```

---

## Quest Types

1. **elimination** - Kill N players of faction X
2. **artifact_collection** - Collect N artifacts of type Y
3. **delivery** - Deliver item to NPC/coordinates
4. **patrol** - Visit N checkpoints + spend M minutes
5. **visit** - Reach specific coordinates once

---

## Example Quest Data

**Artifact Collection:**
```json
{
  "id": "quest-uuid",
  "questType": "artifact_collection",
  "title": "Collect Moonlight Artifacts",
  "description": "Bring me 3 Moonlight artifacts",
  "reward": 1500,
  "questData": {
    "artifact_type_id": "uuid-moonlight",
    "target_count": 3,
    "current_count": 1  // Progress!
  },
  "status": "accepted"
}
```

**Elimination:**
```json
{
  "questType": "elimination",
  "title": "Hunt Bandits",
  "questData": {
    "target_faction": "bandit",
    "target_count": 5,
    "current_count": 2
  }
}
```

---

## Git Workflow

```bash
# Make changes
git add .
git commit -m "feat: add QuestsPage component"

# Push to feature branch
git push origin feature/quest-frontend

# When done, merge to develop
git checkout develop
git merge feature/quest-frontend
git push origin develop

# Deploy
cd /var/www/stalker/stalkerpda
git pull origin develop
make deploy-fe ENVIRONMENT=dev
```

---

## Testing Checklist

- [ ] List available quests
- [ ] Accept quest
- [ ] View active quests with progress
- [ ] Cancel quest
- [ ] Complete quest (auto or manual)
- [ ] View completed quests
- [ ] Quest markers on map
- [ ] Admin: Create quest
- [ ] Admin: Confirm completion

---

## Resources

- **Full spec:** `specs/quest-system-spec.md`
- **Summary:** `specs/quest-system-SUMMARY.md`
- **Backend code:** `backend/src/handlers/quests.py`
- **API docs:** `specs/api/endpoints.md`

---

## Need Help?

Check AGENT_GUIDE.md section "Quest System" for complete details.
