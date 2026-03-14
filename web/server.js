import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import hpp from 'hpp';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../.env.local' }); // Try root as well

const app = express();
const PORT = 5001;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEB_AUTH_REDIRECT_URL = process.env.WEB_AUTH_REDIRECT_URL || process.env.VITE_APP_URL;

// ═══════════════════════════════════════════════════════════════
// 🛡️  SECURITY: Allowed origins (update for your domains)
// ═══════════════════════════════════════════════════════════════
const ALLOWED_ORIGINS = [
  'https://www.pickleplay.ph',
  'https://pickleplay.ph',
  'https://pickleplay.vercel.app',
  'http://localhost:3000',      // local dev
  'http://localhost:5173',      // Vite dev
];

let supabaseAdmin = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
} else {
  console.warn('⚠️ Supabase admin credentials missing. QR login endpoints will be disabled.');
}

// Initialize Resend - only if API key is present
let resend = null;
if (process.env.RESEND_API_KEY) {
  try {
    resend = new Resend(process.env.RESEND_API_KEY);
    console.log('✅ Resend initialized');
  } catch (err) {
    console.error('❌ Failed to initialize Resend:', err.message);
  }
} else {
  console.warn('⚠️ RESEND_API_KEY is missing. Email features will be disabled.');
}

// News API config
const NEWS_API_URL = process.env.HOMESPH_NEWS_API_URL;
const NEWS_API_KEY = process.env.HOMESPH_NEWS_API_KEY;

// ═══════════════════════════════════════════════════════════════
// 🛡️  SECURITY MIDDLEWARE — DDoS / Abuse Protection
// ═══════════════════════════════════════════════════════════════

// 1. Trust proxy (required behind Vercel/Cloudflare/Nginx)
app.set('trust proxy', 1);

// 2. Security headers via Helmet
app.use(helmet({
  contentSecurityPolicy: false,       // Let the SPA handle its own CSP
  crossOriginEmbedderPolicy: false,   // Allow embedding (maps, OAuth popups)
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 3. HTTP Parameter Pollution protection
app.use(hpp());

// 4. CORS — strict origin whitelist
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`🚫 CORS blocked origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24h — reduces OPTIONS flood
}));

// 5. Body parser with strict size limit (prevents large-payload attacks)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// 6. Global rate limiter — 200 requests per IP per minute
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,     // 1 minute
  max: 200,                 // 200 requests per window
  standardHeaders: true,    // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false,
  message: { error: 'Too many requests — please slow down.', retryAfter: 60 },
});
app.use(globalLimiter);

// 7. Speed limiter — progressively slow down repeat offenders
const speedLimiter = slowDown({
  windowMs: 60 * 1000,     // 1 minute
  delayAfter: 100,          // Start slowing after 100 requests
  delayMs: (hits) => (hits - 100) * 100, // Add 100ms per request over limit
});
app.use(speedLimiter);

// 8. Strict rate limiters for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 15,                     // 15 auth attempts per 15 min
  message: { error: 'Too many authentication attempts. Please try again in 15 minutes.' },
});

const emailLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 5,                     // 5 emails per minute per IP
  message: { error: 'Too many email requests. Please wait a moment.' },
});

const accountCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 10,                     // 10 account creations per IP per hour
  message: { error: 'Too many account creation attempts. Please try again later.' },
});

// 9. Block suspicious user-agents and empty requests
app.use((req, res, next) => {
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  // Block known attack tools and bots (not search engines)
  const blockedAgents = ['sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab', 'dirbuster', 'gobuster', 'nuclei', 'httpx-toolkit'];
  if (blockedAgents.some(agent => ua.includes(agent))) {
    console.warn(`🚫 Blocked suspicious UA: ${ua} from ${req.ip}`);
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── OAuth Callback Redirect ────────────────────────────────────
// Google OAuth redirects to /auth/callback, but we need it at /#/auth/callback
// This handler converts the query params to hash params for HashRouter compatibility
app.get('/auth/callback', (req, res) => {
  // Extract all query parameters
  const queryString = new URLSearchParams(req.query).toString();
  // Redirect to hash-based route with same parameters
  const redirectUrl = queryString ? `/#/auth/callback#${queryString}` : '/#/auth/callback';
  res.redirect(redirectUrl);
});

// ─── News API Proxy ─────────────────────────────────────────────
// Proxies requests to HomesPh News API, injecting the secure API key
app.get('/api/v1/news/articles', async (req, res) => {
  try {
    if (!NEWS_API_URL || !NEWS_API_KEY) {
      return res.status(500).json({ error: 'News API not configured. Set HOMESPH_NEWS_API_URL and HOMESPH_NEWS_API_KEY in .env.local' });
    }

    const page = req.query.page || 1;
    const category = req.query.category || ''; // Optional category filter

    // Build URL with optional category filter
    let url = `${NEWS_API_URL}/api/external/articles?page=${page}`;
    if (category) {
      url += `&category=${category}`;
    }

    const response = await fetch(url, {
      headers: {
        'X-Site-Api-Key': NEWS_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ News API error:', response.status, errorText);
      return res.status(response.status).json({ error: `News API returned ${response.status}` });
    }

    const data = await response.json();
    console.log(`📰 News API: fetched page ${page}${category ? ` (category: ${category})` : ' (all categories)'} - ${data?.data?.total || 0} total articles`);
    res.json(data);
  } catch (error) {
    console.error('❌ News proxy error:', error.message);
    res.status(500).json({ error: 'Failed to fetch news articles' });
  }
});

// Proxy for single article detail
app.get('/api/v1/news/articles/:id', async (req, res) => {
  try {
    if (!NEWS_API_URL || !NEWS_API_KEY) {
      return res.status(500).json({ error: 'News API not configured.' });
    }

    const url = `${NEWS_API_URL}/api/external/articles/${req.params.id}`;

    const response = await fetch(url, {
      headers: {
        'X-Site-Api-Key': NEWS_API_KEY,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `News API returned ${response.status}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('❌ News article detail error:', error.message);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// Send email endpoint
app.post('/api/send-email', emailLimiter, async (req, res) => {
  try {
    const { email, subject, code } = req.body;

    console.log('📨 Received email request:', { email, code: '******' });

    // Validate inputs
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    if (!resend) {
      console.error('❌ Email attempt failed: Resend not initialized (missing API key)');
      return res.status(503).json({ error: 'Email service is currently unavailable' });
    }

    // Send email via Resend
    const result = await resend.emails.send({
      from: 'noreply@pickleplays.com', // Replace with your verified domain
      to: email,
      subject: subject || 'Your PicklePlay 2FA Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
              .container { max-width: 500px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 40px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
              .header { text-align: center; margin-bottom: 30px; }
              .logo { font-size: 24px; font-weight: bold; color: #3b82f6; }
              .code-box { background: #f0f9ff; border: 2px solid #3b82f6; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; }
              .code { font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #3b82f6; font-family: monospace; }
              .timer { color: #666; font-size: 14px; margin-top: 10px; }
              .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; font-size: 14px; }
              .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🏐 PicklePlay</div>
              </div>
              <h2 style="color: #333; text-align: center;">Two-Factor Authentication</h2>
              <p style="color: #666; text-align: center;">Enter this code to verify your account:</p>
              <div class="code-box">
                <div class="code">${code}</div>
                <div class="timer">⏱️ Expires in 10 minutes</div>
              </div>
              <div class="warning">
                <strong>⚠️ Security Notice:</strong> Never share this code with anyone. PicklePlay staff will never ask for it.
              </div>
              <p style="color: #666; font-size: 14px;">Didn't request this code? Your account is secure. You can ignore this email.</p>
              <div class="footer">
                <p>© 2026 PicklePlay. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log('✅ Email sent successfully:', result);

    if (result.error) {
      throw new Error(result.error.message || 'Failed to send email');
    }

    res.json({ success: true, id: result.data?.id });
  } catch (error) {
    console.error('❌ Email sending error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

// ─── Create Guest Account & Send Credentials ────────────────
app.post('/api/auth/create-guest-account', accountCreationLimiter, async (req, res) => {
  try {
    const { guestEmail, guestFirstName, guestLastName, referenceId, locationName, locationAddress, courtName, date, startTime, endTime, totalPrice } = req.body;

    if (!guestEmail || !guestFirstName || !referenceId) {
      return res.status(400).json({ error: 'Missing required fields: guestEmail, guestFirstName, referenceId' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY.' });
    }

    if (!resend) {
      return res.status(503).json({ error: 'Email service (Resend) not initialized.' });
    }

    const guestName = `${guestFirstName.trim()} ${(guestLastName || '').trim()}`.trim();

    // Build temp password: Firstname (first-letter-capital) + Reference ID (ALL CAPS)
    const firstName = guestFirstName.trim();
    const capitalizedFirst = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    const refShort = referenceId.slice(0, 8).toUpperCase();
    const tempPassword = `${capitalizedFirst}${refShort}`;

    let userId = null;
    let isExistingUser = false;

    // Step 1: Check if this email already exists in auth via getUserByEmail (faster than listUsers)
    try {
      const { data: existingUserData, error: lookupError } = await supabaseAdmin.auth.admin.getUserById(
        // We can't use getUserById without an ID, so let's try listing with email filter
        '' // placeholder — we'll use a different approach
      );
    } catch (_) { /* ignore */ }

    // Use listUsers with filter for this specific email
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    // More reliable: try to find user by checking profiles table first
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', guestEmail)
      .maybeSingle();

    if (existingProfile) {
      // User exists — update their password and flag for reset
      userId = existingProfile.id;
      isExistingUser = true;

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        user_metadata: { must_reset_password: true },
      });
      if (updateError) {
        console.error('Failed to update existing user password:', updateError);
        throw updateError;
      }

      // Update profile (safely handle missing column)
      await supabaseAdmin.from('profiles')
        .update({ must_reset_password: true })
        .eq('id', userId)
        .then(() => {})
        .catch(() => console.warn('must_reset_password column may not exist yet — run migration 009'));

      console.log(`🔄 Updated existing user ${guestEmail} (${userId}) with new temp password`);

    } else {
      // User doesn't exist — create new Supabase auth user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: guestEmail,
        password: tempPassword,
        email_confirm: true,  // Skip email verification
        user_metadata: {
          full_name: guestName,
          must_reset_password: true,
        },
      });

      if (createError) {
        console.error('Failed to create new user:', createError);
        // If user already exists in auth but not in profiles, try updating
        if (createError.message?.includes('already been registered') || createError.status === 422) {
          // Fetch users to find the one with this email
          const { data: allUsersData } = await supabaseAdmin.auth.admin.listUsers();
          const found = allUsersData?.users?.find(u => u.email === guestEmail);
          if (found) {
            userId = found.id;
            isExistingUser = true;
            await supabaseAdmin.auth.admin.updateUserById(userId, {
              password: tempPassword,
              user_metadata: { ...found.user_metadata, must_reset_password: true },
            });
            // Ensure profile exists
            // Upsert profile — try with must_reset_password, fallback without
            let upsertResult = await supabaseAdmin.from('profiles').upsert({
              id: userId,
              email: guestEmail,
              full_name: guestName,
              must_reset_password: true,
            }, { onConflict: 'id' });
            if (upsertResult.error) {
              await supabaseAdmin.from('profiles').upsert({
                id: userId,
                email: guestEmail,
                full_name: guestName,
              }, { onConflict: 'id' });
            }
            console.log(`🔄 Found existing auth user, updated: ${guestEmail} (${userId})`);
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      } else {
        userId = newUser.user.id;

        // Create profile for the new user
        const baseUsername = firstName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 22);
        const username = `${baseUsername}_${Math.random().toString(36).slice(2, 7)}`;

        const profileData = {
          id: userId,
          email: guestEmail,
          full_name: guestName,
          username: username,
          active_role: 'PLAYER',
          roles: ['PLAYER'],
        };

        // Try insert with must_reset_password first
        let { error: profileError } = await supabaseAdmin.from('profiles').insert({
          ...profileData,
          must_reset_password: true,
        });

        if (profileError) {
          console.error('Profile insert error (trying without must_reset_password):', profileError.message);
          // Column may not exist yet — retry without it
          const { error: retryError } = await supabaseAdmin.from('profiles').insert(profileData);
          if (retryError) {
            console.error('Profile insert retry error (trying upsert):', retryError.message);
            await supabaseAdmin.from('profiles').upsert(profileData, { onConflict: 'id' });
          }
          // Try to set must_reset_password separately (will silently fail if column missing)
          await supabaseAdmin.from('profiles').update({ must_reset_password: true }).eq('id', userId).then(() => {}).catch(() => {});
        }

        console.log(`✅ Created new user: ${guestEmail} (${userId})`);
      }
    }

    // Format date
    const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Format time
    const formatTime = (t) => {
      const [h, m] = t.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hr = h % 12 || 12;
      return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    // Duration
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const durationMin = (eh * 60 + em) - (sh * 60 + sm);
    const durationHrs = durationMin >= 60 ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? ` ${durationMin % 60}m` : ''}` : `${durationMin}m`;

    const loginUrl = 'https://www.pickleplay.ph/login';
    const logoUrl = 'https://www.pickleplay.ph/images/PicklePlayLogo.jpg';

    // Branded email HTML — Vivid Blue (#2563EB) + Yellow Green (#84CC16) + Logo
    const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f0fdf4;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;">
<div style="max-width:600px;margin:0 auto;">

  <!-- Header -->
  <div style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #1d4ed8 100%); padding:32px; text-align:center; border-radius:0 0 24px 24px;">
    <img src="${logoUrl}" alt="PicklePlay" style="width:72px;height:72px;border-radius:16px;margin-bottom:12px;border:3px solid rgba(255,255,255,0.3);" />
    <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">
      PICKLE<span style="color:#a3e635;">PLAY</span>
    </h1>
    <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,0.6);letter-spacing:3px;text-transform:uppercase;font-weight:600;">Philippines</p>
  </div>

  <!-- Body -->
  <div style="background-color:#ffffff;padding:36px 28px;margin:0 12px;">

    <!-- Badge -->
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#84cc16,#65a30d);color:#ffffff;font-size:11px;font-weight:800;padding:6px 20px;border-radius:20px;letter-spacing:2px;text-transform:uppercase;">🎉 Account Created</div>
    </div>

    <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#0f172a;text-align:center;">
      Welcome to PicklePlay, ${guestName}!
    </h2>
    <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;text-align:center;">
      A court has been booked for you at <strong style="color:#1e40af;">${locationName}</strong>.<br/>Your PicklePlay account has been created automatically.
    </p>

    <!-- Credentials Card -->
    <div style="background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:2px solid #bfdbfe;border-radius:16px;padding:24px;margin-bottom:24px;">
      <div style="text-align:center;margin-bottom:16px;">
        <span style="display:inline-block;background:#1e40af;color:#ffffff;font-size:10px;font-weight:800;padding:6px 18px;border-radius:20px;letter-spacing:2px;text-transform:uppercase;">🔐 Your Login Credentials</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:14px 16px;background:#ffffff;border-radius:12px 12px 0 0;border-bottom:1px solid #e2e8f0;">
            <span style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Email</span><br/>
            <span style="color:#1e40af;font-size:16px;font-weight:800;font-family:monospace;">${guestEmail}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 16px;background:#ffffff;border-radius:0 0 12px 12px;">
            <span style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Temporary Password</span><br/>
            <span style="color:#84cc16;font-size:20px;font-weight:900;font-family:monospace;letter-spacing:1px;">${tempPassword}</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- How Password Is Formed Guide -->
    <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:16px;padding:20px;margin-bottom:24px;">
      <div style="text-align:center;margin-bottom:12px;">
        <span style="display:inline-block;background:#2563eb;color:#ffffff;font-size:10px;font-weight:800;padding:5px 14px;border-radius:20px;letter-spacing:1.5px;text-transform:uppercase;">📖 How Your Password Works</span>
      </div>
      <p style="margin:0 0 12px;color:#334155;font-size:13px;line-height:1.7;text-align:center;">
        Your temporary password is formed by combining:
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:12px;">
        <tr>
          <td style="padding:10px 12px;background:#eff6ff;border-radius:8px 8px 0 0;border-bottom:1px solid #dbeafe;">
            <span style="color:#1e40af;font-size:12px;font-weight:800;">Step 1:</span>
            <span style="color:#334155;font-size:12px;font-weight:600;"> Your <strong>First Name</strong> (first letter capitalized)</span><br/>
            <span style="color:#1e40af;font-size:16px;font-weight:900;font-family:monospace;margin-left:60px;">${capitalizedFirst}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:4px 12px;text-align:center;color:#94a3b8;font-size:18px;font-weight:900;">+</td>
        </tr>
        <tr>
          <td style="padding:10px 12px;background:#f0fdf4;border-radius:0 0 8px 8px;border-top:1px solid #d9f99d;">
            <span style="color:#65a30d;font-size:12px;font-weight:800;">Step 2:</span>
            <span style="color:#334155;font-size:12px;font-weight:600;"> Your <strong>Booking Reference ID</strong> (ALL CAPS)</span><br/>
            <span style="color:#84cc16;font-size:16px;font-weight:900;font-family:monospace;margin-left:60px;">${refShort}</span>
          </td>
        </tr>
      </table>
      <div style="background:#ffffff;border:2px dashed #bfdbfe;border-radius:10px;padding:12px;text-align:center;">
        <span style="color:#64748b;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Result</span><br/>
        <span style="color:#0f172a;font-size:22px;font-weight:900;font-family:monospace;letter-spacing:1px;">
          <span style="color:#1e40af;">${capitalizedFirst}</span><span style="color:#84cc16;">${refShort}</span>
        </span>
      </div>
    </div>

    <!-- Step-by-step Setup Guide -->
    <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 12px;color:#92400e;font-size:14px;font-weight:800;">📋 How to Set Up Your Account:</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;vertical-align:top;width:28px;"><span style="color:#d97706;font-size:14px;font-weight:900;">1.</span></td>
          <td style="padding:6px 0;color:#78350f;font-size:13px;font-weight:600;">Click <strong>"Sign In Now"</strong> below or go to <strong>pickleplay.ph/login</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 0;vertical-align:top;"><span style="color:#d97706;font-size:14px;font-weight:900;">2.</span></td>
          <td style="padding:6px 0;color:#78350f;font-size:13px;font-weight:600;">Enter your <strong>Email</strong> and the <strong>Temporary Password</strong> shown above</td>
        </tr>
        <tr>
          <td style="padding:6px 0;vertical-align:top;"><span style="color:#d97706;font-size:14px;font-weight:900;">3.</span></td>
          <td style="padding:6px 0;color:#78350f;font-size:13px;font-weight:600;">You'll be asked to change your password — enter your <strong>Current Password</strong> (temporary), then choose a <strong>New Password</strong></td>
        </tr>
        <tr>
          <td style="padding:6px 0;vertical-align:top;"><span style="color:#d97706;font-size:14px;font-weight:900;">4.</span></td>
          <td style="padding:6px 0;color:#78350f;font-size:13px;font-weight:600;">Done! 🎉 Your booking will appear in <strong>My Bookings</strong></td>
        </tr>
      </table>
    </div>

    <!-- Login Button -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${loginUrl}" target="_blank" style="display:inline-block;text-decoration:none;color:#ffffff;background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:16px 48px;border-radius:14px;font-size:15px;font-weight:800;letter-spacing:1px;text-transform:uppercase;box-shadow:0 4px 14px rgba(37,99,235,0.4);">
        🏸 Sign In Now
      </a>
    </div>

    <!-- Booking Receipt -->
    <div style="background:#f8fafc;border:2px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:28px;">
      <div style="text-align:center;margin-bottom:18px;">
        <span style="display:inline-block;background:linear-gradient(135deg,#84cc16,#65a30d);color:#ffffff;font-size:10px;font-weight:800;padding:6px 18px;border-radius:20px;letter-spacing:2px;text-transform:uppercase;">Booking Receipt</span>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Reference ID</td>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#1e40af;font-size:13px;font-weight:800;text-align:right;font-family:monospace;letter-spacing:1px;">${refShort}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Branch</td>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:800;text-align:right;">${locationName}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Address</td>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:700;text-align:right;">${locationAddress}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Court</td>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:800;text-align:right;">${courtName}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Date</td>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:800;text-align:right;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Time Slot</td>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:800;text-align:right;">${formatTime(startTime)} – ${formatTime(endTime)}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#64748b;font-size:13px;font-weight:600;">Duration</td>
          <td style="padding:11px 0;border-bottom:1px solid #e2e8f0;color:#0f172a;font-size:13px;font-weight:800;text-align:right;">${durationHrs}</td>
        </tr>
        <tr>
          <td style="padding:14px 0 0;color:#0f172a;font-size:15px;font-weight:900;">TOTAL</td>
          <td style="padding:14px 0 0;color:#84cc16;font-size:22px;font-weight:900;text-align:right;">${totalPrice > 0 ? `₱${Number(totalPrice).toFixed(2)}` : 'FREE'}</td>
        </tr>
      </table>
    </div>

    <!-- Footer text -->
    <p style="color:#94a3b8;font-size:12px;line-height:1.6;text-align:center;margin:0 0 6px;">
      Questions? Contact us at <a href="mailto:phpickleplay@gmail.com" style="color:#2563eb;text-decoration:none;font-weight:700;">phpickleplay@gmail.com</a>
    </p>
    <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0;">
      Best regards, <strong style="color:#94a3b8;">The PicklePlay Philippines Team</strong>
    </p>
  </div>

  <!-- Bottom Bar -->
  <div style="background:linear-gradient(135deg,#1e40af,#1d4ed8);padding:18px 32px;text-align:center;border-radius:24px 24px 0 0;margin:0 12px;">
    <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.5);letter-spacing:1px;">
      © 2026 PicklePlay Philippines · <a href="https://www.pickleplay.ph" style="color:rgba(255,255,255,0.5);text-decoration:none;">pickleplay.ph</a>
    </p>
  </div>

</div>
</body>
</html>`;

    // Send email via Resend
    const emailResult = await resend.emails.send({
      from: 'PicklePlay Philippines <noreply@pickleplays.com>',
      to: guestEmail,
      subject: `🏸 Your PicklePlay Account & Booking Confirmation – ${courtName} | ${formattedDate}`,
      html: htmlContent,
    });

    if (emailResult.error) {
      throw new Error(emailResult.error.message || 'Failed to send email');
    }

    console.log(`✅ Guest account created for ${guestEmail} (userId: ${userId}), email sent.`);

    res.json({ success: true, userId, tempPassword });
  } catch (error) {
    console.error('❌ Create guest account error:', error);
    res.status(500).json({ error: error.message || 'Failed to create guest account' });
  }
});

// ─── Set Guest Password (for pre-created accounts via Signup flow) ────────────────
app.post('/api/auth/set-guest-password', authLimiter, async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: 'Missing required fields: email, newPassword' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Supabase admin client not configured. Set SUPABASE_SERVICE_ROLE_KEY.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Find user in profiles
    let profile = null;
    let hasResetColumn = true;

    // Try with must_reset_password column first
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, must_reset_password')
      .eq('email', email)
      .maybeSingle();

    if (profileError && (profileError.code === '42703' || profileError.message?.includes('column') || profileError.code === 'PGRST204')) {
      // Column doesn't exist — query without it
      hasResetColumn = false;
      const { data: fallbackProfile, error: fallbackError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (fallbackError) throw fallbackError;
      profile = fallbackProfile;
    } else if (profileError) {
      throw profileError;
    } else {
      profile = profileData;
    }

    if (!profile) {
      // No profile — try finding user in auth directly
      const { data: allUsersData } = await supabaseAdmin.auth.admin.listUsers();
      const found = allUsersData?.users?.find(u => u.email === email);
      if (!found) {
        return res.status(404).json({ error: 'No guest account found for this email.' });
      }
      profile = { id: found.id };
    }

    // Update password via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password: newPassword,
      user_metadata: { must_reset_password: false },
    });

    if (updateError) {
      console.error('Failed to update guest password:', updateError);
      throw updateError;
    }

    // Clear the must_reset_password flag and set password_set_at (safely handle missing columns)
    await supabaseAdmin.from('profiles')
      .update({ must_reset_password: false, password_set_at: new Date().toISOString() })
      .eq('id', profile.id)
      .then(() => {})
      .catch(async () => {
        // Columns may not exist — try without must_reset_password
        await supabaseAdmin.from('profiles')
          .update({ password_set_at: new Date().toISOString() })
          .eq('id', profile.id)
          .catch(() => {});
      });

    console.log(`✅ Guest password set successfully for ${email} (${profile.id})`);
    res.json({ success: true, userId: profile.id });

  } catch (error) {
    console.error('❌ Set guest password error:', error);
    res.status(500).json({ error: error.message || 'Failed to set password.' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`📧 Email server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});

const requireSupabaseAdmin = () => {
  if (!supabaseAdmin || !WEB_AUTH_REDIRECT_URL) {
    const message = !supabaseAdmin
      ? 'Supabase admin client not configured.'
      : 'WEB_AUTH_REDIRECT_URL is missing.';
    return { ok: false, message };
  }

  return { ok: true };
};

// ─── QR Login Endpoints ───────────────────────────────────────
app.post('/api/auth/qr/start', authLimiter, async (_req, res) => {
  try {
    const guard = requireSupabaseAdmin();
    if (!guard.ok) return res.status(500).json({ error: guard.message });

    const nonce = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('login_challenges')
      .insert({ nonce, expires_at: expiresAt })
      .select('id, expires_at')
      .single();

    if (error) throw error;

    res.json({ challengeId: data.id, expiresAt: data.expires_at });
  } catch (error) {
    console.error('❌ QR login start error:', error.message);
    res.status(500).json({ error: 'Failed to start QR login' });
  }
});

app.post('/api/auth/qr/approve', async (req, res) => {
  try {
    const guard = requireSupabaseAdmin();
    if (!guard.ok) return res.status(500).json({ error: guard.message });

    const authHeader = req.headers.authorization || '';
    const accessToken = authHeader.replace('Bearer ', '').trim();
    const { challengeId } = req.body || {};

    if (!accessToken) return res.status(401).json({ error: 'Missing access token' });
    if (!challengeId) return res.status(400).json({ error: 'Missing challengeId' });

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('login_challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (challengeError || !challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    if (challenge.status !== 'pending') {
      return res.status(400).json({ error: 'Challenge already used' });
    }

    if (new Date(challenge.expires_at).getTime() < Date.now()) {
      await supabaseAdmin
        .from('login_challenges')
        .update({ status: 'expired' })
        .eq('id', challengeId);
      return res.status(400).json({ error: 'Challenge expired' });
    }

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userData.user.email,
      options: { redirectTo: WEB_AUTH_REDIRECT_URL },
    });

    if (linkError) throw linkError;

    const actionLink = linkData?.properties?.action_link;
    if (!actionLink) throw new Error('Missing action link');

    const { error: updateError } = await supabaseAdmin
      .from('login_challenges')
      .update({
        status: 'approved',
        user_id: userData.user.id,
        approved_at: new Date().toISOString(),
        action_link: actionLink,
      })
      .eq('id', challengeId);

    if (updateError) throw updateError;

    res.json({ success: true });
  } catch (error) {
    console.error('❌ QR login approve error:', error.message);
    res.status(500).json({ error: 'Failed to approve QR login' });
  }
});

app.get('/api/auth/qr/status/:challengeId', async (req, res) => {
  try {
    const guard = requireSupabaseAdmin();
    if (!guard.ok) return res.status(500).json({ error: guard.message });

    const { challengeId } = req.params;

    const { data: challenge, error } = await supabaseAdmin
      .from('login_challenges')
      .select('status, expires_at, action_link')
      .eq('id', challengeId)
      .single();

    if (error || !challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    const isExpired = new Date(challenge.expires_at).getTime() < Date.now();
    if (isExpired && challenge.status === 'pending') {
      await supabaseAdmin
        .from('login_challenges')
        .update({ status: 'expired' })
        .eq('id', challengeId);
      return res.json({ status: 'expired', expiresAt: challenge.expires_at });
    }

    res.json({
      status: challenge.status,
      expiresAt: challenge.expires_at,
      actionLink: challenge.action_link,
    });
  } catch (error) {
    console.error('❌ QR login status error:', error.message);
    res.status(500).json({ error: 'Failed to fetch QR login status' });
  }
});