# Глосарій STALKER PDA

## Продукт

| Термін | Опис |
|--------|------|
| STALKER PDA | Хмарна платформа для airsoft-ігор з геолокацією та віртуальною економікою |
| PDA | Personal Digital Assistant — мобільний інтерфейс гравця (PWA) |
| Admin Panel | Панель Game Master для управління грою |
| Game Master (GM) | Організатор/адміністратор гри |

## Ігрові механіки

| Термін | Опис |
|--------|------|
| Artifact | Ігровий предмет на карті, який гравець може знайти та підібрати |
| Zone | Радіаційна зона на карті з ефектами для гравців |
| Contract | Завдання/місія для гравця з нагородою |
| Quest | Розширений контракт з прогресом та етапами |
| Faction | Фракція гравця (Loners, Duty, Freedom, Bandits тощо) |
| Radiation | Рівень радіації гравця (0-100), при 100 — смерть |
| Respawn | Відродження гравця в зеленій зоні після смерті |
| Loot | Здобич з вбитих гравців |
| Trader | NPC-торговець (Sidorovich) |

## Технічні

| Термін | Опис |
|--------|------|
| Lambda | AWS Lambda — serverless функції (Python 3.12) |
| API Gateway | AWS сервіс для REST та WebSocket API |
| RDS | AWS Relational Database Service (MySQL 8.0) |
| DynamoDB | AWS NoSQL БД для WebSocket з'єднань |
| CloudFront | AWS CDN для роздачі фронтенду |
| S3 | AWS сховище для статичних файлів та зображень |
| SAM | AWS Serverless Application Model — IaC інструмент |
| JWT | JSON Web Token — авторизація гравців |
| Haversine | Формула розрахунку відстані між GPS координатами |
| PWA | Progressive Web App — мобільний веб-додаток |

## UI/UX

| Термін | Опис |
|--------|------|
| CRT Effect | Візуальний ефект старого монітора в стилі PDA |
| Scanlines | Горизонтальні лінії для PDA-стилю |
| Hold Button | Кнопка з утриманням (30с для екстракції артефактів) |
| Detection Radius | Радіус виявлення артефактів (15м) |
| Pickup Radius | Радіус підбору артефактів (2м) |
