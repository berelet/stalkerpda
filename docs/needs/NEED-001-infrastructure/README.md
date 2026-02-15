# NEED-001: AWS Infrastructure

## Статус
`done`

## Пріоритет
`P0`

## Метадані
| Поле | Значення |
|------|----------|
| Дата створення | 2026-01-02 |
| Дата завершення | 2026-01-02 |

---

## Вихідна потреба

### Хто
Технічна команда

### Що (проблема)
Потрібна хмарна інфраструктура для розгортання serverless платформи airsoft-ігор.

### Навіщо (ціль)
Розгорнути повний стек на AWS з мінімальними витратами та автоматичним масштабуванням.

### Критерії успіху
- [x] AWS ресурси розгорнуті та працюють
- [x] API доступний через HTTPS
- [x] Frontend роздається через CDN
- [x] БД доступна та налаштована
- [x] CI/CD-ready деплой через SAM

---

## Що реалізовано

- **SAM template** (`infrastructure/template.yaml`) — IaC для всього стеку
- **RDS MySQL 8.0** (db.t3.micro) — основна БД
- **12 Lambda Functions** — auth, players, location, artifacts, contracts, zones, admin, websocket, upload, trade, quests
- **API Gateway** — REST + WebSocket
- **S3 Buckets** — frontend, admin, artifacts (images)
- **CloudFront** — CDN для frontend та admin panel
- **DynamoDB** — WebSocket connections
- **Деплой скрипти** — `sync.sh`, `deploy.sh`, `check-status.sh`, `Makefile`

## URLs
- Frontend: https://d384azcb4go67w.cloudfront.net
- Admin: https://d3gda670zz1dlb.cloudfront.net
- API: https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev
- WebSocket: wss://08xq76njp7.execute-api.eu-north-1.amazonaws.com/dev

## Вартість
~$44/міс (RDS $15, Lambda+APIGW $9, CloudFront+S3 $12, DynamoDB+Transfer $8)
