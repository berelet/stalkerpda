# Промпт для генерации структуры проекта PDA ZONE

## Контекст

Ты — senior full-stack разработчик. Создай структуру проекта для airsoft/LARP игры по мотивам S.T.A.L.K.E.R.

## Технический стек

- **Frontend:** React 18 + TypeScript + Vite + TailwindCSS + Zustand
- **Backend:** Python 3.11 + FastAPI + SQLAlchemy + Pydantic
- **Database:** PostgreSQL 15
- **Infrastructure:** AWS Lambda + API Gateway + S3 + CloudFront + RDS
- **Deploy:** AWS SAM CLI (без CI/CD, деплой из командной строки)

## Требования к архитектуре

### Frontend (S3 + CloudFront)
- SPA с роутингом (React Router)
- PWA для офлайн-режима (Service Worker + IndexedDB)
- WebSocket для real-time событий
- Компоненты в стиле PDA из S.T.A.L.K.E.R. (зелёный монохром, сканлайны, глитч-эффекты)
- Мобильная адаптация (игроки используют телефоны)

### Backend (Lambda + API Gateway)
- REST API для CRUD операций
- WebSocket API для real-time (game events, сканирование, уведомления)
- JWT авторизация
- Каждый Lambda handler — отдельный файл
- Слоистая архитектура: handlers → services → repositories

### База данных
- PostgreSQL на RDS (Free Tier: db.t3.micro, 20GB)
- Миграции через Alembic
- Connection pooling для Lambda (RDS Proxy или pgbouncer pattern)

## Игровые сущности (из спецификации)

```
Player: id, nickname, faction, status (alive/wounded/dead), balance, inventory, reputation
Faction: stalker, bandit, mercenary, duty, freedom
Artifact: id, rarity, value, scanRadius, state (hidden/scanned/extracted/destroyed), owner
Zone: id, type (anomaly/control/neutral), dangerLevel, ownerFaction, modifiers
Contract: id, type, issuer, target, reward, escrowState, successCriteria, timeout
GameEvent: id, type, timestamp, playerId, data (JSONB)
```

## Структура проекта для генерации

```
pda-zone/
├── README.md
├── Makefile                      # Команды для разработки и деплоя
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── public/
│   │   ├── manifest.json         # PWA manifest
│   │   └── sw.js                 # Service Worker
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css             # Tailwind + PDA стили
│       ├── components/
│       │   ├── ui/               # Базовые UI компоненты в стиле PDA
│       │   │   ├── PDAScreen.tsx
│       │   │   ├── PDAButton.tsx
│       │   │   ├── PDACard.tsx
│       │   │   ├── PDAInput.tsx
│       │   │   └── ScanlineOverlay.tsx
│       │   ├── layout/
│       │   │   ├── PDALayout.tsx
│       │   │   └── Navigation.tsx
│       │   ├── player/
│       │   │   ├── PlayerStatus.tsx
│       │   │   ├── Inventory.tsx
│       │   │   └── FactionBadge.tsx
│       │   ├── artifacts/
│       │   │   ├── ArtifactScanner.tsx
│       │   │   ├── ArtifactList.tsx
│       │   │   └── ArtifactCard.tsx
│       │   ├── contracts/
│       │   │   ├── ContractList.tsx
│       │   │   ├── ContractCard.tsx
│       │   │   └── CreateContract.tsx
│       │   ├── zones/
│       │   │   ├── ZoneMap.tsx
│       │   │   └── ZoneControl.tsx
│       │   └── admin/
│       │       ├── GameMaster.tsx
│       │       ├── PlayerManager.tsx
│       │       └── EventLog.tsx
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── ScannerPage.tsx
│       │   ├── ContractsPage.tsx
│       │   ├── MapPage.tsx
│       │   ├── ProfilePage.tsx
│       │   └── AdminPage.tsx
│       ├── stores/
│       │   ├── authStore.ts
│       │   ├── playerStore.ts
│       │   ├── gameStore.ts
│       │   └── offlineStore.ts   # IndexedDB для офлайн
│       ├── hooks/
│       │   ├── useWebSocket.ts
│       │   ├── useGeolocation.ts
│       │   ├── useOfflineSync.ts
│       │   └── useGameEvents.ts
│       ├── services/
│       │   ├── api.ts            # Axios instance
│       │   ├── auth.ts
│       │   ├── players.ts
│       │   ├── artifacts.ts
│       │   ├── contracts.ts
│       │   └── zones.ts
│       ├── types/
│       │   ├── player.ts
│       │   ├── artifact.ts
│       │   ├── contract.ts
│       │   ├── zone.ts
│       │   └── events.ts
│       └── utils/
│           ├── constants.ts
│           ├── factions.ts       # Цвета, иконки, названия фракций
│           └── gameLogic.ts      # Клиентская валидация
│
├── backend/
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/             # Миграции БД
│   ├── src/
│   │   ├── __init__.py
│   │   ├── config.py             # Environment variables
│   │   ├── database.py           # SQLAlchemy setup
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── player.py
│   │   │   ├── faction.py
│   │   │   ├── artifact.py
│   │   │   ├── zone.py
│   │   │   ├── contract.py
│   │   │   └── game_event.py
│   │   ├── schemas/              # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── player.py
│   │   │   ├── artifact.py
│   │   │   ├── contract.py
│   │   │   └── zone.py
│   │   ├── repositories/         # Database access layer
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── player.py
│   │   │   ├── artifact.py
│   │   │   ├── contract.py
│   │   │   └── zone.py
│   │   ├── services/             # Business logic
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── player.py
│   │   │   ├── artifact.py       # Scan, extract, trade logic
│   │   │   ├── contract.py       # Escrow, validation
│   │   │   ├── zone.py           # Control, modifiers
│   │   │   ├── economy.py        # Balance, transactions
│   │   │   ├── reputation.py     # Faction relations
│   │   │   └── game_master.py    # Admin operations
│   │   ├── handlers/             # Lambda handlers
│   │   │   ├── __init__.py
│   │   │   ├── auth.py           # Login, register, refresh
│   │   │   ├── players.py        # CRUD players
│   │   │   ├── artifacts.py      # Scan, extract, trade
│   │   │   ├── contracts.py      # Create, accept, complete
│   │   │   ├── zones.py          # Control, status
│   │   │   ├── game_events.py    # Event log
│   │   │   ├── admin.py          # Game master endpoints
│   │   │   └── websocket.py      # WebSocket connect/disconnect/message
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── jwt.py
│   │       ├── responses.py      # Lambda response helpers
│   │       ├── validators.py
│   │       └── game_rules.py     # Game mechanics validation
│   └── tests/
│       ├── __init__.py
│       ├── conftest.py
│       ├── test_auth.py
│       ├── test_artifacts.py
│       ├── test_contracts.py
│       └── test_game_logic.py
│
├── infrastructure/
│   ├── template.yaml             # AWS SAM template
│   ├── samconfig.toml            # SAM CLI config
│   ├── parameters/
│   │   ├── dev.json
│   │   └── prod.json
│   └── scripts/
│       ├── setup-rds.sh          # Создание RDS через CLI
│       ├── deploy.sh             # Полный деплой
│       ├── deploy-frontend.sh    # Только фронт
│       ├── deploy-backend.sh     # Только бэкенд
│       └── run-migrations.sh     # Запуск миграций
│
└── docs/
    ├── api.md                    # API документация
    ├── game-rules.md             # Правила игры
    └── deployment.md             # Инструкция деплоя
```

## Задание

1. Сгенерируй все файлы согласно структуре выше
2. Каждый файл должен содержать рабочий код (не заглушки)
3. Frontend должен компилироваться и запускаться
4. Backend должен запускаться локально с Docker PostgreSQL
5. AWS SAM template должен быть валидным и деплоиться

## Стиль кода

- TypeScript: strict mode, no any
- Python: type hints везде, black + isort + mypy
- Комментарии на английском
- Docstrings для публичных функций

## Начни с генерации

1. Makefile с командами
2. Frontend package.json и конфиги
3. Backend requirements.txt и конфиги
4. AWS SAM template.yaml
5. Затем компоненты и handlers по очереди

Генерируй файлы последовательно, я буду подтверждать каждый блок.
