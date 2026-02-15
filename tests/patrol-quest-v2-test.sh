#!/bin/bash
# Patrol Quest v2 Tests - Sequential Checkpoints
# NEED-010: Patrol Quest v2
# Run: ./tests/patrol-quest-v2-test.sh

API_URL="https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev"
TIMESTAMP=$(date +%s)
TEST_EMAIL="patrol_${TIMESTAMP}@zone.com"
TEST_NICKNAME="patrol_${TIMESTAMP}"
GM_EMAIL="gm_patrol_${TIMESTAMP}@zone.com"
GM_NICKNAME="gm_patrol_${TIMESTAMP}"

TOKEN=""
GM_TOKEN=""
PLAYER_ID=""
GM_ID=""
QUEST_ID=""

PASSED=0
FAILED=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "   ${GREEN}✅ $1${NC}"; ((PASSED++)); }
fail() { echo -e "   ${RED}❌ $1${NC}"; echo -e "   ${RED}Response: $2${NC}"; ((FAILED++)); }
section() { echo ""; echo -e "${YELLOW}━━━ $1 ━━━${NC}"; }

echo "🧪 Patrol Quest v2 Tests (NEED-010)"
echo "====================================="

# 3 checkpoints: ~100m apart near Limassol
CP1_LAT=34.766848
CP1_LNG=32.433766
CP2_LAT=34.767748
CP2_LNG=32.433766
CP3_LAT=34.768648
CP3_LNG=32.433766

# ============================================
section "1. SETUP"
# ============================================

echo "1.1 Register player..."
RESP=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"nickname\":\"$TEST_NICKNAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"test123\",\"faction\":\"stalker\"}")
if echo "$RESP" | jq -e '.token' > /dev/null 2>&1; then
  TOKEN=$(echo "$RESP" | jq -r '.token')
  PLAYER_ID=$(echo "$RESP" | jq -r '.id')
  pass "Register player"
else
  fail "Register player" "$RESP"
fi

echo "1.2 Register GM..."
RESP=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"nickname\":\"$GM_NICKNAME\",\"email\":\"$GM_EMAIL\",\"password\":\"test123\",\"faction\":\"duty\"}")
if echo "$RESP" | jq -e '.token' > /dev/null 2>&1; then
  GM_ID=$(echo "$RESP" | jq -r '.id')
  pass "Register GM"
else
  fail "Register GM" "$RESP"
fi

echo "1.3 Grant GM role..."
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
  -u pda_admin -p"4c78768f1a2191ef978adafa18d4de87" pda_zone \
  -e "INSERT INTO player_roles (player_id, is_gm) VALUES ('$GM_ID', 1) ON DUPLICATE KEY UPDATE is_gm = 1;" 2>/dev/null
pass "Grant GM role"

echo "1.4 Login as GM..."
RESP=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$GM_EMAIL\",\"password\":\"test123\"}")
if echo "$RESP" | jq -e '.is_gm' | grep -q true; then
  GM_TOKEN=$(echo "$RESP" | jq -r '.token')
  pass "Login as GM"
else
  fail "Login as GM" "$RESP"
fi

# ============================================
section "2. CREATE PATROL QUEST"
# ============================================

echo "2.1 Admin: Create patrol quest with 3 sequential checkpoints..."
RESP=$(curl -s -X POST "$API_URL/api/admin/quests" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\":\"Patrol Route Alpha\",
    \"description\":\"Visit 3 checkpoints in order\",
    \"questType\":\"patrol\",
    \"reward\":2000,
    \"rewardReputation\":50,
    \"issuerId\":\"$GM_ID\",
    \"questData\":{
      \"checkpoints\":[
        {\"lat\":$CP1_LAT,\"lng\":$CP1_LNG,\"radius\":30,\"visited\":false},
        {\"lat\":$CP2_LAT,\"lng\":$CP2_LNG,\"radius\":30,\"visited\":false},
        {\"lat\":$CP3_LAT,\"lng\":$CP3_LNG,\"radius\":30,\"visited\":false}
      ],
      \"checkpoint_visits\":[]
    }
  }")
if echo "$RESP" | jq -e '.id' > /dev/null 2>&1; then
  QUEST_ID=$(echo "$RESP" | jq -r '.id')
  pass "Create patrol quest (ID: ${QUEST_ID:0:8}...)"
else
  fail "Create patrol quest" "$RESP"
fi

echo "2.2 Verify quest_data has no time fields..."
RESP=$(curl -s "$API_URL/api/admin/quests" -H "Authorization: Bearer $GM_TOKEN")
QUEST_DATA=$(echo "$RESP" | jq -r ".quests[] | select(.id==\"$PLAYER_QUEST_ID\") | .questData")
if echo "$QUEST_DATA" | jq -e '.required_time_minutes' > /dev/null 2>&1; then
  fail "No time fields in quest_data" "Found required_time_minutes"
else
  pass "No time fields in quest_data"
fi

# ============================================
section "3. ACCEPT QUEST"
# ============================================

echo "3.1 Player accepts patrol quest..."
RESP=$(curl -s -X POST "$API_URL/api/quests/$QUEST_ID/accept" \
  -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | jq -e '.success' > /dev/null 2>&1; then
  PLAYER_QUEST_ID=$(echo "$RESP" | jq -r '.questId')
  pass "Accept patrol quest (Player Quest ID: ${PLAYER_QUEST_ID:0:8}...)"
else
  fail "Accept patrol quest" "$RESP"
fi

# ============================================
section "4. SEQUENTIAL CHECKPOINT TESTS"
# ============================================

echo "4.1 Visit checkpoint 2 FIRST (should NOT count — wrong order)..."
RESP=$(curl -s -X POST "$API_URL/api/location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\":$CP2_LAT,\"longitude\":$CP2_LNG,\"accuracy\":5}")
# Check quest_data — checkpoint 2 should still be unvisited
QUEST_RESP=$(curl -s "$API_URL/api/quests/active" -H "Authorization: Bearer $TOKEN")
CP2_VISITED=$(echo "$QUEST_RESP" | jq -r "[.quests[] | select(.id==\"$PLAYER_QUEST_ID\")] | .[0].questData.checkpoints[1].visited")
if [ "$CP2_VISITED" = "false" ]; then
  pass "Checkpoint 2 NOT counted (wrong order)"
else
  fail "Checkpoint 2 NOT counted (wrong order)" "visited=$CP2_VISITED"
fi

echo "4.2 Visit checkpoint 1 (correct — first in sequence)..."
RESP=$(curl -s -X POST "$API_URL/api/location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\":$CP1_LAT,\"longitude\":$CP1_LNG,\"accuracy\":5}")
QUEST_RESP=$(curl -s "$API_URL/api/quests/active" -H "Authorization: Bearer $TOKEN")
CP1_VISITED=$(echo "$QUEST_RESP" | jq -r "[.quests[] | select(.id==\"$PLAYER_QUEST_ID\")] | .[0].questData.checkpoints[0].visited")
if [ "$CP1_VISITED" = "true" ]; then
  pass "Checkpoint 1 counted (correct order)"
else
  fail "Checkpoint 1 counted" "visited=$CP1_VISITED"
fi

# Check questUpdates in location response
if echo "$RESP" | jq -e '.questUpdates[0].visitedCount' > /dev/null 2>&1; then
  VISITED_COUNT=$(echo "$RESP" | jq -r '.questUpdates[0].visitedCount')
  pass "questUpdates returned (visitedCount=$VISITED_COUNT)"
else
  fail "questUpdates in response" "$RESP"
fi

echo "4.3 Visit checkpoint 3 (should NOT count — checkpoint 2 not done)..."
RESP=$(curl -s -X POST "$API_URL/api/location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\":$CP3_LAT,\"longitude\":$CP3_LNG,\"accuracy\":5}")
QUEST_RESP=$(curl -s "$API_URL/api/quests/active" -H "Authorization: Bearer $TOKEN")
CP3_VISITED=$(echo "$QUEST_RESP" | jq -r "[.quests[] | select(.id==\"$PLAYER_QUEST_ID\")] | .[0].questData.checkpoints[2].visited")
if [ "$CP3_VISITED" = "false" ]; then
  pass "Checkpoint 3 NOT counted (checkpoint 2 not done)"
else
  fail "Checkpoint 3 NOT counted" "visited=$CP3_VISITED"
fi

echo "4.4 Visit checkpoint 2 (correct — next in sequence)..."
RESP=$(curl -s -X POST "$API_URL/api/location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\":$CP2_LAT,\"longitude\":$CP2_LNG,\"accuracy\":5}")
QUEST_RESP=$(curl -s "$API_URL/api/quests/active" -H "Authorization: Bearer $TOKEN")
CP2_VISITED=$(echo "$QUEST_RESP" | jq -r "[.quests[] | select(.id==\"$PLAYER_QUEST_ID\")] | .[0].questData.checkpoints[1].visited")
if [ "$CP2_VISITED" = "true" ]; then
  pass "Checkpoint 2 counted (correct order)"
else
  fail "Checkpoint 2 counted" "visited=$CP2_VISITED"
fi

# ============================================
section "5. AUTO-COMPLETE & REWARDS"
# ============================================

echo "5.1 Get player balance before completion..."
RESP=$(curl -s "$API_URL/api/auth/me" -H "Authorization: Bearer $TOKEN")
BALANCE_BEFORE=$(echo "$RESP" | jq -r '.balance')
echo "   Balance before: $BALANCE_BEFORE"

echo "5.2 Visit checkpoint 3 (last — should auto-complete)..."
RESP=$(curl -s -X POST "$API_URL/api/location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"latitude\":$CP3_LAT,\"longitude\":$CP3_LNG,\"accuracy\":5}")

# Check questCompleted in response
if echo "$RESP" | jq -e '.questCompleted[0].questId' > /dev/null 2>&1; then
  COMPLETED_TITLE=$(echo "$RESP" | jq -r '.questCompleted[0].title')
  COMPLETED_REWARD=$(echo "$RESP" | jq -r '.questCompleted[0].reward')
  COMPLETED_REP=$(echo "$RESP" | jq -r '.questCompleted[0].rewardReputation')
  pass "questCompleted returned (title=$COMPLETED_TITLE, reward=$COMPLETED_REWARD, rep=$COMPLETED_REP)"
else
  fail "questCompleted in response" "$RESP"
fi

echo "5.3 Verify quest status is completed..."
RESP=$(curl -s "$API_URL/api/quests/completed?status=completed" -H "Authorization: Bearer $TOKEN")
QUEST_STATUS=$(echo "$RESP" | jq -r "[.quests[] | select(.id==\"$PLAYER_QUEST_ID\")] | .[0].status")
if [ "$QUEST_STATUS" = "completed" ]; then
  pass "Quest status = completed"
else
  fail "Quest status = completed" "status=$QUEST_STATUS"
fi

echo "5.4 Verify reward money credited..."
RESP=$(curl -s "$API_URL/api/auth/me" -H "Authorization: Bearer $TOKEN")
BALANCE_AFTER=$(echo "$RESP" | jq -r '.balance')
EXPECTED=$(echo "$BALANCE_BEFORE + 2000" | bc)
echo "   Balance after: $BALANCE_AFTER (expected: $EXPECTED)"
if [ "$(echo "$BALANCE_AFTER >= $EXPECTED" | bc)" = "1" ]; then
  pass "Reward money credited (+2000)"
else
  fail "Reward money credited" "before=$BALANCE_BEFORE after=$BALANCE_AFTER expected=$EXPECTED"
fi

echo "5.5 Verify quest no longer in active list..."
RESP=$(curl -s "$API_URL/api/quests/active" -H "Authorization: Bearer $TOKEN")
ACTIVE_QUEST=$(echo "$RESP" | jq -r ".quests[] | select(.id==\"$PLAYER_QUEST_ID\") | .id")
if [ -z "$ACTIVE_QUEST" ]; then
  pass "Quest removed from active list"
else
  fail "Quest removed from active list" "Still in active: $ACTIVE_QUEST"
fi

# ============================================
section "6. CLEANUP"
# ============================================

echo "6.1 Delete test quest..."
RESP=$(curl -s -X DELETE "$API_URL/api/admin/quests/$QUEST_ID" \
  -H "Authorization: Bearer $GM_TOKEN")
pass "Cleanup: delete quest"

echo "6.2 Deactivate test users..."
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
  -u pda_admin -p"4c78768f1a2191ef978adafa18d4de87" pda_zone \
  -e "UPDATE players SET status='dead' WHERE id IN ('$PLAYER_ID','$GM_ID');" 2>/dev/null
pass "Cleanup: deactivate test users"

# ============================================
echo ""
echo "==============================="
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "==============================="

if [ $FAILED -gt 0 ]; then
  exit 1
fi
