# Password Reset System Specification

**Version:** 1.0  
**Date:** 2026-01-05  
**Status:** Draft

## Overview

Password reset system for S.T.A.L.K.E.R. PDA with email-based token verification. Uses Google SMTP for email delivery.

---

## User Flow

### 1. Forgot Password Page

**URL:** `/forgot-password`

**UI Elements:**
- Back button (← arrow) - returns to login
- System header: `> SYS_RECOVERY`
- Icon: Lock with ERR_403 badge
- Headline: `:: IDENTITY_LOSS ::`
- Description: "CRITICAL FAILURE. Enter registered comms frequency to re-establish neural link."
- Email input field with @ icon
- Submit button: `[ TRANSMIT ]`
- Status bar footer (signal, radiation, battery)

**Behavior:**
1. User enters email address
2. On submit → POST `/api/auth/forgot-password`
3. Show success message (regardless of email existence): 
   - "If your frequency exists in our database, we've transmitted recovery coordinates to it."
4. Email sent if account exists (silent failure for security)

**Validation:**
- Email format validation (client-side)
- Rate limiting: 1 request per 5 minutes per IP

---

### 2. Email Delivery

**SMTP Configuration:**
- Provider: Google SMTP (smtp.gmail.com:587)
- TLS: Required
- Credentials: Stored in `.env.local` and Lambda environment variables

**Email Template:**

```
Subject: [PDA ZONE] Security Override Protocol - Password Reset

STALKER,

A password reset request was initiated for your PDA account.

If you did not request this, ignore this transmission. Your current access codes remain secure.

To establish new security credentials, access the following coordinates within 1 hour:

{RESET_LINK}

This link expires at: {EXPIRY_TIME} UTC

WARNING: After expiration, you must request a new recovery protocol.

---
S.T.A.L.K.E.R. PDA Network
Zone Security Division
```

**Reset Link Format:**
```
https://d384azcb4go67w.cloudfront.net/reset-password?token={JWT_TOKEN}
```

**Token Specification:**
- Type: JWT (HS256)
- Payload: `{player_id, email, type: 'password_reset', exp}`
- Expiration: 1 hour from generation
- Secret: Same as auth JWT secret

---

### 3. Reset Password Page

**URL:** `/reset-password?token={TOKEN}`

**UI Elements:**
- System header: `> SYSTEM RECOVERY // RESET_PWD`
- Icon: Lock reset symbol
- Description: "SECURITY OVERRIDE DETECTED. Input new security key to re-establish network link functionality."
- Two password input fields:
  - "ENTER_NEW_CODE" (password type)
  - "CONFIRM_CODE" (password type)
- Error message box (shown on mismatch):
  - `>> ERR: CHECKSUM INVALID`
  - "Passwords do not match local hash."
- Submit button: `INITIALIZE PATCH`
- Footer status bar

**Behavior:**
1. On page load:
   - Extract token from URL query parameter
   - Validate token format (client-side)
   - If invalid/missing → redirect to `/forgot-password` with error message
2. User enters new password twice
3. Client-side validation:
   - Passwords match
   - Minimum 6 characters
   - Show error if validation fails
4. On submit → POST `/api/auth/reset-password` with `{token, newPassword}`
5. On success:
   - Show success message: "PROTOCOL UPDATED. Security credentials synchronized."
   - Show link to login: "Return to access terminal →"
   - Auto-redirect to login after 3 seconds
6. On error (expired/invalid token):
   - Show error: "LINK EXPIRED. Request new recovery protocol."
   - Show link to forgot password page

**Validation:**
- Password length: 6-100 characters
- Passwords must match
- Token must be valid and not expired

---

## Database Schema

### New Tables

**1. `password_reset_tokens`**

```sql
CREATE TABLE password_reset_tokens (
    id VARCHAR(36) PRIMARY KEY,
    player_id VARCHAR(36) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Notes:**
- `token_hash`: SHA256 hash of JWT token (for revocation checking)
- `used`: Prevents token reuse
- Expired/used tokens cleaned up by cron job (optional)

**2. `rate_limits`**

```sql
CREATE TABLE rate_limits (
    id VARCHAR(100) PRIMARY KEY,
    last_request TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_last_request (last_request)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**Notes:**
- `id`: Format `forgot_password#{IP_ADDRESS}`
- `last_request`: Timestamp of last request
- Used for rate limiting (1 request per 5 minutes)

---

## API Endpoints

### 1. Request Password Reset

**Endpoint:** `POST /api/auth/forgot-password`

**Request:**
```json
{
  "email": "stalker@zone.net"
}
```

**Response (always 200):**
```json
{
  "message": "If your frequency exists in our database, we've transmitted recovery coordinates to it."
}
```

**Logic:**
1. Validate email format
2. Check rate limit (1 request per 5 min per IP) - MySQL table
3. Look up player by email
4. If player exists:
   - Generate JWT token with 1-hour expiration
   - Store token hash in `password_reset_tokens` table
   - Send email via Google SMTP
5. Return success message (even if email not found)

**Rate Limiting (MySQL):**
```python
def check_rate_limit(cursor, ip: str) -> bool:
    key = f"forgot_password#{ip}"
    cursor.execute("SELECT last_request FROM rate_limits WHERE id = %s", (key,))
    result = cursor.fetchone()
    
    if result:
        last_request = result['last_request']
        if datetime.utcnow() - last_request < timedelta(minutes=5):
            return False  # Rate limited
    
    cursor.execute(
        "INSERT INTO rate_limits (id, last_request) VALUES (%s, NOW()) "
        "ON DUPLICATE KEY UPDATE last_request = NOW()",
        (key,)
    )
    return True
```

---

### 2. Reset Password

**Endpoint:** `POST /api/auth/reset-password`

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newSecurePassword123"
}
```

**Response (Success):**
```json
{
  "message": "Password updated successfully"
}
```

**Response (Error):**
```json
{
  "error": "INVALID_TOKEN",
  "message": "Reset link is invalid or expired"
}
```

**Logic:**
1. Validate JWT token:
   - Verify signature
   - Check expiration
   - Extract `player_id` and `email`
2. Check token hash in database:
   - Token exists
   - Not expired (`expires_at > NOW()`)
   - Not used (`used = FALSE`)
3. Validate new password (6-100 chars)
4. Update player password:
   - Hash with SHA256 (or bcrypt in production)
   - Update `players.password_hash`
5. Mark token as used: `UPDATE password_reset_tokens SET used = TRUE`
6. Return success

**Error Codes:**
- `INVALID_TOKEN` - Token malformed, expired, or already used
- `INVALID_PASSWORD` - Password doesn't meet requirements
- `PLAYER_NOT_FOUND` - Player account deleted

---

## Backend Implementation

### File Structure

```
backend/src/
├── handlers/
│   └── auth.py              # Add forgot_password_handler, reset_password_handler
└── utils/
    └── email.py             # NEW: Email sending via Google SMTP
```

### New Lambda Functions

**1. Forgot Password Handler**

```python
# backend/src/handlers/auth.py

def forgot_password_handler(event, context):
    """
    POST /api/auth/forgot-password
    Request password reset email
    """
    # 1. Parse request body
    # 2. Validate email format
    # 3. Check rate limit (IP-based, MySQL)
    # 4. Look up player by email
    # 5. Generate JWT token (1 hour expiry)
    # 6. Store token hash in DB
    # 7. Send email via SMTP
    # 8. Return generic success message
```

**2. Reset Password Handler**

```python
# backend/src/handlers/auth.py

def reset_password_handler(event, context):
    """
    POST /api/auth/reset-password
    Reset password with token
    """
    # 1. Parse request body
    # 2. Validate JWT token
    # 3. Check token in DB (not used, not expired)
    # 4. Validate new password
    # 5. Hash password (SHA256)
    # 6. Update player password
    # 7. Mark token as used
    # 8. Return success
```

### Email Utility

```python
# backend/src/utils/email.py

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from src.config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD

def send_password_reset_email(to_email: str, reset_link: str, expiry_time: str):
    """
    Send password reset email via Google SMTP
    """
    subject = "[PDA ZONE] Security Override Protocol - Password Reset"
    
    body = f"""STALKER,

A password reset request was initiated for your PDA account.

If you did not request this, ignore this transmission. Your current access codes remain secure.

To establish new security credentials, access the following coordinates within 1 hour:

{reset_link}

This link expires at: {expiry_time} UTC

WARNING: After expiration, you must request a new recovery protocol.

---
S.T.A.L.K.E.R. PDA Network
Zone Security Division
"""
    
    msg = MIMEMultipart()
    msg['From'] = SMTP_USER
    msg['To'] = to_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.send_message(msg)
```

### Rate Limiting Utility

Rate limiting implemented directly in handler using MySQL:

```python
# In forgot_password_handler

def check_rate_limit(cursor, ip: str) -> bool:
    """Check if IP is rate limited (5 min cooldown)"""
    key = f"forgot_password#{ip}"
    cursor.execute("SELECT last_request FROM rate_limits WHERE id = %s", (key,))
    result = cursor.fetchone()
    
    if result:
        last_request = result['last_request']
        if datetime.utcnow() - last_request < timedelta(minutes=5):
            return False
    
    cursor.execute(
        "INSERT INTO rate_limits (id, last_request) VALUES (%s, NOW()) "
        "ON DUPLICATE KEY UPDATE last_request = NOW()",
        (key,)
    )
    return True

# Usage in handler
ip = event['requestContext']['identity']['sourceIp']
if not check_rate_limit(cursor, ip):
    return {
        'statusCode': 429,
        'body': json.dumps({'error': 'TOO_MANY_REQUESTS'})
    }
```

---

## Configuration

### Environment Variables

Add to `.env.local` and Lambda environment:

```bash
# Google SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password  # Google App Password, not regular password
```

**Google App Password Setup:**
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Generate App Password for "Mail"
4. Use generated password in `SMTP_PASSWORD`

### SAM Template Updates

```yaml
# infrastructure/template.yaml

Resources:
  # New Lambda function for forgot password
  ForgotPasswordFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-forgot-password-${Environment}
      Handler: src.handlers.auth.forgot_password_handler
      Runtime: python3.12
      Environment:
        Variables:
          DB_HOST: !GetAtt Database.Endpoint.Address
          DB_NAME: pda_zone
          DB_USER: !Ref DBUsername
          DB_PASSWORD: !Ref DBPassword
          JWT_SECRET: !Ref JWTSecret
          SMTP_HOST: smtp.gmail.com
          SMTP_PORT: 587
          SMTP_USER: !Ref SMTPUser
          SMTP_PASSWORD: !Ref SMTPPassword
          FRONTEND_URL: !Sub https://${FrontendDistribution.DomainName}
      Events:
        ForgotPassword:
          Type: Api
          Properties:
            Path: /api/auth/forgot-password
            Method: POST
            RestApiId: !Ref ApiGateway

  # New Lambda function for reset password
  ResetPasswordFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub pda-zone-reset-password-${Environment}
      Handler: src.handlers.auth.reset_password_handler
      Runtime: python3.12
      Environment:
        Variables:
          DB_HOST: !GetAtt Database.Endpoint.Address
          DB_NAME: pda_zone
          DB_USER: !Ref DBUsername
          DB_PASSWORD: !Ref DBPassword
          JWT_SECRET: !Ref JWTSecret
      Events:
        ResetPassword:
          Type: Api
          Properties:
            Path: /api/auth/reset-password
            Method: POST
            RestApiId: !Ref ApiGateway

Parameters:
  SMTPUser:
    Type: String
    Description: Google SMTP username (email)
  SMTPPassword:
    Type: String
    NoEcho: true
    Description: Google App Password for SMTP
```

---

## Frontend Implementation

### New Pages

**1. Forgot Password Page**

```typescript
// frontend/src/pages/ForgotPasswordPage.tsx

import { useState } from 'react';
import { api } from '../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (error) {
      // Always show success message for security
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="pda-screen">
        <div className="success-message">
          <p>If your frequency exists in our database, we've transmitted recovery coordinates to it.</p>
          <p>Check your email for further instructions.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pda-screen">
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="STALKER@PDA.NET"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'TRANSMITTING...' : '[ TRANSMIT ]'}
        </button>
      </form>
    </div>
  );
}
```

**2. Reset Password Page**

```typescript
// frontend/src/pages/ResetPasswordPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (!tokenParam) {
      navigate('/forgot-password');
    } else {
      setToken(tokenParam);
    }
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Reset link is invalid or expired');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="pda-screen">
        <div className="success-message">
          <p>PROTOCOL UPDATED</p>
          <p>Security credentials synchronized.</p>
          <p>Redirecting to access terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pda-screen">
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="ENTER_NEW_CODE"
          required
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="CONFIRM_CODE"
          required
        />
        
        {error && (
          <div className="error-box">
            <span>&gt;&gt; ERR: CHECKSUM INVALID</span>
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading}>
          {loading ? 'PATCHING...' : 'INITIALIZE PATCH'}
        </button>
      </form>
    </div>
  );
}
```

### Router Updates

```typescript
// frontend/src/App.tsx

import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// Add routes
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

### Login Page Update

Add "Forgot Password" link to login page:

```typescript
// frontend/src/pages/LoginPage.tsx

<Link to="/forgot-password" className="text-primary text-sm">
  Forgot Password?
</Link>
```

---

## Testing

### Manual Testing Flow

1. **Request Reset:**
   ```bash
   curl -X POST https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev/api/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Check Email:**
   - Verify email received
   - Click reset link
   - Verify token in URL

3. **Reset Password:**
   ```bash
   curl -X POST https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev/api/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"JWT_TOKEN_HERE","newPassword":"newpass123"}'
   ```

4. **Login with New Password:**
   ```bash
   curl -X POST https://czqg4fcsqi.execute-api.eu-north-1.amazonaws.com/dev/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"newpass123"}'
   ```

### Test Cases

- ✅ Valid email → email sent
- ✅ Invalid email → generic success message (no leak)
- ✅ Rate limiting → 429 error after 1 request in 5 minutes
- ✅ Valid token → password reset successful
- ✅ Expired token → error message
- ✅ Used token → error message (no reuse)
- ✅ Invalid token → error message
- ✅ Password mismatch → client-side error
- ✅ Short password → validation error
- ✅ Login with new password → success

---

## Security Considerations

1. **Email Enumeration Prevention:**
   - Always return success message, even if email doesn't exist
   - Same response time for existing/non-existing emails

2. **Rate Limiting:**
   - 1 request per 5 minutes per IP address
   - Prevents brute force attacks

3. **Token Security:**
   - JWT with 1-hour expiration
   - Token hash stored in DB for revocation
   - Single-use tokens (marked as used after reset)

4. **Password Requirements:**
   - Minimum 6 characters (increase to 8+ for production)
   - Consider adding complexity requirements

5. **SMTP Security:**
   - Use Google App Password (not regular password)
   - TLS encryption for email transmission
   - Store credentials in environment variables

6. **Token Cleanup:**
   - Optional: Cron job to delete expired tokens
   - Or rely on DB indexes for performance

---

## Deployment Checklist

- [ ] Create database migration (`004_password_reset.sql`)
- [ ] Add SMTP credentials to `.env.local`
- [ ] Update SAM template with new resources
- [ ] Implement backend handlers (`forgot_password`, `reset_password`)
- [ ] Implement email utility (`utils/email.py`)
- [ ] Implement rate limiting utility (`utils/rate_limit.py`)
- [ ] Create frontend pages (`ForgotPasswordPage`, `ResetPasswordPage`)
- [ ] Update login page with "Forgot Password" link
- [ ] Deploy infrastructure (`sam build && sam deploy`)
- [ ] Deploy frontend (`make deploy-fe`)
- [ ] Test full flow (request → email → reset → login)
- [ ] Update AGENT_GUIDE.md with new feature

---

## Future Enhancements

1. **Email Templates:**
   - HTML email with PDA-themed design
   - Inline CSS for better rendering

2. **Multi-language Support:**
   - Translate email content based on user preference
   - Use Google Translate API

3. **SMS Reset Option:**
   - Alternative to email via AWS SNS
   - Phone number verification

4. **Security Questions:**
   - Additional verification layer
   - Fallback if email unavailable

5. **Admin Notifications:**
   - Alert GMs of suspicious reset activity
   - Dashboard for reset statistics

---

## Cost Estimate

**Additional AWS Resources:**
- Lambda invocations: ~$0 (within 1M free tier)
- RDS storage: +~1MB for new tables (~$0)

**Google SMTP:**
- Free tier: 500 emails/day
- Cost: $0 (within free tier)

**Total Additional Cost:** ~$0/month
