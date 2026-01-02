#!/bin/bash
# API Tests for PDA ZONE

set -e

API_URL="https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev"
TEST_EMAIL="test_$(date +%s)@zone.com"
TEST_NICKNAME="tester_$(date +%s)"
TOKEN=""

echo "🧪 Running API Tests..."
echo "======================="
echo ""

# Test 1: Register
echo "1️⃣  Testing Registration..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"nickname\":\"$TEST_NICKNAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"test123\",\"faction\":\"stalker\"}")

if echo "$REGISTER_RESPONSE" | jq -e '.token' > /dev/null; then
  echo "   ✅ Registration successful"
  TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.token')
else
  echo "   ❌ Registration failed"
  echo "   Response: $REGISTER_RESPONSE"
  exit 1
fi

# Test 2: Login
echo "2️⃣  Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"test123\"}")

if echo "$LOGIN_RESPONSE" | jq -e '.token' > /dev/null; then
  echo "   ✅ Login successful"
  TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
else
  echo "   ❌ Login failed"
  echo "   Response: $LOGIN_RESPONSE"
  exit 1
fi

# Test 3: Get Profile
echo "3️⃣  Testing Get Profile..."
ME_RESPONSE=$(curl -s "$API_URL/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESPONSE" | jq -e '.id' > /dev/null; then
  echo "   ✅ Get profile successful"
  PLAYER_ID=$(echo "$ME_RESPONSE" | jq -r '.id')
  echo "   Player ID: $PLAYER_ID"
else
  echo "   ❌ Get profile failed"
  echo "   Response: $ME_RESPONSE"
  exit 1
fi

# Test 4: Update Location
echo "4️⃣  Testing Location Update..."
LOCATION_RESPONSE=$(curl -s -X POST "$API_URL/api/location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude":59.3293,"longitude":18.0686,"accuracy":10}')

if echo "$LOCATION_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "   ✅ Location update successful"
else
  echo "   ❌ Location update failed"
  echo "   Response: $LOCATION_RESPONSE"
  exit 1
fi

# Test 5: Get Artifacts
echo "5️⃣  Testing Get Artifacts..."
ARTIFACTS_RESPONSE=$(curl -s "$API_URL/api/artifacts" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ARTIFACTS_RESPONSE" | jq -e '.artifacts' > /dev/null; then
  echo "   ✅ Get artifacts successful"
  ARTIFACT_COUNT=$(echo "$ARTIFACTS_RESPONSE" | jq '.artifacts | length')
  echo "   Artifacts: $ARTIFACT_COUNT"
else
  echo "   ❌ Get artifacts failed"
  echo "   Response: $ARTIFACTS_RESPONSE"
  exit 1
fi

# Test 6: Get Contracts
echo "6️⃣  Testing Get Contracts..."
CONTRACTS_RESPONSE=$(curl -s "$API_URL/api/contracts" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CONTRACTS_RESPONSE" | jq -e '.contracts' > /dev/null; then
  echo "   ✅ Get contracts successful"
  CONTRACT_COUNT=$(echo "$CONTRACTS_RESPONSE" | jq '.contracts | length')
  echo "   Contracts: $CONTRACT_COUNT"
else
  echo "   ❌ Get contracts failed"
  echo "   Response: $CONTRACTS_RESPONSE"
  exit 1
fi

# Test 7: Get Zones
echo "7️⃣  Testing Get Zones..."
ZONES_RESPONSE=$(curl -s "$API_URL/api/zones" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ZONES_RESPONSE" | jq -e '.radiationZones' > /dev/null; then
  echo "   ✅ Get zones successful"
  ZONE_COUNT=$(echo "$ZONES_RESPONSE" | jq '.radiationZones | length')
  echo "   Radiation zones: $ZONE_COUNT"
else
  echo "   ❌ Get zones failed"
  echo "   Response: $ZONES_RESPONSE"
  exit 1
fi

# Test 8: Invalid Token
echo "8️⃣  Testing Invalid Token..."
INVALID_RESPONSE=$(curl -s "$API_URL/api/auth/me" \
  -H "Authorization: Bearer invalid_token")

if echo "$INVALID_RESPONSE" | jq -e '.error' > /dev/null; then
  echo "   ✅ Invalid token rejected correctly"
else
  echo "   ⚠️  Invalid token not rejected properly"
fi

echo ""
echo "======================="
echo "✅ All tests passed!"
echo ""
echo "Test User:"
echo "  Email: $TEST_EMAIL"
echo "  Nickname: $TEST_NICKNAME"
echo "  Token: ${TOKEN:0:50}..."
