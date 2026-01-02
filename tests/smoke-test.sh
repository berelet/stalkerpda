#!/bin/bash
# Quick API Smoke Tests

API_URL="https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev"
TEST_EMAIL="test_$(date +%s)@zone.com"
TEST_NICKNAME="tester_$(date +%s)"

echo "🔥 Quick Smoke Tests"
echo "===================="

# Test Auth Flow
echo "✓ Testing Auth..."
REGISTER=$(curl -s -X POST "$API_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"nickname\":\"$TEST_NICKNAME\",\"email\":\"$TEST_EMAIL\",\"password\":\"test123\",\"faction\":\"stalker\"}")

TOKEN=$(echo "$REGISTER" | jq -r '.token')
if [ "$TOKEN" != "null" ]; then
  echo "  ✅ Register & Login work"
else
  echo "  ❌ Auth failed"
  exit 1
fi

# Test Profile
ME=$(curl -s "$API_URL/api/auth/me" -H "Authorization: Bearer $TOKEN")
if echo "$ME" | jq -e '.id' > /dev/null; then
  echo "  ✅ Profile works"
else
  echo "  ❌ Profile failed"
  exit 1
fi

# Test Location
LOC=$(curl -s -X POST "$API_URL/api/location" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"latitude":59.3293,"longitude":18.0686}')

if echo "$LOC" | jq -e '.success' > /dev/null; then
  echo "  ✅ Location works"
else
  echo "  ❌ Location failed"
  exit 1
fi

echo ""
echo "✅ All critical endpoints working!"
echo "   Test user: $TEST_EMAIL"
