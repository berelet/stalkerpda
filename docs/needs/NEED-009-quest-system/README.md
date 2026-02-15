# NEED-009: Quest System (Backend)

## Статус
`done` (backend) / `in-progress` (frontend pending)

## Пріоритет
`P1`

## Метадані
| Поле | Значення |
|------|----------|
| Дата створення | 2026-01-11 |
| Дата завершення | 2026-01-11 (backend) |

---

## Вихідна потреба

### Хто
Гравці, Game Masters, Бармени

### Що (проблема)
Потрібна система квестів з автоматичним відстеженням прогресу, репутацією та умовами провалу.

### Критерії успіху
- [x] 4 типи квестів (collection, delivery, patrol, visit)
- [x] Автоматичне відстеження прогресу
- [x] Система репутації (-10000 до +10000)
- [x] Провал квестів при смерті
- [x] GM створює квести в admin panel
- [x] Бармени створюють квести в PDA
- [x] Авто-респаун артефактів
- [ ] ⏳ Frontend UI для квестів (pending)
- [ ] ⏳ Маркери квестів на карті (pending)

---

## Що реалізовано (Backend)

### Database
- `006_quest_system.sql` — quests, quest_progress, reputation таблиці
- `007_artifact_respawn.sql` — авто-респаун артефактів

### Handlers
- `src/handlers/quests.py` — 12 ендпоінтів (list, accept, progress, complete, fail, cancel тощо)

### Utils
- `src/utils/quest.py` — відстеження прогресу квестів
- `src/utils/reputation.py` — система репутації (1% знижка на 100 rep, max 100%)
- `src/utils/respawn.py` — авто-респаун артефактів (delay + random radius)

### Інтеграції
- Death handler → fail all active quests
- Artifact pickup → collection quest progress
- Location update → patrol/visit quest progress + respawn activation
- Admin spawn → respawn settings

### Типи квестів
| Тип | Опис | Відстеження |
|-----|------|-------------|
| Collection | Зібрати N артефактів типу Y | Автоматичне при підборі |
| Delivery | Доставити предмет до NPC/координат | При досягненні точки |
| Patrol | Відвідати N чекпоінтів + M хвилин | Location update |
| Visit | Досягти конкретних координат | Location update |

## ⏳ TODO
- Frontend: сторінка квестів, маркери на карті, створення барменом
