-- Migration: 001_initial_schema.sql
-- Description: Create all tables for PDA ZONE game

-- Players table
CREATE TABLE players (
    id VARCHAR(36) PRIMARY KEY,
    nickname VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    faction ENUM('stalker', 'bandit', 'mercenary', 'duty', 'freedom', 'loner') NOT NULL,
    status ENUM('alive', 'wounded', 'dead') DEFAULT 'alive',
    balance DECIMAL(10, 2) DEFAULT 1000.00,
    reputation INT DEFAULT 0,
    qr_code VARCHAR(255) NOT NULL UNIQUE,
    
    -- Stats (persistent)
    total_kills INT DEFAULT 0,
    total_deaths INT DEFAULT 0,
    total_artifacts_found INT DEFAULT 0,
    total_contracts_completed INT DEFAULT 0,
    
    -- Session data (reset each game)
    current_lives INT DEFAULT 4,
    current_radiation INT DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_seen TIMESTAMP NULL,
    
    INDEX idx_faction (faction),
    INDEX idx_nickname (nickname),
    INDEX idx_qr_code (qr_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Player locations
CREATE TABLE player_locations (
    player_id VARCHAR(36) PRIMARY KEY,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy FLOAT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    
    INDEX idx_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Location history
CREATE TABLE location_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    player_id VARCHAR(36) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    accuracy FLOAT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    
    INDEX idx_player_time (player_id, recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Artifact types
CREATE TABLE artifact_types (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rarity ENUM('common', 'uncommon', 'rare', 'legendary') NOT NULL,
    base_value DECIMAL(10, 2) NOT NULL,
    
    -- Effects (JSON)
    bonus_lives INT DEFAULT 0,
    radiation_resist INT DEFAULT 0,
    other_effects JSON,
    
    -- Metadata
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES players(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Artifacts
CREATE TABLE artifacts (
    id VARCHAR(36) PRIMARY KEY,
    type_id VARCHAR(36) NOT NULL,
    state ENUM('hidden', 'visible', 'extracting', 'extracted', 'lost') DEFAULT 'hidden',
    
    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    
    -- Ownership
    owner_id VARCHAR(36),
    extracting_by VARCHAR(36),
    extraction_started_at TIMESTAMP NULL,
    
    -- Timestamps
    spawned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    extracted_at TIMESTAMP NULL,
    
    FOREIGN KEY (type_id) REFERENCES artifact_types(id) ON DELETE CASCADE,
    FOREIGN KEY (owner_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (extracting_by) REFERENCES players(id) ON DELETE SET NULL,
    
    INDEX idx_state (state),
    INDEX idx_owner (owner_id),
    INDEX idx_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Equipment types
CREATE TABLE equipment_types (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category ENUM('armor', 'ring', 'consumable') NOT NULL,
    
    -- Effects
    bonus_wounds INT DEFAULT 0,
    radiation_resist INT DEFAULT 0,
    radiation_removal INT DEFAULT 0,
    
    -- Economy
    base_price DECIMAL(10, 2) NOT NULL,
    
    -- Limits
    max_slots INT DEFAULT 1,
    
    -- Metadata
    created_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES players(id) ON DELETE SET NULL,
    
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Player equipment
CREATE TABLE player_equipment (
    id VARCHAR(36) PRIMARY KEY,
    player_id VARCHAR(36) NOT NULL,
    equipment_type_id VARCHAR(36) NOT NULL,
    equipped BOOLEAN DEFAULT TRUE,
    
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
    
    INDEX idx_player (player_id),
    INDEX idx_equipped (player_id, equipped)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Radiation zones
CREATE TABLE radiation_zones (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    
    -- Location
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    radius INT NOT NULL,
    
    -- Radiation
    radiation_level INT NOT NULL,
    
    -- Metadata
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (created_by) REFERENCES players(id) ON DELETE CASCADE,
    
    INDEX idx_active (active),
    INDEX idx_center (center_lat, center_lng)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Control points
CREATE TABLE control_points (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    
    -- Location
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    capture_radius INT DEFAULT 2,
    
    -- Control
    controlled_by_faction ENUM('stalker', 'bandit', 'mercenary', 'duty', 'freedom', 'loner') NULL,
    controlled_by_player VARCHAR(36),
    captured_at TIMESTAMP NULL,
    
    -- Capture in progress
    capturing_by VARCHAR(36),
    capture_started_at TIMESTAMP NULL,
    
    -- Metadata
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (controlled_by_player) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (capturing_by) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES players(id) ON DELETE CASCADE,
    
    INDEX idx_active (active),
    INDEX idx_faction (controlled_by_faction),
    INDEX idx_location (latitude, longitude)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contracts
CREATE TABLE contracts (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('elimination', 'escort', 'delivery', 'artifact_extraction', 'zone_control') NOT NULL,
    
    -- Parties
    issuer_id VARCHAR(36) NOT NULL,
    accepted_by VARCHAR(36),
    
    -- Details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    reward DECIMAL(10, 2) NOT NULL,
    
    -- Type-specific data
    target_player_id VARCHAR(36),
    target_artifact_id VARCHAR(36),
    target_zone_id VARCHAR(36),
    delivery_from VARCHAR(36),
    delivery_to VARCHAR(36),
    delivery_item_id VARCHAR(36),
    destination_lat DECIMAL(10, 8),
    destination_lng DECIMAL(11, 8),
    
    -- Status
    status ENUM('available', 'accepted', 'in_progress', 'completed', 'failed', 'cancelled') DEFAULT 'available',
    
    -- Faction restriction
    faction_restriction ENUM('stalker', 'bandit', 'mercenary', 'duty', 'freedom', 'loner') NULL,
    
    -- Escrow
    escrow_amount DECIMAL(10, 2) NOT NULL,
    escrow_held BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    available_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    accepted_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (issuer_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (accepted_by) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (target_player_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (target_artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL,
    FOREIGN KEY (target_zone_id) REFERENCES control_points(id) ON DELETE SET NULL,
    FOREIGN KEY (delivery_from) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (delivery_to) REFERENCES players(id) ON DELETE SET NULL,
    
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_issuer (issuer_id),
    INDEX idx_accepted (accepted_by),
    INDEX idx_faction (faction_restriction),
    INDEX idx_available (available_at, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Transactions
CREATE TABLE transactions (
    id VARCHAR(36) PRIMARY KEY,
    type ENUM('contract_payment', 'artifact_sale', 'equipment_purchase', 'looting', 'death_penalty') NOT NULL,
    
    from_player_id VARCHAR(36),
    to_player_id VARCHAR(36),
    
    amount DECIMAL(10, 2) NOT NULL,
    
    -- References
    contract_id VARCHAR(36),
    artifact_id VARCHAR(36),
    equipment_id VARCHAR(36),
    
    description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (from_player_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (to_player_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL,
    
    INDEX idx_from (from_player_id),
    INDEX idx_to (to_player_id),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Game events
CREATE TABLE game_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('player_killed', 'artifact_extracted', 'zone_captured', 'contract_completed', 
              'zone_transition', 'radiation_death', 'looting', 'equipment_lost') NOT NULL,
    
    player_id VARCHAR(36),
    target_player_id VARCHAR(36),
    artifact_id VARCHAR(36),
    zone_id VARCHAR(36),
    contract_id VARCHAR(36),
    
    data JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (target_player_id) REFERENCES players(id) ON DELETE SET NULL,
    FOREIGN KEY (artifact_id) REFERENCES artifacts(id) ON DELETE SET NULL,
    FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE SET NULL,
    
    INDEX idx_type (type),
    INDEX idx_player (player_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Shop inventory
CREATE TABLE shop_inventory (
    id VARCHAR(36) PRIMARY KEY,
    bartender_id VARCHAR(36) NOT NULL,
    
    item_type ENUM('equipment', 'consumable', 'ammo', 'physical') NOT NULL,
    item_id VARCHAR(36),
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INT,
    
    is_physical BOOLEAN DEFAULT FALSE,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (bartender_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES equipment_types(id) ON DELETE SET NULL,
    
    INDEX idx_bartender (bartender_id),
    INDEX idx_active (active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Purchase transactions
CREATE TABLE purchase_transactions (
    id VARCHAR(36) PRIMARY KEY,
    bartender_id VARCHAR(36) NOT NULL,
    player_id VARCHAR(36) NOT NULL,
    
    items JSON NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    qr_code VARCHAR(255) NOT NULL,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (bartender_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    
    INDEX idx_bartender (bartender_id),
    INDEX idx_player (player_id),
    INDEX idx_status (status),
    INDEX idx_qr (qr_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Looting events
CREATE TABLE looting_events (
    id VARCHAR(36) PRIMARY KEY,
    looter_id VARCHAR(36) NOT NULL,
    victim_id VARCHAR(36) NOT NULL,
    
    -- Loot results
    money_stolen DECIMAL(10, 2) DEFAULT 0,
    equipment_stolen JSON,
    artifacts_stolen JSON,
    
    qr_scanned VARCHAR(255) NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (looter_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (victim_id) REFERENCES players(id) ON DELETE CASCADE,
    
    INDEX idx_looter (looter_id),
    INDEX idx_victim (victim_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Player roles
CREATE TABLE player_roles (
    player_id VARCHAR(36) PRIMARY KEY,
    is_gm BOOLEAN DEFAULT FALSE,
    is_bartender BOOLEAN DEFAULT FALSE,
    
    permissions JSON,
    
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Game sessions
CREATE TABLE game_sessions (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    
    default_lives INT DEFAULT 4,
    
    status ENUM('scheduled', 'active', 'completed') DEFAULT 'scheduled',
    
    created_by VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (created_by) REFERENCES players(id) ON DELETE CASCADE,
    
    INDEX idx_status (status),
    INDEX idx_start (start_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Session players
CREATE TABLE session_players (
    session_id VARCHAR(36),
    player_id VARCHAR(36),
    
    lives_at_start INT DEFAULT 4,
    lives_remaining INT DEFAULT 4,
    
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (session_id, player_id),
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
