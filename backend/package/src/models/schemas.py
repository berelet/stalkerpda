from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

# Enums
class Faction(str, Enum):
    STALKER = "stalker"
    BANDIT = "bandit"
    MERCENARY = "mercenary"
    DUTY = "duty"
    FREEDOM = "freedom"
    LONER = "loner"

class PlayerStatus(str, Enum):
    ALIVE = "alive"
    WOUNDED = "wounded"
    DEAD = "dead"

class ArtifactRarity(str, Enum):
    COMMON = "common"
    UNCOMMON = "uncommon"
    RARE = "rare"
    LEGENDARY = "legendary"

class ArtifactState(str, Enum):
    HIDDEN = "hidden"
    VISIBLE = "visible"
    EXTRACTING = "extracting"
    EXTRACTED = "extracted"
    LOST = "lost"

class ContractType(str, Enum):
    ELIMINATION = "elimination"
    ESCORT = "escort"
    DELIVERY = "delivery"
    ARTIFACT_EXTRACTION = "artifact_extraction"
    ZONE_CONTROL = "zone_control"

class ContractStatus(str, Enum):
    AVAILABLE = "available"
    ACCEPTED = "accepted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Request Models
class RegisterRequest(BaseModel):
    nickname: str
    email: EmailStr
    password: str
    faction: Faction

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LocationUpdate(BaseModel):
    latitude: float
    longitude: float
    accuracy: Optional[float] = None

class ExtractArtifactRequest(BaseModel):
    latitude: float
    longitude: float

class CreateContractRequest(BaseModel):
    type: ContractType
    title: str
    description: str
    reward: float
    targetPlayerId: Optional[str] = None
    targetArtifactId: Optional[str] = None
    targetZoneId: Optional[str] = None
    deliveryFrom: Optional[str] = None
    deliveryTo: Optional[str] = None
    destinationLat: Optional[float] = None
    destinationLng: Optional[float] = None
    expiresAt: Optional[datetime] = None
    factionRestriction: Optional[Faction] = None

class LootPlayerRequest(BaseModel):
    victimQrCode: str

# Response Models
class PlayerResponse(BaseModel):
    id: str
    nickname: str
    email: str
    faction: Faction
    status: PlayerStatus
    balance: float
    reputation: int
    currentLives: int
    currentRadiation: int
    qrCode: str
    stats: dict

class AuthResponse(BaseModel):
    id: str
    nickname: str
    email: str
    faction: Faction
    token: str

class LocationResponse(BaseModel):
    success: bool
    currentZones: dict
    nearbyArtifacts: List[dict]

class ArtifactResponse(BaseModel):
    id: str
    name: str
    rarity: ArtifactRarity
    value: float
    effects: dict
    extractedAt: Optional[datetime] = None

class ContractResponse(BaseModel):
    id: str
    type: ContractType
    title: str
    description: str
    reward: float
    status: ContractStatus
    issuer: dict
    expiresAt: Optional[datetime] = None
