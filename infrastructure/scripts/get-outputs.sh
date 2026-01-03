#!/bin/bash
# Get stack outputs

ENVIRONMENT=${1:-dev}
REGION=eu-north-1
PROFILE=stalker
STACK_NAME="pda-zone-${ENVIRONMENT}"

echo "📊 Stack Outputs for ${STACK_NAME}:"
echo ""

aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --profile ${PROFILE} \
  --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
  --output table

echo ""
echo "Quick links:"
echo ""

PDA_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --profile ${PROFILE} \
  --query "Stacks[0].Outputs[?OutputKey=='CloudFrontURL'].OutputValue" \
  --output text)

ADMIN_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --profile ${PROFILE} \
  --query "Stacks[0].Outputs[?OutputKey=='AdminCloudFrontURL'].OutputValue" \
  --output text)

API_URL=$(aws cloudformation describe-stacks \
  --stack-name ${STACK_NAME} \
  --region ${REGION} \
  --profile ${PROFILE} \
  --query "Stacks[0].Outputs[?OutputKey=='ApiURL'].OutputValue" \
  --output text)

echo "🎮 PDA:   ${PDA_URL}"
echo "⚙️  Admin: ${ADMIN_URL}"
echo "🔌 API:   ${API_URL}"
