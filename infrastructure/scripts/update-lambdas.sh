#!/bin/bash
# Update Lambda function code without full redeployment

set -e

REGION="eu-north-1"
PROFILE="stalker"
ENVIRONMENT="dev"

echo "📦 Packaging Lambda functions..."

cd backend

# Create deployment package
rm -rf package lambda-package.zip
mkdir -p package

# Install dependencies
pip3 install -r requirements.txt -t package/ --upgrade --quiet

# Copy source code
cp -r src package/

# Create zip
cd package
zip -r ../lambda-package.zip . -q
cd ..

echo "✅ Package created: lambda-package.zip ($(du -h lambda-package.zip | cut -f1))"

# Update each Lambda function
FUNCTIONS=(
    "pda-zone-login-${ENVIRONMENT}"
    "pda-zone-register-${ENVIRONMENT}"
    "pda-zone-location-update-${ENVIRONMENT}"
    "pda-zone-artifacts-${ENVIRONMENT}"
    "pda-zone-players-${ENVIRONMENT}"
    "pda-zone-contracts-${ENVIRONMENT}"
    "pda-zone-zones-${ENVIRONMENT}"
    "pda-zone-admin-${ENVIRONMENT}"
    "pda-zone-ws-connect-${ENVIRONMENT}"
    "pda-zone-ws-disconnect-${ENVIRONMENT}"
    "pda-zone-ws-message-${ENVIRONMENT}"
)

echo ""
echo "🚀 Updating Lambda functions..."

for func in "${FUNCTIONS[@]}"; do
    echo "  ▶ Updating $func..."
    aws lambda update-function-code \
        --function-name "$func" \
        --zip-file fileb://lambda-package.zip \
        --region "$REGION" \
        --profile "$PROFILE" \
        --no-cli-pager > /dev/null 2>&1 || echo "  ⚠️  $func not found (may need full deploy)"
done

echo ""
echo "✅ Lambda functions updated!"
echo ""
echo "Note: If functions don't exist yet, run full deployment:"
echo "  make deploy ENVIRONMENT=dev"
