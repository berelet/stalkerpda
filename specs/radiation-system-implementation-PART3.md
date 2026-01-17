# Radiation & Death System - Part 3: Frontend & Admin UI

---

## 8. Frontend PDA UI

### 8.1 Radiation Display (Header)

**Location:** `frontend/src/components/layout/Header.tsx`

**Changes:**
```tsx
interface HeaderProps {
  player: {
    nickname: string;
    balance: number;
    currentLives: number;
    currentRadiation: number;  // NEW
    currentWounds: number;     // NEW (not used in MVP)
  };
}

export function Header({ player }: HeaderProps) {
  // Radiation color thresholds
  const getRadiationColor = (radiation: number) => {
    if (radiation <= 20) return 'text-green-400';
    if (radiation <= 70) return 'text-yellow-400';
    return 'text-red-500';
  };
  
  const radiationColor = getRadiationColor(player.currentRadiation);
  
  return (
    <div className="pda-header">
      <div className="player-stats">
        <div className="stat">
          <span className="label">Lives:</span>
          <span className="value">{player.currentLives}</span>
        </div>
        
        <div className="stat">
          <span className="label">Radiation:</span>
          <span className={`value ${radiationColor}`}>
            {Math.round(player.currentRadiation)}%
          </span>
        </div>
        
        <div className="stat">
          <span className="label">Balance:</span>
          <span className="value">💰 {player.balance.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
```

### 8.2 Death Banner (Map Page)

**Location:** `frontend/src/pages/MapPage.tsx`

**Add banner for dead players:**
```tsx
export function MapPage() {
  const { player } = useAuthStore();
  const [nearestRespawnZone, setNearestRespawnZone] = useState<any>(null);
  
  // Check if player is dead
  const isDead = player?.status === 'dead';
  const canRespawn = player?.currentLives > 0;
  
  useEffect(() => {
    if (isDead && canRespawn) {
      // Find nearest respawn zone
      // ... fetch respawn zones and calculate distances ...
    }
  }, [isDead, canRespawn]);
  
  return (
    <div className="map-page">
      {/* Death Banner */}
      {isDead && (
        <div className="death-banner">
          <div className="banner-content">
            <h2 className="text-red-500 text-2xl font-bold">
              ВЫ МЕРТВЫ
            </h2>
            
            {canRespawn ? (
              <>
                <p className="text-yellow-400 mt-2">
                  Lives remaining: {player.currentLives}
                </p>
                <p className="text-gray-300 mt-1">
                  Go to respawn zone to resurrect
                </p>
                
                {nearestRespawnZone && (
                  <div className="mt-3">
                    <p className="text-green-400">
                      Nearest: {nearestRespawnZone.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      Distance: {nearestRespawnZone.distance}m
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-red-400 mt-2">
                  No lives remaining
                </p>
                <p className="text-gray-300 mt-1">
                  You can only trade with Barman
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Equip items with bonus lives to become eligible for respawn
                </p>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* Map */}
      <MapContainer {...}>
        {/* Radiation zones */}
        {radiationZones.map(zone => (
          <Circle
            key={zone.id}
            center={[zone.centerLat, zone.centerLng]}
            radius={zone.radius}
            pathOptions={{
              color: 'red',
              fillColor: 'red',
              fillOpacity: 0.2
            }}
          >
            <Popup>
              <div>
                <h3>{zone.name}</h3>
                <p>Radiation: {zone.radiationLevel}/5min</p>
              </div>
            </Popup>
          </Circle>
        ))}
        
        {/* Respawn zones */}
        {respawnZones.map(zone => (
          <Circle
            key={zone.id}
            center={[zone.centerLat, zone.centerLng]}
            radius={zone.radius}
            pathOptions={{
              color: 'green',
              fillColor: 'green',
              fillOpacity: 0.3
            }}
          >
            <Popup>
              <div>
                <h3>{zone.name}</h3>
                <p>Respawn time: {zone.respawnTimeSeconds}s</p>
              </div>
            </Popup>
          </Circle>
        ))}
        
        {/* Player marker */}
        <Marker position={[playerLat, playerLng]}>
          <Popup>You are here</Popup>
        </Marker>
      </MapContainer>
      
      {/* Resurrection Progress (if inside respawn zone) */}
      {isDead && canRespawn && resurrectionProgress && (
        <div className="resurrection-progress">
          <h3>Resurrection Progress</h3>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${resurrectionProgress.percent}%` }}
            />
          </div>
          <p>
            {resurrectionProgress.progress}s / {resurrectionProgress.required}s
          </p>
        </div>
      )}
    </div>
  );
}
```

**CSS:** `frontend/src/pages/MapPage.css`
```css
.death-banner {
  position: absolute;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid #ef4444;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  min-width: 300px;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.5);
}

.resurrection-progress {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid #10b981;
  border-radius: 8px;
  padding: 15px;
  min-width: 250px;
}

.progress-bar {
  width: 100%;
  height: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #10b981, #34d399);
  transition: width 0.3s ease;
}
```

### 8.3 Profile Page - QR Code Display

**Location:** `frontend/src/pages/ProfilePage.tsx`

**Add QR code section:**
```tsx
export function ProfilePage() {
  const { player } = useAuthStore();
  const [qrCode, setQrCode] = useState<string | null>(null);
  
  useEffect(() => {
    // Fetch QR code from /api/auth/me
    fetchProfile().then(data => {
      setQrCode(data.qrCode);
    });
  }, []);
  
  return (
    <div className="profile-page">
      {/* Existing stats */}
      
      {/* QR Code Section */}
      <div className="qr-section">
        <h2>Looting QR Code</h2>
        <p className="text-sm text-gray-400 mb-3">
          Show this code to other players when you die
        </p>
        
        {qrCode ? (
          <div className="qr-code-container">
            <img src={qrCode} alt="QR Code" className="qr-code" />
          </div>
        ) : (
          <div className="loading">Loading QR code...</div>
        )}
        
        <p className="text-xs text-gray-500 mt-2">
          Can only be scanned once per death
        </p>
      </div>
    </div>
  );
}
```

**CSS:**
```css
.qr-section {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  margin-top: 20px;
}

.qr-code-container {
  display: flex;
  justify-content: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  margin: 0 auto;
  max-width: 250px;
}

.qr-code {
  width: 200px;
  height: 200px;
}
```

### 8.4 Looting Page (NEW)

**Location:** `frontend/src/pages/LootingPage.tsx`

**New page for scanning victim QR codes:**
```tsx
import { useState } from 'react';
import { apiClient } from '../services/api';
import { QrReader } from 'react-qr-reader';

export function LootingPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handleScan = async (data: string | null) => {
    if (!data) return;
    
    setScanning(false);
    setError(null);
    
    try {
      const response = await apiClient.post('/api/player/loot', {
        victimQrCode: data
      });
      
      setResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to loot player');
    }
  };
  
  const handleError = (err: any) => {
    console.error(err);
    setError('Failed to scan QR code');
  };
  
  return (
    <div className="looting-page">
      <h1>Loot Player</h1>
      
      {!scanning && !result && (
        <button 
          className="btn-primary"
          onClick={() => setScanning(true)}
        >
          Scan QR Code
        </button>
      )}
      
      {scanning && (
        <div className="qr-scanner">
          <QrReader
            onResult={(result, error) => {
              if (result) {
                handleScan(result?.getText());
              }
              if (error) {
                handleError(error);
              }
            }}
            constraints={{ facingMode: 'environment' }}
          />
          
          <button 
            className="btn-secondary mt-4"
            onClick={() => setScanning(false)}
          >
            Cancel
          </button>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          <p className="text-red-500">{error}</p>
          <button 
            className="btn-secondary mt-3"
            onClick={() => {
              setError(null);
              setScanning(true);
            }}
          >
            Try Again
          </button>
        </div>
      )}
      
      {result && (
        <div className="loot-result">
          <h2 className="text-green-400">Looting Successful!</h2>
          
          <div className="victim-info mt-4">
            <p>Victim: {result.victimName}</p>
          </div>
          
          <div className="items-looted mt-4">
            <h3>Items Looted:</h3>
            {result.itemsLooted.length > 0 ? (
              <ul className="item-list">
                {result.itemsLooted.map((item: any, i: number) => (
                  <li key={i}>
                    {item.type === 'artifact' ? '💎' : '🛡️'} {item.name}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400">No items looted</p>
            )}
          </div>
          
          <button 
            className="btn-primary mt-6"
            onClick={() => {
              setResult(null);
              setScanning(true);
            }}
          >
            Loot Another Player
          </button>
        </div>
      )}
    </div>
  );
}
```

**Add to routes:** `frontend/src/App.tsx`
```tsx
import { LootingPage } from './pages/LootingPage';

<Route path="/loot" element={<ProtectedRoute><LootingPage /></ProtectedRoute>} />
```

**Add to navigation:** `frontend/src/components/layout/Footer.tsx`
```tsx
<Link to="/loot" className="nav-item">
  <QrCodeIcon />
  <span>Loot</span>
</Link>
```

**Install dependency:**
```bash
npm install react-qr-reader
```

---

## 9. Admin Panel UI

### 9.1 Radiation Zones Page (Modified)

**Location:** `admin/src/pages/ZonesPage.tsx`

**Add time window and respawn settings:**
```tsx
interface RadiationZoneForm {
  name: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  radiationLevel: number;
  
  // Time window (NEW)
  timeMode: 'duration' | 'exact' | 'permanent';
  durationHours?: number;
  activeFrom?: string;  // ISO datetime
  activeTo?: string;    // ISO datetime
  
  // Respawn settings (NEW)
  respawnEnabled: boolean;
  respawnDelaySeconds?: number;
  respawnRadiusMeters?: number;
}

export function ZonesPage() {
  const [form, setForm] = useState<RadiationZoneForm>({
    name: '',
    centerLat: 0,
    centerLng: 0,
    radius: 100,
    radiationLevel: 50,
    timeMode: 'permanent',
    respawnEnabled: false
  });
  
  const handleSubmit = async () => {
    // Calculate timestamps based on timeMode
    let activeFrom = null;
    let activeTo = null;
    
    if (form.timeMode === 'duration') {
      activeFrom = new Date().toISOString();
      activeTo = new Date(Date.now() + form.durationHours! * 60 * 60 * 1000).toISOString();
    } else if (form.timeMode === 'exact') {
      activeFrom = form.activeFrom;
      activeTo = form.activeTo;
    }
    
    const payload = {
      name: form.name,
      centerLat: form.centerLat,
      centerLng: form.centerLng,
      radius: form.radius,
      radiationLevel: form.radiationLevel,
      activeFrom,
      activeTo,
      respawnEnabled: form.respawnEnabled,
      respawnDelaySeconds: form.respawnDelaySeconds,
      respawnRadiusMeters: form.respawnRadiusMeters
    };
    
    await apiClient.post('/api/admin/zones/radiation', payload);
    
    // Refresh list
    fetchZones();
  };
  
  return (
    <div className="zones-page">
      <h1>Radiation Zones</h1>
      
      {/* Map for coordinate selection */}
      <MapContainer {...}>
        <MapClickHandler onMapClick={(lat, lng) => {
          setForm({ ...form, centerLat: lat, centerLng: lng });
        }} />
        
        {/* Show existing zones */}
        {zones.map(zone => (
          <Circle
            key={zone.id}
            center={[zone.centerLat, zone.centerLng]}
            radius={zone.radius}
            pathOptions={{ color: 'red', fillOpacity: 0.2 }}
          />
        ))}
        
        {/* Show new zone preview */}
        {form.centerLat !== 0 && (
          <Circle
            center={[form.centerLat, form.centerLng]}
            radius={form.radius}
            pathOptions={{ color: 'orange', fillOpacity: 0.3 }}
          />
        )}
      </MapContainer>
      
      {/* Form */}
      <div className="zone-form">
        <input
          type="text"
          placeholder="Zone name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
        />
        
        <input
          type="number"
          placeholder="Radius (meters)"
          value={form.radius}
          onChange={e => setForm({ ...form, radius: parseInt(e.target.value) })}
        />
        
        <input
          type="number"
          placeholder="Radiation level (per 5 min)"
          value={form.radiationLevel}
          onChange={e => setForm({ ...form, radiationLevel: parseInt(e.target.value) })}
        />
        
        {/* Time Mode */}
        <div className="time-mode">
          <label>Time Mode:</label>
          <select
            value={form.timeMode}
            onChange={e => setForm({ ...form, timeMode: e.target.value as any })}
          >
            <option value="permanent">Permanent</option>
            <option value="duration">Duration (hours from now)</option>
            <option value="exact">Exact time range</option>
          </select>
        </div>
        
        {form.timeMode === 'duration' && (
          <input
            type="number"
            placeholder="Duration (hours)"
            value={form.durationHours || ''}
            onChange={e => setForm({ ...form, durationHours: parseInt(e.target.value) })}
          />
        )}
        
        {form.timeMode === 'exact' && (
          <>
            <input
              type="datetime-local"
              placeholder="Active from"
              onChange={e => setForm({ ...form, activeFrom: new Date(e.target.value).toISOString() })}
            />
            <input
              type="datetime-local"
              placeholder="Active to"
              onChange={e => setForm({ ...form, activeTo: new Date(e.target.value).toISOString() })}
            />
          </>
        )}
        
        {/* Respawn Settings */}
        <div className="respawn-settings">
          <label>
            <input
              type="checkbox"
              checked={form.respawnEnabled}
              onChange={e => setForm({ ...form, respawnEnabled: e.target.checked })}
            />
            Enable auto-respawn after expiration
          </label>
          
          {form.respawnEnabled && (
            <>
              <input
                type="number"
                placeholder="Respawn delay (seconds)"
                value={form.respawnDelaySeconds || ''}
                onChange={e => setForm({ ...form, respawnDelaySeconds: parseInt(e.target.value) })}
              />
              <input
                type="number"
                placeholder="Respawn radius (meters)"
                value={form.respawnRadiusMeters || ''}
                onChange={e => setForm({ ...form, respawnRadiusMeters: parseInt(e.target.value) })}
              />
            </>
          )}
        </div>
        
        <button className="btn-primary" onClick={handleSubmit}>
          Create Radiation Zone
        </button>
      </div>
      
      {/* Zones List */}
      <div className="zones-list">
        <h2>Active Zones</h2>
        {zones.map(zone => (
          <div key={zone.id} className="zone-item">
            <h3>{zone.name}</h3>
            <p>Radiation: {zone.radiationLevel}/5min</p>
            <p>Radius: {zone.radius}m</p>
            {zone.activeTo && (
              <p>Expires: {new Date(zone.activeTo).toLocaleString()}</p>
            )}
            {zone.respawnEnabled && (
              <p className="text-green-400">Auto-respawn enabled</p>
            )}
            <button onClick={() => deleteZone(zone.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 9.2 Respawn Zones Page (NEW)

**Location:** `admin/src/pages/RespawnZonesPage.tsx`

**Similar to radiation zones, but for respawn:**
```tsx
interface RespawnZoneForm {
  name: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  respawnTimeSeconds: number;
  
  // Time window
  timeMode: 'duration' | 'exact' | 'permanent';
  durationHours?: number;
  activeFrom?: string;
  activeTo?: string;
  
  // Respawn settings
  respawnEnabled: boolean;
  respawnDelaySeconds?: number;
  respawnRadiusMeters?: number;
}

export function RespawnZonesPage() {
  // Similar implementation to ZonesPage
  // But creates respawn zones instead of radiation zones
  
  return (
    <div className="respawn-zones-page">
      <h1>Respawn Zones</h1>
      
      {/* Map + Form (similar to radiation zones) */}
      
      {/* Key difference: respawnTimeSeconds instead of radiationLevel */}
      <input
        type="number"
        placeholder="Respawn time (seconds)"
        value={form.respawnTimeSeconds}
        onChange={e => setForm({ ...form, respawnTimeSeconds: parseInt(e.target.value) })}
      />
      
      {/* Rest is similar */}
    </div>
  );
}
```

**Add to routes:** `admin/src/App.tsx`
```tsx
<Route path="/respawn-zones" element={<ProtectedRoute><RespawnZonesPage /></ProtectedRoute>} />
```

### 9.3 Artifacts Page - Add Radiation Field

**Location:** `admin/src/pages/ArtifactsPage.tsx`

**Add pickup radiation field:**
```tsx
interface ArtifactSpawnForm {
  typeId: string;
  latitude: number;
  longitude: number;
  
  // Time settings
  timeMode: 'duration' | 'exact' | 'permanent';
  durationHours?: number;
  expiresAt?: string;
  
  // Radiation (NEW)
  pickupRadiation: number;  // 0-100
  
  // Respawn settings
  respawnEnabled: boolean;
  respawnDelaySeconds?: number;
  respawnRadiusMeters?: number;
}

// In form:
<input
  type="number"
  placeholder="Pickup radiation (0-100)"
  value={form.pickupRadiation}
  onChange={e => setForm({ ...form, pickupRadiation: parseInt(e.target.value) })}
  min="0"
  max="100"
/>

<p className="text-xs text-gray-400">
  Radiation applied on pickup (±30% variance)
</p>
```

### 9.4 Players Map - Resurrect Button

**Location:** `admin/src/pages/DashboardPage.tsx` (GM Map)

**Add resurrect button to player popup:**
```tsx
<Marker
  key={player.id}
  position={[player.latitude, player.longitude]}
  icon={player.status === 'dead' ? greyIcon : factionIcon}
>
  <Popup>
    <div className="player-popup">
      <h3>{player.nickname}</h3>
      <p>Faction: {player.faction}</p>
      <p>Status: {player.status}</p>
      <p>Lives: {player.currentLives}</p>
      <p>Radiation: {player.currentRadiation}%</p>
      
      {player.status === 'dead' && (
        <button
          className="btn-danger mt-2"
          onClick={() => resurrectPlayer(player.id)}
        >
          Resurrect Player
        </button>
      )}
    </div>
  </Popup>
</Marker>
```

**Resurrect function:**
```tsx
const resurrectPlayer = async (playerId: string) => {
  if (!confirm('Resurrect this player? This will set status to ALIVE immediately.')) {
    return;
  }
  
  try {
    await apiClient.post(`/api/admin/players/${playerId}/resurrect`);
    alert('Player resurrected');
    fetchPlayers();  // Refresh map
  } catch (err) {
    alert('Failed to resurrect player');
  }
};
```

---

**Continue in Part 4: Testing, Deployment, Cron Jobs...**
