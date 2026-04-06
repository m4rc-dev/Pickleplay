import { Resend } from 'resend';
import { buildPaymentConfirmationEmailHtml } from '../shared/paymentConfirmationEmailTemplate.js';

const resend = new Resend(process.env.RESEND_API_KEY);

// Simple rate limiter for serverless environment
const ipHits = new Map();
const RATE_WINDOW = 60_000 * 5; // 5 minutes (less aggressive than 2FA)
const RATE_MAX = 10; // 10 emails per 5 minutes per IP

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
    const origin = req.headers.origin || '';
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

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
            paymentMethod,
        } = req.body;

        if (!email || !playerName || !courtName || !date || !referenceId) {
            return res.status(400).json({ error: 'Missing required booking parameters' });
        }

        const appUrl = 'https://www.pickleplay.ph';
        const htmlContent = buildPaymentConfirmationEmailHtml({
            playerName,
            courtName,
            locationName,
            date,
            startTime,
            endTime,
            totalPrice,
            referenceId,
            paymentMethod,
            appUrl,
            bookingsUrl: `${appUrl}/my-bookings`,
        });

        const { data: resendData, error } = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: 'Payment Verified - Booking Confirmed | PicklePlay',
            html: htmlContent,
        });

        if (error) {
            console.error('Resend API Error (Vercel):', error);
            return res.status(500).json({ error: error.message });
        }

        console.log('Receipt email sent via Vercel to:', email);
        return res.status(200).json({ success: true, id: resendData?.id });
    } catch (error) {
        console.error('Vercel function error:', error.message);
        return res.status(500).json({ error: 'Internal server error while sending email' });
    }
}
