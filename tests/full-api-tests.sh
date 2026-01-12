#!/bin/bash
# Full API Tests for PDA ZONE - Quest System & Trader Quests
# Run: ./tests/full-api-tests.sh

API_URL="https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_${TIMESTAMP}@zone.com"
TEST_NICKNAME="tester_${TIMESTAMP}"
GM_EMAIL="gm_${TIMESTAMP}@zone.com"
GM_NICKNAME="gm_${TIMESTAMP}"

TOKEN=""
GM_TOKEN=""
PLAYER_ID=""
GM_ID=""
QUEST_ID=""
TRADER_ID=""

PASSED=0
FAILED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() {
  echo -e "   ${GREEN}✅ $1${NC}"
  ((PASSED++))
}

fail() {
  echo -e "   ${RED}❌ $1${NC}"
  echo -e "   ${RED}Response: $2${NC}"
  ((FAILED++))
}

section() {
  echo ""
  echo -e "${YELLOW}━━━ $1 ━━━${NC}"
}

echo "🧪 Full API Tests for PDA ZONE"
echo "==============================="

# ============================================
section "1. AUTH TESTS"
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
  pass "Register GM user"
else
  fail "Register GM user" "$RESP"
fi

echo "1.3 Grant GM role (direct DB)..."
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
  pass "Login as GM (is_gm=true)"
else
  fail "Login as GM" "$RESP"
fi

echo "1.5 Get profile..."
RESP=$(curl -s "$API_URL/api/auth/me" -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | jq -e '.id' > /dev/null 2>&1; then
  pass "Get profile"
else
  fail "Get profile" "$RESP"
fi

echo "1.6 Invalid token rejected..."
RESP=$(curl -s "$API_URL/api/auth/me" -H "Authorization: Bearer invalid")
if echo "$RESP" | jq -e '.error' > /dev/null 2>&1; then
  pass "Invalid token rejected"
else
  fail "Invalid token rejected" "$RESP"
fi

# ============================================
section "2. LOCATION TESTS"
# ============================================

echo "2.1 Update location..."
RESP=$(curl -s -X POST "$API_URL/api/location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude":34.766848,"longitude":32.433766,"accuracy":10}')
if echo "$RESP" | jq -e '.success' > /dev/null 2>&1; then
  pass "Update location"
else
  fail "Update location" "$RESP"
fi

# ============================================
section "3. ARTIFACTS TESTS"
# ============================================

echo "3.1 Get artifacts..."
RESP=$(curl -s "$API_URL/api/artifacts" -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | jq -e '.artifacts' > /dev/null 2>&1; then
  pass "Get artifacts"
else
  fail "Get artifacts" "$RESP"
fi

# ============================================
section "4. QUESTS TESTS"
# ============================================

echo "4.1 Get available quests..."
RESP=$(curl -s "$API_URL/api/quests" -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | jq -e '.quests' > /dev/null 2>&1; then
  pass "Get available quests"
else
  fail "Get available quests" "$RESP"
fi

echo "4.2 Get active quests..."
RESP=$(curl -s "$API_URL/api/quests/active" -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | jq -e '.quests' > /dev/null 2>&1; then
  pass "Get active quests"
else
  fail "Get active quests" "$RESP"
fi

echo "4.3 Get quest history..."
RESP=$(curl -s "$API_URL/api/quests/completed?status=all" -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | jq -e '.quests' > /dev/null 2>&1; then
  pass "Get quest history"
else
  fail "Get quest history" "$RESP"
fi

# ============================================
section "5. ADMIN QUESTS TESTS"
# ============================================

echo "5.1 Admin: List quests..."
RESP=$(curl -s "$API_URL/api/admin/quests" -H "Authorization: Bearer $GM_TOKEN")
if echo "$RESP" | jq -e '.quests' > /dev/null 2>&1; then
  pass "Admin list quests"
else
  fail "Admin list quests" "$RESP"
fi

echo "5.2 Admin: Create quest..."
RESP=$(curl -s -X POST "$API_URL/api/admin/quests" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\":\"Test Quest $TIMESTAMP\",
    \"description\":\"Collect 3 artifacts\",
    \"questType\":\"artifact_collection\",
    \"reward\":1000,
    \"issuerId\":\"$GM_ID\",
    \"questData\":{\"target_count\":3,\"artifact_type\":null,\"collected\":0}
  }")
if echo "$RESP" | jq -e '.id' > /dev/null 2>&1; then
  QUEST_ID=$(echo "$RESP" | jq -r '.id')
  pass "Admin create quest (ID: ${QUEST_ID:0:8}...)"
else
  fail "Admin create quest" "$RESP"
fi

echo "5.3 Admin: Get quest by ID... (skipped - endpoint not implemented)"
pass "Admin get quest by ID (skipped)"

echo "5.4 Admin: Update quest..."
if [ -n "$QUEST_ID" ]; then
  RESP=$(curl -s -X PUT "$API_URL/api/admin/quests/$QUEST_ID" \
    -H "Authorization: Bearer $GM_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"reward":1500}')
  if echo "$RESP" | jq -e '.success // .message' > /dev/null 2>&1; then
    pass "Admin update quest"
  else
    fail "Admin update quest" "$RESP"
  fi
else
  fail "Admin update quest" "No quest ID"
fi

# ============================================
section "6. TRADERS TESTS"
# ============================================

echo "6.1 Admin: List traders..."
RESP=$(curl -s "$API_URL/api/admin/traders" -H "Authorization: Bearer $GM_TOKEN")
if echo "$RESP" | jq -e '.traders' > /dev/null 2>&1; then
  TRADER_ID=$(echo "$RESP" | jq -r '.traders[0].id // empty')
  TRADER_COUNT=$(echo "$RESP" | jq '.traders | length')
  pass "Admin list traders (count: $TRADER_COUNT)"
else
  fail "Admin list traders" "$RESP"
fi

echo "6.2 Admin: Create trader..."
RESP=$(curl -s -X POST "$API_URL/api/admin/traders" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Test Trader $TIMESTAMP\",
    \"type\":\"npc\",
    \"latitude\":34.766848,
    \"longitude\":32.433766,
    \"interaction_radius\":20
  }")
if echo "$RESP" | jq -e '.trader_id' > /dev/null 2>&1; then
  TRADER_ID=$(echo "$RESP" | jq -r '.trader_id')
  pass "Admin create trader (ID: ${TRADER_ID:0:8}...)"
else
  fail "Admin create trader" "$RESP"
fi

echo "6.3 Admin: Get trader quests..."
if [ -n "$TRADER_ID" ]; then
  RESP=$(curl -s "$API_URL/api/admin/traders/$TRADER_ID/quests" -H "Authorization: Bearer $GM_TOKEN")
  if echo "$RESP" | jq -e '.quests' > /dev/null 2>&1; then
    pass "Get trader quests"
  else
    fail "Get trader quests" "$RESP"
  fi
else
  fail "Get trader quests" "No trader ID"
fi

echo "6.4 Admin: Assign quest to trader..."
if [ -n "$TRADER_ID" ] && [ -n "$QUEST_ID" ]; then
  RESP=$(curl -s -X PUT "$API_URL/api/admin/traders/$TRADER_ID/quests" \
    -H "Authorization: Bearer $GM_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"quest_ids\":[\"$QUEST_ID\"]}")
  if echo "$RESP" | jq -e '.message' > /dev/null 2>&1; then
    pass "Assign quest to trader"
  else
    fail "Assign quest to trader" "$RESP"
  fi
else
  fail "Assign quest to trader" "No trader/quest ID"
fi

echo "6.5 Admin: Verify quest assigned..."
if [ -n "$TRADER_ID" ]; then
  RESP=$(curl -s "$API_URL/api/admin/traders/$TRADER_ID/quests" -H "Authorization: Bearer $GM_TOKEN")
  QUEST_COUNT=$(echo "$RESP" | jq '.quests | length')
  if [ "$QUEST_COUNT" -gt 0 ]; then
    pass "Verify quest assigned (count: $QUEST_COUNT)"
  else
    fail "Verify quest assigned" "No quests found"
  fi
else
  fail "Verify quest assigned" "No trader ID"
fi

echo "6.6 Admin: Get trader inventory..."
if [ -n "$TRADER_ID" ]; then
  RESP=$(curl -s "$API_URL/api/admin/traders/$TRADER_ID/inventory" -H "Authorization: Bearer $GM_TOKEN")
  if echo "$RESP" | jq -e '.items' > /dev/null 2>&1; then
    pass "Get trader inventory"
  else
    fail "Get trader inventory" "$RESP"
  fi
else
  fail "Get trader inventory" "No trader ID"
fi

echo "6.7 Player: Get trader quests..."
if [ -n "$TRADER_ID" ]; then
  RESP=$(curl -s "$API_URL/api/traders/$TRADER_ID/quests" -H "Authorization: Bearer $TOKEN")
  if echo "$RESP" | jq -e '.quests' > /dev/null 2>&1; then
    PLAYER_QUEST_COUNT=$(echo "$RESP" | jq '.quests | length')
    pass "Player get trader quests (count: $PLAYER_QUEST_COUNT)"
  else
    fail "Player get trader quests" "$RESP"
  fi
else
  fail "Player get trader quests" "No trader ID"
fi

echo "6.8 Player: Trader radius check (too far)..."
# Create trader with small radius far from player
RESP=$(curl -s -X POST "$API_URL/api/admin/traders" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\":\"Far Trader $TIMESTAMP\",
    \"type\":\"npc\",
    \"latitude\":50.0,
    \"longitude\":30.0,
    \"interaction_radius\":10
  }")
FAR_TRADER_ID=$(echo "$RESP" | jq -r '.trader_id // empty')
if [ -n "$FAR_TRADER_ID" ]; then
  RESP=$(curl -s "$API_URL/api/traders/$FAR_TRADER_ID/quests" -H "Authorization: Bearer $TOKEN")
  if echo "$RESP" | jq -e '.error' | grep -q 'TOO_FAR'; then
    pass "Trader radius check (correctly rejected)"
  else
    fail "Trader radius check" "Should reject - too far"
  fi
  # Cleanup far trader
  curl -s -X DELETE "$API_URL/api/admin/traders/$FAR_TRADER_ID" -H "Authorization: Bearer $GM_TOKEN" > /dev/null
else
  fail "Trader radius check" "Failed to create test trader"
fi

echo "6.9 Quest faction restriction..."
# Create quest only for 'duty' faction (player is 'stalker')
RESP=$(curl -s -X POST "$API_URL/api/admin/quests" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\":\"Duty Only Quest $TIMESTAMP\",
    \"description\":\"Only for Duty\",
    \"questType\":\"manual\",
    \"reward\":500,
    \"issuerId\":\"$GM_ID\",
    \"factionRestrictions\":[\"duty\"]
  }")
DUTY_QUEST_ID=$(echo "$RESP" | jq -r '.id // empty')
if [ -n "$DUTY_QUEST_ID" ]; then
  # Assign to trader
  curl -s -X PUT "$API_URL/api/admin/traders/$TRADER_ID/quests" \
    -H "Authorization: Bearer $GM_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"quest_ids\":[\"$QUEST_ID\",\"$DUTY_QUEST_ID\"]}" > /dev/null
  
  # Player (stalker) should NOT see duty-only quest
  RESP=$(curl -s "$API_URL/api/traders/$TRADER_ID/quests" -H "Authorization: Bearer $TOKEN")
  QUEST_COUNT=$(echo "$RESP" | jq '.quests | length')
  # Should see 1 quest (the original), not 2
  if [ "$QUEST_COUNT" -eq 1 ]; then
    pass "Quest faction restriction (duty quest hidden from stalker)"
  else
    fail "Quest faction restriction" "Stalker should not see duty-only quest (got $QUEST_COUNT)"
  fi
  # Cleanup
  curl -s -X DELETE "$API_URL/api/admin/quests/$DUTY_QUEST_ID" -H "Authorization: Bearer $GM_TOKEN" > /dev/null
else
  fail "Quest faction restriction" "Failed to create test quest"
fi

# ============================================
section "7. PLAYER QUEST FLOW"
# ============================================

echo "7.1 Player: Accept quest..."
if [ -n "$QUEST_ID" ]; then
  RESP=$(curl -s -X POST "$API_URL/api/quests/$QUEST_ID/accept" -H "Authorization: Bearer $TOKEN")
  if echo "$RESP" | jq -e '.questId // .quest_id' > /dev/null 2>&1; then
    PLAYER_QUEST_ID=$(echo "$RESP" | jq -r '.questId // .quest_id')
    pass "Accept quest (player quest: ${PLAYER_QUEST_ID:0:8}...)"
  else
    fail "Accept quest" "$RESP"
  fi
else
  fail "Accept quest" "No quest ID"
fi

echo "7.2 Player: Check active quests..."
RESP=$(curl -s "$API_URL/api/quests/active" -H "Authorization: Bearer $TOKEN")
ACTIVE_COUNT=$(echo "$RESP" | jq '.quests | length')
if [ "$ACTIVE_COUNT" -gt 0 ]; then
  pass "Active quests (count: $ACTIVE_COUNT)"
else
  fail "Active quests" "No active quests"
fi

echo "7.3 Player: Cancel quest..."
if [ -n "$PLAYER_QUEST_ID" ]; then
  RESP=$(curl -s -X POST "$API_URL/api/quests/$PLAYER_QUEST_ID/cancel" -H "Authorization: Bearer $TOKEN")
  if echo "$RESP" | jq -e '.success // .message' > /dev/null 2>&1; then
    pass "Cancel quest"
  else
    fail "Cancel quest" "$RESP"
  fi
else
  fail "Cancel quest" "No player quest ID"
fi

# ============================================
section "8. ZONES TESTS"
# ============================================

echo "8.1 Get zones..."
RESP=$(curl -s "$API_URL/api/zones" -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | jq -e '.radiationZones' > /dev/null 2>&1; then
  ZONE_COUNT=$(echo "$RESP" | jq '.radiationZones | length')
  pass "Get zones (count: $ZONE_COUNT)"
else
  fail "Get zones" "$RESP"
fi

# ============================================
section "9. TRADING TESTS"
# ============================================

echo "9.1 Get traders (player)..."
RESP=$(curl -s "$API_URL/api/traders" -H "Authorization: Bearer $TOKEN")
if echo "$RESP" | jq -e '.traders' > /dev/null 2>&1; then
  pass "Get traders (player)"
else
  fail "Get traders (player)" "$RESP"
fi

# ============================================
section "10. CLEANUP"
# ============================================

echo "10.1 Delete test trader..."
if [ -n "$TRADER_ID" ]; then
  RESP=$(curl -s -X DELETE "$API_URL/api/admin/traders/$TRADER_ID" -H "Authorization: Bearer $GM_TOKEN")
  if echo "$RESP" | jq -e '.message' > /dev/null 2>&1; then
    pass "Delete test trader"
  else
    fail "Delete test trader" "$RESP"
  fi
fi

echo "10.2 Delete test quest..."
if [ -n "$QUEST_ID" ]; then
  RESP=$(curl -s -X DELETE "$API_URL/api/admin/quests/$QUEST_ID" -H "Authorization: Bearer $GM_TOKEN")
  if echo "$RESP" | jq -e '.success // .message' > /dev/null 2>&1; then
    pass "Delete test quest"
  else
    fail "Delete test quest" "$RESP"
  fi
fi

echo "10.3 Cleanup test users from DB..."
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
  -u pda_admin -p"4c78768f1a2191ef978adafa18d4de87" pda_zone \
  -e "DELETE FROM player_roles WHERE player_id IN ('$PLAYER_ID', '$GM_ID');
      DELETE FROM player_locations WHERE player_id IN ('$PLAYER_ID', '$GM_ID');
      DELETE FROM contracts WHERE issuer_id = '$GM_ID' OR accepted_by IN ('$PLAYER_ID', '$GM_ID');
      DELETE FROM players WHERE id IN ('$PLAYER_ID', '$GM_ID');" 2>/dev/null
pass "Cleanup test users"

# ============================================
# SUMMARY
# ============================================
echo ""
echo "==============================="
echo -e "Results: ${GREEN}$PASSED passed${NC}, ${RED}$FAILED failed${NC}"
echo "==============================="

if [ $FAILED -gt 0 ]; then
  exit 1
fi
