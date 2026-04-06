const DEFAULT_APP_URL = 'https://www.pickleplay.ph';
const DEFAULT_LOGO_URL = 'https://www.pickleplay.ph/images/PicklePlayLogo.jpg';
const DEFAULT_SUPPORT_EMAIL = 'phpickleplay@gmail.com';

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const formatBookingDate = (value) => {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return escapeHtml(value || '');
  return escapeHtml(parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }));
};

const formatCurrency = (amount) => {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) return 'FREE';
  return `PHP ${numericAmount.toFixed(2)}`;
};

const formatIssueDate = () => escapeHtml(new Date().toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'Asia/Manila',
}));

const formatTimeValue = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';

  const twelveHourMatch = normalized.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
  if (twelveHourMatch) {
    const [, hours, minutes, period] = twelveHourMatch;
    return `${Number(hours)}:${minutes} ${period.toUpperCase()}`;
  }

  const twentyFourHourMatch = normalized.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!twentyFourHourMatch) return escapeHtml(normalized);

  const hours = Number(twentyFourHourMatch[1]);
  const minutes = twentyFourHourMatch[2];
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${period}`;
};

const formatTimeRange = (startTime, endTime) => {
  const start = formatTimeValue(startTime);
  const end = formatTimeValue(endTime);
  if (!start && !end) return 'TBD';
  if (!start) return end;
  if (!end) return start;
  return `${start} - ${end}`;
};

const formatPaymentMethod = (value) => {
  const normalized = String(value || 'Online').trim().toLowerCase();
  if (!normalized) return 'Online';
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatReferenceId = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (!normalized) return 'N/A';
  return normalized.slice(0, 8);
};

const buildDetailRow = (label, value, { emphasize = false, monospace = false } = {}) => `
  <tr>
    <td style="padding: 12px 0; border-bottom: 1px solid #dbe5f6; color: #5b6b88; font-size: 13px; font-weight: 600; width: 42%;">
      ${escapeHtml(label)}
    </td>
    <td style="padding: 12px 0; border-bottom: 1px solid #dbe5f6; color: ${emphasize ? '#2156c9' : '#14213d'}; font-size: ${emphasize ? '15px' : '13px'}; font-weight: 800; text-align: right; ${monospace ? "font-family: 'Courier New', monospace; letter-spacing: 1px;" : ''}">
      ${escapeHtml(value)}
    </td>
  </tr>
`;

const buildSectionRow = (label, value, {
  pill = false,
  monospace = false,
  accent = false,
} = {}) => `
  <tr>
    <td style="padding: 9px 0; color: #64748b; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; width: 38%;">
      ${escapeHtml(label)}
    </td>
    <td style="padding: 9px 0; text-align: right;">
      <span style="display: inline-block; ${pill ? 'padding: 6px 10px; border-radius: 10px; border: 1px solid #dbeafe; background-color: #eff6ff;' : ''} color: ${accent ? '#2563eb' : '#0f172a'}; font-size: 12px; font-weight: 800; ${monospace ? "font-family: 'Courier New', monospace; letter-spacing: 1px;" : ''} text-transform: uppercase;">
        ${escapeHtml(value)}
      </span>
    </td>
  </tr>
`;

export const buildPaymentConfirmationEmailHtml = ({
  playerName,
  courtName,
  locationName,
  date,
  startTime,
  endTime,
  totalPrice,
  referenceId,
  paymentMethod,
  appUrl = DEFAULT_APP_URL,
  bookingsUrl = `${DEFAULT_APP_URL}/my-bookings`,
  logoUrl = DEFAULT_LOGO_URL,
  supportEmail = DEFAULT_SUPPORT_EMAIL,
}) => {
  const safePlayerName = escapeHtml(playerName || 'Player');
  const safeCourtName = escapeHtml(courtName || 'Pickleball Court');
  const safeTimeRange = escapeHtml(formatTimeRange(startTime, endTime));
  const safeReference = formatReferenceId(referenceId);
  const formattedDate = formatBookingDate(date);
  const formattedPaymentMethod = formatPaymentMethod(paymentMethod);
  const formattedTotal = formatCurrency(totalPrice);
  const issueDate = formatIssueDate();
  const safeBookingsUrl = escapeHtml(bookingsUrl);
  const safeLogoUrl = escapeHtml(logoUrl);
  const safeAppUrl = escapeHtml(appUrl);
  const safeSupportEmail = escapeHtml(supportEmail);

  return `
<div style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, Helvetica, sans-serif;">
  <div style="max-width: 760px; margin: 0 auto; padding: 28px 16px 40px;">
    <div style="border: 1px solid #e2e8f0; border-radius: 28px; overflow: hidden; background-color: #ffffff; box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);">
      <div style="padding: 28px 28px 24px; border-bottom: 2px dashed #e2e8f0;">
        <div style="display: inline-block; padding: 7px 14px; background-color: #0f172a; color: #ffffff; border-radius: 999px; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 14px;">
          Official Receipt
        </div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <img src="${safeLogoUrl}" alt="PicklePlay" style="display: block; width: 72px; height: 72px; border-radius: 36px; border: 2px solid #e2e8f0;" />
          <div>
            <h1 style="margin: 0; color: #0f172a; font-size: 30px; line-height: 1; font-weight: 900; text-transform: uppercase; letter-spacing: -1px;">
              PicklePlay
            </h1>
            <p style="margin: 6px 0 0; color: #94a3b8; font-size: 10px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase;">
              Philippines Network
            </p>
          </div>
        </div>
      </div>

      <div style="padding: 24px 28px 28px;">
        <div style="margin-bottom: 16px; padding: 12px 16px; border: 2px solid #bbf7d0; background-color: #f0fdf4; color: #16a34a; border-radius: 16px; text-align: center; font-size: 12px; font-weight: 900; letter-spacing: 1.6px; text-transform: uppercase;">
          Status: Completed
        </div>

        <p style="margin: 0 0 18px; color: #475569; font-size: 14px; line-height: 1.7;">
          Hi ${safePlayerName}, your payment has been verified and your booking is now confirmed. This email mirrors your official receipt in PicklePlay.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding: 0 12px 0 0;">
              <div style="padding: 0 0 14px; border-bottom: 1px solid #f1f5f9;">
                <p style="margin: 0 0 8px; color: #94a3b8; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
                  Receipt No.
                </p>
                <p style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 900; font-family: 'Courier New', monospace;">
                  #${safeReference}
                </p>
              </div>
            </td>
            <td style="width: 50%; vertical-align: top; padding: 0 0 0 12px; text-align: right;">
              <div style="padding: 0 0 14px; border-bottom: 1px solid #f1f5f9;">
                <p style="margin: 0 0 8px; color: #94a3b8; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
                  Issue Date
                </p>
                <p style="margin: 0; color: #0f172a; font-size: 13px; font-weight: 900; text-transform: uppercase;">
                  ${issueDate}
                </p>
              </div>
            </td>
          </tr>
        </table>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 18px; margin-bottom: 18px;">
          <p style="margin: 0 0 12px; color: #94a3b8; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
            Venue &amp; Schedule
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            ${buildSectionRow('Court', safeCourtName)}
            ${locationName ? buildSectionRow('Venue', locationName) : ''}
            ${buildSectionRow('Date', formattedDate)}
            ${buildSectionRow('Time Slot', safeTimeRange, { pill: true, accent: true })}
            ${buildSectionRow('Payment ID', safeReference, { pill: true, accent: true, monospace: true })}
          </table>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 18px; margin-bottom: 18px;">
          <p style="margin: 0 0 12px; color: #94a3b8; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
            Financials
          </p>
          <table style="width: 100%; border-collapse: collapse;">
            ${buildSectionRow('Player', safePlayerName)}
            ${buildSectionRow('Payment Method', formattedPaymentMethod)}
            <tr>
              <td style="padding: 14px 0 0; border-top: 2px solid #0f172a; width: 60%;">
                <p style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 900; letter-spacing: -0.4px; text-transform: uppercase;">
                  Total Amount
                </p>
                <span style="display: inline-block; margin-top: 8px; padding: 4px 8px; border-radius: 8px; background-color: #dcfce7; color: #16a34a; font-size: 9px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
                  Paid
                </span>
              </td>
              <td style="padding: 14px 0 0; border-top: 2px solid #0f172a; text-align: right;">
                <span style="color: #0f172a; font-size: 30px; font-weight: 900; letter-spacing: -1px;">
                  ${escapeHtml(formattedTotal)}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div style="border: 2px solid #0f172a; border-radius: 24px; background-color: #f8fafc; padding: 22px 20px; text-align: center; margin-bottom: 18px;">
          <p style="margin: 0 0 10px; color: #64748b; font-size: 10px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase;">
            Digital Check-in Pass
          </p>
          <p style="margin: 0 0 14px; color: #2563eb; font-size: 14px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
            Pass Activated
          </p>
          <p style="margin: 0 0 18px; color: #475569; font-size: 13px; line-height: 1.7;">
            Open My Bookings to view the same official receipt and your digital pass before arriving at the court.
          </p>
          <a href="${safeBookingsUrl}" target="_blank" rel="noreferrer" style="display: inline-block; text-decoration: none; background-color: #2563eb; color: #ffffff; padding: 14px 28px; border-radius: 999px; font-size: 13px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">
            View My Bookings
          </a>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px;">
          <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.7;">
            Need help? Contact us at <a href="mailto:${safeSupportEmail}" style="color: #2563eb; text-decoration: none; font-weight: 700;">${safeSupportEmail}</a>.
          </p>
        </div>
      </div>
    </div>

    <p style="margin: 18px 0 0; text-align: center; color: #94a3b8; font-size: 11px; letter-spacing: 1px;">
      &copy; 2026 PicklePlay Philippines · <a href="${safeAppUrl}" style="color: #64748b; text-decoration: none;">pickleplay.ph</a>
    </p>
  </div>
</div>
  `.trim();
};
