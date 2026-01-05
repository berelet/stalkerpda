# Google SMTP Setup Instructions

## Step 1: Enable 2-Step Verification

1. Go to https://myaccount.google.com/security
2. Find "2-Step Verification" section
3. Click "Get Started" and follow the steps
4. Complete the setup

## Step 2: Generate App Password

1. Go to https://myaccount.google.com/apppasswords
2. Select app: "Mail"
3. Select device: "Other (Custom name)"
4. Enter name: "PDA Zone Password Reset"
5. Click "Generate"
6. Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

## Step 3: Add to .env.local

Add these lines to `/var/www/stalker/stalkerpda/.env.local`:

```bash
# SMTP Configuration (Google)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App Password from Step 2
```

## Step 4: Deploy

After adding credentials, deploy with:

```bash
cd /var/www/stalker/stalkerpda
source .env.local

# Deploy backend with SMTP parameters
sam build --template infrastructure/template.yaml
sam deploy --template-file .aws-sam/build/template.yaml \
  --stack-name pda-zone-dev --region eu-north-1 \
  --capabilities CAPABILITY_IAM --resolve-s3 \
  --parameter-overrides \
    Environment=dev \
    DBUsername=pda_admin \
    DBPassword=$DB_PASSWORD \
    JWTSecret=$JWT_SECRET \
    AllowedIP=0.0.0.0/0 \
    SMTPHost=$SMTP_HOST \
    SMTPPort=$SMTP_PORT \
    SMTPUser=$SMTP_USER \
    SMTPPassword="$SMTP_PASSWORD" \
  --no-confirm-changeset --profile stalker

# Deploy frontend
cd frontend
npm run build
aws s3 sync dist/ s3://pda-zone-frontend-dev-707694916945 --delete --profile stalker --region eu-north-1
aws cloudfront create-invalidation --distribution-id d384azcb4go67w --paths "/*" --profile stalker --region eu-north-1
```

## Testing

After deployment, test the flow:

1. Go to https://d384azcb4go67w.cloudfront.net/login
2. Click "Forgot Password?"
3. Enter your email
4. Check email for reset link
5. Click link and reset password
6. Login with new password

## Troubleshooting

**Error: "Invalid credentials"**
- Make sure you're using App Password, not regular Gmail password
- Remove spaces from App Password when adding to .env.local

**Error: "SMTP connection failed"**
- Check that 2-Step Verification is enabled
- Verify SMTP_HOST and SMTP_PORT are correct

**Not receiving emails:**
- Check spam folder
- Verify email exists in database
- Check Lambda logs: `aws logs tail /aws/lambda/pda-zone-forgot-password-dev --follow --profile stalker --region eu-north-1`
