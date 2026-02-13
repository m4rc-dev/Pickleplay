import { Resend } from 'resend';
import type { NextRequest } from 'next/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, subject, code } = await request.json();

    // Validate inputs
    if (!email || !code) {
      return Response.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    // Send email via Resend
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@pickleplays.com',
      to: email,
      subject: subject || 'Your PicklePlay 2FA Code',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 500px;
                margin: 0 auto;
                background-color: white;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              }
              .header {
                text-align: center;
                margin-bottom: 30px;
              }
              .logo {
                font-size: 24px;
                font-weight: bold;
                color: #3b82f6;
              }
              .title {
                font-size: 20px;
                font-weight: 600;
                color: #333;
                margin: 20px 0;
              }
              .code-box {
                background: #f0f9ff;
                border: 2px solid #3b82f6;
                padding: 20px;
                border-radius: 6px;
                text-align: center;
                margin: 20px 0;
              }
              .code {
                font-size: 32px;
                font-weight: bold;
                letter-spacing: 4px;
                color: #3b82f6;
                font-family: monospace;
              }
              .timer {
                color: #666;
                font-size: 14px;
                margin-top: 10px;
              }
              .warning {
                background: #fef3c7;
                border-left: 4px solid #f59e0b;
                padding: 15px;
                margin: 20px 0;
                border-radius: 4px;
                font-size: 14px;
              }
              .footer {
                text-align: center;
                color: #999;
                font-size: 12px;
                margin-top: 20px;
                border-top: 1px solid #eee;
                padding-top: 20px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo">🏐 PicklePlay</div>
              </div>
              <h2 class="title">Two-Factor Authentication</h2>
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

    if (!result || 'error' in result) throw new Error('Failed to send email');

    return Response.json({ success: true, id: (result as any).id });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return Response.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}
