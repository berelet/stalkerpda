# Roles System

## Архитектура

Система ролей использует флаги в таблице `player_roles` для гибкого управления правами доступа.

### Таблица player_roles
```sql
player_id VARCHAR(36) PRIMARY KEY
is_gm TINYINT(1) DEFAULT 0
is_bartender TINYINT(1) DEFAULT 0
permissions JSON
updated_at TIMESTAMP
```

## Доступные роли

| Роль | Флаг | Описание |
|------|------|----------|
| **Player** | (default) | Обычный игрок |
| **GM** | `is_gm = 1` | Game Master - видит всех игроков, управляет игрой |
| **Bartender** | `is_bartender = 1` | Бармен - управляет баром, продаёт предметы |
| **Trader** | `permissions.trader` | Торговец - покупает/продаёт артефакты |
| **Medic** | `permissions.medic` | Медик - лечит игроков |
| **Admin** | `permissions.admin` | Администратор - полный доступ |

## Управление ролями

### Дать роль GM
```sql
INSERT INTO player_roles (player_id, is_gm) 
VALUES ('player-uuid', 1)
ON DUPLICATE KEY UPDATE is_gm = 1;
```

### Дать роль Bartender
```sql
INSERT INTO player_roles (player_id, is_bartender) 
VALUES ('player-uuid', 1)
ON DUPLICATE KEY UPDATE is_bartender = 1;
```

### Дать несколько ролей
```sql
INSERT INTO player_roles (player_id, is_gm, is_bartender) 
VALUES ('player-uuid', 1, 1)
ON DUPLICATE KEY UPDATE is_gm = 1, is_bartender = 1;
```

### Забрать роль
```sql
UPDATE player_roles 
SET is_gm = 0 
WHERE player_id = 'player-uuid';
```

### Проверить роли игрока
```sql
SELECT p.email, p.nickname, pr.is_gm, pr.is_bartender, pr.permissions
FROM players p
LEFT JOIN player_roles pr ON p.id = pr.player_id
WHERE p.email = 'user@example.com';
```

## Backend

### Middleware
- `@require_auth` - требует авторизацию
- `@require_gm` - требует роль GM

### API Response
`GET /api/auth/me` возвращает:
```json
{
  "id": "...",
  "nickname": "...",
  "role": "gm",  // "player" | "gm" | "bartender"
  ...
}
```

## Frontend

### Проверка роли
```typescript
const { data } = await api.get('/api/auth/me')
const isGM = data.role === 'gm'
```

### Условный рендеринг
```tsx
{isGM && (
  <button onClick={...}>GM FEATURE</button>
)}
```

## Примеры

### Дать GM роль пользователю berelet@gmail.com
```bash
mysql -h <rds-host> -u pda_admin -p pda_zone -e "
INSERT INTO player_roles (player_id, is_gm) 
SELECT id, 1 FROM players WHERE email = 'berelet@gmail.com'
ON DUPLICATE KEY UPDATE is_gm = 1;
"
```

### Найти всех GM
```sql
SELECT p.nickname, p.email
FROM players p
JOIN player_roles pr ON p.id = pr.player_id
WHERE pr.is_gm = 1;
```

### Дать игроку несколько ролей
```sql
-- GM + Bartender
INSERT INTO player_roles (player_id, is_gm, is_bartender) 
SELECT id, 1, 1 FROM players WHERE nickname = 'Admin'
ON DUPLICATE KEY UPDATE is_gm = 1, is_bartender = 1;
```
