import { useState } from 'react'

type Section = 'overview' | 'artifacts' | 'radiation' | 'contracts' | 'looting' | 'equipment' | 'zones'

export default function WikiPage() {
  const [activeSection, setActiveSection] = useState<Section>('overview')

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📖' },
    { id: 'artifacts', label: 'Artifacts', icon: '💎' },
    { id: 'radiation', label: 'Radiation', icon: '☢️' },
    { id: 'contracts', label: 'Contracts', icon: '📋' },
    { id: 'looting', label: 'Looting', icon: '💀' },
    { id: 'equipment', label: 'Equipment', icon: '🛡️' },
    { id: 'zones', label: 'Zones', icon: '🗺️' },
  ] as const

  return (
    <div className="p-4 text-pda-text font-mono">
      <h1 className="text-xl text-pda-highlight mb-4 text-center border-b border-pda-primary/30 pb-2">
        📚 STALKER PDA WIKI
      </h1>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id as Section)}
            className={`p-2 text-xs border transition-colors ${
              activeSection === section.id
                ? 'bg-pda-primary/20 border-pda-primary text-pda-highlight'
                : 'border-pda-primary/30 text-pda-text hover:bg-pda-primary/10'
            }`}
          >
            {section.icon} {section.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-pda-case-dark border border-pda-primary/30 p-4 text-xs space-y-3">
        {activeSection === 'overview' && (
          <div className="space-y-3">
            <h2 className="text-pda-highlight text-sm">🎮 Game Overview</h2>
            <p>Welcome to the Zone, Stalker! This is a 6-8 hour session-based game with 10-50 players.</p>
            
            <h3 className="text-pda-amber mt-3">🎯 Objective</h3>
            <p>Survive, collect artifacts, complete contracts, and build your reputation.</p>
            
            <h3 className="text-pda-amber mt-3">👥 Factions</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><span className="text-green-400">Stalker</span> - Independent explorers</li>
              <li><span className="text-red-400">Bandit</span> - Hostile faction</li>
              <li><span className="text-blue-400">Mercenary</span> - Hired guns</li>
              <li><span className="text-orange-400">Duty</span> - Military faction</li>
              <li><span className="text-purple-400">Freedom</span> - Anarchists</li>
              <li><span className="text-gray-400">Loner</span> - Solo players</li>
            </ul>

            <h3 className="text-pda-amber mt-3">❤️ Lives System</h3>
            <p>• Start with 4 lives per game</p>
            <p>• Artifacts can grant bonus lives</p>
            <p>• 15 min respawn timer (physical)</p>
            <p>• 0 lives = can only stay at bar</p>
          </div>
        )}

        {activeSection === 'artifacts' && (
          <div className="space-y-3">
            <h2 className="text-pda-highlight text-sm">💎 Artifacts</h2>
            
            <h3 className="text-pda-amber">🔍 Detection</h3>
            <p>• Auto-detected within 15m radius</p>
            <p>• Exact location shown on map</p>
            <p>• Quest artifacts show ~100m area</p>
            
            <h3 className="text-pda-amber mt-3">📦 Extraction</h3>
            <p>• Must be within 2m of artifact</p>
            <p>• Hold "Pick Up" button for 30 seconds</p>
            <p>• Release = timer resets to 0</p>
            <p>• Success = added to inventory</p>
            
            <h3 className="text-pda-amber mt-3">⭐ Rarity</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><span className="text-gray-400">Common</span> - Basic effects</li>
              <li><span className="text-green-400">Uncommon</span> - Good bonuses</li>
              <li><span className="text-blue-400">Rare</span> - Strong effects</li>
              <li><span className="text-purple-400">Legendary</span> - Unique powers</li>
            </ul>

            <h3 className="text-pda-amber mt-3">💫 Effects</h3>
            <p>• Bonus lives (+1 to +3)</p>
            <p>• Radiation resistance (10-30%)</p>
            <p>• Special bonuses (varies)</p>
            <p className="text-pda-danger mt-2">⚠️ Only equipped artifact gives bonuses!</p>
          </div>
        )}

        {activeSection === 'radiation' && (
          <div className="space-y-3">
            <h2 className="text-pda-highlight text-sm">☢️ Radiation System</h2>
            
            <h3 className="text-pda-amber">🗺️ Radiation Zones</h3>
            <p>• Created by GM before game</p>
            <p>• Levels: 10-100 rad per 5 minutes</p>
            <p>• Auto-detected when you enter</p>
            
            <h3 className="text-pda-amber mt-3">📊 Accumulation</h3>
            <p>• Every 5 min in zone: +radiation</p>
            <p>• Resistance reduces accumulation</p>
            <p>• Formula: actual = level × (1 - resist%)</p>
            <p>• Max radiation: 100 = death</p>
            
            <h3 className="text-pda-amber mt-3">🛡️ Protection</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Armor: 0-30% resistance</li>
              <li>Addons: 10-30% each (2 slots)</li>
              <li>Artifacts: 10-30% resistance</li>
              <li>Total stacks: up to 90%</li>
            </ul>

            <h3 className="text-pda-amber mt-3">💊 Treatment</h3>
            <p>• Anti-rad consumables: 10-100%</p>
            <p>• Use from inventory</p>
            <p>• Death resets radiation to 0</p>
          </div>
        )}

        {activeSection === 'contracts' && (
          <div className="space-y-3">
            <h2 className="text-pda-highlight text-sm">📋 Contracts</h2>
            
            <h3 className="text-pda-amber">📝 Types</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><span className="text-blue-400">Escort</span> - Protect client to destination</li>
              <li><span className="text-green-400">Delivery</span> - Transfer item between players</li>
              <li><span className="text-purple-400">Artifact</span> - Extract specific artifact</li>
              <li><span className="text-orange-400">Zone Control</span> - Hold control point</li>
            </ul>

            <h3 className="text-pda-amber mt-3">💰 Payment</h3>
            <p>• System contracts: paid by GM/Bartender</p>
            <p>• Player contracts: money held in escrow</p>
            <p>• Completion requires confirmation</p>
            <p>• Cancellation returns escrow</p>

            <h3 className="text-pda-amber mt-3">✅ Completion</h3>
            <p>1. Executor marks "completed"</p>
            <p>2. Issuer/GM/Bartender confirms</p>
            <p>3. Money transferred</p>
            <p>4. Reputation +10</p>

            <h3 className="text-pda-amber mt-3">🚫 Restrictions</h3>
            <p>• Some contracts faction-specific</p>
            <p>• Time limits may apply</p>
            <p>• Failed conditions auto-fail</p>
          </div>
        )}

        {activeSection === 'looting' && (
          <div className="space-y-3">
            <h2 className="text-pda-highlight text-sm">💀 Death & Looting</h2>
            
            <h3 className="text-pda-amber">☠️ On Death</h3>
            <p>1. Can be looted once (QR scan)</p>
            <p>2. Go to spawn (15 min physical)</p>
            <p>3. Mark death in PDA</p>
            <p>4. Lose 1 life</p>
            <p>5. All items: 1-10% loss chance</p>
            <p>6. Radiation reset to 0</p>

            <h3 className="text-pda-amber mt-3">🎯 Looting Process</h3>
            <p>1. Killer scans victim's QR code</p>
            <p>2. System calculates loot:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Money: 1-50% chance</li>
              <li>Equipment: 1-5% per item</li>
              <li>Artifacts: 1-3% per item</li>
            </ul>
            <p>3. Items transferred to killer</p>
            <p>4. Can only loot once per death</p>

            <h3 className="text-pda-amber mt-3">📱 QR Code</h3>
            <p>• Available in Inventory tab</p>
            <p>• Show only when dead</p>
            <p>• Physical card also issued</p>
            <p className="text-pda-danger mt-2">⚠️ All items lootable (equipped + backpack)!</p>
          </div>
        )}

        {activeSection === 'equipment' && (
          <div className="space-y-3">
            <h2 className="text-pda-highlight text-sm">🛡️ Equipment System</h2>
            
            <h3 className="text-pda-amber">📦 Inventory</h3>
            <p>• 4 equipment slots (armor, 2 addons, artifact)</p>
            <p>• 50 backpack slots</p>
            <p>• Total: 54 items max</p>
            <p className="text-pda-danger mt-2">⚠️ Only equipped items give bonuses!</p>

            <h3 className="text-pda-amber mt-3">🎒 Equipment Types</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><span className="text-blue-400">Armor</span> - +1 to +3 wounds, rad resist</li>
              <li><span className="text-green-400">Addons</span> - 10-30% rad resist (2 slots)</li>
              <li><span className="text-purple-400">Artifacts</span> - bonus lives, rad resist</li>
              <li><span className="text-yellow-400">Consumables</span> - anti-rad, medicine</li>
            </ul>

            <h3 className="text-pda-amber mt-3">⚙️ Operations</h3>
            <p>• Click item → context menu</p>
            <p>• Details: photo, description, stats</p>
            <p>• Equip/Unequip: move to/from slots</p>
            <p>• Use: consume anti-rad/medicine</p>
            <p>• Drop: delete permanently</p>
            <p>• Sell: only from backpack</p>

            <h3 className="text-pda-amber mt-3">💫 Bonus Lives</h3>
            <p>• Equip artifact: +lives</p>
            <p>• Unequip artifact: -lives (can kill!)</p>
            <p>• Can resurrect from 0 lives</p>
            <p>• Lives can go negative (debt)</p>
          </div>
        )}

        {activeSection === 'zones' && (
          <div className="space-y-3">
            <h2 className="text-pda-highlight text-sm">🗺️ Zones</h2>
            
            <h3 className="text-pda-amber">☢️ Radiation Zones</h3>
            <p>• Red circles on map</p>
            <p>• Radiation level: 10-100 per 5 min</p>
            <p>• Auto-detected on entry</p>
            <p>• Use protection to reduce damage</p>

            <h3 className="text-pda-amber mt-3">🚩 Control Points</h3>
            <p>• Flags on map (faction colors)</p>
            <p>• Capture range: 2m</p>
            <p>• Hold button for 30 seconds</p>
            <p>• Release = timer resets</p>
            <p>• Rewards via contracts</p>

            <h3 className="text-pda-amber mt-3">🎯 Capture Process</h3>
            <p>1. Approach point (within 2m)</p>
            <p>2. Hold "Capture" button (30s)</p>
            <p>3. Don't release or timer resets</p>
            <p>4. Success: point captured for faction</p>

            <h3 className="text-pda-amber mt-3">⚔️ Liberation</h3>
            <p>• Enemy can liberate your points</p>
            <p>• Same process: hold 30s</p>
            <p>• Point becomes neutral or theirs</p>
          </div>
        )}
      </div>
    </div>
  )
}
