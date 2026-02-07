import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config(); // Loads from .env by default

const app = express();
const PORT = 5001; // Changed from 5000

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// News API config
const NEWS_API_URL = process.env.HOMESPH_NEWS_API_URL;
const NEWS_API_KEY = process.env.HOMESPH_NEWS_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
app.post('/api/send-email', async (req, res) => {
  try {
    const { email, subject, code } = req.body;

    console.log('📨 Received email request:', { email, code: '******' });

    // Validate inputs
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
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

// Start server
app.listen(PORT, () => {
  console.log(`📧 Email server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
});
