import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple rate limiter for serverless environment
const ipHits = new Map();
const RATE_WINDOW = 60_000 * 5; // 5 minutes (less aggressive than 2FA)
const RATE_MAX = 10;            // 10 emails per 5 minutes per IP

function isRateLimited(ip) {
    const now = Date.now();
    const entry = ipHits.get(ip);
    if (!entry || now - entry.start > RATE_WINDOW) {
        ipHits.set(ip, { start: now, count: 1 });
        return false;
    }
    entry.count++;
    return entry.count > RATE_MAX;
}

const ALLOWED_ORIGINS = [
    'https://www.pickleplay.ph',
    'https://pickleplay.ph',
    'https://pickleplay.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
];

export default async function handler(req, res) {
    // CORS configuration
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
        return res.status(429).json({ error: 'Too many receipt requests. Please try again later.' });
    }

    try {
        const { 
            email, 
            playerName, 
            courtName, 
            locationName, 
            date, 
            startTime, 
            endTime, 
            totalPrice, 
            referenceId,
            paymentMethod 
        } = req.body;

        if (!email || !playerName || !courtName || !date || !referenceId) {
            return res.status(400).json({ error: 'Missing required booking parameters' });
        }

        const appUrl = 'https://www.pickleplay.ph';
        const logoUrl = 'https://www.pickleplay.ph/images/PicklePlayLogo.jpg';

        // Same HTML styling as Guest Booking Email, adjusted for Payment Receipt
        const htmlContent = `
<div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f0fdf4;">
  <div style="max-width: 600px; margin: 0 auto;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #1d4ed8 100%); padding: 32px; text-align: center; border-radius: 0 0 24px 24px;">
      <img src="${logoUrl}" alt="PicklePlay" style="width: 72px; height: 72px; border-radius: 16px; margin-bottom: 12px; border: 3px solid rgba(255,255,255,0.3);" />
      <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">
        PICKLE<span style="color: #a3e635;">PLAY</span>
      </h1>
      <p style="margin: 6px 0 0; font-size: 11px; color: rgba(255,255,255,0.6); letter-spacing: 3px; text-transform: uppercase; font-weight: 600;">Philippines</p>
    </div>

    <!-- Body -->
    <div style="background-color: #ffffff; padding: 36px 28px; margin: 0 12px;">

      <!-- Welcome -->
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background-color: #dcfce7; color: #16a34a; margin-bottom: 16px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </div>
        <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 800; color: #0f172a;">
          Payment Verified! 🎉
        </h2>
        <p style="margin: 0; font-size: 15px; color: #475569; line-height: 1.6;">
          Hi ${playerName}, your payment has been successfully verified. Your booking is now <strong style="color: #16a34a;">CONFIRMED</strong>.
        </p>
      </div>

      <!-- Booking Receipt Card -->
      <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 28px;">
        <div style="text-align: center; margin-bottom: 18px;">
          <span style="display: inline-block; background: linear-gradient(135deg, #10b981, #059669); color: #ffffff; font-size: 10px; font-weight: 800; padding: 6px 18px; border-radius: 20px; letter-spacing: 2px; text-transform: uppercase;">Official Receipt</span>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Reference ID</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #1e40af; font-size: 13px; font-weight: 800; text-align: right; font-family: monospace; letter-spacing: 1px;">${referenceId.slice(0, 8).toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Court</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 800; text-align: right;">${courtName}</td>
          </tr>
          ${locationName ? `
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Location</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 800; text-align: right;">${locationName}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Date</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 800; text-align: right;">${new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</td>
          </tr>
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Time</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 800; text-align: right;">${startTime} - ${endTime}</td>
          </tr>
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Payment Via</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 800; text-align: right; text-transform: capitalize;">${paymentMethod || 'Online'}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0 0; color: #0f172a; font-size: 15px; font-weight: 900;">TOTAL PAID</td>
            <td style="padding: 14px 0 0; color: #16a34a; font-size: 22px; font-weight: 900; text-align: right;">₱${Number(totalPrice).toFixed(2)}</td>
          </tr>
        </table>
      </div>

      <!-- Download Pass Info -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px; text-align: center;">
        <h3 style="margin: 0 0 8px; color: #0f172a; font-size: 16px; font-weight: 800;">Get Your Digital Pass</h3>
        <p style="margin: 0 0 16px; color: #64748b; font-size: 13px; line-height: 1.5;">
          You can download or print your official digital pass from your account. Present this pass at the venue.
        </p>
        <a href="${appUrl}/my-bookings" target="_blank" style="display: inline-block; text-decoration: none; color: #ffffff; background: #1e40af; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 700; border: 1px solid #1e3a8a;">
          View My Bookings
        </a>
      </div>

      <!-- Footer note -->
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; text-align: center; margin: 0 0 6px;">
        Need help? Contact us at
        <a href="mailto:phpickleplay@gmail.com" style="color: #2563eb; text-decoration: none; font-weight: 700;">phpickleplay@gmail.com</a>
      </p>
      <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin: 0;">
        Best regards, <strong style="color: #94a3b8;">The PicklePlay Philippines Team</strong>
      </p>
    </div>

    <!-- Bottom Bar -->
    <div style="background: linear-gradient(135deg, #1e40af, #1d4ed8); padding: 18px 32px; text-align: center; border-radius: 24px 24px 0 0; margin: 0 12px;">
      <p style="margin: 0; font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 1px;">
        © 2026 PicklePlay Philippines · <a href="${appUrl}" style="color: rgba(255,255,255,0.5); text-decoration: none;">pickleplay.ph</a>
      </p>
    </div>

  </div>
</div>
        `.trim();

        const { data: resendData, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: `Payment Verified – Booking Confirmed | PicklePlay`,
            html: htmlContent,
        });

        if (error) {
            console.error('❌ Resend API Error (Vercel):', error);
            return res.status(500).json({ error: error.message });
        }

        console.log('✅ Receipt email sent via Vercel to:', email);
        return res.status(200).json({ success: true, id: resendData?.id });
    } catch (error) {
        console.error('❌ Vercel function error:', error.message);
        return res.status(500).json({ error: 'Internal server error while sending email' });
    }
}
