#!/bin/bash
set -e

ENVIRONMENT=${1:-dev}
REGION=eu-north-1
STACK_NAME="pda-zone-${ENVIRONMENT}"

echo "🚀 Deploying PDA ZONE to ${ENVIRONMENT}..."

# Check prerequisites
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI required"; exit 1; }
command -v sam >/dev/null 2>&1 || { echo "❌ SAM CLI required"; exit 1; }

# Get your public IP for RDS access
MY_IP=$(curl -s https://checkip.amazonaws.com)/32
echo "📍 Your IP: ${MY_IP}"

# Check required env vars
if [ -z "$DB_PASSWORD" ]; then
  echo "❌ DB_PASSWORD not set"
  exit 1
fi

if [ -z "$JWT_SECRET" ]; then
  echo "❌ JWT_SECRET not set"
  exit 1
fi

# Deploy SAM stack
echo "☁️ Deploying SAM stack..."
sam deploy \
  --template-file infrastructure/template.yaml \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --parameter-overrides \
    Environment=${ENVIRONMENT} \
    DBUsername=pda_admin \
    DBPassword=${DB_PASSWORD} \
    JWTSecret=${JWT_SECRET} \
    AllowedIP=${MY_IP} \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --profile stalker

# Get outputs
echo "📊 Getting stack outputs..."
S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
  --output text \
  --profile stalker)

CLOUDFRONT_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" \
  --output text \
  --profile stalker)

RDS_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query "Stacks[0].Outputs[?OutputKey=='RDSEndpoint'].OutputValue" \
  --output text \
  --profile stalker)

API_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query "Stacks[0].Outputs[?OutputKey=='ApiURL'].OutputValue" \
  --output text \
  --profile stalker)

WS_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --query "Stacks[0].Outputs[?OutputKey=='WebSocketURL'].OutputValue" \
  --output text \
  --profile stalker)

echo ""
echo "✅ Deployment complete!"
echo "========================================"
echo "🌐 Frontend URL:  ${CLOUDFRONT_URL}"
echo "🔌 API URL:       ${API_URL}"
echo "📡 WebSocket URL: ${WS_URL}"
echo "🗄️  MySQL Host:    ${RDS_ENDPOINT}"
echo "📦 S3 Bucket:     ${S3_BUCKET}"
echo "========================================"
echo ""
echo "Connect to MySQL:"
echo "  mysql -h ${RDS_ENDPOINT} -u pda_admin -p pda_zone"
