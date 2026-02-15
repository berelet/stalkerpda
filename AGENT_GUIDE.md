# Agent Guide

## ⚠️ REQUIRED READING

**Before working on this project, you MUST read:**

### Step 1: Workflow & Needs System (ОБОВ'ЯЗКОВО)
- `docs/CLAUDE_CODE_INSTRUCTIONS.md` - Інструкція для AI-асистента (сценарії роботи A/B/C/D)
- `docs/needs/WORKFLOW.md` - Повний workflow розробки (8 етапів з апрув-гейтами)
- `docs/needs/INDEX.md` - Реєстр всіх потреб (перевірити поточний стан)
- `docs/needs/GLOSSARY.md` - Терміни проекту

### Step 2: Game Specs (за потребою, при роботі з ігровими механіками)
- `specs/game-mechanics/FINAL-SPEC.md` - Complete game mechanics specification
- `specs/inventory-system-spec.md` - Inventory system v2.0 specification (2026-01-03)
- `specs/quest-system-spec.md` - Quest system specification (2026-01-11)
- `specs/artifact-respawn-spec.md` - Artifact respawn mechanics (2026-01-11)

**Quick reference:**
- `specs/quest-system-SUMMARY.md` - Quest system implementation checklist
- `docs/needs/templates/` - Шаблони для створення нових потреб

### ⚠️ Для нових фіч — слідувати WORKFLOW.md!
Будь-яка нова функціональність оформлюється як NEED в `docs/needs/NEED-XXX-назва/`.
Quickfix-и (баги, дрібні зміни) — як QUICKFIX в `docs/needs/QUICKFIX-XXX-назва/`.

## AWS Configuration

This project uses the **`stalker`** AWS profile exclusively.

- **Profile name:** `stalker`
- **Region:** `eu-north-1` (Stockholm)
- **Account ID:** 707694916945

All AWS CLI commands and operations must use `--profile stalker` or set `AWS_PROFILE=stalker`.

## 🚀 Development Workflow - START HERE!

**⚠️ IMPORTANT: Before making any code changes, start `sam sync` for automatic deployments!**

### Quick Start (Run This First!)

```bash
cd /var/www/stalker/stalkerpda
source .env.local
sam sync --template infrastructure/template.yaml \
  --stack-name pda-zone-dev \
  --watch \
  --profile stalker \
  --region eu-north-1 \
  --parameter-overrides Environment=dev DBUsername=pda_admin DBPassword=$DB_PASSWORD JWTSecret=$JWT_SECRET AllowedIP=0.0.0.0/0
```

This command:
- Watches for file changes in `backend/` folder
- Automatically deploys changed Lambda functions in **10-20 seconds**
- No need to manually run deploy commands
- Keep this terminal open while developing
- **You can edit files immediately** - sync detects changes and deploys automatically

**Quick start script:** Use `./sync.sh` instead of typing the full command.

### Deployment Strategy

| Situation | What to Use | Time |
|-----------|-------------|------|
| **Backend code changes** | `sam sync --watch` (auto-deploys) | 10-20 sec per change |
| **Changes to template.yaml** | Full `sam deploy` | 3-5 min |
| **Production release** | Full `sam deploy` | 3-5 min |
| **Frontend changes** | `make deploy-fe` + invalidate cache | 1-2 min |
| **Admin panel changes** | `make deploy-admin` + invalidate cache | 1-2 min |

**⚠️ CRITICAL: Always invalidate CloudFront cache after frontend/admin deployments!**

```bash
# Frontend cache invalidation
aws cloudfront create-invalidation --distribution-id E1LX6WLS4JUEVL --paths "/*" --profile stalker

# Admin cache invalidation
aws cloudfront create-invalidation --distribution-id E3FHC7M1Y2KICX --paths "/*" --profile stalker
```

### Why SAM Sync?

Without `sam sync`, SAM caches the Lambda code zip and may not update functions even after code changes. `sam sync --watch` solves this by:
1. Detecting file changes automatically (1-2 seconds after save)
2. Building only changed functions
3. Uploading directly to Lambda (bypassing CloudFormation)
4. Providing instant feedback in terminal

**Workflow:**
1. Start `./sync.sh` in one terminal (leave it running)
2. Edit backend files in another terminal/editor
3. Save files - sync auto-detects and deploys
4. Watch deployment progress in sync terminal
5. Test changes immediately (10-20 sec after save)

### When to Use Full Deploy

Use `sam deploy` instead of sync when:
- Changing `infrastructure/template.yaml` (resources, permissions, etc.)
- Adding/removing Lambda functions
- Modifying API Gateway routes
- Production releases (for safety)

### Direct Lambda Update (Alternative)

If `sam sync` is not running and you need a quick fix:

```bash
# 1. Build first (if not already built)
sam build --template infrastructure/template.yaml

# 2. Create zip from build
cd .aws-sam/build/MeFunction && zip -r /tmp/code.zip . -q

# 3. Upload to S3 and update Lambda
aws s3 cp /tmp/code.zip s3://pda-zone-artifacts-dev-707694916945/lambda/code.zip --profile stalker --region eu-north-1
aws lambda update-function-code \
  --function-name pda-zone-me-dev \
  --s3-bucket pda-zone-artifacts-dev-707694916945 \
  --s3-key lambda/code.zip \
  --profile stalker --region eu-north-1
```

### Build Optimization (2026-01-08)

**Problem solved:** Build size reduced from 1.9 GB to 725 MB by:
- Removing `boto3` from requirements.txt (already in Lambda runtime)
- Moving `Pillow` to separate `backend-upload/` folder (only needed for UploadFunction)
- Deleting old `backend/package/` cache folder

**Current function sizes:**
- Regular functions: ~19 MB
- UploadFunction (with Pillow): ~21 MB

**⚠️ Never add `boto3` to requirements.txt** - it's already available in Lambda runtime and adds 55 MB of unnecessary bloat.

### Future Optimization: Lambda Layers

For even faster deployments, consider migrating to Lambda Layers:

```
Current:                            With Layers:
────────────────────────────────────────────────────────
40 functions × 19 MB = 760 MB       1 Layer (19 MB) + 40 handlers (50 KB each)
                                    = 21 MB total

Deploy time: 3-5 min                Deploy handler: 5-10 sec
                                    Deploy layer: 1-2 min
```

Layer contains: `src/`, `pymysql`, `geopy`, `pyjwt`
Functions contain: only handler code

This is a larger refactoring task - implement when needed.

### AWS Credits Application

We're applying for **$1,000 AWS Activate credits** to support MVP launch and beta testing.

**Documentation:**
- Full application: [PITCH.md](./PITCH.md)
- Quick summary: [AWS_CREDITS_SUMMARY.md](./AWS_CREDITS_SUMMARY.md)
- Public README: [README.md](./README.md)

**Current monthly costs**: ~$44/month  
**12-month projection**: $1,200 total  
**Credits will cover**: 8-9 months of operations

## Deployed Infrastructure

**Status:** ✅ DEPLOYED (2026-01-02)

### URLs
- **Frontend:** https://d384azcb4go67w.cloudfront.net
- **Admin Panel:** https://d3gda670zz1dlb.cloudfront.net
- **API:** https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev
- **WebSocket:** wss://08xq76njp7.execute-api.eu-north-1.amazonaws.com/dev

### Database
- **Host:** pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com
- **Port:** 3306
- **Database:** pda_zone
- **User:** pda_admin
- **Password:** stored in `.env.local`

### AWS Resources
- RDS MySQL 8.0 (db.t3.micro, publicly accessible)
- S3 Buckets:
  - Frontend: pda-zone-frontend-dev-707694916945
  - Admin: pda-zone-admin-dev-707694916945
  - Artifacts (images): pda-zone-artifacts-dev-707694916945
- CloudFront Distributions:
  - Frontend: d384azcb4go67w
  - Admin: d3gda670zz1dlb
- API Gateway (REST + WebSocket)
- 12 Lambda Functions (auth, players, location, artifacts, contracts, zones, admin, websocket, upload)
- DynamoDB Table: pda-zone-connections-dev

## Credentials

Secrets are stored in `.env.local` (gitignored):
```
DB_PASSWORD=4c78768f1a2191ef978adafa18d4de87
JWT_SECRET=9bff4221ac9f0a5158524b4dd4bfb1899755856f86bd7f25e8a7c0b3b7673c6b
```

## Project Structure

```
stalkerpda/
├── specs/                   # ✅ COMPLETE - All specifications
│   ├── game-mechanics/
│   │   └── FINAL-SPEC.md   # Complete game mechanics
│   ├── database/
│   │   └── schema.md       # Complete database schema
│   ├── api/
│   │   └── endpoints.md    # Complete API specification
│   └── frontend/
│       └── ui-spec.md      # Complete UI/UX specification
│
├── infrastructure/          # ✅ DEPLOYED - AWS infrastructure
│   ├── template.yaml       # SAM template
│   ├── scripts/
│   │   ├── deploy.sh       # Deployment script
│   │   └── check-status.sh # Status checker
│   └── README.md
│
├── backend/                 # ✅ COMPLETE - Python Lambda functions
│   ├── src/
│   │   ├── config.py       # ✅ Configuration
│   │   ├── database.py     # ✅ MySQL connection utilities
│   │   ├── models/
│   │   │   └── schemas.py  # ✅ Pydantic models
│   │   ├── utils/
│   │   │   ├── auth.py     # ✅ JWT, bcrypt, QR generation
│   │   │   ├── geo.py      # ✅ Haversine distance, radius checks
│   │   │   └── game.py     # ✅ Game mechanics (loot, prices)
│   │   ├── middleware/
│   │   │   └── auth.py     # ✅ @require_auth, @require_gm decorators
│   │   └── handlers/
│   │       ├── auth.py     # ✅ login, register, me
│   │       ├── location.py # ✅ update with zone/artifact detection
│   │       ├── artifacts.py # ✅ list, extract, complete, cancel, drop
│   │       ├── players.py  # ✅ list, death, loot
│   │       ├── contracts.py # ✅ CRUD, accept, complete, confirm
│   │       ├── zones.py    # ✅ list, capture, complete, cancel
│   │       ├── admin.py    # ✅ GM functions, spawn, zones
│   │       └── websocket.py # ✅ connect, disconnect, message
│   └── requirements.txt
│
├── database/                # ✅ COMPLETE - Migrations
│   ├── migrations/
│   │   ├── 001_initial_schema.sql  # ✅ 18 tables
│   │   └── 002_seed_data.sql       # ✅ 8 artifacts, 9 equipment
│   └── run_migrations.sh           # ✅ Applied to RDS
│
├── frontend/                # 🚧 IN PROGRESS (40%) - React frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── layout/     # ✅ PDALayout with Header/Footer
│   │   ├── pages/          # ✅ Login, Map, Inventory, Contracts, Profile
│   │   ├── stores/         # ✅ Auth store with cookies
│   │   ├── services/       # ✅ API client with CORS
│   │   └── utils/          # ✅ Cookie utilities
│   ├── index.html          # ✅ Google Translate widget
│   ├── package.json        # ✅ React 18 + TypeScript + Vite
│   └── dist/               # ✅ Deployed to CloudFront
│
├── admin/                   # ✅ COMPLETE - Admin Panel (Game Master)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx      # ✅ GM authentication
│   │   │   ├── DashboardPage.tsx  # ✅ Overview & stats
│   │   │   ├── PlayersPage.tsx    # ✅ Player management
│   │   │   ├── ArtifactsPage.tsx  # ✅ Spawn artifacts
│   │   │   ├── ZonesPage.tsx      # ✅ Create/manage zones
│   │   │   └── ContractsPage.tsx  # ✅ Contract management
│   │   ├── components/     # ✅ Reusable UI components
│   │   ├── services/       # ✅ API client
│   │   ├── stores/         # ✅ Auth store
│   │   └── utils/          # ✅ Utilities
│   ├── package.json        # ✅ React 18 + TypeScript + Vite
│   └── dist/               # ✅ Deployed separately
│
├── docs/
│   ├── base_scripts/       # Setup prompts and guides
│   └── makets/             # UI mockups
│
├── Makefile                # Deployment commands
├── .env.local              # Secrets (gitignored)
└── AGENT_GUIDE.md          # This file
```

## Development Status

### ✅ Completed (100%)

1. **Specifications (100%)**
   - ✅ Game mechanics fully defined (specs/game-mechanics/FINAL-SPEC.md)
   - ✅ Database schema designed - 18 tables (specs/database/schema.md)
   - ✅ API endpoints specified - 50+ endpoints (specs/api/endpoints.md)
   - ✅ Frontend UI/UX designed - 8 screens (specs/frontend/ui-spec.md)
   - ✅ **Inventory system v2.0** - Equipment slots + backpack (specs/inventory-system-spec.md)
   - ✅ **Trading system** - Buy/sell with traders (specs/trading-system-spec.md)
   - ✅ **Quest system** - Enhanced contracts with progress tracking (specs/quest-system-spec.md) **NEW 2026-01-11**
   - ✅ **Artifact respawn** - Auto-respawn mechanics (specs/artifact-respawn-spec.md) **NEW 2026-01-11**

2. **Infrastructure (100%)**
   - ✅ AWS deployed and working
   - ✅ RDS MySQL accessible and configured
   - ✅ Lambda functions created and deployed
   - ✅ API Gateway configured with CORS
   - ✅ CloudFront + S3 for frontend

3. **Database (100%)**
   - ✅ 18 tables created and migrated
   - ✅ Migrations applied to RDS (database/migrations/)
   - ✅ Roles system: `player_roles` table with `is_gm`, `is_bartender`, `permissions`
   - ✅ Seed data loaded:
     - 8 artifact types (Moonlight, Flash, Droplet, Fireball, Gravi, Crystal, Battery, Mica)
     - 9 equipment types (3 armors, 3 rings, 3 anti-rads)
   - ✅ **Trading system tables** (004_trading_system.sql) **NEW 2026-01-07**
     - item_definitions (7 items: medkit, bandage, anti-rad, BBs, beer, energy drink, food)
     - player_items (backpack)
     - traders (NPC: Sidorovich)
     - trader_inventory
     - trade_sessions
     - trade_transactions
   - ⏳ **Inventory v2.0 migration pending** (003_inventory_system_v2.sql)

4. **Backend (100%)**
   - ✅ Configuration system (src/config.py)
   - ✅ Database connection utilities (src/database.py)
   - ✅ Authentication utilities - JWT, QR generation (src/utils/auth_simple.py)
   - ✅ Geolocation utilities - Haversine distance (src/utils/geo.py)
   - ✅ Game mechanics utilities - loot, prices (src/utils/game.py)
   - ✅ Auth middleware - @require_auth, @require_gm (src/middleware/auth.py)
   - ✅ **ALL 9 HANDLERS FULLY IMPLEMENTED:**
     - auth.py (login, register, me) ✅
     - location.py (update with zone/artifact detection) ✅
     - artifacts.py (list, extract, complete, cancel, drop) ✅
     - players.py (list, death, loot) ✅
     - contracts.py (list, my, create, accept, complete, confirm) ✅
     - zones.py (list, capture, complete, cancel) ✅
     - admin.py (players map, history, spawn artifacts, create zones) ✅
     - websocket.py (connect, disconnect, message) ✅
     - **trade.py (session, catalog, backpack, buy, sell, redeem)** ✅ **NEW 2026-01-07**
   - ⏳ **Inventory handler pending** (inventory.py with 6 endpoints)

5. **Testing (100%)**
   - ✅ Smoke test suite (tests/smoke-test.sh)
   - ✅ Full API test suite (tests/api-tests.sh)
   - ✅ All 8 tests passing
   - ✅ Automated testing via `make test` and `make smoke-test`

6. **Frontend (60% → 70%)**
   - ✅ React 18 + TypeScript + Vite setup
   - ✅ TailwindCSS with PDA theme (CRT effects, scanlines)
   - ✅ Unified Layout (Header with stats, Footer navigation)
   - ✅ Login/Register page with faction selection (English UI)
   - ✅ Auth store with JWT in cookies (not localStorage)
   - ✅ **Auth validation** - Token check on page load and route changes ⭐ **NEW 2026-01-06**
   - ✅ **ProtectedRoute** - Validates cookies/localStorage on every navigation ⭐ **NEW**
   - ✅ API client with auto token injection + CORS support
   - ✅ Google Translate widget (EN/RU/UK/EL) - collapsible button
   - ✅ Map page with Leaflet integration
   - ✅ Artifact detection on map (15m radius)
   - ✅ Artifact modal with details (image, description, effects)
   - ✅ Artifact extraction with 30s hold button (2m radius)
   - ✅ **Inventory page v2.0** - Equipment slots + backpack ⭐ **NEW 2026-01-04**
   - ✅ **Context menu** - Click item for actions ⭐ **NEW**
   - ✅ **Item details modal** - Photo, description, stats ⭐ **NEW**
   - ✅ Contracts page with contracts list
   - ✅ Profile page with full stats and QR code
   - ✅ Deployed to CloudFront
   - ⏳ Real-time updates via WebSocket
   - ⏳ Contract acceptance/completion flow
   - ⏳ Zone capture mechanics

7. **Admin Panel (100%)**
   - ✅ Separate React app for Game Masters
   - ✅ GM authentication (requires is_gm=1 in database)
   - ✅ **Auth validation** - Token check on page load and route changes ⭐ **NEW 2026-01-06**
   - ✅ **ProtectedRoute** - Validates localStorage + GM status on every navigation ⭐ **NEW**
   - ✅ Dashboard with overview & stats
   - ✅ Players management page with search, filters, and status toggle
   - ✅ Artifacts spawning interface with interactive map and time controls
   - ✅ Artifact management: Reset to Map, Delete spawn
   - ✅ Spawned artifacts list with status (Collected, Active, Expired, Lost)
   - ✅ Zones creation and management
   - ✅ Contracts management
   - ✅ Deployed separately from main frontend
   - ✅ Image upload through Lambda (base64) to avoid CORS issues
   - ✅ Player status management (enable/disable accounts)

### Artifact Spawning System

**Admin Interface (Spawn Artifacts Page):**
- Visual artifact type selection (grid with images)
- Interactive Leaflet map for coordinate selection (click to place)
- Two time modes:
  - **Duration (hours):** Artifact expires N hours from now (1-168 hours)
  - **Exact Time:** Specify start and end datetime (time range)
- Edit mode: Click on spawned artifact to edit location/time
- List of active artifacts with status indicators (Editing, Expired, Collected)

**Database Schema:**
```sql
-- artifacts table
id VARCHAR(36) PRIMARY KEY
type_id VARCHAR(36) -- FK to artifact_types
latitude DECIMAL(10,8)
longitude DECIMAL(11,8)
state ENUM('hidden','visible','extracting','extracted','lost')
spawned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
expires_at TIMESTAMP NULL  -- When artifact becomes inactive
```

**Backend Endpoints:**
- `POST /api/admin/artifacts/spawn` - Create artifact (requires GM)
  - Body: `{typeId, latitude, longitude, expiresAt?}`
  - Handler: `src.handlers.admin.spawn_artifact_handler`
- `GET /api/admin/artifacts/spawned` - List all spawned artifacts (requires GM)
  - Returns: artifacts with type_name, coordinates, state, timestamps
  - Handler: `src.handlers.admin.get_spawned_artifacts_handler`
- `DELETE /api/admin/artifacts/{id}` - Remove artifact (requires GM)
  - Handler: `src.handlers.admin.delete_artifact_handler`

**Frontend Detection (PDA):**
- Players detect artifacts within 15m radius (see `specs/game-mechanics/FINAL-SPEC.md`)
- Detection happens on location update: `POST /api/location/update`
- Backend checks: `distance(player_location, artifact_location) <= 15m`
- Returns nearby artifacts in response
- Artifacts must be: `state='hidden'` AND `(expires_at IS NULL OR expires_at > NOW())`

**Key Implementation Notes:**
- All timestamps MUST include 'Z' suffix (UTC indicator)
- Leaflet map auto-centers on user's geolocation
- Edit mode: delete old + create new (no UPDATE endpoint)
- Expired artifacts shown in list but not returned to players
- Artifact types stored in `artifact_types` table (managed via Artifacts Library page)

### ⏳ TODO (30%)
- **Quest System Frontend** - UI for quests page, map markers, bartender creation
- **Frontend features** - Real-time WebSocket updates, contract/zone mechanics UI
- **Advanced features** - Push notifications, PWA, offline mode

### ✅ Recently Completed (2026-01-11)

**Quest System Backend:**
- ✅ Database migrations (006_quest_system.sql, 007_artifact_respawn.sql)
- ✅ Quest progress tracking utilities (src/utils/quest.py)
- ✅ Reputation system (src/utils/reputation.py)
- ✅ Artifact respawn utilities (src/utils/respawn.py)
- ✅ Quest handlers (src/handlers/quests.py) - 12 endpoints
- ✅ Integration with death handler (fail quests on death)
- ✅ Integration with artifact pickup (collection quest progress)
- ✅ Integration with location update (patrol/visit quest progress + respawn activation)
- ✅ Admin spawn artifact with respawn settings

## Quick Commands

### Deployment

**⚠️ See "Development Workflow" section above for recommended approach!**

```bash
# RECOMMENDED: Start sam sync for automatic deployments
source .env.local
sam sync --template infrastructure/template.yaml \
  --stack-name pda-zone-dev --watch --profile stalker --region eu-north-1 \
  --parameter-overrides Environment=dev DBUsername=pda_admin DBPassword=$DB_PASSWORD JWTSecret=$JWT_SECRET AllowedIP=0.0.0.0/0

# Full deployment (only when changing template.yaml or for releases)
sam build --template infrastructure/template.yaml
sam deploy --template-file .aws-sam/build/template.yaml \
  --stack-name pda-zone-dev --region eu-north-1 \
  --capabilities CAPABILITY_IAM --resolve-s3 \
  --parameter-overrides Environment=dev DBUsername=pda_admin DBPassword=$DB_PASSWORD JWTSecret=$JWT_SECRET AllowedIP=0.0.0.0/0 \
  --no-confirm-changeset --profile stalker

# Frontend only
make deploy-fe ENVIRONMENT=dev

# Admin panel only
make deploy-admin ENVIRONMENT=dev

# ⚠️ IMPORTANT: After deploying frontend/admin, invalidate CloudFront cache!
aws cloudfront create-invalidation --distribution-id E1LX6WLS4JUEVL --paths "/*" --profile stalker  # Frontend
aws cloudfront create-invalidation --distribution-id E3FHC7M1Y2KICX --paths "/*" --profile stalker  # Admin

# Check status
./infrastructure/scripts/check-status.sh

# View logs
make logs ENVIRONMENT=dev
```

### Database
```bash
# Connect to MySQL
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
      -u pda_admin -p pda_zone
# Password: 4c78768f1a2191ef978adafa18d4de87

# Run migrations (if needed)
cd database && DB_PASSWORD="4c78768f1a2191ef978adafa18d4de87" ./run_migrations.sh

# Grant GM role to a player
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
      -u pda_admin -p"4c78768f1a2191ef978adafa18d4de87" pda_zone \
      -e "INSERT INTO player_roles (player_id, is_gm) VALUES ('PLAYER_ID', 1) 
          ON DUPLICATE KEY UPDATE is_gm = 1;"

# Check GM users
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
      -u pda_admin -p"4c78768f1a2191ef978adafa18d4de87" pda_zone \
      -e "SELECT p.nickname, p.email, pr.is_gm FROM players p 
          LEFT JOIN player_roles pr ON p.id = pr.player_id 
          WHERE pr.is_gm = 1;"
```

### Testing API
```bash
# Quick smoke test (30 seconds) - Run after every deployment
make smoke-test

# Full API test suite - All 8 tests passing ✅
make test

# Test results:
# ✅ Registration
# ✅ Login  
# ✅ Get Profile (JWT auth)
# ✅ Location Update
# ✅ Get Artifacts
# ✅ Get Contracts
# ✅ Get Zones
# ✅ Invalid Token Rejection
```

### Frontend Testing
```bash
# Open in browser
open https://d384azcb4go67w.cloudfront.net

# Test flow:
# 1. Register new account (nickname, email, password, faction)
# 2. Login with credentials
# 3. Check cookies in DevTools (pda_token, pda_player_id, pda_nickname)
# 4. Navigate between pages (Map, Inventory, Contracts, Profile)
# 5. Test Google Translate widget (🌐 button in bottom-right)
# 6. Logout and verify cookies are cleared
```

### Admin Panel Testing
```bash
# Open in browser
open https://d3gda670zz1dlb.cloudfront.net

# Test flow:
# 1. Login with GM account (requires is_gm=1 in database)
# 2. Dashboard - view stats and overview
# 3. Players - manage player accounts (search, filter, toggle status)
# 4. Artifacts - spawn artifacts at coordinates
# 5. Zones - create and manage radiation zones
# 6. Contracts - manage contracts

# Players Page Features:
# - Search by nickname, ID, or email
# - Filter by status (All / Active / Inactive)
# - View faction, last online, lives, radiation
# - Toggle player status (alive/dead) to enable/disable accounts
# - Inactive players cannot login to PDA or admin panel
```

## Next Steps (Priority Order)

1. **WebSocket Integration** 🎯 NEXT PRIORITY
   - Real-time player location updates
   - Live artifact spawns
   - Zone status changes
   - Contract notifications

2. **Enhanced Testing**
   - Add integration tests for artifact extraction flow
   - Test contract completion flow
   - Test zone capture mechanics

3. **Production Hardening**
   - Replace SHA256 password hashing with bcrypt (requires Lambda Layer)
   - Add rate limiting
   - Implement proper error logging
   - Add monitoring and alerts
   - Setup CI/CD pipeline

4. **Advanced Features**
   - Push notifications for nearby artifacts/zones
   - PWA support for offline mode
   - Player movement history tracking

## Known Issues & Notes

### Authentication & Security

**Token Validation (2026-01-06):**
- ✅ Both PDA and Admin validate JWT tokens on every page load and route change
- ✅ PDA checks cookies directly (`pda_token`) via `ProtectedRoute` component
- ✅ Admin checks localStorage (`admin-auth`) and validates GM status
- ✅ Invalid/expired tokens trigger automatic logout and redirect to login
- ✅ Works without page refresh - validates on SPA navigation

**Implementation:**
- `frontend/src/components/ProtectedRoute.tsx` - Validates cookies on route change
- `admin/src/components/ProtectedRoute.tsx` - Validates localStorage + GM status
- Both call `/api/auth/me` endpoint to verify token validity
- `useEffect` with `location.pathname` dependency triggers on navigation

**Password Hashing:** Currently using SHA256 for simplicity. This is NOT production-ready. For production, implement bcrypt using AWS Lambda Layers.

### Binary Dependencies Resolution
**Solution Applied:** Removed pydantic, bcrypt, and cryptography dependencies. Using pure Python alternatives:
- JWT: pyjwt library
- Password hashing: hashlib.sha256 (temporary, replace with bcrypt for production)
- No Pydantic validation (manual validation in handlers)

This allows local builds without Docker and avoids GLIBC version mismatches in Lambda runtime.

### CORS Configuration
API Gateway CORS is configured to allow:
- Origins: * (all origins for development)
- Methods: GET, POST, PUT, DELETE, OPTIONS
- Headers: Content-Type, Authorization, X-Amz-Date, X-Api-Key, X-Amz-Security-Token

**⚠️ IMPORTANT: All Lambda handlers MUST return CORS headers:**

```python
return {
    'statusCode': 200,
    'headers': {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    },
    'body': json.dumps({...})
}
```

**Common CORS Issues:**
1. **Missing headers in response** - Always include all 4 CORS headers in every Lambda response
2. **502 Bad Gateway** - Usually means Lambda function doesn't exist or has wrong handler path
3. **OPTIONS preflight fails** - API Gateway handles OPTIONS automatically, but Lambda must return CORS headers
4. **New endpoints fail** - Check that SAM template has correct handler path and function exists

**Quick Fix Checklist:**
- ✅ Lambda handler returns all CORS headers (Origin, Headers, Methods)
- ✅ SAM template has correct `Handler: src.handlers.module.function_name`
- ✅ Function is deployed (`sam build && sam deploy`)
- ✅ CloudFront cache invalidated if using CloudFront

### Timezone Handling

**⚠️ CRITICAL: All timestamps MUST include UTC indicator**

**Database:**
- MySQL timezone: `UTC`
- All TIMESTAMP columns store UTC time
- Python datetime objects from MySQL are naive (no timezone info)

**Backend (Python):**
```python
# ✅ CORRECT - Add 'Z' suffix to indicate UTC
'timestamp': datetime_obj.isoformat() + 'Z' if datetime_obj else None

# ❌ WRONG - JavaScript will interpret as local time
'timestamp': datetime_obj.isoformat() if datetime_obj else None
```

**Frontend (JavaScript):**
```javascript
// ✅ CORRECT - With 'Z' suffix, Date parses as UTC
new Date('2026-01-03T09:07:53Z')  // Converts to local: 11:07 in Kyiv (UTC+2)

// ❌ WRONG - Without 'Z', Date parses as local time
new Date('2026-01-03T09:07:53')   // Treats as 09:07 local time (incorrect)
```

**Creating timestamps:**
```javascript
// For duration (hours from now)
const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()

// For exact datetime (from datetime-local input)
const expiresAt = new Date(exactDateTime).toISOString()  // Converts local to UTC
```

**Displaying timestamps:**
```javascript
// Automatically converts UTC to user's local time
new Date(utcTimestamp).toLocaleString('en-GB', {
  year: 'numeric',
  month: '2-digit', 
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
})
```

**Common Issues:**
- Missing 'Z' suffix → 2-hour offset in Kyiv timezone
- Using `getTimezoneOffset()` → unnecessary, Date handles it automatically
- Comparing UTC and local times → always use `.getTime()` (milliseconds since epoch)

### Database Access
RDS instance is publicly accessible (AllowedIP=0.0.0.0/0) for development. Restrict this in production.

### Roles System
**Structure:**
- `players` table - no role field (removed to avoid confusion)
- `player_roles` table - contains `player_id`, `is_gm`, `is_bartender`, `permissions` (JSON)
- Backend uses LEFT JOIN to fetch role data: `SELECT ... FROM players p LEFT JOIN player_roles pr ON p.id = pr.player_id`

**Admin Access:**
- Admin panel requires `is_gm = 1` in `player_roles` table
- Login endpoint returns `is_gm` boolean in response
- Frontend checks `data.is_gm` and rejects non-GM users

**Player Status Management:**
- Players can be set to `status = 'dead'` to disable their account
- Inactive players (status='dead') cannot login to PDA or GM admin
- Login returns `403 ACCOUNT_INACTIVE` error for disabled accounts
- Use Players page in admin panel to toggle player status

**Grant GM Access:**
```sql
INSERT INTO player_roles (player_id, is_gm) 
VALUES ('player-uuid-here', 1) 
ON DUPLICATE KEY UPDATE is_gm = 1;
```

**Disable Player Account:**
```sql
UPDATE players SET status = 'dead' WHERE id = 'player-uuid-here';
```

### Image Upload System
**Architecture:**
- Frontend converts images to base64
- Upload via POST `/api/admin/upload` (Lambda API)
- Lambda decodes base64 and uploads to S3
- Returns public S3 URL

**Why not presigned URLs?**
- S3 presigned URLs with PUT method trigger CORS preflight
- Browser adds headers that cause CORS validation failures
- Direct upload through Lambda avoids all CORS issues

**S3 Configuration:**
- Bucket: `pda-zone-artifacts-dev-707694916945`
- CORS enabled for GET requests (public read)
- Bucket policy allows public read: `s3:GetObject` for all
- Images stored at: `artifacts/{uuid}.{ext}`

**To add CORS to S3 bucket:**
```bash
aws s3api put-bucket-cors --bucket BUCKET_NAME --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }]
}' --profile stalker --region eu-north-1
```

**To make bucket publicly readable:**
```bash
aws s3api put-bucket-policy --bucket BUCKET_NAME --policy '{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadGetObject",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::BUCKET_NAME/*"
  }]
}' --profile stalker --region eu-north-1
```

## Technical Details

### Cache System

**Version-based Cache Invalidation:**
- Table `cache_versions` with keys: `artifacts`, `zones`, `contracts`
- Each Lambda checks version before using cache
- Cache TTL: 15 minutes (artifacts), auto-invalidates on changes
- Invalidation triggers:
  - Artifact spawn/pickup/reset/delete
  - Zone creation/update
  - Contract creation/completion

**Performance:**
- Without cache: 120 queries/min (20 players × 6 updates/min)
- With cache: ~4 queries/min (97% reduction)
- Cache hit rate: >95%

### API Endpoints (All Working ✅)


### Backend Architecture
- **Runtime:** Python 3.12 on AWS Lambda
- **Database:** PyMySQL with connection pooling
- **Auth:** JWT tokens (HS256, 7-day expiration)
- **Validation:** Manual dict validation (no Pydantic)
- **Geolocation:** Haversine formula for distance calculations
- **Dependencies:** pyjwt, pymysql, geopy, boto3 (pure Python only)

### Key Game Mechanics Implemented
- Password hashing with SHA256 (temporary - use bcrypt for production)
- JWT token generation/validation
- QR code generation for players
- Distance calculations (Haversine) with GPS accuracy compensation
- Loot probability calculations (1-50% money, 1-5% equipment, 1-3% artifacts)
- Reputation-based pricing
- Radiation system (0-100 scale) with death/respawn mechanics
- Zone capture mechanics
- Artifact extraction with time delays
- Contract system with confirmation flow

### GPS Accuracy Compensation
All distance-based mechanics use dynamic radius adjustment:
```
effective_radius = base_radius + min(gps_accuracy, max_buffer)
```

| Mechanic | Base | Max Buffer | Effective |
|----------|------|------------|-----------|
| Artifact detection | 15m | 15m | 15-30m |
| Artifact pickup | 2m | 5m | 2-7m |
| Control point | 2m | 10m | 2-12m |
| Zone entry/exit | radius | 15m | +0-15m |
| Quest points | radius | 10m | +0-10m |

Frontend sends `accuracy` from `navigator.geolocation.coords.accuracy`.
See `specs/game-mechanics/FINAL-SPEC.md` section 11 for details.

### Database Connection
- Connection pooling via context managers
- Auto-commit on success, rollback on error
- DictCursor for easy result handling

### Radiation & Death/Respawn System

**Radiation Accumulation:**
- Player accumulates radiation when inside a radiation zone
- Formula: `zone_level / 300 * time_in_zone * (1 - resist%)`
- Radiation resist from equipped artifacts (max 80% cap)
- Location updates every 15 seconds calculate radiation delta
- Key file: `backend/src/utils/radiation.py`

**Death:**
- At 100% radiation → player dies automatically
- Status set to `dead`, radiation resets to 0, loses 1 life
- Dead players cannot: pick up artifacts, trade, do quests
- Death triggered in `backend/src/handlers/location.py` via `trigger_death()`

**Respawn:**
- Dead player must physically go to a green respawn zone
- Progress fills while in zone (based on zone's `respawn_time_seconds`)
- When progress reaches 100%, "RESPAWN" button appears
- Manual button click required - no automatic resurrection
- Respawn resets radiation to 0
- Endpoint: `POST /api/player/respawn`

**UI Elements:**
- Header shows lives (❤️) and radiation (☢️) with color coding
- Yellow banner when in radiation zone: `☢️ RADIATION +X rad • ZoneName`
- Full-screen death banner with restrictions list
- Respawn zones shown as green dashed circles on map

### Key Tables
- `players` - user accounts (18 columns)
- `player_roles` - GM/bartender permissions
- `player_inventory` - artifacts/equipment owned
- `player_locations` - current location (updated every 15s)
- `artifacts` - spawned artifacts on map
- `artifact_types` - artifact definitions (10 types)
- `cache_versions` - version-based cache invalidation
- 18 tables total

## Cost Estimate

**Current (Free Tier):** $0/month for first 12 months

**After Free Tier:** ~$15-20/month
- RDS db.t3.micro: ~$12-15
- Lambda, API Gateway, S3, CloudFront: ~$3-5

## Important Notes

- CloudFront URL (d384azcb4go67w) cannot be customized without custom domain
- RDS is publicly accessible for development (change in production)
- **All 8 Lambda handlers fully implemented and tested** ✅
- Database has 18 tables with seed data (8 artifacts, 9 equipment types)
- Frontend is a React SPA with PDA-style UI (English interface)
- All API endpoints working and validated via automated tests
- **Currency:** Virtual in-game currency displayed as 💰 (money bag emoji) with thousand separators (e.g., 💰 5,000)
- **Auth:** JWT stored in cookies (pda_token, pda_player_id, pda_nickname) with 7-day expiration
- **CORS:** Fully configured on Lambda responses (Access-Control-Allow-Origin: *)
- **Translation:** Google Translate widget (EN/RU/UK/EL) in bottom-right corner

## Specifications Reference

All detailed specifications are in `specs/` directory:
- **Game Mechanics:** `specs/game-mechanics/FINAL-SPEC.md`
- **Inventory System v2.0:** `specs/inventory-system-spec.md` ⭐ **NEW 2026-01-03**
- **Database Schema:** `specs/database/schema.md`
- **API Endpoints:** `specs/api/endpoints.md`
- **Frontend UI:** `specs/frontend/ui-spec.md`

Refer to these specs when implementing features.

---

## Inventory System v2.0 (NEW)

**Status:** Specification complete, implementation pending  
**Full spec:** `specs/inventory-system-spec.md`  
**Changes:** `specs/inventory-system-CHANGES.md`

### Key Features

**Equipment Slots (4 total):**
- 1x Armor (wounds protection)
- 2x Rings (radiation resistance) - **reduced from 3**
- 1x Artifact (special bonuses) - **NEW slot**

**Backpack:**
- 50 item capacity (equipment slots NOT counted)
- Total: 54 items max (4 equipped + 50 backpack)

**Lives System:**
- Bonus lives from artifacts can resurrect from 0 lives
- Unequipping can kill player (lives can go negative)
- Players with 0 lives can still equip/unequip items

**Death & Looting:**
- All items: 1-10% loss on death (changed from 1-20% equipment, 100% artifacts)
- All items lootable (equipped + backpack)

**Operations:**
- Click item → context menu (Details, Equip/Unequip, Use, Drop, Sell)
- Details modal shows photo, description, stats
- Consumables use from backpack (no equipping)
- Sell only from backpack (must unequip first)

### Database Migration

**File:** `database/migrations/003_inventory_system_v2.sql`

**Changes:**
```sql
-- player_equipment table
- equipped: BOOLEAN                    ❌ REMOVED
+ slot_type: ENUM(...)                 ✅ ADDED
+ slot_position: INT                   ✅ ADDED

-- artifacts table
+ slot_type: ENUM('backpack','artifact') ✅ ADDED

-- players table
+ backpack_capacity: INT DEFAULT 50    ✅ ADDED
```

**Run migration:**
```bash
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
      -u pda_admin -p"$DB_PASSWORD" pda_zone \
      < database/migrations/003_inventory_system_v2.sql
```

### API Endpoints (NEW)

```
GET  /api/inventory              - Get full inventory
POST /api/inventory/equip        - Equip item from backpack
POST /api/inventory/unequip      - Unequip item to backpack
POST /api/inventory/use          - Use consumable
POST /api/inventory/drop         - Drop item (permanent)
POST /api/inventory/sell         - Sell item from backpack
```

### Implementation Priority

1. **Database migration** (003_inventory_system_v2.sql)
2. **Backend handler** (src/handlers/inventory.py)
3. **Update death/looting logic** (1-10% loss for all items)
4. **Frontend UI** (inventory screen with slots + backpack)
5. **Testing** (equip/unequip, lives, capacity limits)

### Breaking Changes

- Ring slots reduced from 3 to 2
- Artifacts in backpack are inactive (only equipped artifact gives bonuses)
- Must unequip items before selling
- Death item loss changed to 1-10% for all items
