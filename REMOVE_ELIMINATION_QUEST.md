# Remove Elimination Quest Type - Change List

**Date:** 2026-01-17

---

## Files to Modify

### Backend (Python)

1. **backend/src/handlers/quests.py**
   - Line 376: Remove `if quest_type == 'elimination'` block
   - Line 451-453: Remove elimination with specific target logic

2. **backend/src/handlers/players.py**
   - Line 162: Remove import `complete_elimination_quest_for_target`
   - Line 168-177: Remove complete elimination quests logic from death handler
   - Line 374-390: Remove update quest progress for elimination quests from loot handler

3. **backend/src/utils/quest.py**
   - Line 9-26: Remove `update_elimination_progress()` function
   - Line 181-202: Remove `complete_elimination_quest_for_target()` function

4. **backend/src/models/schemas.py**
   - Line 34: Remove `ELIMINATION = "elimination"` from enum

### Frontend (React/TypeScript)

5. **frontend/src/pages/QuestsPage.tsx**
   - Line 117: Remove `case 'elimination': return '🎯'`
   - Line 263-273: Remove elimination quest objectives display

6. **frontend/src/pages/TraderQuestsPage.tsx**
   - Line 62: Remove `elimination: '💀'` from icons
   - Line 76: Remove `elimination: 'Elimination'` from labels

7. **frontend/src/pages/WikiPage.tsx**
   - Line 136: Remove elimination quest type from wiki

### Admin Panel (React/TypeScript)

8. **admin/src/pages/QuestsPage.tsx**
   - Line 38: Remove `'elimination'` from QUEST_TYPES array
   - Line 50: Change default questType from `'elimination'` to `'artifact_collection'`
   - Line 96: Change resetForm default from `'elimination'` to `'artifact_collection'`
   - Line 132-145: Remove elimination quest_data building logic
   - Line 387-420: Remove elimination quest form fields (faction selection, kill count)

### Documentation (Markdown)

9. **specs/quest-system-spec.md**
   - Remove elimination from quest types table
   - Remove "Elimination" section with JSON example
   - Update overview text

10. **specs/quest-system-SUMMARY.md**
    - Remove elimination from quest types table
    - Remove elimination quest tracking section
    - Update enum definition

11. **specs/quest-system-DIAGRAM.md**
    - Remove elimination from diagrams

12. **specs/quest-system-REVIEW.md**
    - Remove elimination tracking references

13. **specs/game-mechanics/FINAL-SPEC.md**
    - Remove elimination contract type

14. **specs/database/schema.md**
    - Update contract type enum (remove elimination)

15. **specs/api/endpoints.md**
    - Remove elimination from type examples

16. **specs/frontend/ui-spec.md**
    - Remove elimination UI elements

17. **QUEST_FEATURE.md**
    - Remove elimination references

18. **AGENT_GUIDE.md**
    - Remove elimination integration notes

19. **docs/feutures/quest-system.md**
    - Remove elimination from feature list

20. **QUEST_SYSTEM_ANALYSIS.md**
    - Remove elimination from analysis

### Database Migration (SQL)

21. **database/migrations/006_quest_system.sql**
    - Update ENUM to remove 'elimination'

22. **database/migrations/009_quest_enhancements.sql**
    - Update ENUM to remove 'elimination'

---

## Summary

- **Backend files:** 4
- **Frontend files:** 3
- **Admin files:** 1
- **Documentation files:** 12
- **Database migrations:** 2

**Total:** 22 files to modify
