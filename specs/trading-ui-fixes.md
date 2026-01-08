# Trading UI Fixes - Session 2026-01-07

## Issues Fixed

### 1. Cart Clearing on Tab Change
**Problem:** Cart was being cleared on every render, not just tab changes.

**Solution:**
- Separated cart clearing logic into dedicated `useEffect` with `[tab]` dependency
- Removed `setCart(new Map())` from `loadItems()` function

```typescript
// Clear cart on tab change
useEffect(() => {
  setCart(new Map())
}, [tab])
```

### 2. 403 Forbidden Error on Session Start
**Problem:** Browser was showing 403 instead of 401 due to missing CORS headers in auth middleware.

**Solution:**
- Added CORS headers to 401 response in `backend/src/middleware/auth.py`

```python
def require_auth(handler):
    @wraps(handler)
    def wrapper(event, context):
        player = get_current_player(event)
        if not player:
            return {
                'statusCode': 401,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
                },
                'body': '{"error": {"code": "UNAUTHORIZED", "message": "Authentication required"}}'
            }
        event['player'] = player
        return handler(event, context)
    return wrapper
```

### 3. Constant Re-rendering (Processing Indicator)
**Problem:** Countdown timer (`setTimeLeft` every second) was causing full component re-render, including expensive items list.

**Solution:**
- Memoized items list rendering with `useMemo`
- Dependencies: `items`, `cart`, `tab`, and serialized cart for proper comparison

```typescript
const itemsList = useMemo(() => {
  if (items.length === 0) {
    return <div>Empty message</div>
  }
  
  return items.map(item => {
    // Full item rendering logic
  })
}, [items, cart, tab, JSON.stringify(Array.from(cart))])
```

### 4. Cart Total Calculation Optimization
**Problem:** `calculateTotal()` was being called on every render.

**Solution:**
- Converted to `useMemo` with proper dependencies

```typescript
const cartTotal = useMemo(() => {
  const items = tab === 'buy' ? catalog : backpack
  let total = 0
  
  cart.forEach((qty, itemId) => {
    const item = items.find(i => (tab === 'buy' ? i.item_def_id : i.item_id) === itemId)
    if (item) {
      const price = tab === 'buy' ? item.buy_price! : item.sell_price!
      total += price * qty
    }
  })
  
  return total
}, [JSON.stringify(Array.from(cart)), catalog, backpack, tab])
```

## Files Modified

1. **frontend/src/pages/TradingPage.tsx**
   - Added `useMemo` import
   - Separated cart clearing logic
   - Memoized items list rendering
   - Memoized cart total calculation

2. **backend/src/middleware/auth.py**
   - Added CORS headers to 401 response in `require_auth` decorator

## Performance Improvements

- **Before:** Full component re-render every second (timer) + on every cart change
- **After:** 
  - Timer updates don't trigger items list re-render
  - Cart total calculated only when cart/items change
  - Items list rendered only when cart/items/tab change

## Testing

All fixes deployed and tested:
- ✅ Cart persists when adding items
- ✅ Cart clears only on tab switch
- ✅ No 403 errors on session start
- ✅ No constant "PROCESSING..." indicator
- ✅ Smooth UI performance

## Deployment

```bash
# Backend
cd /var/www/stalker/stalkerpda
sam build --template infrastructure/template.yaml
sam deploy --resolve-s3 --no-confirm-changeset

# Frontend
cd frontend && npm run build
aws s3 sync dist/ s3://pda-zone-frontend-dev-707694916945/ --delete
aws cloudfront create-invalidation --distribution-id E1LX6WLS4JUEVL --paths "/*"
```

## Next Steps

- [ ] Test with real user session
- [ ] Verify session expiration handling
- [ ] Test buy/sell transactions
- [ ] Check inventory updates after trade
