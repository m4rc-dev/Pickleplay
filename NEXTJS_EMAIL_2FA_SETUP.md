# Next.js Email 2FA Setup

## Step 1: Install Resend

```bash
npm install resend
```

## Step 2: Get Resend API Key

1. Go to https://resend.com
2. Create account & login
3. Go to API Keys section
4. Copy your API key

## Step 3: Add Environment Variables

Add to `.env.local`:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@pickleplays.com
```

**Note:** For production, you should:
- Verify your domain in Resend
- Use your actual domain email (e.g., noreply@yourdomain.com)

## Step 4: API Endpoint Created

✅ Created: `app/api/send-email/route.ts`

This handles:
- POST requests with `{ email, subject, code }`
- Sends verification codes via Resend
- Error handling & validation
- Professional HTML email template

## Step 5: Test It

### Test via cURL:
```bash
curl -X POST http://localhost:3000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'
```

### Test via Frontend:
The frontend already calls this endpoint in `services/twoFactorAuth.ts`:
```typescript
const response = await fetch('/api/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: userEmail,
    subject: 'Your PicklePlay 2FA Code',
    code: verificationCode,
  }),
});
```

## API Response

**Success (200):**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "id": "email_xxxxx"
}
```

**Error (400/500):**
```json
{
  "error": "Failed to send email"
}
```

## Email Template Features

✅ Professional design
✅ 6-digit code display
✅ 10-minute expiry countdown
✅ Security warnings
✅ Dark mode support
✅ Mobile responsive
✅ Branding (PicklePlay logo)

## Testing Checklist

- [ ] `.env.local` has `RESEND_API_KEY`
- [ ] `resend` package installed
- [ ] API route created at `app/api/send-email/route.ts`
- [ ] Test email sends successfully
- [ ] Frontend can trigger 2FA flow
- [ ] Verification code appears in email
- [ ] Code validation works

## Resend Free Tier

- **100 emails/day** free
- Great for development & small MVPs
- Easy to upgrade later

## Production Deployment (Vercel)

1. Add environment variables to Vercel dashboard:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`

2. Deploy:
   ```bash
   git push origin main
   ```

That's it! Vercel automatically deploys Next.js API routes.

## Troubleshooting

**"Resend API key not found"**
- Add `RESEND_API_KEY` to `.env.local`
- Restart dev server: `npm run dev`

**"Email not sending"**
- Check API key is valid
- Check email format is correct
- Check Resend dashboard for errors

**"CORS errors"**
- Should not happen with Next.js API routes
- Frontend is same origin (no CORS needed)

## Next Steps

1. ✅ Create `.env.local` with API key
2. ✅ Test sending an email
3. ✅ Test full 2FA flow in app
4. ✅ Deploy to Vercel
