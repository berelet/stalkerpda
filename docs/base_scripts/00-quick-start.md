# PDA ZONE — Quick Start Guide

## Как использовать эти промпты

### Шаг 1: Генерация структуры проекта

Открой Claude/Cursor/Copilot и вставь содержимое файла:
```
01-project-structure-prompt.md
```

Скажи AI: **"Начни с Makefile и package.json"**

Затем последовательно проси генерировать:
1. Конфиги (tsconfig, vite.config, tailwind.config)
2. Frontend компоненты (начни с UI kit)
3. Backend handlers и services
4. База данных (models, migrations) — **MySQL 8.0**
5. **Геолокация** (hooks, handlers, карта GM)

### Шаг 2: Настройка AWS

1. **Установи инструменты:**
```bash
# macOS
brew install awscli aws-sam-cli

# Linux
pip install awscli aws-sam-cli

# Проверь
aws --version
sam --version
```

2. **Настрой AWS credentials:**
```bash
aws configure
# AWS Access Key ID: <из IAM Console>
# AWS Secret Access Key: <из IAM Console>
# Default region: eu-central-1
# Default output format: json
```

3. **Создай секреты:**
```bash
# Добавь в ~/.bashrc или ~/.zshrc
export DB_PASSWORD="YourSecurePassword123!"
export JWT_SECRET="$(openssl rand -base64 32)"
```

### Шаг 3: Деплой

```bash
# Клонируй/создай проект
cd pda-zone

# Установи зависимости
make install

# Локальная разработка
make dev-db        # Запусти MySQL в Docker
make dev-backend   # Backend на localhost:8000
make dev-frontend  # Frontend на localhost:5173

# Деплой в AWS
make deploy ENVIRONMENT=dev

# Только фронт (быстрее)
make deploy-fe ENVIRONMENT=dev
```

## Архитектура (финальная)

```
┌─────────────────────────────────────────────────────────────┐
│                      CloudFront CDN                          │
│          https://d1234567890.cloudfront.net                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
    ┌─────────┐     ┌──────────────┐  ┌──────────────┐
    │   S3    │     │ API Gateway  │  │ API Gateway  │
    │ (React) │     │    REST      │  │  WebSocket   │
    └─────────┘     └──────┬───────┘  └──────┬───────┘
                           │                 │
                           ▼                 ▼
                    ┌─────────────────────────────┐
                    │     Lambda Functions        │
                    │  Python 3.11 + FastAPI      │
                    │  + Location Tracking        │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │   RDS MySQL 8.0             │
                    │   db.t3.micro (Free Tier)   │
                    │   PUBLIC ACCESS ✓           │
                    └─────────────────────────────┘
```

## Геолокация

### Как работает
1. **Игрок** — телефон отправляет GPS координаты каждые 10-30 сек через WebSocket
2. **Сервер** — сохраняет позицию + проверяет, в какой зоне игрок
3. **Game Master** — видит всех игроков на карте в реальном времени

### Ключевые endpoints
```
POST /api/location              # Игрок отправляет координаты
GET  /api/location/me           # Моя последняя позиция
GET  /api/zones/current         # В какой зоне я сейчас
GET  /api/admin/locations       # GM: все игроки на карте
GET  /api/admin/locations/{id}/history  # GM: трек игрока
```

### WebSocket события
```json
// Игрок → Сервер
{"action": "location_update", "data": {"lat": 34.7071, "lng": 33.0226}}

// Сервер → GM (broadcast)
{"action": "player_location_update", "data": {"playerId": "...", "position": {...}}}

// Сервер → GM (переход зоны)
{"action": "zone_transition", "data": {"playerId": "...", "fromZone": "...", "toZone": "..."}}
```

## Подключение к MySQL

```bash
# После деплоя — RDS публично доступен!
mysql -h pda-zone-db-dev.xxxxx.eu-central-1.rds.amazonaws.com \
      -u pda_admin -p pda_zone

# Локально (Docker)
mysql -h localhost -u pda_admin -plocaldev123 pda_zone
```

## Ожидаемые расходы

### Первые 12 месяцев (Free Tier)
| Сервис | Расход | Стоимость |
|--------|--------|-----------|
| Lambda | ~100K req/month | $0 |
| API Gateway | ~100K calls | $0 |
| S3 | ~100MB | $0 |
| CloudFront | ~10GB | $0 |
| RDS MySQL | 24/7 db.t3.micro | $0 |
| **Итого** | | **$0** |

### После Free Tier (~$15-25/month)
| Сервис | Расход | Стоимость |
|--------|--------|-----------|
| Lambda | ~100K req | ~$0.20 |
| API Gateway | ~100K calls | ~$0.35 |
| S3 | ~100MB | ~$0.01 |
| CloudFront | ~10GB | ~$0.85 |
| RDS MySQL | db.t3.micro | ~$12-15 |
| **Итого** | | **~$15** |

## Полезные команды

```bash
# Логи Lambda в реальном времени
make logs

# Статус стека
aws cloudformation describe-stacks --stack-name pda-zone-dev

# Подключение к RDS
RDS_HOST=$(aws cloudformation describe-stacks --stack-name pda-zone-dev \
  --query "Stacks[0].Outputs[?OutputKey=='RDSEndpoint'].OutputValue" --output text)
mysql -h $RDS_HOST -u pda_admin -p pda_zone

# Очистка (УДАЛИТ ВСЁ!)
aws cloudformation delete-stack --stack-name pda-zone-dev
```

## Что дальше

1. **MVP Features:**
   - [ ] Авторизация (login/register)
   - [ ] Профиль игрока
   - [ ] Сканер артефактов
   - [ ] Базовые контракты
   - [ ] **Карта с геолокацией** ← ПРИОРИТЕТ

2. **После MVP:**
   - [ ] WebSocket real-time events
   - [ ] PWA + офлайн режим
   - [ ] Push notifications
   - [ ] Admin панель (Game Master)
   - [ ] Треки перемещений игроков

3. **Оптимизации:**
   - [ ] Lambda Layers для dependencies
   - [ ] Custom domain + SSL
   - [ ] RDS → Aurora Serverless (если нужен автоскейлинг)
