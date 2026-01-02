# PDA Zone Frontend

React + TypeScript + Vite SPA для S.T.A.L.K.E.R. PDA игры.

## Структура

```
frontend/
├── src/
│   ├── components/
│   │   └── layout/          # Единый Layout с Header и Footer
│   ├── pages/               # Страницы приложения
│   ├── stores/              # Zustand stores
│   ├── services/            # API клиенты
│   └── index.css            # PDA стили с CRT эффектами
├── dist/                    # Build output
└── package.json
```

## Разработка

```bash
# Установка зависимостей
npm install

# Запуск dev сервера
npm run dev

# Сборка для продакшена
npm run build

# Превью продакшен билда
npm run preview
```

## Особенности

- **Единый Layout**: `PDALayout` с Header (статистика игрока) и Footer (навигация)
- **CRT эффекты**: Scanlines, flicker, glow для атмосферы PDA
- **Роутинг**: React Router с защищенными роутами
- **Авторизация**: JWT токены в localStorage через Zustand
- **API**: Axios с автоматическим добавлением токена

## Страницы

- `/login` - Авторизация
- `/` - Карта (главная)
- `/inventory` - Инвентарь
- `/contracts` - Контракты
- `/profile` - Профиль и выход

## Деплой

```bash
# Сборка
npm run build

# Загрузка в S3
aws s3 sync dist/ s3://pda-zone-frontend-dev-707694916945 --profile stalker

# Инвалидация CloudFront
aws cloudfront create-invalidation --distribution-id d384azcb4go67w --paths "/*" --profile stalker
```
