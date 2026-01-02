#!/bin/bash
# Check deployment status

echo "📊 Deployment Status"
echo "===================="
echo ""

# Check if deployment is running
if pgrep -f "make deploy" > /dev/null; then
    echo "✅ Deployment is running"
else
    echo "⚠️  Deployment process not found"
fi

echo ""
echo "📋 Recent log output:"
echo "--------------------"
tail -20 /tmp/deploy4.log | grep -E "(CREATE|COMPLETE|FAILED|Error|✅|🌐)"

echo ""
echo "🔍 Stack status:"
aws cloudformation describe-stacks \
    --stack-name pda-zone-dev \
    --region eu-north-1 \
    --profile stalker \
    --query 'Stacks[0].{Status:StackStatus,Created:CreationTime}' \
    --output table 2>&1 || echo "Stack not yet visible"

echo ""
echo "Monitor full log: tail -f /tmp/deploy4.log"
