// Shared types between PDA and Admin
export type Faction = 'stalker' | 'bandit' | 'mercenary' | 'duty' | 'freedom' | 'loner';

export type PlayerStatus = 'alive' | 'wounded' | 'dead';

export interface Player {
  id: string;
  nickname: string;
  email: string;
  faction: Faction;
  status: PlayerStatus;
  balance: number;
  reputation: number;
  currentLives: number;
  currentRadiation: number;
  qrCode: string;
  stats: {
    kills: number;
    deaths: number;
    artifactsFound: number;
    contractsCompleted: number;
  };
}

export interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  updatedAt?: string;
}

export interface PlayerWithLocation extends Player {
  location: Location;
}

export interface Artifact {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  value: number;
  effects: {
    bonusLives?: number;
    radiationResist?: number;
  };
  state: 'hidden' | 'visible' | 'extracting' | 'extracted' | 'lost';
  location?: Location;
  ownerId?: string;
  extractedAt?: string;
}

export interface ArtifactType {
  id: string;
  name: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  value: number;
  bonusLives: number;
  radiationResist: number;
  imageUrl: string;
  createdAt: string;
}

export interface RadiationZone {
  id: string;
  name: string;
  centerLat: number;
  centerLng: number;
  radius: number;
  radiationLevel: number;
  active: boolean;
}

export interface ControlPoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  controlledByFaction?: Faction;
  controlledByPlayer?: string;
  capturedAt?: string;
  active: boolean;
}

export interface Contract {
  id: string;
  type: 'elimination' | 'escort' | 'delivery' | 'artifact_extraction' | 'zone_control';
  title: string;
  description: string;
  reward: number;
  status: 'available' | 'accepted' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  issuerId: string;
  acceptedBy?: string;
  createdAt: string;
  expiresAt?: string;
}
