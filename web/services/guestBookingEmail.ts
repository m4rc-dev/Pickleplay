import emailjs from '@emailjs/browser';

// EmailJS Configuration for Guest Booking
const EMAILJS_SERVICE_ID = 'service_pa784ti';
const EMAILJS_TEMPLATE_ID = 'template_9ujgabr';
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '';

interface GuestBookingEmailData {
    guestEmail: string;
    guestName: string;
    referenceId: string;
    locationName: string;
    locationAddress: string;
    courtName: string;
    date: string;
    startTime: string;
    endTime: string;
    totalPrice: number;
}

export const sendGuestBookingEmail = async (data: GuestBookingEmailData): Promise<{ success: boolean; error?: string }> => {
    try {
        // Format date nicely
        const formattedDate = new Date(data.date + 'T00:00:00').toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Format time
        const formatTime = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const hr = h % 12 || 12;
            return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
        };

        // Calculate duration
        const [sh, sm] = data.startTime.split(':').map(Number);
        const [eh, em] = data.endTime.split(':').map(Number);
        const durationMin = (eh * 60 + em) - (sh * 60 + sm);
        const durationHrs = durationMin >= 60 ? `${Math.floor(durationMin / 60)}h${durationMin % 60 > 0 ? ` ${durationMin % 60}m` : ''}` : `${durationMin}m`;

        const signupUrl = `https://www.pickleplay.ph/signup?email=${encodeURIComponent(data.guestEmail)}&name=${encodeURIComponent(data.guestName)}&guest=true`;
        const logoUrl = 'https://www.pickleplay.ph/images/PicklePlayLogo.jpg';

        // Full email HTML — PicklePlay branded: Vivid Blue (#2563EB) + Yellow Green (#84CC16)
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
      <h2 style="margin: 0 0 6px; font-size: 22px; font-weight: 800; color: #0f172a; text-align: center;">
        Welcome, ${data.guestName}! 🎉
      </h2>
      <p style="margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.6; text-align: center;">
        A court has been booked for you at <strong style="color: #1e40af;">${data.locationName}</strong>. Here's your booking receipt:
      </p>

      <!-- Booking Receipt Card -->
      <div style="background-color: #f8fafc; border: 2px solid #e2e8f0; border-radius: 16px; padding: 24px; margin-bottom: 28px;">
        <div style="text-align: center; margin-bottom: 18px;">
          <span style="display: inline-block; background: linear-gradient(135deg, #84cc16, #65a30d); color: #ffffff; font-size: 10px; font-weight: 800; padding: 6px 18px; border-radius: 20px; letter-spacing: 2px; text-transform: uppercase;">Booking Receipt</span>
        </div>

        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Reference ID</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #1e40af; font-size: 13px; font-weight: 800; text-align: right; font-family: monospace; letter-spacing: 1px;">${data.referenceId.slice(0, 8).toUpperCase()}</td>
          </tr>
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Branch</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 800; text-align: right;">${data.locationName}</td>
          </tr>
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Address</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 700; text-align: right;">${data.locationAddress}</td>
          </tr>
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Court</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 800; text-align: right;">${data.courtName}</td>
          </tr>
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Date</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 800; text-align: right;">${formattedDate}</td>
          </tr>
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Time Slot</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 800; text-align: right;">${formatTime(data.startTime)} – ${formatTime(data.endTime)}</td>
          </tr>
          <tr>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 13px; font-weight: 600;">Duration</td>
            <td style="padding: 11px 0; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 13px; font-weight: 800; text-align: right;">${durationHrs}</td>
          </tr>
          <tr>
            <td style="padding: 14px 0 0; color: #0f172a; font-size: 15px; font-weight: 900;">TOTAL</td>
            <td style="padding: 14px 0 0; color: #84cc16; font-size: 22px; font-weight: 900; text-align: right;">${data.totalPrice > 0 ? `₱${data.totalPrice.toFixed(2)}` : 'FREE'}</td>
          </tr>
        </table>
      </div>

      <!-- Setup Account CTA -->
      <div style="background: linear-gradient(135deg, #1e40af, #1d4ed8); border-radius: 16px; padding: 28px 24px; text-align: center; margin-bottom: 28px;">
        <h3 style="color: #ffffff; font-size: 17px; font-weight: 800; margin: 0 0 8px;">Setup Your PicklePlay Account</h3>
        <p style="color: rgba(255,255,255,0.6); font-size: 13px; line-height: 1.5; margin: 0 0 20px;">
          Set your password for <strong style="color: #a3e635;">${data.guestEmail}</strong> and this booking will automatically appear in your <strong style="color: #ffffff;">My Bookings</strong> page.
        </p>
        <a href="${signupUrl}" target="_blank" style="display: inline-block; text-decoration: none; color: #1e40af; background: linear-gradient(135deg, #a3e635, #84cc16); padding: 14px 36px; border-radius: 12px; font-size: 14px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
          Setup Your Account
        </a>
        <p style="color: rgba(255,255,255,0.4); font-size: 11px; margin: 14px 0 0;">
          Find partners, book courts, track rankings &amp; more!
        </p>
      </div>

      <!-- Footer note -->
      <p style="color: #94a3b8; font-size: 12px; line-height: 1.6; text-align: center; margin: 0 0 6px;">
        Questions? Contact us at
        <a href="mailto:phpickleplay@gmail.com" style="color: #2563eb; text-decoration: none; font-weight: 700;">phpickleplay@gmail.com</a>
      </p>
      <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin: 0;">
        Best regards, <strong style="color: #94a3b8;">The PicklePlay Philippines Team</strong>
      </p>
    </div>

    <!-- Bottom Bar -->
    <div style="background: linear-gradient(135deg, #1e40af, #1d4ed8); padding: 18px 32px; text-align: center; border-radius: 24px 24px 0 0; margin: 0 12px;">
      <p style="margin: 0; font-size: 10px; color: rgba(255,255,255,0.5); letter-spacing: 1px;">
        © 2026 PicklePlay Philippines · <a href="https://www.pickleplay.ph" style="color: rgba(255,255,255,0.5); text-decoration: none;">pickleplay.ph</a>
      </p>
    </div>

  </div>
</div>
        `.trim();

        const result = await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
                email: data.guestEmail,
                name: data.guestName,
                message_html: htmlContent,
                message: htmlContent,
                subject: `🏸 Booking Confirmed – ${data.courtName} | ${formattedDate} | PicklePlay`,
                from_name: 'PicklePlay Philippines',
                reply_to: 'phpickleplay@gmail.com',
            },
            EMAILJS_PUBLIC_KEY
        );

        if (result.status !== 200) {
            throw new Error('Failed to send email');
        }

        return { success: true };
    } catch (err: any) {
        console.error('Guest booking email error:', err);
        return { success: false, error: err?.message || 'Failed to send email' };
    }
};
