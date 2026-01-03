-- Roles system migration

-- Create roles table
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create player_roles junction table
CREATE TABLE IF NOT EXISTS player_roles (
    player_id VARCHAR(36) NOT NULL,
    role_id VARCHAR(36) NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(36),
    PRIMARY KEY (player_id, role_id),
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES players(id) ON DELETE SET NULL
);

-- Insert default roles
INSERT INTO roles (id, name, description) VALUES
    (UUID(), 'player', 'Regular player'),
    (UUID(), 'gm', 'Game Master - can view all players, manage game'),
    (UUID(), 'bartender', 'Bartender - can manage bar, sell items'),
    (UUID(), 'trader', 'Trader - can buy/sell artifacts'),
    (UUID(), 'medic', 'Medic - can heal players'),
    (UUID(), 'admin', 'Administrator - full access');

-- Grant player role to all existing players
INSERT INTO player_roles (player_id, role_id)
SELECT p.id, r.id
FROM players p
CROSS JOIN roles r
WHERE r.name = 'player'
AND NOT EXISTS (
    SELECT 1 FROM player_roles pr 
    WHERE pr.player_id = p.id AND pr.role_id = r.id
);
