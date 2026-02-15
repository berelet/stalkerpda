# Бэклог

Список бажаних фіч та покращень. Звідси нарізаються конкретні NEED-и.

---

## 🔴 P0 — Критично (блокує MVP)

### WebSocket Real-time
- Live оновлення позицій гравців
- Нотифікації про артефакти/зони
- Оновлення статусу контрактів
- **Scope:** backend (вже є connect/disconnect) + frontend інтеграція

### Inventory v2.0 Migration
- Застосувати міграцію `003_inventory_system_v2.sql`
- Backend handler `inventory.py` (6 ендпоінтів: equip, unequip, use, drop, sell, list)
- Equipment slots: 1 armor, 2 rings, 1 artifact
- Backpack: 50 слотів

---

## 🟡 P1 — Високий (потрібно для бети)

### Contract UI (Frontend)
- Прийняття контрактів
- Відстеження прогресу
- Завершення/підтвердження

### Zone Capture UI (Frontend)
- Відображення зон на карті
- Механіка захоплення
- Прогрес-бар

### Quest UI (Frontend)
- Сторінка квестів (список, деталі, прогрес)
- Маркери квестів на карті
- Створення квестів барменом

### Trading UI (Frontend)
- Інтерфейс торгівлі з NPC
- Каталог, кошик, підтвердження
- QR-сканер для live-торговців

---

## 🟢 P2 — Важливо (після бети)

### PWA Optimization
- Service Worker для offline
- Push notifications
- Install prompt

### Production Hardening
- bcrypt замість SHA256 (Lambda Layer)
- Rate limiting
- Error logging та моніторинг
- CI/CD pipeline

### Payment Integration
- Stripe підписки для організаторів
- Subscription management

### Advanced Analytics
- Dashboard для організаторів
- Статистика по іграх
- Heatmaps переміщень

---

## 🔵 P3 — Бажано (roadmap)

### Mobile Native Apps
- iOS / Android (React Native або PWA)

### P2P Trading
- Торгівля між гравцями
- QR-код обмін

### Blockchain Integration
- NFT артефакти

### AI Game Balancing
- Автоматичне балансування зон/артефактів

### International Expansion
- Multi-language support
- Regional servers

---

## Як працювати з бэклогом

1. Обери задачу з бэклогу
2. Створи NEED за WORKFLOW.md
3. Після завершення — видали з бэклогу або позначь ✅
