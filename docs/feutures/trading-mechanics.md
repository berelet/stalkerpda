Trading Mechanics (MVP)
This document describes the complete trading mechanics for the PDA application within the S.T.A.L.K.E.R. (airsoft) game. The focus is on an MVP implementation: simplicity, no real inventory stock for traders, transactional safety, and minimal anti‑exploit measures.

1. General Principles
Trading is possible:
between a player and a trader (Bartender — a live player with a role, or an NPC trader);
P2P trading between players is not available in the MVP.
Only items located in the backpack can be traded.
Equipped items cannot be traded.
Dead players have limited access to trading (see section 2.3).
All operations are performed server‑side and atomically (MySQL transactions).

2. Types of Trading
2.1 Selling to a Trader
Flow:
The player initiates a sale:
to a live trader — by scanning a QR code;
to an NPC trader — by clicking the NPC point on the map.
The server verifies:
the trader is active;
for NPCs: the player is within a ≤ 20 meter radius;
the items exist in the player’s backpack;
the items have is_sellable = true.
The selling interface opens:
list of items in the backpack (excluding equipped items);
selection of items and quantities (for stackable items).
The total selling price is displayed.
The player confirms the operation (Are you sure?).
The server:
re‑checks that all items are still present;
removes the items from the backpack;
credits money to the player’s balance;
records the transaction.
Important:
If at least one item is missing from the backpack, the entire transaction is cancelled.
Sold items are removed permanently and do not transfer to the trader.

2.2 Buying from a Trader
Buying is available to both alive and dead players.
Flow:
The player initiates a purchase (QR scan / NPC click).
The server verifies:
the trader is active;
for NPCs: the player is within a ≤ 20 meter radius.
The buying interface opens:
list of trader’s items;
selection of items and quantities.
The total purchase price is displayed.
The player clicks "Buy".
The server verifies:
sufficient funds;
sufficient free backpack slots;
validity of the trade session.
The server atomically:
deducts money;
adds items to the backpack;
records the transaction.
If any condition fails, the entire transaction is cancelled.

2.3 Restrictions for Dead Players
Dead players cannot sell items to traders.
Dead players are allowed to buy items.
The purpose of this rule is to allow a player who has exhausted all lives (e.g. 4 lives per game) to purchase an item that grants additional lives and then resurrect via the standard respawn process.
All purchase checks (funds, backpack slots, NPC distance, trade session validity) apply to dead players exactly as they do to alive players.
Any attempt by a dead player to sell items must be rejected with the error code PLAYER_DEAD_SELL_FORBIDDEN.

3. Prices and Commissions
Each item has a base_price (integer).
Final prices are calculated using the trader’s commission:
commission_buy_pct — markup applied on purchase;
commission_sell_pct — commission applied on sale.
Formulas:
Buy price: price = round(base_price * (1 + commission_buy_pct / 100))
Sell price: price = round(base_price * (1 - commission_sell_pct / 100))
All prices and balances are integers.

4. Items
4.1 Item Types
Items are created in the admin panel and can have the following types:
Armor
Armor Addon
Medicine
Ammunition (BBs)
Food / Drink (redeemable)
4.2 Common Flags and Fields
is_sellable — whether the item can be sold to a trader;
is_active — whether the item is available for purchase;
is_stackable — whether the item is stackable;
base_price;
item parameters (resists, extra lives, anti‑radiation, etc. — out of scope for trading mechanics).
4.3 Stackable Items
Only Ammunition (BBs) is stackable.
BBs are stored as a single stack with a quantity field.
BBs are purchased in bundles of 10 units.
Medicine, food and drinks are non-stackable items in the MVP:
each unit occupies its own backpack slot;
each unit is purchased individually (quantity = number of items).
4.4 Quantity Selection UX
Each item has a quantity control (+ / −).
Quantity = 0 means the item is not selected.
Reducing quantity to 0 removes the item from the cart.

5. Inventory and Slots
The backpack has a limited number of slots.
Before purchase, the server checks:
if the item is stackable and already exists in the backpack → 0 new slots required;
if the stackable item does not exist → +1 slot required;
non‑stackable items → +N slots required.
If there are not enough free slots, the purchase is rejected.

6. NPC Traders
An NPC trader is a virtual trader placed on the map.
Fields:
name
location (map point)
interaction_radius (default: 20 m)
commission_buy_pct / commission_sell_pct
is_active
list of available items
Trading with an NPC is only possible while inside the interaction radius.

7. Trade Sessions and Timeout
Every operation is linked to a trade_session_id (UUID).
A trade session lives for 5 minutes.
After timeout expiration:
the UI is automatically closed;
the server rejects any operation with the error SESSION_EXPIRED.

8. Idempotency and Anti‑Duplication
8.1 Trade Sessions
Table trade_sessions:
trade_session_id (PK)
buyer_id
seller_type / seller_id
status (PENDING / SUCCESS / FAILED)
created_at / expires_at
8.2 Algorithm
The client sends trade_session_id.
The server attempts to create a session:
if SUCCESS — returns the previous result;
if FAILED — returns the same error;
if PENDING — continues processing.
All actions are executed within a single database transaction.
This prevents BB duplication and double purchases caused by poor network conditions.

9. Transactions
Table trade_transactions:
id
created_at
type (BUY / SELL)
buyer_id
seller_type / seller_id
total_amount
lines_json (item_def_id, qty, unit_price)
result
error_code (optional)
GM Admin Panel
View transaction history;
Pagination by 50 records;
"Clear all" button (typically used after a game session).

10. Errors (error_code)
TRADER_TOO_FAR
TRADER_INACTIVE
SESSION_EXPIRED
INSUFFICIENT_FUNDS
INVENTORY_FULL
ITEM_NOT_IN_BACKPACK
ITEM_NOT_SELLABLE
INVALID_QUANTITY
PLAYER_DEAD_SELL_FORBIDDEN

11. Food and Drinks (Redeem Mechanic)
Purchased as regular items.
An inventory action "Redeem / Receive" is available.
On use:
the item is marked as redeemed and removed;
the player is shown a confirmation screen for the bartender (QR/code);
the bartender provides the physical food or drink.

12. Explicit MVP Limitations
No P2P trading.
No refunds or cancellations after confirmation.
No real inventory stock for traders.
No faction‑based price modifiers (to be added later).
No equipment or stat influence within trading mechanics.

Status: Approved for MVP.

