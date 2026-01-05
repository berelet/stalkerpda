# Password Reset Implementation - Summary

## ✅ Completed

### Backend
- ✅ Database migration (004_password_reset.sql) - applied to RDS
- ✅ Email utility (backend/src/utils/email.py)
- ✅ Auth handlers updated (forgot_password_handler, reset_password_handler)
- ✅ JWT token support for custom expiration
- ✅ Config updated with SMTP and FRONTEND_URL
- ✅ SAM template updated with new Lambda functions and SMTP parameters

### Frontend
- ✅ ForgotPasswordPage component
- ✅ ResetPasswordPage component
- ✅ Routes added to App.tsx
- ✅ "Forgot Password?" link on LoginPage

## 📋 Next Steps

### 1. Setup Google SMTP (Required)

Follow instructions in `docs/SMTP_SETUP.md`:

1. Enable 2-Step Verification on your Google account
2. Generate App Password at https://myaccount.google.com/apppasswords
3. Add credentials to `.env.local`:

```bash
# Add these lines to .env.local
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # Remove spaces when pasting
```

### 2. Deploy Backend

```bash
cd /var/www/stalker/stalkerpda
source .env.local

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
```

### 3. Deploy Frontend

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://pda-zone-frontend-dev-707694916945 --delete --profile stalker --region eu-north-1
aws cloudfront create-invalidation --distribution-id d384azcb4go67w --paths "/*" --profile stalker --region eu-north-1
```

### 4. Test

1. Open https://d384azcb4go67w.cloudfront.net/login
2. Click "Forgot Password?"
3. Enter email address
4. Check email for reset link
5. Click link and set new password
6. Login with new password

## 🔍 Testing Checklist

- [ ] Request password reset for existing email
- [ ] Request password reset for non-existing email (should show same message)
- [ ] Receive email with reset link
- [ ] Click reset link and open page
- [ ] Try mismatched passwords (should show error)
- [ ] Try short password (should show error)
- [ ] Successfully reset password
- [ ] Login with new password
- [ ] Try using same reset link again (should fail)
- [ ] Try expired token (wait 1 hour or manually expire in DB)
- [ ] Test rate limiting (try 2 requests within 5 minutes)

## 📊 Database Tables

Two new tables created:

1. **password_reset_tokens** - stores reset tokens
   - Tokens expire after 1 hour
   - Single-use (marked as used after reset)

2. **rate_limits** - prevents abuse
   - 1 request per 5 minutes per IP
   - Automatic cleanup via timestamp

## 🔐 Security Features

- ✅ Email enumeration prevention (always shows success)
- ✅ Rate limiting (1 request per 5 min per IP)
- ✅ JWT tokens with 1-hour expiration
- ✅ Single-use tokens (no reuse)
- ✅ Token hash storage (not plain JWT)
- ✅ Password validation (min 6 chars)
- ✅ SMTP over TLS

## 📝 API Endpoints

### POST /api/auth/forgot-password
Request password reset email

**Request:**
```json
{
  "email": "stalker@zone.net"
}
```

**Response:**
```json
{
  "message": "If your frequency exists in our database, we've transmitted recovery coordinates to it."
}
```

### POST /api/auth/reset-password
Reset password with token

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password updated successfully"
}
```

## 🐛 Troubleshooting

### Email not sending
```bash
# Check Lambda logs
aws logs tail /aws/lambda/pda-zone-forgot-password-dev --follow --profile stalker --region eu-north-1
```

### SMTP authentication failed
- Verify App Password (not regular password)
- Check 2-Step Verification is enabled
- Remove spaces from App Password in .env.local

### Token invalid/expired
- Check token expiration (1 hour)
- Verify JWT_SECRET matches between functions
- Check database for token record

### Rate limiting issues
```sql
-- Check rate limits
SELECT * FROM rate_limits WHERE id LIKE 'forgot_password%';

-- Clear rate limit for testing
DELETE FROM rate_limits WHERE id = 'forgot_password#YOUR_IP';
```

## 📚 Documentation

- Full spec: `specs/password-reset-spec.md`
- SMTP setup: `docs/SMTP_SETUP.md`
- Agent guide: Update `AGENT_GUIDE.md` after deployment

## 💰 Cost Impact

- Additional Lambda invocations: $0 (within free tier)
- RDS storage: +~1MB (~$0)
- Google SMTP: $0 (500 emails/day free)

**Total: $0/month**
