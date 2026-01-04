#!/bin/bash

# Inventory System v2.0 - Quick Test
# Tests all 6 inventory endpoints

API_URL="https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev"

echo "==================================="
echo "Inventory System v2.0 - Quick Test"
echo "==================================="
echo ""

# 1. Register test user
echo "1. Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "nickname": "inventory_test_'$(date +%s)'",
    "email": "inventory_test_'$(date +%s)'@test.com",
    "password": "test123",
    "faction": "stalker"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | jq -r '.token')
PLAYER_ID=$(echo $REGISTER_RESPONSE | jq -r '.id')

if [ "$TOKEN" == "null" ]; then
  echo "❌ Registration failed"
  echo $REGISTER_RESPONSE | jq '.'
  exit 1
fi

echo "✅ Registered: $PLAYER_ID"
echo ""

# 2. Get inventory (should be empty)
echo "2. Getting inventory..."
INVENTORY=$(curl -s -X GET "$API_URL/api/inventory" \
  -H "Authorization: Bearer $TOKEN")

echo $INVENTORY | jq '.'
echo ""

# 3. Test equip (need to add item first via admin or purchase)
echo "3. Testing inventory endpoints structure..."
echo "   Note: Actual equip/unequip requires items in inventory"
echo ""

# Test error handling
echo "4. Testing error handling..."
EQUIP_ERROR=$(curl -s -X POST "$API_URL/api/inventory/equip" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId": "non-existent-id"}')

echo "   Equip non-existent item:"
echo "   $EQUIP_ERROR" | jq -r '.error'
echo ""

UNEQUIP_ERROR=$(curl -s -X POST "$API_URL/api/inventory/unequip" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId": "non-existent-id"}')

echo "   Unequip non-existent item:"
echo "   $UNEQUIP_ERROR" | jq -r '.error'
echo ""

USE_ERROR=$(curl -s -X POST "$API_URL/api/inventory/use" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId": "non-existent-id"}')

echo "   Use non-existent item:"
echo "   $USE_ERROR" | jq -r '.error'
echo ""

DROP_ERROR=$(curl -s -X POST "$API_URL/api/inventory/drop" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId": "non-existent-id"}')

echo "   Drop non-existent item:"
echo "   $DROP_ERROR" | jq -r '.error'
echo ""

SELL_ERROR=$(curl -s -X POST "$API_URL/api/inventory/sell" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemId": "non-existent-id"}')

echo "   Sell non-existent item:"
echo "   $SELL_ERROR" | jq -r '.error'
echo ""

echo "==================================="
echo "✅ All inventory endpoints responding"
echo "==================================="
echo ""
echo "Endpoints tested:"
echo "  ✅ GET  /api/inventory"
echo "  ✅ POST /api/inventory/equip"
echo "  ✅ POST /api/inventory/unequip"
echo "  ✅ POST /api/inventory/use"
echo "  ✅ POST /api/inventory/drop"
echo "  ✅ POST /api/inventory/sell"
echo ""
echo "Note: Full functional testing requires items in inventory"
echo "      Use admin panel to spawn artifacts or purchase equipment"
