# STALKER PDA - Documentation Index

This document provides an overview of all project documentation.

---

## 📄 For AWS Credits Application

### Primary Documents

1. **[README.md](./README.md)** - Main project overview
   - Executive summary
   - Features and architecture
   - Current status (75% complete)
   - AWS credits request summary
   - Market opportunity

2. **[PITCH.md](./PITCH.md)** - Detailed AWS credits application
   - Problem & solution
   - Technical architecture
   - AWS services used
   - Cost breakdown ($44/month → $1,200/year)
   - Use of credits (8-9 months coverage)
   - Roadmap and milestones
   - Long-term AWS commitment

3. **[AWS_CREDITS_SUMMARY.md](./AWS_CREDITS_SUMMARY.md)** - Quick overview
   - One-page summary
   - Key metrics
   - Credits impact
   - Resources links

---

## 🛠️ Technical Documentation

### For Developers

4. **[AGENT_GUIDE.md](./AGENT_GUIDE.md)** - Complete technical guide
   - AWS configuration
   - Project structure
   - Development status
   - Deployment instructions
   - Database schema
   - API endpoints
   - Testing procedures

### Specifications

5. **[specs/game-mechanics/FINAL-SPEC.md](./specs/game-mechanics/FINAL-SPEC.md)**
   - Complete game mechanics
   - Formulas and calculations
   - Player stats and progression

6. **[specs/api/endpoints.md](./specs/api/endpoints.md)**
   - All 50+ API endpoints
   - Request/response formats
   - Authentication requirements

7. **[specs/database/schema.md](./specs/database/schema.md)**
   - 24 database tables
   - Relationships and indexes
   - Migration scripts

8. **[specs/trading-system-spec.md](./specs/trading-system-spec.md)**
   - Trading mechanics
   - NPC traders
   - Virtual economy

9. **[specs/inventory-system-spec.md](./specs/inventory-system-spec.md)**
   - Inventory v2.0 specification
   - Equipment slots
   - Backpack system

---

## 🚀 Deployment & Infrastructure

10. **[infrastructure/template.yaml](./infrastructure/template.yaml)**
    - AWS SAM template
    - 40+ Lambda functions
    - API Gateway configuration
    - RDS, DynamoDB, S3, CloudFront

11. **[database/migrations/](./database/migrations/)**
    - 001_initial_schema.sql
    - 002_seed_data.sql
    - 003_inventory_system_v2.sql
    - 004_trading_system.sql

---

## 🧪 Testing

12. **[tests/smoke-test.sh](./tests/smoke-test.sh)**
    - Quick 30-second validation
    - Run after every deployment

13. **[tests/api-tests.sh](./tests/api-tests.sh)**
    - Full E2E test suite
    - 8 test scenarios

14. **[tests/trade-test.sh](./tests/trade-test.sh)**
    - Trading system validation
    - Buy/sell flow testing

---

## 📊 Live Demos

### Public Access

- **Player App**: https://d384azcb4go67w.cloudfront.net
  - Mobile PDA interface
  - Real-time gameplay
  - Virtual economy

- **Admin Panel**: https://d3gda670zz1dlb.cloudfront.net
  - Game master tools
  - Player management
  - Analytics dashboard

### API Endpoints

- **REST API**: https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev
- **WebSocket**: wss://08xq76njp7.execute-api.eu-north-1.amazonaws.com/dev

---

## 📈 Project Status

### Completed (75%)

✅ Infrastructure (100%)  
✅ Database (100%)  
✅ Backend API (95%)  
✅ Admin Panel (100%)  
✅ Frontend PDA (70%)  
✅ Trading System (100%)  
✅ Testing (90%)

### In Progress (25%)

⏳ WebSocket integration  
⏳ Inventory v2.0 migration  
⏳ Contract/Zone UI  
⏳ PWA optimization

---

## 🎯 Quick Start

### For AWS Reviewers

1. Read [README.md](./README.md) - 5 min overview
2. Review [PITCH.md](./PITCH.md) - Detailed application
3. Try [Live Demo](https://d384azcb4go67w.cloudfront.net)
4. Check [AGENT_GUIDE.md](./AGENT_GUIDE.md) - Technical details

### For Developers

1. Read [AGENT_GUIDE.md](./AGENT_GUIDE.md)
2. Review [infrastructure/template.yaml](./infrastructure/template.yaml)
3. Check [specs/api/endpoints.md](./specs/api/endpoints.md)
4. Run tests: `make test`

### For Beta Testers

1. Visit [Player App](https://d384azcb4go67w.cloudfront.net)
2. Register account
3. Explore features
4. Provide feedback

---

## 📞 Contact

For questions about:
- **AWS Credits Application**: See [PITCH.md](./PITCH.md)
- **Technical Details**: See [AGENT_GUIDE.md](./AGENT_GUIDE.md)
- **General Inquiries**: GitHub Issues

---

<div align="center">

**STALKER PDA** - *Built with AWS | Ready to Scale*

[Live Demo](https://d384azcb4go67w.cloudfront.net) • [Documentation](./AGENT_GUIDE.md) • [AWS Application](./PITCH.md)

</div>
