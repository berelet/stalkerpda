# Radiation & Death System - Part 4: Testing & Deployment

---

## 10. Testing Strategy

### 10.1 Unit Tests

**File:** `backend/tests/test_radiation.py`

```python
import pytest
from src.utils.radiation import (
    calculate_time_in_zone,
    calculate_segment_in_circle,
    get_player_radiation_resist
)

def test_calculate_time_in_zone_stationary_inside():
    """Player not moving, inside zone"""
    P0 = {'lat': 50.0, 'lng': 30.0}
    P1 = {'lat': 50.0, 'lng': 30.0}
    zone = {
        'center_lat': 50.0,
        'center_lng': 30.0,
        'radius': 100
    }
    delta_t = 15
    
    time_inside = calculate_time_in_zone(P0, P1, zone, delta_t)
    assert time_inside == 15

def test_calculate_time_in_zone_stationary_outside():
    """Player not moving, outside zone"""
    P0 = {'lat': 50.0, 'lng': 30.0}
    P1 = {'lat': 50.0, 'lng': 30.0}
    zone = {
        'center_lat': 50.1, 
        'center_lng': 30.1,
        'radius': 10
    }
    delta_t = 15
    
    time_inside = calculate_time_in_zone(P0, P1, zone, delta_t)
    assert time_inside == 0

def test_calculate_time_in_zone_crossing():
    """Player crosses zone boundary"""
    P0 = {'lat': 50.0, 'lng': 30.0}  # Outside
    P1 = {'lat': 50.001, 'lng': 30.001}  # Inside
    zone = {
        'center_lat': 50.0005,
        'center_lng': 30.0005,
        'radius': 50
    }
    delta_t = 15
    
    time_inside = calculate_time_in_zone(P0, P1, zone, delta_t)
    assert 0 < time_inside < 15  # Partial time

def test_radiation_resist_calculation():
    """Test resist calculation from equipped items"""
    # Mock database cursor
    class MockCursor:
        def execute(self, query, params):
            pass
        
        def fetchall(self):
            # Armor: 10%, Addon1: 20%, Addon2: 15%
            return [
                {'radiation_resist': 10},
                {'radiation_resist': 20},
                {'radiation_resist': 15}
            ]
        
        def fetchone(self):
            # Artifact: 25%
            return {'radiation_resist': 25}
    
    cursor = MockCursor()
    resist = get_player_radiation_resist(cursor, 'player-id')
    
    # Total: 10 + 20 + 15 + 25 = 70%
    assert resist == 70

def test_radiation_resist_cap():
    """Test 80% resist cap"""
    class MockCursor:
        def execute(self, query, params):
            pass
        
        def fetchall(self):
            # Total: 90% (should be capped)
            return [
                {'radiation_resist': 30},
                {'radiation_resist': 30},
                {'radiation_resist': 30}
            ]
        
        def fetchone(self):
            return None
    
    cursor = MockCursor()
    resist = get_player_radiation_resist(cursor, 'player-id')
    
    # Capped at 80%
    assert resist == 80
```

### 10.2 Integration Tests

**File:** `tests/integration/test_radiation_flow.sh`

```bash
#!/bin/bash

API_URL="https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev"
TOKEN=""

# 1. Login as test player
echo "=== Test 1: Login ==="
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@stalker.com","password":"test123"}')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
PLAYER_ID=$(echo $LOGIN_RESPONSE | jq -r '.player.id')

echo "Token: $TOKEN"
echo "Player ID: $PLAYER_ID"

# 2. Create test radiation zone (as GM)
echo -e "\n=== Test 2: Create Radiation Zone ==="
ZONE_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/zones/radiation" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Zone",
    "centerLat": 50.0,
    "centerLng": 30.0,
    "radius": 100,
    "radiationLevel": 100,
    "activeFrom": null,
    "activeTo": null
  }')

ZONE_ID=$(echo $ZONE_RESPONSE | jq -r '.id')
echo "Zone ID: $ZONE_ID"

# 3. Update location inside zone (should accumulate radiation)
echo -e "\n=== Test 3: Enter Radiation Zone ==="
for i in {1..5}; do
  echo "Tick $i..."
  LOCATION_RESPONSE=$(curl -s -X POST "$API_URL/api/location/update" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "latitude": 50.0,
      "longitude": 30.0,
      "accuracy": 10
    }')
  
  RADIATION=$(echo $LOCATION_RESPONSE | jq -r '.radiationUpdate.current')
  echo "Radiation: $RADIATION"
  
  sleep 2  # Wait 2 seconds between ticks
done

# 4. Check if player died
echo -e "\n=== Test 4: Check Death ==="
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

STATUS=$(echo $PROFILE_RESPONSE | jq -r '.status')
LIVES=$(echo $PROFILE_RESPONSE | jq -r '.currentLives')
RADIATION=$(echo $PROFILE_RESPONSE | jq -r '.currentRadiation')

echo "Status: $STATUS"
echo "Lives: $LIVES"
echo "Radiation: $RADIATION"

if [ "$RADIATION" == "0" ]; then
  echo "✅ Radiation reset after death"
else
  echo "❌ Radiation not reset"
fi

# 5. Create respawn zone
echo -e "\n=== Test 5: Create Respawn Zone ==="
RESPAWN_RESPONSE=$(curl -s -X POST "$API_URL/api/admin/zones/respawn" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Test Respawn",
    "centerLat": 50.001,
    "centerLng": 30.001,
    "radius": 50,
    "respawnTimeSeconds": 30
  }')

RESPAWN_ID=$(echo $RESPAWN_RESPONSE | jq -r '.id')
echo "Respawn Zone ID: $RESPAWN_ID"

# 6. Move to respawn zone and wait for resurrection
echo -e "\n=== Test 6: Resurrection ==="
for i in {1..3}; do
  echo "Tick $i..."
  LOCATION_RESPONSE=$(curl -s -X POST "$API_URL/api/location/update" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "latitude": 50.001,
      "longitude": 30.001,
      "accuracy": 10
    }')
  
  PROGRESS=$(echo $LOCATION_RESPONSE | jq -r '.resurrectionUpdate.progress')
  RESURRECTED=$(echo $LOCATION_RESPONSE | jq -r '.resurrectionUpdate.resurrected')
  
  echo "Progress: $PROGRESS / 30"
  
  if [ "$RESURRECTED" == "true" ]; then
    echo "✅ Player resurrected!"
    break
  fi
  
  sleep 15  # Wait 15 seconds between ticks
done

# 7. Cleanup
echo -e "\n=== Cleanup ==="
curl -s -X DELETE "$API_URL/api/admin/zones/radiation/$ZONE_ID" \
  -H "Authorization: Bearer $TOKEN"
curl -s -X DELETE "$API_URL/api/admin/zones/respawn/$RESPAWN_ID" \
  -H "Authorization: Bearer $TOKEN"

echo "✅ Test complete"
```

### 10.3 Manual Testing Checklist

**Radiation Accumulation:**
- [ ] Player enters radiation zone → radiation increases
- [ ] Player exits radiation zone → radiation stops increasing
- [ ] Player with 50% resist → radiation increases at 50% rate
- [ ] Player with 80% resist → radiation increases at 20% rate
- [ ] Player reaches 100 radiation → dies immediately
- [ ] Multiple overlapping zones → only first-entered zone applies

**Death:**
- [ ] Death decrements lives by 1
- [ ] Death resets radiation to 0
- [ ] Death triggers 1-10% item loss
- [ ] Death fails active quests
- [ ] Death with 0 lives → status = 'dead'

**Looting:**
- [ ] Scan victim QR → loot items (1-5% equipment, 1-3% artifacts)
- [ ] Scan same victim twice → error "ALREADY_LOOTED"
- [ ] Scan alive player → error "PLAYER_NOT_DEAD"

**Respawn:**
- [ ] Dead player with lives > 0 → can accumulate resurrection progress
- [ ] Dead player with lives = 0 → cannot resurrect
- [ ] Inside respawn zone → progress increases
- [ ] Outside respawn zone → progress pauses (not reset)
- [ ] Progress reaches required time → player resurrected

**Equipment:**
- [ ] Equip artifact with bonus lives → lives increase
- [ ] Unequip artifact with bonus lives → lives decrease
- [ ] Unequip artifact causing lives = 0 → player dies

**Admin:**
- [ ] Create radiation zone with time window → zone expires
- [ ] Create radiation zone with respawn → zone respawns after expiration
- [ ] Create respawn zone → visible on map
- [ ] Spawn artifact with pickup radiation → player gets radiation on pickup
- [ ] GM resurrect button → player status = 'alive'

---

## 11. AWS Free Tier Considerations

### 11.1 Cron Jobs for Radiation Calculation

**Problem:** Players not tracking location (phone off, no signal) still accumulate radiation.

**Solution Options:**

#### Option A: EventBridge + Lambda (Free Tier)
```yaml
# infrastructure/template.yaml

RadiationTickFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: src.handlers.cron.radiation_tick_handler
    Runtime: python3.12
    Timeout: 60
    Events:
      ScheduleEvent:
        Type: Schedule
        Properties:
          Schedule: rate(1 minute)  # Run every minute
          Enabled: true

# Handler: backend/src/handlers/cron.py
def radiation_tick_handler(event, context):
    """
    Cron job: Calculate radiation for all players in zones
    Runs every 1 minute
    """
    with get_db() as conn:
        with conn.cursor() as cursor:
            # Get all alive players in radiation zones
            cursor.execute("""
                SELECT p.id, p.current_radiation, p.current_radiation_zone_id,
                       p.last_radiation_calc_at,
                       pl.latitude, pl.longitude
                FROM players p
                JOIN player_locations pl ON p.id = pl.player_id
                WHERE p.status = 'alive'
                  AND p.current_radiation_zone_id IS NOT NULL
            """)
            
            players = cursor.fetchall()
            now = datetime.utcnow()
            
            for player in players:
                # Calculate radiation since last calc
                # Assume player hasn't moved (stationary in zone)
                P0 = {'lat': player['latitude'], 'lng': player['longitude']}
                P1 = P0  # No movement
                
                radiation_update = calculate_radiation_accrual(
                    cursor, player, P0, P1, now
                )
                
                # Check death
                if radiation_update['current'] >= 100:
                    trigger_death(cursor, player, reason='radiation_zone')
    
    return {'statusCode': 200, 'body': 'OK'}
```

**Free Tier Limits:**
- EventBridge: 1M events/month (free forever)
- Lambda: 1M requests/month + 400,000 GB-seconds compute (free forever)
- **Cost:** $0 for <1000 players

**Calculation:**
- 1 cron/minute = 43,200 invocations/month
- 100 players × 43,200 = 4.3M calculations/month
- Well within free tier

#### Option B: Client-side Calculation (No Cron)
```typescript
// frontend/src/services/radiation.ts

export function estimateRadiationWhileOffline(
  lastRadiation: number,
  lastCalcTime: Date,
  currentTime: Date,
  zoneRadiationLevel: number,
  resist: number
): number {
  const deltaSeconds = (currentTime.getTime() - lastCalcTime.getTime()) / 1000;
  
  // Assume player was stationary in zone
  const baseRate = zoneRadiationLevel / 300.0;  // per second
  const effectiveRate = baseRate * (1 - resist / 100.0);
  
  const deltaRad = effectiveRate * deltaSeconds;
  const estimatedRadiation = Math.min(100, lastRadiation + deltaRad);
  
  return estimatedRadiation;
}

// Show warning in UI if estimated radiation > 80
```

**Pros:**
- No server costs
- Instant feedback

**Cons:**
- Not authoritative (client can cheat)
- Death not triggered until next location update

**Recommendation:** Use Option A (EventBridge cron) - it's free and authoritative.

### 11.2 Database Queries Optimization

**Problem:** Cron job queries all players every minute → high DB load

**Solution:** Index optimization
```sql
-- Add indexes for cron queries
CREATE INDEX idx_players_alive_in_zone 
  ON players(status, current_radiation_zone_id, last_radiation_calc_at);

CREATE INDEX idx_player_locations_updated 
  ON player_locations(player_id, updated_at);
```

**Query optimization:**
```python
# Only process players who haven't updated location in >1 minute
cursor.execute("""
    SELECT p.id, p.current_radiation, p.current_radiation_zone_id,
           p.last_radiation_calc_at,
           pl.latitude, pl.longitude, pl.updated_at
    FROM players p
    JOIN player_locations pl ON p.id = pl.player_id
    WHERE p.status = 'alive'
      AND p.current_radiation_zone_id IS NOT NULL
      AND pl.updated_at < DATE_SUB(NOW(), INTERVAL 1 MINUTE)
""")
```

This filters out players actively tracking (they handle radiation in location updates).

---

## 12. Deployment Plan

### 12.1 Database Migration

```bash
# 1. Create migration file
cat > database/migrations/008_radiation_system.sql << 'EOF'
-- See Part 1 for full migration SQL
EOF

# 2. Apply migration
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
      -u pda_admin -p"$DB_PASSWORD" pda_zone \
      < database/migrations/008_radiation_system.sql

# 3. Verify
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
      -u pda_admin -p"$DB_PASSWORD" pda_zone \
      -e "SHOW COLUMNS FROM players LIKE 'current_radiation%';"
```

### 12.2 Backend Deployment

```bash
# 1. Add dependencies
echo "qrcode==7.4.2" >> backend/requirements.txt
echo "Pillow==10.2.0" >> backend-upload/requirements.txt

# 2. Start sam sync
source .env.local
./sync.sh

# 3. Deploy changes (files auto-detected)
# - src/handlers/location.py (modified)
# - src/handlers/players.py (modified)
# - src/handlers/admin.py (new endpoints)
# - src/utils/radiation.py (new)
# - src/utils/respawn.py (modified)
# - src/utils/qr.py (new)

# 4. Add cron function to template.yaml
# (see section 11.1)

# 5. Full deploy (for template changes)
sam build --template infrastructure/template.yaml
sam deploy --template-file .aws-sam/build/template.yaml \
  --stack-name pda-zone-dev --region eu-north-1 \
  --capabilities CAPABILITY_IAM --resolve-s3 \
  --parameter-overrides Environment=dev DBUsername=pda_admin DBPassword=$DB_PASSWORD JWTSecret=$JWT_SECRET AllowedIP=0.0.0.0/0 \
  --no-confirm-changeset --profile stalker
```

### 12.3 Frontend Deployment

```bash
# 1. Install dependencies
cd frontend
npm install react-qr-reader

# 2. Build
npm run build

# 3. Deploy
make deploy-fe ENVIRONMENT=dev

# 4. Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id E1LX6WLS4JUEVL \
  --paths "/*" \
  --profile stalker
```

### 12.4 Admin Panel Deployment

```bash
# 1. Build
cd admin
npm run build

# 2. Deploy
make deploy-admin ENVIRONMENT=dev

# 3. Invalidate cache
aws cloudfront create-invalidation \
  --distribution-id E3FHC7M1Y2KICX \
  --paths "/*" \
  --profile stalker
```

---

## 13. Rollback Plan

**If issues occur:**

```bash
# 1. Revert database migration
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
      -u pda_admin -p"$DB_PASSWORD" pda_zone \
      < database/migrations/008_radiation_system_rollback.sql

# 2. Revert backend (git)
git revert <commit-hash>
sam build && sam deploy

# 3. Revert frontend
git revert <commit-hash>
cd frontend && npm run build && make deploy-fe

# 4. Disable cron (if causing issues)
aws events disable-rule --name pda-zone-radiation-tick-dev --profile stalker
```

---

## 14. Success Metrics

**After deployment, verify:**

- [ ] Radiation accumulates correctly (test with 100/5min zone)
- [ ] Death triggers at 100 radiation
- [ ] Item loss works (1-10% on death)
- [ ] Looting works (QR scan)
- [ ] Respawn zones work (timer accumulates)
- [ ] Equipment bonus lives work (equip/unequip)
- [ ] Admin can create zones with time windows
- [ ] Admin can spawn artifacts with radiation
- [ ] Cron job runs without errors (check CloudWatch logs)
- [ ] No performance degradation (API response time <500ms)

**Monitoring:**
```bash
# Check cron logs
aws logs tail /aws/lambda/pda-zone-radiation-tick-dev --follow --profile stalker

# Check API errors
aws logs tail /aws/lambda/pda-zone-location-dev --follow --profile stalker
```

---

## 15. Documentation Updates

**Update files:**
- [ ] `AGENT_GUIDE.md` - Add radiation system section
- [ ] `README.md` - Update feature list
- [ ] `specs/api/endpoints.md` - Add new endpoints
- [ ] `specs/database/schema.md` - Update schema

---

## 16. Future Enhancements (Post-MVP)

**Not in this implementation:**
- Real-time WebSocket notifications for radiation/death
- Faction-specific respawn zones
- Radiation healing items (anti-rads already exist)
- Radiation damage over time (wounds)
- Radiation zones with variable levels (distance-based)
- Player radiation history graphs
- Heatmap of radiation deaths

---

**END OF SPECIFICATION**

Total implementation time estimate: **2-3 weeks**
- Week 1: Database + Backend (radiation, death, respawn)
- Week 2: Frontend PDA (UI, QR, looting)
- Week 3: Admin Panel + Testing + Deployment
