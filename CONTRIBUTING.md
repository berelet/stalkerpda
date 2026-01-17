# Contributing to STALKER PDA

## Git Flow Workflow

This project uses Git Flow for branch management.

### Branch Structure

- **main** - Production-ready code
- **develop** - Integration branch for features
- **feature/** - New features (branch from develop)
- **hotfix/** - Critical fixes (branch from main)
- **release/** - Release preparation (branch from develop)

### Working on Features

1. **Start new feature:**
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. **Commit changes:**
   ```bash
   git add .
   git commit -m "feat: description"
   ```

3. **Push feature branch:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Merge to develop:**
   ```bash
   git checkout develop
   git merge feature/your-feature-name
   git push origin develop
   ```

5. **Delete feature branch:**
   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

### Commit Message Convention

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Build/config changes

### Current Feature: Quest System Frontend

**Branch:** `feature/quest-frontend`

**Tasks:**
- [ ] Create Quests page (Available/Active/Completed tabs)
- [ ] Quest card component
- [ ] Quest details modal
- [ ] Accept/Cancel/Claim buttons
- [ ] Map markers for quest objectives
- [ ] Admin quest management UI

**Backend:** Already 100% complete (see AGENT_GUIDE.md)
