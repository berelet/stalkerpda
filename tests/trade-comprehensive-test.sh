#!/bin/bash

# Comprehensive Trading System Test
# Tests all trading endpoints and edge cases

set -e

if [ -f .env.local ]; then
  source .env.local
fi

API_URL="https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev"

echo "=== Comprehensive Trading System Test ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

pass() {
  echo -e "${GREEN}✓${NC} $1"
}

fail() {
  echo -e "${RED}✗${NC} $1"
  exit 1
}

# Test 1: Get traders list
echo "Test 1: Get traders list"
TRADERS=$(curl -s "$API_URL/api/traders")
TRADER_COUNT=$(echo "$TRADERS" | jq '.traders | length')
if [ "$TRADER_COUNT" -gt 0 ]; then
  pass "Found $TRADER_COUNT trader(s)"
  TRADER_ID=$(echo "$TRADERS" | jq -r '.traders[0].id')
  TRADER_NAME=$(echo "$TRADERS" | jq -r '.traders[0].name')
  echo "  Trader: $TRADER_NAME ($TRADER_ID)"
else
  fail "No traders found"
fi
echo ""

# Test 2: Register user
echo "Test 2: Register test user"
TIMESTAMP=$(date +%s)
REGISTER=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"nickname\":\"trade_test_$TIMESTAMP\",\"email\":\"trade_test_$TIMESTAMP@test.com\",\"password\":\"test123\",\"faction\":\"loner\"}")

TOKEN=$(echo "$REGISTER" | jq -r '.token')
PLAYER_ID=$(echo "$REGISTER" | jq -r '.id')

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  pass "User registered: $PLAYER_ID"
else
  fail "Registration failed: $(echo $REGISTER | jq -r '.error')"
fi
echo ""

# Test 3: Give player money
echo "Test 3: Give player money"
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
  -u pda_admin -p"$DB_PASSWORD" pda_zone \
  -e "UPDATE players SET balance = 10000 WHERE id='$PLAYER_ID'" 2>/dev/null
pass "Balance set to 10000"
echo ""

# Test 4: Start trade session
echo "Test 4: Start session"
SESSION=$(curl -s -X POST "$API_URL/api/trade/session/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"trader_id\":\"$TRADER_ID\",\"latitude\":50.450001,\"longitude\":30.523333}")

SESSION_ID=$(echo "$SESSION" | jq -r '.trade_session_id')
if [ "$SESSION_ID" != "null" ] && [ -n "$SESSION_ID" ]; then
  pass "Session started: $SESSION_ID"
else
  fail "Session start failed: $(echo $SESSION | jq -r '.error')"
fi
echo ""

# Test 6: Get catalog
echo "Test 6: Get catalog"
CATALOG=$(curl -s "$API_URL/api/trade/catalog?trade_session_id=$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN")

ITEM_COUNT=$(echo "$CATALOG" | jq '.items | length')
if [ "$ITEM_COUNT" -gt 0 ]; then
  pass "Catalog loaded: $ITEM_COUNT items"
  MEDKIT_ID=$(echo "$CATALOG" | jq -r '.items[] | select(.name=="Medkit") | .item_def_id')
  MEDKIT_PRICE=$(echo "$CATALOG" | jq -r '.items[] | select(.name=="Medkit") | .buy_price')
  echo "  Medkit: $MEDKIT_PRICE credits"
else
  fail "Catalog empty"
fi
echo ""

# Test 7: Buy items (insufficient funds - should fail)
echo "Test 7: Buy with insufficient funds (should fail)"
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
  -u pda_admin -p"$DB_PASSWORD" pda_zone \
  -e "UPDATE players SET balance = 100 WHERE id='$PLAYER_ID'" 2>/dev/null

BUY=$(curl -s -X POST "$API_URL/api/trade/buy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"trade_session_id\":\"$SESSION_ID\",\"items\":[{\"item_def_id\":\"$MEDKIT_ID\",\"quantity\":2}]}")

ERROR=$(echo "$BUY" | jq -r '.error')
if [ "$ERROR" == "INSUFFICIENT_FUNDS" ]; then
  pass "Correctly rejected (insufficient funds)"
else
  fail "Should reject when insufficient funds"
fi
echo ""

# Test 8: Buy items (success)
echo "Test 8: Buy items (success)"
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
  -u pda_admin -p"$DB_PASSWORD" pda_zone \
  -e "UPDATE players SET balance = 10000 WHERE id='$PLAYER_ID'" 2>/dev/null

# Start new session
SESSION=$(curl -s -X POST "$API_URL/api/trade/session/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"trader_id\":\"$TRADER_ID\",\"latitude\":50.450001,\"longitude\":30.523333}")
SESSION_ID=$(echo "$SESSION" | jq -r '.trade_session_id')

BUY=$(curl -s -X POST "$API_URL/api/trade/buy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"trade_session_id\":\"$SESSION_ID\",\"items\":[{\"item_def_id\":\"$MEDKIT_ID\",\"quantity\":2}]}")

SUCCESS=$(echo "$BUY" | jq -r '.success')
NEW_BALANCE=$(echo "$BUY" | jq -r '.new_balance')
if [ "$SUCCESS" == "true" ]; then
  pass "Purchase successful. New balance: $NEW_BALANCE"
else
  fail "Purchase failed: $(echo $BUY | jq -r '.error')"
fi
echo ""

# Test 9: Get backpack
echo "Test 9: Get backpack"
SESSION=$(curl -s -X POST "$API_URL/api/trade/session/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"trader_id\":\"$TRADER_ID\",\"latitude\":50.450001,\"longitude\":30.523333}")
SESSION_ID=$(echo "$SESSION" | jq -r '.trade_session_id')

BACKPACK=$(curl -s "$API_URL/api/trade/backpack?trade_session_id=$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN")

BACKPACK_COUNT=$(echo "$BACKPACK" | jq '.items | length')
if [ "$BACKPACK_COUNT" -gt 0 ]; then
  pass "Backpack loaded: $BACKPACK_COUNT items"
  ITEM_ID=$(echo "$BACKPACK" | jq -r '.items[0].item_id')
else
  fail "Backpack empty"
fi
echo ""

# Test 10: Sell items
echo "Test 10: Sell items"
SELL=$(curl -s -X POST "$API_URL/api/trade/sell" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"trade_session_id\":\"$SESSION_ID\",\"items\":[{\"item_id\":\"$ITEM_ID\",\"quantity\":1}]}")

SUCCESS=$(echo "$SELL" | jq -r '.success')
FINAL_BALANCE=$(echo "$SELL" | jq -r '.new_balance')
if [ "$SUCCESS" == "true" ]; then
  pass "Sale successful. Final balance: $FINAL_BALANCE"
else
  fail "Sale failed: $(echo $SELL | jq -r '.error')"
fi
echo ""

# Test 11: Redeem food/drink
echo "Test 11: Redeem food/drink"
# Buy beer first
SESSION=$(curl -s -X POST "$API_URL/api/trade/session/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"trader_id\":\"$TRADER_ID\",\"latitude\":50.450001,\"longitude\":30.523333}")
SESSION_ID=$(echo "$SESSION" | jq -r '.trade_session_id')

CATALOG=$(curl -s "$API_URL/api/trade/catalog?trade_session_id=$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN")
BEER_ID=$(echo "$CATALOG" | jq -r '.items[] | select(.name=="Beer") | .item_def_id')

BUY=$(curl -s -X POST "$API_URL/api/trade/buy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"trade_session_id\":\"$SESSION_ID\",\"items\":[{\"item_def_id\":\"$BEER_ID\",\"quantity\":1}]}")

# Get beer item_id
SESSION=$(curl -s -X POST "$API_URL/api/trade/session/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"trader_id\":\"$TRADER_ID\",\"latitude\":50.450001,\"longitude\":30.523333}")
SESSION_ID=$(echo "$SESSION" | jq -r '.trade_session_id')

BACKPACK=$(curl -s "$API_URL/api/trade/backpack?trade_session_id=$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN")
BEER_ITEM_ID=$(echo "$BACKPACK" | jq -r '.items[] | select(.name=="Beer") | .item_id')

# Redeem
REDEEM=$(curl -s -X POST "$API_URL/api/trade/redeem" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"item_id\":\"$BEER_ITEM_ID\"}")

SUCCESS=$(echo "$REDEEM" | jq -r '.success')
REDEEM_CODE=$(echo "$REDEEM" | jq -r '.redeem_code')
if [ "$SUCCESS" == "true" ]; then
  pass "Redeem successful. Code: $REDEEM_CODE"
else
  fail "Redeem failed: $(echo $REDEEM | jq -r '.error')"
fi
echo ""

echo "=== All Tests Passed ✅ ==="
echo ""
echo "Summary:"
echo "  ✓ Traders list"
echo "  ✓ Session management"
echo "  ✓ "
echo "  ✓ Catalog retrieval"
echo "  ✓ Insufficient funds check"
echo "  ✓ Buy transaction"
echo "  ✓ Backpack retrieval"
echo "  ✓ Sell transaction"
echo "  ✓ Food/drink redeem"
