# SMS & Email 2FA Setup Guide

## Environment Variables

Add these to your `.env` file:

```env
# Resend (Email)
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Twilio (SMS)
VITE_TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxx
VITE_TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxx
VITE_TWILIO_PHONE_NUMBER=+1234567890
```

## Step 1: Set up Resend (Email)

1. **Create account**: https://resend.com
2. **Get API Key**:
   - Go to Resend dashboard
   - API Keys section
   - Copy your API key
3. **Add to .env**: `VITE_RESEND_API_KEY=your_key_here`
4. **Verify domain** (optional, for production):
   - Add your domain to Resend
   - Update from email in backend

## Step 2: Set up Twilio (SMS)

1. **Create account**: https://www.twilio.com/console/sms/getting-started
2. **Get Credentials**:
   - Account SID (from dashboard)
   - Auth Token (from dashboard)
   - Phone Number (Twilio assigns you one)
3. **Add to .env**:
   ```env
   VITE_TWILIO_ACCOUNT_SID=your_sid
   VITE_TWILIO_AUTH_TOKEN=your_token
   VITE_TWILIO_PHONE_NUMBER=+1234567890
   ```
4. **Verify recipient numbers** (development):
   - In Twilio console, add test phone numbers

## Backend Endpoints Needed

Create these API endpoints in your backend (Node.js, Python, etc.):

### `/api/send-sms` (POST)
```typescript
// Request body
{
  phoneNumber: "+1234567890",
  message: "Your PicklePlay 2FA code is: 123456"
}

// Implementation (Node.js with Express)
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

app.post('/api/send-sms', async (req, res) => {
  const { phoneNumber, message } = req.body;
  
  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

### `/api/send-email` (POST)
```typescript
// Request body
{
  email: "user@example.com",
  subject: "Your PicklePlay 2FA Code",
  code: "123456"
}

// Implementation (Node.js with Express)
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/api/send-email', async (req, res) => {
  const { email, subject, code } = req.body;
  
  try {
    await resend.emails.send({
      from: 'noreply@pickleplays.com',
      to: email,
      subject: subject,
      html: `
        <h2>Your 2FA Code</h2>
        <p>Your PicklePlay verification code is:</p>
        <h1 style="font-size: 32px; letter-spacing: 5px;">${code}</h1>
        <p>Valid for 10 minutes</p>
      `
    });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
```

## Frontend Usage

### Enabling 2FA via Email:
```typescript
import { sendEmailCode, verifyCode } from '@/services/twoFactorAuth';

// Step 1: Send code
const result = await sendEmailCode(userEmail, userId);

// Step 2: User enters code
const verification = await verifyCode(userId, enteredCode);
```

### Enabling 2FA via SMS:
```typescript
import { sendSmsCode, verifyCode, updatePhoneNumber } from '@/services/twoFactorAuth';

// Step 1: Update phone number
await updatePhoneNumber(userId, '+1234567890');

// Step 2: Send code
const result = await sendSmsCode('+1234567890', userId);

// Step 3: User enters code
const verification = await verifyCode(userId, enteredCode);
```

## Testing

### Email Testing (Free)
- Use Resend's free tier (100 emails/day)
- Check spam folder if email doesn't arrive
- Use test email addresses

### SMS Testing (Free)
- Twilio trial includes $15 credit
- Add verified phone numbers to test with
- Use your real phone number for testing

## Free Tier Limits

| Service | Limit | Cost After |
|---------|-------|-----------|
| **Resend** | 100 emails/day | $20/month for more |
| **Twilio** | $15 trial credit | ~$0.0075 per SMS |

## Costs Estimate

For a typical app:
- **Email 2FA**: 100-500 emails/month → ~$0-5/month
- **SMS 2FA**: 100-500 SMS/month → ~$1-5/month
- **Total**: ~$5-10/month

## Migration Steps

1. Run updated SQL migration:
   ```sql
   -- Add new columns to security_settings
   ALTER TABLE security_settings 
   ADD COLUMN verification_code TEXT,
   ADD COLUMN verification_code_expires_at TIMESTAMP,
   ADD COLUMN verification_attempts INT DEFAULT 0,
   ADD COLUMN phone_number TEXT;
   ```

2. Install dependencies:
   ```bash
   npm install resend twilio
   ```

3. Add environment variables

4. Set up backend endpoints

5. Test 2FA flow in Profile component
