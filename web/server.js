import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import hpp from 'hpp';
import { Resend } from 'resend';
import dotenv from 'dotenv';
import crypto from 'crypto';
import net from 'node:net';
import tls from 'node:tls';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '../.env.local' }); // Try root as well

const app = express();
const PORT = 5001;
const CURRENT_FILE_PATH = fileURLToPath(import.meta.url);
const isDirectExecution = Boolean(process.argv[1]) && path.resolve(process.argv[1]) === CURRENT_FILE_PATH;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const WEB_AUTH_REDIRECT_URL = process.env.WEB_AUTH_REDIRECT_URL || process.env.VITE_APP_URL;
const MAILER = (process.env.MAIL_MAILER || process.env.AIL_MAILER || '').trim().toLowerCase();
const SMTP_HOST = process.env.MAIL_HOST?.trim();
const SMTP_PORT = Number(process.env.MAIL_PORT || 465);
const SMTP_USERNAME = process.env.MAIL_USERNAME?.trim();
const SMTP_PASSWORD = process.env.MAIL_PASSWORD;
const SMTP_ENCRYPTION = (process.env.MAIL_ENCRYPTION || '').trim().toLowerCase();
const SMTP_FROM_ADDRESS = (process.env.MAIL_FROM_ADDRESS || SMTP_USERNAME || '').trim();
const SMTP_FROM_NAME = (process.env.MAIL_FROM_NAME || 'PicklePlay').trim();
const SMTP_SECURE = SMTP_ENCRYPTION === 'ssl' || SMTP_ENCRYPTION === 'tls' || SMTP_PORT === 465;
const SMTP_ENABLED = Boolean(
  SMTP_HOST &&
  SMTP_PORT &&
  SMTP_USERNAME &&
  SMTP_PASSWORD &&
  SMTP_FROM_ADDRESS &&
  (MAILER ? MAILER === 'smtp' : true)
);

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
const hasDistinctServiceRoleKey =
  Boolean(SUPABASE_SERVICE_ROLE_KEY) &&
  (!SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY !== SUPABASE_ANON_KEY);

if (SUPABASE_URL && hasDistinctServiceRoleKey) {
  supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
} else if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY === SUPABASE_ANON_KEY) {
  console.warn('⚠️ SUPABASE_SERVICE_ROLE_KEY matches the anon key. Admin endpoints will fail RLS checks until you replace it with the real service_role key.');
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

if (SMTP_ENABLED) {
  console.log(`✅ SMTP mailer initialized (${SMTP_HOST}:${SMTP_PORT}, secure=${SMTP_SECURE})`);
} else {
  console.warn('⚠️ SMTP mailer is not fully configured. Set MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, and MAIL_FROM_ADDRESS.');
}

const hasEmailTransport = () => SMTP_ENABLED || Boolean(resend);

const formatEmailAddress = (address, name) => {
  if (!name) return address;
  const safeName = name.replace(/"/g, '\\"');
  return `"${safeName}" <${address}>`;
};

const encodeMimeWord = (value) => {
  if (!value) return '';
  return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
};

const chunkBase64 = (value) =>
  Buffer.from(value || '', 'utf8')
    .toString('base64')
    .match(/.{1,76}/g)
    ?.join('\r\n') || '';

const htmlToPlainText = (html) =>
  (html || '')
    .replace(/<(br|\/p|\/div|\/tr|\/h[1-6])\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\r/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const buildMimeMessage = ({ fromAddress, fromName, recipients, subject, html, text }) => {
  const boundary = `PicklePlayBoundary-${crypto.randomBytes(12).toString('hex')}`;
  const fromHeader = fromName ? `${encodeMimeWord(fromName)} <${fromAddress}>` : fromAddress;
  const toHeader = recipients.join(', ');
  const messageIdDomain = fromAddress.split('@')[1] || 'pickleplay.local';
  const plainText = text || htmlToPlainText(html);

  return [
    `From: ${fromHeader}`,
    `To: ${toHeader}`,
    `Subject: ${encodeMimeWord(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomBytes(12).toString('hex')}@${messageIdDomain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    chunkBase64(plainText),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    chunkBase64(html || ''),
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');
};

const createSmtpResponseQueue = (socket) => {
  let buffer = '';
  let currentLines = [];
  const queuedResponses = [];
  const pendingReaders = [];

  const flushResponse = (response) => {
    const nextReader = pendingReaders.shift();
    if (nextReader) {
      nextReader.resolve(response);
      return;
    }
    queuedResponses.push(response);
  };

  const rejectAll = (error) => {
    while (pendingReaders.length > 0) {
      pendingReaders.shift().reject(error);
    }
  };

  socket.on('data', (chunk) => {
    buffer += chunk.toString('utf8');

    while (buffer.includes('\n')) {
      const newlineIndex = buffer.indexOf('\n');
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, '');
      buffer = buffer.slice(newlineIndex + 1);
      currentLines.push(line);

      if (/^\d{3} /.test(line)) {
        flushResponse({
          code: Number(line.slice(0, 3)),
          lines: [...currentLines],
          text: currentLines.join('\n'),
        });
        currentLines = [];
      }
    }
  });

  socket.on('error', rejectAll);
  socket.on('close', () => rejectAll(new Error('SMTP connection closed before completing the response.')));
  socket.on('timeout', () => rejectAll(new Error('SMTP connection timed out.')));

  return {
    next() {
      if (queuedResponses.length > 0) {
        return Promise.resolve(queuedResponses.shift());
      }
      return new Promise((resolve, reject) => pendingReaders.push({ resolve, reject }));
    },
  };
};

const sendSmtpEmail = async ({ to, subject, html, text, fromAddress = SMTP_FROM_ADDRESS, fromName = SMTP_FROM_NAME }) => {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (recipients.length === 0) {
    throw new Error('At least one recipient email address is required.');
  }

  const socket = SMTP_SECURE
    ? tls.connect({
        host: SMTP_HOST,
        port: SMTP_PORT,
        servername: SMTP_HOST,
      })
    : net.createConnection({
        host: SMTP_HOST,
        port: SMTP_PORT,
      });

  socket.setTimeout(20000);
  const responses = createSmtpResponseQueue(socket);

  await new Promise((resolve, reject) => {
    const eventName = SMTP_SECURE ? 'secureConnect' : 'connect';
    socket.once(eventName, resolve);
    socket.once('error', reject);
  });

  const sendCommand = async (command, expectedCodes) => {
    socket.write(`${command}\r\n`);
    const response = await responses.next();
    if (!expectedCodes.includes(response.code)) {
      throw new Error(`SMTP ${command.split(' ')[0]} failed (${response.code}): ${response.text}`);
    }
    return response;
  };

  const greeting = await responses.next();
  if (greeting.code !== 220) {
    throw new Error(`SMTP greeting failed (${greeting.code}): ${greeting.text}`);
  }

  const heloHost = SMTP_FROM_ADDRESS.split('@')[1] || 'localhost';
  const ehloResponse = await sendCommand(`EHLO ${heloHost}`, [250]);
  const supportsLogin = /AUTH[^\n]*LOGIN/i.test(ehloResponse.text);
  const supportsPlain = /AUTH[^\n]*PLAIN/i.test(ehloResponse.text);

  if (supportsLogin) {
    await sendCommand('AUTH LOGIN', [334]);
    await sendCommand(Buffer.from(SMTP_USERNAME, 'utf8').toString('base64'), [334]);
    await sendCommand(Buffer.from(SMTP_PASSWORD, 'utf8').toString('base64'), [235]);
  } else if (supportsPlain) {
    const loginToken = Buffer.from(`\u0000${SMTP_USERNAME}\u0000${SMTP_PASSWORD}`, 'utf8').toString('base64');
    await sendCommand(`AUTH PLAIN ${loginToken}`, [235]);
  } else {
    throw new Error('SMTP server does not advertise a supported auth mechanism.');
  }

  await sendCommand(`MAIL FROM:<${fromAddress}>`, [250]);
  for (const recipient of recipients) {
    await sendCommand(`RCPT TO:<${recipient}>`, [250, 251]);
  }
  await sendCommand('DATA', [354]);

  const mimeMessage = buildMimeMessage({
    fromAddress,
    fromName,
    recipients,
    subject,
    html,
    text,
  });
  const dotStuffedMessage = mimeMessage
    .replace(/\r?\n/g, '\r\n')
    .split('\r\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');

  socket.write(`${dotStuffedMessage}\r\n.\r\n`);
  const dataResponse = await responses.next();
  if (dataResponse.code !== 250) {
    throw new Error(`SMTP DATA failed (${dataResponse.code}): ${dataResponse.text}`);
  }

  try {
    await sendCommand('QUIT', [221]);
  } finally {
    socket.end();
  }

  return {
    id: dataResponse.text,
    data: { id: dataResponse.text },
    error: null,
    transport: 'smtp',
  };
};

const sendAppEmail = async ({
  to,
  subject,
  html,
  text,
  fromAddress = SMTP_FROM_ADDRESS || process.env.RESEND_FROM_EMAIL || 'noreply@pickleplays.com',
  fromName = SMTP_FROM_NAME,
}) => {
  if (SMTP_ENABLED) {
    return sendSmtpEmail({ to, subject, html, text, fromAddress, fromName });
  }

  if (resend) {
    const result = await resend.emails.send({
      from: formatEmailAddress(fromAddress, fromName),
      to,
      subject,
      html,
      text: text || htmlToPlainText(html),
    });

    if (result?.error) {
      throw new Error(result.error.message || 'Failed to send email');
    }

    return {
      id: result.data?.id || null,
      data: result.data || { id: result.data?.id || null },
      error: null,
      transport: 'resend',
    };
  }

  throw new Error('Email service is not configured. Set SMTP mail settings or RESEND_API_KEY.');
};

// News API config
const NEWS_API_URL = process.env.HOMESPH_NEWS_API_URL;
const NEWS_API_KEY = process.env.HOMESPH_NEWS_API_KEY;

const getNewsApiHeaders = () => ({
  'X-Site-Api-Key': NEWS_API_KEY,
  'Accept': 'application/json',
});

async function fetchNewsArticlesPage(page = 1, category = '') {
  const params = new URLSearchParams({ page: String(page) });
  if (category) params.set('category', String(category));

  const response = await fetch(`${NEWS_API_URL}/api/external/articles?${params.toString()}`, {
    headers: getNewsApiHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error = new Error(`News API returned ${response.status}`);
    error.status = response.status;
    error.details = errorText;
    throw error;
  }

  return response.json();
}

function isMatchingNewsArticle(article, articleId) {
  if (!article) return false;
  return String(article.id || '') === String(articleId) || String(article.article_id || '') === String(articleId);
}

function normalizeNewsArticleSlug(value) {
  return String(value || 'article')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'article';
}

function isMatchingNewsArticleSlug(article, articleSlug) {
  if (!article) return false;
  return normalizeNewsArticleSlug(article.slug || article.title) === normalizeNewsArticleSlug(articleSlug);
}

async function findNewsArticleById(articleId) {
  const firstPage = await fetchNewsArticlesPage(1);
  const firstPageArticles = firstPage?.data?.data || [];
  const firstMatch = firstPageArticles.find(article => isMatchingNewsArticle(article, articleId));
  if (firstMatch) return firstMatch;

  const lastPage = Math.max(1, Number(firstPage?.data?.last_page) || 1);
  for (let page = 2; page <= lastPage; page += 1) {
    const pageData = await fetchNewsArticlesPage(page);
    const articles = pageData?.data?.data || [];
    const match = articles.find(article => isMatchingNewsArticle(article, articleId));
    if (match) return match;
  }

  return null;
}

async function findNewsArticleBySlug(articleSlug) {
  const firstPage = await fetchNewsArticlesPage(1);
  const firstPageArticles = firstPage?.data?.data || [];
  const firstMatch = firstPageArticles.find(article => isMatchingNewsArticleSlug(article, articleSlug));
  if (firstMatch) return firstMatch;

  const lastPage = Math.max(1, Number(firstPage?.data?.last_page) || 1);
  for (let page = 2; page <= lastPage; page += 1) {
    const pageData = await fetchNewsArticlesPage(page);
    const articles = pageData?.data?.data || [];
    const match = articles.find(article => isMatchingNewsArticleSlug(article, articleSlug));
    if (match) return match;
  }

  return null;
}

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

const managerInviteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many court manager requests. Please try again shortly.' },
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
// NOTE: Commented out because we are using BrowserRouter and this interferes with client-side routing.
/*
app.get('/auth/callback', (req, res) => {
  // Extract all query parameters
  const queryString = new URLSearchParams(req.query).toString();
  // Redirect to hash-based route with same parameters
  const redirectUrl = queryString ? `/#/auth/callback#${queryString}` : '/#/auth/callback';
  res.redirect(redirectUrl);
});
*/

// ─── News API Proxy ─────────────────────────────────────────────
// Proxies requests to HomesPh News API, injecting the secure API key
app.get('/api/v1/news/articles', async (req, res) => {
  try {
    if (!NEWS_API_URL || !NEWS_API_KEY) {
      return res.status(500).json({ error: 'News API not configured. Set HOMESPH_NEWS_API_URL and HOMESPH_NEWS_API_KEY in .env.local' });
    }

    const page = req.query.page || 1;
    const category = req.query.category || ''; // Optional category filter

    const data = await fetchNewsArticlesPage(page, category);
    console.log(`📰 News API: fetched page ${page}${category ? ` (category: ${category})` : ' (all categories)'} - ${data?.data?.total || 0} total articles`);
    res.json(data);
  } catch (error) {
    if (error.details) {
      console.error('❌ News API error:', error.status, error.details);
    }
    console.error('❌ News proxy error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch news articles' });
  }
});

// Proxy for single article detail
app.get('/api/v1/news/articles/slug/:slug', async (req, res) => {
  try {
    if (!NEWS_API_URL || !NEWS_API_KEY) {
      return res.status(500).json({ error: 'News API not configured.' });
    }

    const article = await findNewsArticleBySlug(req.params.slug);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({ data: article });
  } catch (error) {
    if (error.details) {
      console.error('❌ News article slug lookup upstream error:', error.status, error.details);
    }
    console.error('❌ News article slug lookup error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch article' });
  }
});

// Proxy for single article detail
app.get('/api/v1/news/articles/:id', async (req, res) => {
  try {
    if (!NEWS_API_URL || !NEWS_API_KEY) {
      return res.status(500).json({ error: 'News API not configured.' });
    }

    const article = await findNewsArticleById(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    res.json({ data: article });
  } catch (error) {
    if (error.details) {
      console.error('❌ News article detail upstream error:', error.status, error.details);
    }
    console.error('❌ News article detail error:', error.message);
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch article' });
  }
});

// Send email endpoint
app.post('/api/send-email', emailLimiter, async (req, res) => {
  try {
    const { email, subject, code } = req.body;

    // console.log('📨 Received email request:', { email, code: '******' });

    // Validate inputs
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    if (!hasEmailTransport()) {
      console.error('❌ Email attempt failed: no email transport is configured');
      return res.status(503).json({ error: 'Email service is currently unavailable' });
    }

    // Send email via the configured transport
    const result = await sendAppEmail({
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

    // console.log('✅ Email sent successfully:', result);

    res.json({ success: true, id: result.id });
  } catch (error) {
    console.error('❌ Email sending error:', error);
    res.status(500).json({ error: error.message || 'Failed to send email' });
  }
});

// Send payment receipt email endpoint
app.post('/api/send-receipt-email', emailLimiter, async (req, res) => {
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

    // console.log('📨 Received receipt email request for:', email);

    if (!email || !playerName || !courtName || !date || !referenceId) {
      return res.status(400).json({ error: 'Missing required booking parameters' });
    }

    if (!hasEmailTransport()) {
      console.error('❌ Receipt email failed: no email transport is configured');
      return res.status(503).json({ error: 'Email service is currently unavailable' });
    }

    const appUrl = 'https://www.pickleplay.ph';
    const logoUrl = 'https://www.pickleplay.ph/images/PicklePlayLogo.jpg';

    // Branded HTML (Same as Vercel function)
    const htmlContent = `
<div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; margin: 0; padding: 0; background-color: #f0fdf4;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #1d4ed8 100%); padding: 32px; text-align: center; border-radius: 0 0 24px 24px;">
      <img src="${logoUrl}" alt="PicklePlay" style="width: 72px; height: 72px; border-radius: 16px; margin-bottom: 12px; border: 3px solid rgba(255,255,255,0.3);" />
      <h1 style="margin: 0; font-size: 28px; font-weight: 900; letter-spacing: 2px; color: #ffffff; text-transform: uppercase;">
        PICKLE<span style="color: #a3e635;">PLAY</span>
      </h1>
      <p style="margin: 6px 0 0; font-size: 11px; color: rgba(255,255,255,0.6); letter-spacing: 3px; text-transform: uppercase; font-weight: 600;">Philippines</p>
    </div>

    <div style="background-color: #ffffff; padding: 36px 28px; margin: 0 12px;">
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

      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 28px; text-align: center;">
        <h3 style="margin: 0 0 8px; color: #0f172a; font-size: 16px; font-weight: 800;">Get Your Digital Pass</h3>
        <p style="margin: 0 0 16px; color: #64748b; font-size: 13px; line-height: 1.5;">
          You can download or print your official digital pass from your account. Present this pass at the venue.
        </p>
        <a href="${appUrl}/#/my-bookings" target="_blank" style="display: inline-block; text-decoration: none; color: #ffffff; background: #1e40af; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 700; border: 1px solid #1e3a8a;">
          View My Bookings
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; text-align: center; margin: 0 0 6px;">
        Need help? Contact us at
        <a href="mailto:phpickleplay@gmail.com" style="color: #2563eb; text-decoration: none; font-weight: 700;">phpickleplay@gmail.com</a>
      </p>
      <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin: 0;">
        Best regards, <strong style="color: #94a3b8;">The PicklePlay Philippines Team</strong>
      </p>
    </div>

    <div style="background: linear-gradient(135deg, #1e40af, #1d4ed8); padding: 18px 32px; text-align: center; border-radius: 24px 24px 0 0; margin: 0 12px;">
      <p style="margin: 0; font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 1px;">
        © 2026 PicklePlay Philippines · <a href="${appUrl}" style="color: rgba(255,255,255,0.5); text-decoration: none;">pickleplay.ph</a>
      </p>
    </div>
  </div>
</div>
    `.trim();

    const result = await sendAppEmail({
      to: email,
      subject: `Payment Verified – Booking Confirmed | PicklePlay`,
      html: htmlContent,
    });

    if (result.error) {
      console.error('❌ Resend API Error:', result.error);
      throw new Error(result.error.message || 'Failed to send receipt email');
    }

    // console.log('✅ Receipt email sent successfully to:', email, 'ID:', result.data?.id);
    res.json({ success: true, id: result.data?.id });
  } catch (error) {
    console.error('❌ Receipt email error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to send receipt email' });
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

    if (!hasEmailTransport()) {
      return res.status(503).json({ error: 'Email service is currently unavailable.' });
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

      // console.log(`🔄 Updated existing user ${guestEmail} (${userId}) with new temp password`);

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
            // console.log(`🔄 Found existing auth user, updated: ${guestEmail} (${userId})`);
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

        // console.log(`✅ Created new user: ${guestEmail} (${userId})`);
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

    // Send email via the configured transport
    const emailResult = await sendAppEmail({
      fromName: 'PicklePlay Philippines',
      fromAddress: SMTP_FROM_ADDRESS || 'noreply@pickleplays.com',
      to: guestEmail,
      subject: `🏸 Your PicklePlay Account & Booking Confirmation – ${courtName} | ${formattedDate}`,
      html: htmlContent,
    });

    if (emailResult.error) {
      throw new Error(emailResult.error.message || 'Failed to send email');
    }

    // console.log(`✅ Guest account created for ${guestEmail} (userId: ${userId}), email sent.`);

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

    // console.log(`✅ Guest password set successfully for ${email} (${profile.id})`);
    res.json({ success: true, userId: profile.id });

  } catch (error) {
    console.error('❌ Set guest password error:', error);
    res.status(500).json({ error: error.message || 'Failed to set password.' });
  }
});

const normalizeEmail = (email) => (email || '').trim().toLowerCase();

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const appendRole = (roles, role) => {
  const next = Array.isArray(roles) ? [...roles] : [];
  if (!next.includes(role)) next.push(role);
  if (!next.includes('PLAYER')) next.unshift('PLAYER');
  return [...new Set(next)];
};

const removeRole = (roles, role) => {
  const next = (Array.isArray(roles) ? roles : []).filter((item) => item !== role);
  return next.length > 0 ? next : ['PLAYER'];
};

const requireAuthenticatedUser = async (req, res) => {
  const guard = requireSupabaseAdmin();
  if (!guard.ok) {
    res.status(500).json({ error: guard.message });
    return null;
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.replace('Bearer ', '').trim();

  if (!accessToken) {
    res.status(401).json({ error: 'Missing access token' });
    return null;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
  if (error || !data?.user) {
    res.status(401).json({ error: 'Invalid access token' });
    return null;
  }

  return data.user;
};

const buildManagerInviteLink = (token) => {
  const baseUrl = (WEB_AUTH_REDIRECT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${baseUrl}/manager-invite?token=${encodeURIComponent(token)}`;
};

const buildManagerInviteHtml = ({ ownerName, managerName, courtName, inviteLink, expiresInHours }) => `
  <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f8fafc;padding:32px;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #e2e8f0;">
      <p style="margin:0 0 12px;font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#2563eb;">PicklePlay Court Manager Invite</p>
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.1;color:#0f172a;">You were invited to manage ${courtName}</h1>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.7;color:#475569;">${ownerName} assigned you as the court manager for <strong>${courtName}</strong>.</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#475569;">This invite is tied to <strong>${managerName}</strong>, expires in ${expiresInHours} hours, and can only be used once.</p>
      <a href="${inviteLink}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 24px;border-radius:14px;font-weight:800;">Accept Invite</a>
      <div style="margin-top:24px;padding:16px;border-radius:16px;background:#eff6ff;color:#1e3a8a;font-size:13px;line-height:1.7;">
        Use the exact invited email address. If you already have a PicklePlay account with that email, sign in to accept the invite. Owner approval is still required before manager access becomes active.
      </div>
    </div>
  </div>
`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const createCourtManagerInviteLinkRecord = async ({
  assignmentId,
  courtId,
  ownerId,
  inviteeEmail,
  ttlHours = 48,
}) => {
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();

  const { error: revokeError } = await supabaseAdmin
    .from('court_manager_invites')
    .update({ revoked_at: nowIso })
    .eq('assignment_id', assignmentId)
    .is('used_at', null)
    .is('revoked_at', null);

  if (revokeError) throw revokeError;

  const rawToken = crypto.randomBytes(32).toString('hex');
  const { error: inviteInsertError } = await supabaseAdmin
    .from('court_manager_invites')
    .insert({
      assignment_id: assignmentId,
      court_id: courtId,
      owner_id: ownerId,
      invitee_email: inviteeEmail,
      token_hash: hashToken(rawToken),
      expires_at: expiresAt,
    });

  if (inviteInsertError) throw inviteInsertError;

  return {
    inviteLink: buildManagerInviteLink(rawToken),
    expiresAt,
    inviteSentAt: nowIso,
  };
};

const getProfileById = async (userId) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, username, active_role, roles, account_status')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const getProfileByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, username, active_role, roles, account_status')
    .ilike('email', normalizedEmail)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const waitForProfileById = async (userId, attempts = 5, delayMs = 150) => {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const profile = await getProfileById(userId);
    if (profile) return profile;
    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return null;
};

const getAuthUserByEmail = async (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const existingProfile = await getProfileByEmail(normalizedEmail);
  if (existingProfile?.id) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(existingProfile.id);
    if (!error && data?.user) {
      return data.user;
    }
  }

  const perPage = 200;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data?.users || [];
    const matchedUser = users.find((user) => normalizeEmail(user.email) === normalizedEmail);
    if (matchedUser) return matchedUser;
    if (users.length < perPage) break;
  }

  return null;
};

const isFutureTimestamp = (value) => {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > Date.now();
};

const resolveCourtManagerInviteAccountState = async ({ email, assignment = null }) => {
  const authUser = await getAuthUserByEmail(email);
  if (!authUser) {
    return {
      authUser: null,
      profile: null,
      isIncompleteInviteAccount: false,
      isExistingAccount: false,
    };
  }

  let profile = null;
  try {
    profile = await getProfileById(authUser.id);
  } catch (error) {
    console.warn('Unable to load profile for court manager invite account state:', error.message);
  }

  const isIncompleteInviteAccount = Boolean(
    assignment &&
    assignment.status === 'pending_invite' &&
    !assignment.manager_user_id &&
    isFutureTimestamp(authUser.banned_until) &&
    (
      authUser.app_metadata?.court_manager_invite_only === true ||
      !profile ||
      !authUser.last_sign_in_at
    )
  );

  return {
    authUser,
    profile,
    isIncompleteInviteAccount,
    isExistingAccount: Boolean(authUser && !isIncompleteInviteAccount),
  };
};

const createHttpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

const getCourtManagerInviteRecord = async (token) => {
  const { data: invite, error } = await supabaseAdmin
    .from('court_manager_invites')
    .select(`
      id,
      assignment_id,
      invitee_email,
      expires_at,
      used_at,
      revoked_at,
      consumed_by,
      court_manager_assignments!inner (
        id,
        court_id,
        owner_id,
        manager_user_id,
        manager_name,
        manager_email,
        manager_contact_number,
        status,
        courts!inner (
          id,
          name
        )
      )
    `)
    .eq('token_hash', hashToken(token || ''))
    .maybeSingle();

  if (error) throw error;
  if (!invite) return null;

  const assignment = Array.isArray(invite.court_manager_assignments)
    ? invite.court_manager_assignments[0]
    : invite.court_manager_assignments;
  const court = Array.isArray(assignment?.courts) ? assignment.courts[0] : assignment?.courts;

  return {
    invite,
    assignment,
    court,
  };
};

const validateCourtManagerInvite = (inviteRecord, options = {}) => {
  const { allowPendingApprovalForUserId = null } = options;
  const { invite, assignment } = inviteRecord || {};

  if (!invite || !assignment) {
    throw createHttpError(404, 'Invite not found.');
  }

  if (invite.revoked_at) {
    throw createHttpError(410, 'Invite link is no longer valid.');
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    throw createHttpError(410, 'Invite link has expired.');
  }

  const alreadyAcceptedBySameUser = Boolean(
    allowPendingApprovalForUserId &&
    invite.used_at &&
    invite.consumed_by === allowPendingApprovalForUserId &&
    assignment.manager_user_id === allowPendingApprovalForUserId &&
    assignment.status === 'pending_approval'
  );

  if (invite.used_at && !alreadyAcceptedBySameUser) {
    throw createHttpError(410, 'Invite link is no longer valid.');
  }

  if (assignment.status === 'pending_invite' || alreadyAcceptedBySameUser) {
    return;
  }

  if (assignment.status === 'pending_approval') {
    throw createHttpError(409, 'This invite has already been accepted and is waiting for owner approval.');
  }

  throw createHttpError(410, 'Invite link is no longer available.');
};

const moveInviteToPendingApproval = async ({
  inviteId,
  assignment,
  court,
  managerUserId,
  managerName,
  managerEmail,
  managerContactNumber,
  notificationMessage,
}) => {
  const nowIso = new Date().toISOString();
  const { data: updatedAssignment, error: assignmentUpdateError } = await supabaseAdmin
    .from('court_manager_assignments')
    .update({
      manager_user_id: managerUserId,
      manager_name: managerName,
      manager_email: managerEmail,
      manager_contact_number: managerContactNumber,
      status: 'pending_approval',
      invite_accepted_at: nowIso,
      updated_at: nowIso,
    })
    .eq('id', assignment.id)
    .select()
    .single();

  if (assignmentUpdateError) throw assignmentUpdateError;

  const { error: inviteConsumeError } = await supabaseAdmin
    .from('court_manager_invites')
    .update({
      used_at: nowIso,
      consumed_by: managerUserId,
    })
    .eq('id', inviteId);

  if (inviteConsumeError) throw inviteConsumeError;

  try {
    await releasePendingCourtManagerAuthState(managerUserId);
  } catch (authStateError) {
    console.warn('Unable to release pending court manager auth state:', authStateError.message);
  }

  await insertNotification({
    user_id: assignment.owner_id,
    type: 'SYSTEM',
    title: 'Court manager awaiting approval',
    message: notificationMessage,
    related_user_id: managerUserId,
    action_url: `/locations?court=${encodeURIComponent(assignment.court_id)}&manager=1`,
    metadata: {
      kind: 'court_manager_pending_approval',
      assignmentId: updatedAssignment.id,
      courtId: assignment.court_id,
      courtName: court?.name || null,
      managerUserId,
      managerName,
      managerEmail,
    },
  });

  return updatedAssignment;
};

const insertNotification = async (notification) => {
  await supabaseAdmin
    .from('notifications')
    .insert({
      is_read: false,
      created_at: new Date().toISOString(),
      ...notification,
    });
};

const releasePendingCourtManagerAuthState = async (managerUserId) => {
  if (!managerUserId) return false;

  let updated = false;
  const { data: userRecord, error: userError } = await supabaseAdmin.auth.admin.getUserById(managerUserId);
  if (userError || !userRecord?.user) throw userError || new Error('Auth user not found');

  if (isFutureTimestamp(userRecord.user.banned_until)) {
    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(managerUserId, {
      ban_duration: 'none',
    });
    if (unbanError) throw unbanError;
    updated = true;
  }

  if (userRecord.user.app_metadata?.court_manager_invite_only) {
    try {
      await setCourtManagerInviteOnlyFlag(managerUserId, false);
      updated = true;
    } catch (metaError) {
      console.warn('Unable to clear court manager invite-only auth flag during pending approval:', metaError.message);
    }
  }

  return updated;
};

const setProfileAccountStatus = async (userId, accountStatus) => {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      account_status: accountStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.warn('Unable to update profile account status:', error.message);
  }
};

const setCourtManagerInviteOnlyFlag = async (managerUserId, enabled) => {
  const { data: userRecord, error: userError } = await supabaseAdmin.auth.admin.getUserById(managerUserId);
  if (userError || !userRecord?.user) throw userError || new Error('Auth user not found');

  const nextMeta = {
    ...(userRecord.user.app_metadata || {}),
  };

  if (enabled) {
    nextMeta.court_manager_invite_only = true;
  } else {
    delete nextMeta.court_manager_invite_only;
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(managerUserId, {
    app_metadata: nextMeta,
  });

  if (updateError) throw updateError;
};

const getActiveCourtManagerAssignment = async (managerUserId) => {
  const { data, error } = await supabaseAdmin
    .from('court_manager_assignments')
    .select('id, court_id, owner_id, manager_user_id, status')
    .eq('manager_user_id', managerUserId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data;
};

const updateManagerRoleState = async (managerUserId, activate) => {
  const profile = await getProfileById(managerUserId);
  if (!profile) throw new Error('Manager profile not found');

  const nextRoles = activate
    ? appendRole(profile.roles, 'COURT_MANAGER')
    : removeRole(profile.roles, 'COURT_MANAGER');
  const nextActiveRole = activate
    ? (profile.active_role || 'PLAYER')
    : (profile.active_role === 'COURT_MANAGER' ? 'PLAYER' : profile.active_role || 'PLAYER');

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .update({
      roles: nextRoles,
      active_role: nextActiveRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', managerUserId);

  if (profileError) throw profileError;

  const { data: userRecord, error: userError } = await supabaseAdmin.auth.admin.getUserById(managerUserId);
  if (userError || !userRecord?.user) throw userError || new Error('Auth user not found');

  const existingMeta = userRecord.user.app_metadata || {};
  const nextMetaRoles = activate
    ? appendRole(existingMeta.roles, 'COURT_MANAGER')
    : removeRole(existingMeta.roles, 'COURT_MANAGER');
  const nextMetaActiveRole = activate
    ? (existingMeta.active_role || profile.active_role || 'PLAYER')
    : (existingMeta.active_role === 'COURT_MANAGER' ? 'PLAYER' : existingMeta.active_role || profile.active_role || 'PLAYER');

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(managerUserId, {
    app_metadata: {
      ...existingMeta,
      roles: nextMetaRoles,
      active_role: nextMetaActiveRole,
    },
  });

  if (updateError) throw updateError;
};

app.post('/api/court-managers/invite', managerInviteLimiter, async (req, res) => {
  try {
    const ownerUser = await requireAuthenticatedUser(req, res);
    if (!ownerUser) return;

    const { courtId, fullName, email, contactNumber } = req.body || {};
    const managerEmail = normalizeEmail(email);

    if (!courtId || !fullName || !managerEmail || !contactNumber) {
      return res.status(400).json({ error: 'courtId, fullName, email, and contactNumber are required.' });
    }

    if (!hasEmailTransport()) {
      return res.status(503).json({ error: 'Email service is currently unavailable.' });
    }

    const ownerProfile = await getProfileById(ownerUser.id);
    if (!ownerProfile) {
      return res.status(403).json({ error: 'Owner profile not found.' });
    }

    const { data: court, error: courtError } = await supabaseAdmin
      .from('courts')
      .select('id, name, owner_id')
      .eq('id', courtId)
      .eq('owner_id', ownerUser.id)
      .maybeSingle();

    if (courtError) throw courtError;
    if (!court) return res.status(404).json({ error: 'Court not found or not owned by this user.' });

    const { data: existingByEmail, error: emailAssignmentError } = await supabaseAdmin
      .from('court_manager_assignments')
      .select('id, court_id')
      .ilike('manager_email', managerEmail)
      .in('status', ['pending_invite', 'pending_approval', 'active']);

    if (emailAssignmentError) throw emailAssignmentError;
    const conflictingEmailAssignment = (existingByEmail || []).find((item) => item.court_id !== courtId);
    if (conflictingEmailAssignment) {
      return res.status(409).json({ error: 'This manager email is already assigned to another court.' });
    }

    const { data: currentAssignment, error: assignmentLookupError } = await supabaseAdmin
      .from('court_manager_assignments')
      .select('*')
      .eq('court_id', courtId)
      .maybeSingle();

    if (assignmentLookupError) throw assignmentLookupError;

    if (currentAssignment?.status === 'pending_approval') {
      return res.status(409).json({ error: 'This manager has already registered and is waiting for approval.' });
    }

    if (currentAssignment?.status === 'active') {
      return res.status(409).json({ error: 'This court already has an active manager. Remove them before assigning a new one.' });
    }

    const assignmentPayload = {
      court_id: courtId,
      owner_id: ownerUser.id,
      manager_user_id: null,
      manager_name: fullName.trim(),
      manager_email: managerEmail,
      manager_contact_number: contactNumber.trim(),
      status: 'pending_invite',
      invite_sent_at: new Date().toISOString(),
      invite_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      invite_accepted_at: null,
      approved_at: null,
      approved_by: null,
      removed_at: null,
      removed_by: null,
      updated_at: new Date().toISOString(),
    };

    const { data: assignment, error: assignmentError } = currentAssignment
      ? await supabaseAdmin
          .from('court_manager_assignments')
          .update(assignmentPayload)
          .eq('id', currentAssignment.id)
          .select()
          .single()
      : await supabaseAdmin
          .from('court_manager_assignments')
          .insert(assignmentPayload)
          .select()
          .single();

    if (assignmentError) throw assignmentError;
    const { inviteLink, expiresAt, inviteSentAt } = await createCourtManagerInviteLinkRecord({
      assignmentId: assignment.id,
      courtId,
      ownerId: ownerUser.id,
      inviteeEmail: managerEmail,
      ttlHours: 48,
    });

    const { data: refreshedAssignment, error: refreshedAssignmentError } = await supabaseAdmin
      .from('court_manager_assignments')
      .update({
        invite_sent_at: inviteSentAt,
        invite_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment.id)
      .select()
      .single();

    if (refreshedAssignmentError) throw refreshedAssignmentError;

    const emailResult = await sendAppEmail({
      fromAddress: SMTP_FROM_ADDRESS || process.env.RESEND_FROM_EMAIL || 'noreply@pickleplays.com',
      fromName: SMTP_FROM_NAME || 'PicklePlay',
      to: managerEmail,
      subject: `PicklePlay court manager invite for ${court.name}`,
      html: buildManagerInviteHtml({
        ownerName: ownerProfile.full_name || ownerProfile.email || 'A court owner',
        managerName: fullName.trim(),
        courtName: court.name,
        inviteLink,
        expiresInHours: 48,
      }),
    });

    if (emailResult?.error) {
      throw new Error(emailResult.error.message || 'Failed to send invite email');
    }

    res.json({ success: true, assignment: refreshedAssignment, inviteLink, expiresAt });
  } catch (error) {
    console.error('Court manager invite error:', error);
    res.status(500).json({ error: error.message || 'Failed to send court manager invite.' });
  }
});

app.post('/api/court-managers/:assignmentId/copy-link', managerInviteLimiter, async (req, res) => {
  try {
    const ownerUser = await requireAuthenticatedUser(req, res);
    if (!ownerUser) return;

    const { data: assignment, error: assignmentError } = await supabaseAdmin
      .from('court_manager_assignments')
      .select('id, court_id, owner_id, manager_email, status')
      .eq('id', req.params.assignmentId)
      .eq('owner_id', ownerUser.id)
      .maybeSingle();

    if (assignmentError) throw assignmentError;
    if (!assignment) return res.status(404).json({ error: 'Manager assignment not found.' });
    if (assignment.status !== 'pending_invite') {
      return res.status(409).json({ error: 'Invite links can only be copied while the invitation is still waiting to be accepted.' });
    }

    const { inviteLink, expiresAt, inviteSentAt } = await createCourtManagerInviteLinkRecord({
      assignmentId: assignment.id,
      courtId: assignment.court_id,
      ownerId: assignment.owner_id,
      inviteeEmail: assignment.manager_email,
      ttlHours: 48,
    });

    const { data: updatedAssignment, error: updateError } = await supabaseAdmin
      .from('court_manager_assignments')
      .update({
        invite_sent_at: inviteSentAt,
        invite_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assignment.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json({ success: true, assignment: updatedAssignment, inviteLink, expiresAt });
  } catch (error) {
    console.error('Court manager copy invite link error:', error);
    res.status(500).json({ error: error.message || 'Failed to copy invite link.' });
  }
});

app.get('/api/court-managers/invite/:token', async (req, res) => {
  try {
    const guard = requireSupabaseAdmin();
    if (!guard.ok) return res.status(500).json({ error: guard.message });

    const inviteRecord = await getCourtManagerInviteRecord(req.params.token);
    if (!inviteRecord?.invite || !inviteRecord?.assignment) {
      throw createHttpError(404, 'Invite not found.');
    }

    if (inviteRecord.assignment.status === 'pending_invite') {
      validateCourtManagerInvite(inviteRecord);
    } else if (inviteRecord.assignment.status === 'removed') {
      throw createHttpError(410, 'Invite link is no longer valid.');
    }

    const { invite, assignment, court } = inviteRecord;
    const existingInviteProfile = assignment.manager_user_id
      ? await getProfileById(assignment.manager_user_id)
      : await getProfileByEmail(invite.invitee_email);

    res.json({
      assignmentId: assignment.id,
      courtId: assignment.court_id,
      courtName: court.name,
      managerEmail: invite.invitee_email,
      managerName: assignment.manager_name,
      expiresAt: invite.expires_at,
      status: assignment.status,
      existingAccount: Boolean(existingInviteProfile || assignment.manager_user_id),
    });
  } catch (error) {
    console.error('Court manager invite lookup error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to load invite.' });
  }
});

app.post('/api/court-managers/register', accountCreationLimiter, async (req, res) => {
  try {
    const guard = requireSupabaseAdmin();
    if (!guard.ok) return res.status(500).json({ error: guard.message });

    const { token, fullName, email, contactNumber, password } = req.body || {};
    const managerEmail = normalizeEmail(email);

    if (!token || !fullName || !managerEmail || !contactNumber || !password) {
      return res.status(400).json({ error: 'token, fullName, email, contactNumber, and password are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const inviteRecord = await getCourtManagerInviteRecord(token);
    validateCourtManagerInvite(inviteRecord);

    const { invite, assignment, court } = inviteRecord;

    if (normalizeEmail(assignment.manager_email) !== managerEmail) {
      return res.status(400).json({ error: 'Registration email must match the invited email address.' });
    }

    const accountState = await resolveCourtManagerInviteAccountState({
      email: managerEmail,
      assignment,
    });
    if (accountState.isExistingAccount) {
      return res.status(409).json({ error: 'This email already has a PicklePlay account. Sign in to accept your Court Manager invitation.' });
    }

    const usernameBase = (fullName || managerEmail.split('@')[0])
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 24) || 'manager';
    const username = `${usernameBase}_${Math.random().toString(36).slice(2, 7)}`;

    let managerUserId = accountState.authUser?.id || null;
    let existingProfile = accountState.profile;

    if (accountState.isIncompleteInviteAccount && managerUserId) {
      const { error: reuseUserError } = await supabaseAdmin.auth.admin.updateUserById(managerUserId, {
        password,
        email_confirm: true,
        ban_duration: 'none',
        user_metadata: {
          ...(accountState.authUser?.user_metadata || {}),
          full_name: fullName.trim(),
          contact_number: contactNumber.trim(),
        },
        app_metadata: {
          ...(accountState.authUser?.app_metadata || {}),
          roles: Array.isArray(accountState.authUser?.app_metadata?.roles) && accountState.authUser.app_metadata.roles.length > 0
            ? accountState.authUser.app_metadata.roles
            : ['PLAYER'],
          active_role: accountState.authUser?.app_metadata?.active_role || 'PLAYER',
          court_manager_invite_only: true,
        },
      });

      if (reuseUserError) throw reuseUserError;
      existingProfile = await waitForProfileById(managerUserId);
    } else {
      const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: managerEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName.trim(),
          contact_number: contactNumber.trim(),
        },
        app_metadata: {
          roles: ['PLAYER'],
          active_role: 'PLAYER',
          court_manager_invite_only: true,
        },
      });

      if (createUserError || !createdUser?.user) {
        const errorMessage = createUserError?.message || '';
        if (errorMessage.includes('already been registered') || createUserError?.status === 422) {
          return res.status(409).json({ error: 'This email already has a PicklePlay account. Sign in to accept your Court Manager invitation.' });
        }
        throw createUserError || new Error('Failed to create manager account.');
      }

      managerUserId = createdUser.user.id;
      existingProfile = await waitForProfileById(managerUserId);
    }

    if (!managerUserId) {
      throw new Error('Failed to resolve manager account.');
    }

    const profilePayload = {
      email: managerEmail,
      full_name: fullName.trim(),
      username: existingProfile?.username || username,
      active_role: existingProfile?.active_role || 'PLAYER',
      roles: existingProfile?.roles || ['PLAYER'],
      updated_at: new Date().toISOString(),
    };

    if (existingProfile) {
      const { error: profileUpdateError } = await supabaseAdmin
        .from('profiles')
        .update(profilePayload)
        .eq('id', managerUserId);

      if (profileUpdateError) {
        if ((profileUpdateError.message || '').toLowerCase().includes('permission denied for table users')) {
          console.warn('Court manager profile update skipped due to existing DB trigger permissions:', profileUpdateError.message);
        } else {
          throw profileUpdateError;
        }
      }
    } else {
      const { error: profileInsertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: managerUserId,
          ...profilePayload,
        });

      if (profileInsertError) {
        const profileAfterInsertError = await waitForProfileById(managerUserId, 2, 100);
        if (!profileAfterInsertError) {
          throw profileInsertError;
        }
      }
    }

    await setProfileAccountStatus(managerUserId, 'Pending Court Manager Approval');

    const updatedAssignment = await moveInviteToPendingApproval({
      inviteId: invite.id,
      assignment,
      court,
      managerUserId,
      managerName: fullName.trim(),
      managerEmail,
      managerContactNumber: contactNumber.trim(),
      notificationMessage: `${fullName.trim()} completed sign-in for ${court?.name || 'the assigned court'} and is now waiting for your approval.`,
    });

    await insertNotification({
      user_id: managerUserId,
      type: 'SYSTEM',
      title: 'Court manager invitation pending approval',
      message: `Your Court Manager invitation for ${court?.name || 'the assigned court'} has been accepted and is now waiting for Court Owner approval. You can keep using your normal PicklePlay account while you wait.`,
      action_url: '/dashboard',
      metadata: {
        kind: 'court_manager_waiting_approval',
        assignmentId: updatedAssignment.id,
        courtId: assignment.court_id,
        courtName: court?.name || null,
      },
    });

    res.json({ success: true, assignment: updatedAssignment });
  } catch (error) {
    console.error('Court manager registration error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to register court manager.' });
  }
});

app.post('/api/court-managers/invite/accept', managerInviteLimiter, async (req, res) => {
  try {
    const managerUser = await requireAuthenticatedUser(req, res);
    if (!managerUser) return;

    const { token } = req.body || {};
    if (!token) {
      return res.status(400).json({ error: 'token is required.' });
    }

    const managerEmail = normalizeEmail(managerUser.email);
    if (!managerEmail) {
      return res.status(400).json({ error: 'Your account must have a verified email address to accept this invite.' });
    }

    const inviteRecord = await getCourtManagerInviteRecord(token);
    validateCourtManagerInvite(inviteRecord, { allowPendingApprovalForUserId: managerUser.id });

    const { invite, assignment, court } = inviteRecord;
    if (invite.used_at && invite.consumed_by === managerUser.id && assignment.status === 'pending_approval') {
      return res.json({ success: true, assignment, alreadyAccepted: true });
    }

    if (normalizeEmail(invite.invitee_email) !== managerEmail) {
      return res.status(403).json({ error: 'Sign in with the invited email address to accept this court manager invitation.' });
    }

    const existingProfile = await waitForProfileById(managerUser.id, 3, 100);
    const resolvedManagerName =
      existingProfile?.full_name ||
      managerUser.user_metadata?.full_name ||
      managerUser.user_metadata?.name ||
      assignment.manager_name ||
      managerEmail.split('@')[0];

    const updatedAssignment = await moveInviteToPendingApproval({
      inviteId: invite.id,
      assignment,
      court,
      managerUserId: managerUser.id,
      managerName: resolvedManagerName,
      managerEmail,
      managerContactNumber: assignment.manager_contact_number || null,
      notificationMessage: `${resolvedManagerName} accepted the invite for ${court?.name || 'the assigned court'} and is now waiting for your approval.`,
    });

    await insertNotification({
      user_id: managerUser.id,
      type: 'SYSTEM',
      title: 'Court manager invite pending approval',
      message: `Your Court Manager invitation for ${court?.name || 'the assigned court'} has been accepted and is now waiting for Court Owner approval. Your normal PicklePlay account stays active while manager access is pending.`,
      action_url: '/dashboard',
      metadata: {
        kind: 'court_manager_waiting_approval',
        assignmentId: updatedAssignment.id,
        courtId: assignment.court_id,
        courtName: court?.name || null,
      },
    });

    res.json({ success: true, assignment: updatedAssignment });
  } catch (error) {
    console.error('Court manager invite acceptance error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Failed to accept court manager invite.' });
  }
});

app.get('/api/court-managers/login-state', authLimiter, async (req, res) => {
  try {
    const guard = requireSupabaseAdmin();
    if (!guard.ok) return res.status(500).json({ error: guard.message });

    const email = normalizeEmail(req.query.email);
    if (!email) {
      return res.status(400).json({ error: 'email is required.' });
    }

    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('court_manager_assignments')
      .select('id, status, manager_user_id, manager_email')
      .ilike('manager_email', email)
      .in('status', ['pending_invite', 'pending_approval', 'active'])
      .order('updated_at', { ascending: false });

    if (assignmentError) throw assignmentError;

    const assignment = (assignments || [])[0] || null;
    const accountState = await resolveCourtManagerInviteAccountState({ email, assignment });

    if (accountState.isIncompleteInviteAccount) {
      return res.json({ state: 'pending_invite_registration' });
    }

    if (assignment?.status === 'pending_approval') {
      let restoredLoginAccess = false;

      if (
        assignment.manager_user_id &&
        accountState.authUser &&
        accountState.authUser.id === assignment.manager_user_id &&
        (isFutureTimestamp(accountState.authUser.banned_until) || accountState.authUser.app_metadata?.court_manager_invite_only)
      ) {
        try {
          restoredLoginAccess = await releasePendingCourtManagerAuthState(assignment.manager_user_id);
        } catch (repairError) {
          console.warn('Unable to auto-repair pending court manager login state:', repairError.message);
        }
      }

      return res.json({ state: 'pending_owner_approval', restoredLoginAccess });
    }

    return res.json({ state: 'none' });
  } catch (error) {
    console.error('Court manager login state error:', error);
    res.status(500).json({ error: error.message || 'Failed to resolve court manager login state.' });
  }
});

app.post('/api/court-managers/:assignmentId/approve', managerInviteLimiter, async (req, res) => {
  try {
    const ownerUser = await requireAuthenticatedUser(req, res);
    if (!ownerUser) return;

    const { data: assignment, error } = await supabaseAdmin
      .from('court_manager_assignments')
      .select('*')
      .eq('id', req.params.assignmentId)
      .eq('owner_id', ownerUser.id)
      .maybeSingle();

    if (error) throw error;
    if (!assignment) return res.status(404).json({ error: 'Manager assignment not found.' });
    if (!assignment.manager_user_id) return res.status(400).json({ error: 'Manager has not registered yet.' });
    if (assignment.status !== 'pending_approval') {
      return res.status(409).json({ error: 'Only managers waiting for approval can be activated.' });
    }

    const nowIso = new Date().toISOString();
    const { data: updatedAssignment, error: updateError } = await supabaseAdmin
      .from('court_manager_assignments')
      .update({
        status: 'active',
        approved_at: nowIso,
        approved_by: ownerUser.id,
        updated_at: nowIso,
      })
      .eq('id', assignment.id)
      .select()
      .single();

    if (updateError) throw updateError;

    await updateManagerRoleState(assignment.manager_user_id, true);
    const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(assignment.manager_user_id, {
      ban_duration: 'none',
    });
    if (unbanError) throw unbanError;
    try {
      await setCourtManagerInviteOnlyFlag(assignment.manager_user_id, false);
    } catch (metaError) {
      console.warn('Unable to clear court manager invite-only auth flag during approval:', metaError.message);
    }
    await setProfileAccountStatus(assignment.manager_user_id, 'Active');

    await insertNotification({
      user_id: assignment.manager_user_id,
      type: 'SYSTEM',
      title: 'Court manager access approved',
      message: 'Your Court Manager access is now active. Switch to Court Manager mode from your dashboard to manage your assigned court.',
      action_url: '/dashboard',
      metadata: {
        kind: 'court_manager_access_approved',
        assignmentId: updatedAssignment.id,
        courtId: assignment.court_id,
      },
    });

    res.json({ success: true, assignment: updatedAssignment });
  } catch (error) {
    console.error('Court manager approval error:', error);
    res.status(500).json({ error: error.message || 'Failed to approve court manager.' });
  }
});

app.post('/api/court-managers/:assignmentId/remove', managerInviteLimiter, async (req, res) => {
  try {
    const ownerUser = await requireAuthenticatedUser(req, res);
    if (!ownerUser) return;

    const { data: assignment, error } = await supabaseAdmin
      .from('court_manager_assignments')
      .select('*')
      .eq('id', req.params.assignmentId)
      .eq('owner_id', ownerUser.id)
      .maybeSingle();

    if (error) throw error;
    if (!assignment) return res.status(404).json({ error: 'Manager assignment not found.' });
    if (assignment.status === 'removed') {
      return res.status(409).json({ error: 'Manager assignment has already been removed.' });
    }

    const nowIso = new Date().toISOString();
    const previousStatus = assignment.status;
    const managerUserId = assignment.manager_user_id;
    const { data: updatedAssignment, error: updateError } = await supabaseAdmin
      .from('court_manager_assignments')
      .update({
        status: 'removed',
        removed_at: nowIso,
        removed_by: ownerUser.id,
        invite_expires_at: null,
        updated_at: nowIso,
      })
      .eq('id', assignment.id)
      .select()
      .single();

    if (updateError) throw updateError;

    await supabaseAdmin
      .from('court_manager_invites')
      .update({ revoked_at: nowIso })
      .eq('assignment_id', assignment.id)
      .is('used_at', null)
      .is('revoked_at', null);

    if (managerUserId) {
      const { data: activeAssignments, error: activeAssignmentsError } = await supabaseAdmin
        .from('court_manager_assignments')
        .select('id')
        .eq('manager_user_id', managerUserId)
        .in('status', ['pending_approval', 'active']);

      if (activeAssignmentsError) throw activeAssignmentsError;
      if (!activeAssignments || activeAssignments.length === 0) {
        await updateManagerRoleState(managerUserId, false);
      }

      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(managerUserId, {
        ban_duration: 'none',
      });
      if (unbanError) {
        console.warn('Unable to reset court manager auth state during removal:', unbanError.message);
      }
      try {
        await setCourtManagerInviteOnlyFlag(managerUserId, false);
      } catch (metaError) {
        console.warn('Unable to clear court manager invite-only auth flag during removal:', metaError.message);
      }

      await setProfileAccountStatus(managerUserId, 'Active');

      await insertNotification({
        user_id: managerUserId,
        type: 'SYSTEM',
        title: 'Court manager access removed',
        message: previousStatus === 'pending_approval'
          ? 'Your court manager invitation was removed by the court owner before approval.'
          : 'Your court manager assignment has been removed by the court owner.',
        action_url: '/profile',
        metadata: {
          kind: 'court_manager_access_removed',
          assignmentId: updatedAssignment.id,
          courtId: assignment.court_id,
        },
      });
    }

    res.json({ success: true, assignment: updatedAssignment });
  } catch (error) {
    console.error('Court manager removal error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove court manager.' });
  }
});

app.post('/api/court-managers/bookings/:bookingId/action', managerInviteLimiter, async (req, res) => {
  try {
    const managerUser = await requireAuthenticatedUser(req, res);
    if (!managerUser) return;

    const assignment = await getActiveCourtManagerAssignment(managerUser.id);
    if (!assignment) {
      return res.status(403).json({ error: 'You do not have active court manager access.' });
    }

    const { action } = req.body || {};
    const allowedActions = new Set(['confirm', 'cancel', 'check_in', 'check_out', 'no_show']);
    if (!allowedActions.has(action)) {
      return res.status(400).json({ error: 'Unsupported booking action.' });
    }

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from('bookings')
      .select('id, court_id, status, payment_status, is_checked_in, checked_out_at, is_no_show')
      .eq('id', req.params.bookingId)
      .maybeSingle();

    if (bookingError) throw bookingError;
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.court_id !== assignment.court_id) {
      return res.status(403).json({ error: 'This booking is outside your assigned court.' });
    }

    const nowIso = new Date().toISOString();
    let updates = null;

    switch (action) {
      case 'confirm':
        if (booking.status !== 'pending') {
          return res.status(409).json({ error: 'Only pending bookings can be confirmed.' });
        }
        updates = { status: 'confirmed', updated_at: nowIso };
        break;
      case 'cancel':
        if (booking.status === 'cancelled' || booking.status === 'completed') {
          return res.status(409).json({ error: 'This booking can no longer be cancelled.' });
        }
        if (booking.payment_status === 'paid') {
          return res.status(403).json({ error: 'Court managers cannot cancel paid bookings or process refunds.' });
        }
        updates = { status: 'cancelled', updated_at: nowIso };
        break;
      case 'check_in':
        if (booking.payment_status !== 'paid') {
          return res.status(403).json({ error: 'Only paid bookings can be checked in by a court manager.' });
        }
        if (booking.status === 'cancelled' || booking.status === 'completed' || booking.is_checked_in) {
          return res.status(409).json({ error: 'This booking cannot be checked in.' });
        }
        updates = {
          status: 'confirmed',
          is_checked_in: true,
          checked_in_at: nowIso,
          updated_at: nowIso,
        };
        break;
      case 'check_out':
        if (!booking.is_checked_in || booking.checked_out_at || booking.status === 'completed') {
          return res.status(409).json({ error: 'This booking cannot be checked out.' });
        }
        updates = {
          status: 'completed',
          checked_out_at: nowIso,
          updated_at: nowIso,
        };
        break;
      case 'no_show':
        if (booking.is_checked_in || booking.status === 'completed') {
          return res.status(409).json({ error: 'Checked-in or completed bookings cannot be marked as no-show.' });
        }
        updates = {
          is_no_show: true,
          status: 'cancelled',
          updated_at: nowIso,
        };
        break;
      default:
        return res.status(400).json({ error: 'Unsupported booking action.' });
    }

    const { data: updatedBooking, error: updateError } = await supabaseAdmin
      .from('bookings')
      .update(updates)
      .eq('id', booking.id)
      .select('id, court_id, status, payment_status, is_checked_in, checked_in_at, checked_out_at, is_no_show, updated_at')
      .single();

    if (updateError) throw updateError;

    res.json({ success: true, booking: updatedBooking });
  } catch (error) {
    console.error('Court manager booking action error:', error);
    res.status(500).json({ error: error.message || 'Failed to update booking.' });
  }
});

// Start server
if (isDirectExecution) {
  app.listen(PORT, () => {
  console.log(`📧 Email server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  });
}

export default app;

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
