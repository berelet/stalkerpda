# AWS Infrastructure Setup

## Prerequisites

```bash
# Install AWS CLI and SAM CLI
pip install awscli aws-sam-cli

# Verify installation
aws --version
sam --version
```

## Setup

1. **Set environment variables:**

```bash
# Generate secure passwords
export DB_PASSWORD="$(openssl rand -base64 16)"
export JWT_SECRET="$(openssl rand -base64 32)"

# Save them somewhere safe!
echo "DB_PASSWORD=$DB_PASSWORD" >> .env.local
echo "JWT_SECRET=$JWT_SECRET" >> .env.local
```

2. **Deploy infrastructure:**

```bash
make deploy ENVIRONMENT=dev
```

This will create:
- RDS MySQL 8.0 (db.t3.micro, publicly accessible)
- S3 bucket for frontend
- CloudFront distribution
- API Gateway (REST + WebSocket)
- Lambda functions for all endpoints
- DynamoDB table for WebSocket connections

## Deployment takes ~15-20 minutes

The RDS instance creation is the slowest part.

## After Deployment

Connect to MySQL:
```bash
# Get endpoint from stack outputs
RDS_HOST=$(aws cloudformation describe-stacks \
  --stack-name pda-zone-dev \
  --region eu-north-1 \
  --profile stalker \
  --query "Stacks[0].Outputs[?OutputKey=='RDSEndpoint'].OutputValue" \
  --output text)

# Connect
mysql -h $RDS_HOST -u pda_admin -p pda_zone
```

## Costs

**First 12 months (Free Tier):** $0/month

**After Free Tier:** ~$15-20/month
- RDS db.t3.micro: ~$12-15
- Lambda, API Gateway, S3, CloudFront: ~$3-5

## Commands

```bash
make deploy          # Deploy everything
make deploy-fe       # Deploy frontend only (faster)
make logs            # View Lambda logs
make status          # Check stack status
make clean           # Delete stack (WARNING: deletes everything!)
```
