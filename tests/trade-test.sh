#!/bin/bash

# Trading System API Test
# Tests all trading endpoints

set -e

# Load environment
if [ -f .env.local ]; then
  source .env.local
fi

API_URL="https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev"

echo "=== Trading System API Test ==="
echo ""

# 1. Register test user
echo "1. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "trader_test_'$(date +%s)'",
    "email": "trader_test_'$(date +%s)'@test.com",
    "password": "test123",
    "faction": "loner"
  }')

echo "$REGISTER_RESPONSE" | jq '.'

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
PLAYER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.id')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Registration failed"
  exit 1
fi

echo "✅ User registered. Token: ${TOKEN:0:20}..."
echo ""

# 2. Get Sidorovich trader ID
echo "2. Getting Sidorovich trader ID..."
TRADER_ID=$(mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
  -u pda_admin -p"$DB_PASSWORD" pda_zone \
  -sN -e "SELECT id FROM traders WHERE name='Sidorovich' LIMIT 1" 2>/dev/null)

echo "Trader ID: $TRADER_ID"
echo ""

# 3. Give player money BEFORE starting session
echo "3. Giving player money for testing..."
echo "Player ID: $PLAYER_ID"
mysql -h pda-zone-db-dev.ctwu68aqagdj.eu-north-1.rds.amazonaws.com \
  -u pda_admin -p"$DB_PASSWORD" pda_zone \
  -e "UPDATE players SET balance = 10000 WHERE id='$PLAYER_ID'; SELECT id, balance FROM players WHERE id='$PLAYER_ID';" 2>/dev/null

echo "✅ Player balance set to 10000"
echo ""

# 4. Start trade session
echo "4. Starting trade session..."
SESSION_RESPONSE=$(curl -s -X POST "$API_URL/api/trade/session/start" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "trader_id": "'$TRADER_ID'",
    "latitude": 50.450001,
    "longitude": 30.523333
  }')

echo "$SESSION_RESPONSE" | jq '.'

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.trade_session_id')

if [ "$SESSION_ID" == "null" ]; then
  echo "❌ Session start failed"
  exit 1
fi

echo "✅ Session started: $SESSION_ID"
echo ""

# 5. Get catalog
echo "5. Getting trader catalog..."
CATALOG_RESPONSE=$(curl -s -X GET "$API_URL/api/trade/catalog?trade_session_id=$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$CATALOG_RESPONSE" | jq '.'

ITEM_COUNT=$(echo "$CATALOG_RESPONSE" | jq '.items | length')
echo "✅ Catalog loaded: $ITEM_COUNT items"
echo ""

# 5. Get first item for purchase
MEDKIT_ID=$(echo "$CATALOG_RESPONSE" | jq -r '.items[] | select(.name=="Medkit") | .item_def_id')
MEDKIT_PRICE=$(echo "$CATALOG_RESPONSE" | jq -r '.items[] | select(.name=="Medkit") | .buy_price')

echo "Medkit ID: $MEDKIT_ID"
echo "Medkit Price: $MEDKIT_PRICE"
echo ""

# 6. Buy medkit
echo "6. Buying medkit..."
BUY_RESPONSE=$(curl -s -X POST "$API_URL/api/trade/buy" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "trade_session_id": "'$SESSION_ID'",
    "items": [
      {
        "item_def_id": "'$MEDKIT_ID'",
        "quantity": 2
      }
    ]
  }')

echo "$BUY_RESPONSE" | jq '.'

BUY_SUCCESS=$(echo "$BUY_RESPONSE" | jq -r '.success')

if [ "$BUY_SUCCESS" == "true" ]; then
  echo "✅ Purchase successful"
else
  echo "❌ Purchase failed"
  exit 1
fi

NEW_BALANCE=$(echo "$BUY_RESPONSE" | jq -r '.new_balance')
echo "New balance: $NEW_BALANCE"
echo ""

# 7. Get backpack
echo "7. Getting player backpack..."
BACKPACK_RESPONSE=$(curl -s -X GET "$API_URL/api/trade/backpack?trade_session_id=$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$BACKPACK_RESPONSE" | jq '.'

BACKPACK_COUNT=$(echo "$BACKPACK_RESPONSE" | jq '.items | length')
echo "✅ Backpack loaded: $BACKPACK_COUNT items"
echo ""

# 8. Sell medkit back
echo "8. Selling medkit back..."
ITEM_ID=$(echo "$BACKPACK_RESPONSE" | jq -r '.items[0].item_id')

SELL_RESPONSE=$(curl -s -X POST "$API_URL/api/trade/sell" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "trade_session_id": "'$SESSION_ID'",
    "items": [
      {
        "item_id": "'$ITEM_ID'",
        "quantity": 1
      }
    ]
  }')

echo "$SELL_RESPONSE" | jq '.'

SELL_SUCCESS=$(echo "$SELL_RESPONSE" | jq -r '.success')

if [ "$SELL_SUCCESS" == "true" ]; then
  echo "✅ Sell successful"
else
  echo "❌ Sell failed"
  exit 1
fi

FINAL_BALANCE=$(echo "$SELL_RESPONSE" | jq -r '.new_balance')
echo "Final balance: $FINAL_BALANCE"
echo ""

echo "=== All Tests Passed ✅ ==="
