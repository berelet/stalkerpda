S.T.A.L.K.E.R. PDA — Radiation, Death, Respawn (MVP Spec)
0. Scope
This spec defines:
Radiation zones placed by GM in Admin.
Radiation accrual from zones (continuous) and from artifact pickup (instant).
Death by radiation at threshold 100.
Respawn zones and resurrection timer mechanics.
UI requirements for player and GM.
Caching strategy for active zones.
Out of scope (not MVP):
Detailed audit/history screens.
Manual GM tools to edit player stats (except “Resurrect” on GM map).

1. Core Concepts & Definitions
1.1 Player fields (conceptual)
radiation (float, 0..100): current radiation level.
lives (int, >=0): number of available lives.
status (enum): ALIVE | DEAD.
currentRadiationZoneId (nullable): the radiation zone currently used for accrual (first-entered rule).
lastLocation:
lat, lng
at (server timestamp) — last received location update.
lastRadiationCalcAt (server timestamp): last time radiation accrual was processed.
Respawn progress:
resurrectionProgressSeconds (float, >=0)
lastResurrectionCalcAt (server timestamp)
1.2 Radiation zone (Admin)
id
centerLat, centerLng
radiusMeters
radiationLevel5m (int 0..100): points added over 5 minutes of continuous presence (300s) before resist.
activeFrom, activeTo (time window) — same behavior as artifacts’ time window.
Radiation does not depend on distance to center (flat within radius).
1.3 Respawn zone (Admin)
id
centerLat, centerLng
radiusMeters
respawnTimeSeconds (int >0): required time inside zone to resurrect.
activeFrom, activeTo (time window)
1.4 Artifact spawn (Admin)
When placing an artifact on the map (existing feature), add:
pickupRadiation (int 0..100, default 0): radiation instantly applied on pickup.
Rules:
GM may set pickupRadiation per artifact spawn.
On pickup, radiation may jump directly to 100, causing immediate death.
If death occurs on/after pickup, the standard equipment-loss percentage roll applies (defined in a separate spec). The newly picked artifact may be lost immediately or may remain; if it remains, it stays in inventory after resurrection.
1.5 Resist
Active inventory (already implemented) contributes radiation resist.
resistPct (0..100) computed as sum of active items’ resist percentages.
Resist reduces radiation accrual and artifact pickup radiation (see §5).
Recommendation for implementation stability:
Apply cap: resistPct = min(resistPct, RESIST_CAP_PCT).
MVP default: RESIST_CAP_PCT = 80 (can be config).

2. Location Tracking (Ticks)
2.1 Tick definition
A “tick” is a location update sent by the client while the player is on the Map page.
Frequency: every 15 seconds.
Server time is the source of truth.
2.2 Server inputs per tick
player id
current coordinates P1(lat,lng)
server time now
Server maintains previous point P0 = lastLocation.

3. Radiation from Zones (Accrual)
3.1 Active zones set
Only zones active at now participate:
activeFrom <= now < activeTo
Zones are obtained from Lambda cache (see §9).
3.2 Zone selection rule (no stacking)
If a player is affected by multiple overlapping radiation zones, only one zone applies:
“First-entered zone” rule.
State machine:
If currentRadiationZoneId is null:
Determine whether the movement segment P0→P1 enters any active zone.
If it enters multiple, choose the zone with earliest entry time along segment.
Set currentRadiationZoneId to that zone’s id.
If currentRadiationZoneId is set:
Accrue radiation only from that zone until the player leaves it.
Once the segment shows the player is outside the zone (no time inside), clear currentRadiationZoneId.
Tie-breaker (needed for edge cases where entry times match):
smaller distance from P1 to zone center wins; if still equal
smaller zone id wins.
3.3 Accrual rate
For the selected zone:
baseRate = radiationLevel5m / 300.0 (points/sec)
effectiveRate = baseRate * (1 - resistPct/100.0)
3.4 Computing time inside zone
We model the player moving linearly from P0 to P1 over real elapsed time deltaT = now - lastRadiationCalcAt.
Compute timeInsideSeconds as:
Find segment length in meters: pathMeters = dist(P0,P1)
If pathMeters == 0:
If P1 is inside zone: timeInsideSeconds = deltaT
Else: timeInsideSeconds = 0
Else:
Compute insideMeters: length of segment portion inside the zone circle.
timeInsideSeconds = deltaT * (insideMeters / pathMeters)
Boundary rule:
Point on the circle boundary counts as inside.
3.5 Special rule when the player was not tracking (1 m/s assumption)
If the player was not tracking (no location updates) and then resumes tracking:
During the untracked period, assume movement speed = 1 meter/second, along the straight line between last known point and the new point.
Implementation:
Let untrackedDeltaT = now - lastLocation.at.
Let pathMeters = dist(P0,P1).
Define effective travel time used for accrual calculations:
travelSeconds = max(untrackedDeltaT, pathMeters / 1.0)
Then use deltaT = travelSeconds in §3.4 for this catch-up computation.
Rationale:
If coordinates are not tracked for long time, we still attribute realistic exposure based on distance traveled at 1 m/s.
3.6 Apply accrual
deltaRad = effectiveRate * timeInsideSeconds
Update: radiation = radiation + deltaRad
Clamp: radiation = min(radiation, 100)
Store updated:
lastRadiationCalcAt = now
lastLocation = P1, now
3.7 No accrual when DEAD
If status == DEAD, do not accrue radiation from zones.

4. Death
4.1 Death condition
If radiation >= 100 after any radiation update (zone accrual or artifact pickup):
Player dies immediately.
4.2 Death effects
Atomically (single transaction / conditional update):
status = DEAD
lives = lives - 1 (do not allow below 0 if you enforce non-negative)
radiation = 0
Clear currentRadiationZoneId = null
Set deadAt = now
Other effects (defined in other spec):
Equipment loss by percentage on death.
If death happens immediately after artifact pickup, the picked artifact can be lost in this roll.
If the artifact survives the roll, it remains in inventory and will still be there after resurrection.
4.3 Lives == 0
If lives == 0, the player can still:
Access inventory.
Trade only with Barman.
Equip an item that grants +1 life (see §6.3) to become eligible to resurrect.

5. Radiation from Artifact Pickup (Instant)
5.1 Admin input
Artifact placement includes pickupRadiation (0..100, default 0).
5.2 Applying pickup radiation
On successful pickup:
Compute resist the same way as for zones.
effectivePickupRadiation = pickupRadiation * (1 - resistPct/100.0)
radiation = min(100, radiation + effectivePickupRadiation)
If radiation >= 100 → apply death (§4).
Notes:
Applying resist to pickup radiation is recommended for consistency with “resist reduces radiation received”.
If you want pickup radiation to ignore resist, explicitly change this rule.

6. Respawn (Resurrection)
6.1 Spawn visibility
Respawn zones are visible on the map to all players in a distinct color.
6.2 Choosing respawn point
Multiple respawn zones may exist.
A dead player can resurrect in any active respawn zone they physically reach.
6.3 Inventory while dead
Dead players can:
Open inventory.
Equip items.
If equipping an item grants +lives, lives is updated immediately.
If this results in lives > 0 (including from 0), the player becomes eligible to resurrect via respawn timer progression.
6.4 Resurrection timer behavior
Resurrection progress accumulates only while:
status == DEAD
lives > 0
player is inside an active respawn zone.
Per location update:
Compute deltaT = now - lastResurrectionCalcAt (or now - lastLocation.at if first time)
If inside any active respawn zone and eligible:
resurrectionProgressSeconds += deltaT
Else:
progress does not change.
lastResurrectionCalcAt = now
Progress is paused when leaving the zone and retained (not reset).
Completion:
If resurrectionProgressSeconds >= respawnTimeSeconds:
status = ALIVE
resurrectionProgressSeconds = 0
radiation remains as-is (it was set to 0 on death)
6.5 Radiation overlapping respawn
Respawn zones may be covered by radiation zones.
While DEAD: no radiation accrual (§3.7).
Immediately after resurrection: zone radiation accrual can start again.

7. Player Restrictions When DEAD
When status == DEAD:
Allowed:
Map view (for navigation to respawn).
Inventory view + equip items.
Trade with Barman only.
Blocked:
Artifact scanning/pickup.
Trading with other players.
Quests and other interactive game actions.
UI:
Map and Quests pages show a large red “Вы мертвы” banner, not fully blocking the map.
Show an indicator/arrow to the nearest active respawn zone.

8. UI Requirements
8.1 Player header
On all pages, show:
Current radiation (rounded for display).
Current lives.
Color thresholds for radiation display:
0–20: green
21–70: yellow
71–100: red
8.2 GM map mode
GM sees:
All currently active radiation zones with radius and radiationLevel5m.
All currently active respawn zones with radius and respawnTimeSeconds.
All players, with:
faction color for alive players
grey icon for dead players
On player click (GM): show
radiation
lives
status
GM action:
“Resurrect” button on a player marker:
Sets player to ALIVE immediately.
Resets resurrectionProgressSeconds = 0.
Does not grant extra lives; use only if GM intends override.

9. Caching & Performance
9.1 Cache strategy
Active radiation zones and respawn zones are cached in AWS Lambda memory for up to 24 hours.
Cache invalidation uses a version mechanism similar to artifacts:
DB stores zonesVersion.
Lambda checks version; if changed, reloads zones.
9.2 Expected scale
Zones count is small; per-tick checks can be simple linear scans.

10. Edge Cases & Acceptance Criteria
10.1 No previous location
If lastLocation is missing (first ever tick):
Set lastLocation = P1 and initialize lastRadiationCalcAt = now.
Do not accrue radiation on this first tick.
10.2 Boundary
If the player is exactly on zone boundary:
Treat as inside.
10.3 Multiple overlap entry
Given movement P0→P1 crosses two zones:
Only the earliest entry zone becomes currentRadiationZoneId.
No stacking.
10.4 Immediate death on pickup
If artifact pickup pushes radiation to >=100:
Death triggers immediately.
Equipment-loss percent roll applies and can remove the newly picked artifact.
If artifact remains, it stays in inventory after resurrection.
10.5 Lives recovery while dead
If lives == 0 and player equips an item that adds +1 life:
Player becomes eligible for respawn timer progression.
10.6 Concurrency
Two overlapping requests must not double-decrement lives.
Death transition is atomic/conditional.

11. Configuration Defaults (MVP)
Map tick: 15 seconds.
Radiation threshold for death: 100.
Resist cap: 80% (configurable).
Cache TTL: 24 hours with version invalidation.

