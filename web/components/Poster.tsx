import React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface PosterData {
    courtName: string;
    locationName?: string;
    address?: string;
    city?: string;
    date?: string;         // YYYY-MM-DD
    startTime?: string;    // HH:MM
    endTime?: string;      // HH:MM
    skillLevel?: string;   // e.g. "Beginner", "Intermediate", "All Levels"
    availableSlots?: number;
    courtType?: 'Indoor' | 'Outdoor' | 'Both';
    imageUrl?: string;
    joinLink?: string;     // URL to the booking/court page
    amenities?: string[];
    bookingId?: string;
    sharerUsername?: string; // username slug used in the public share URL
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export const formatDate = (d?: string) => {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
};

export const formatTime = (t?: string) => {
    if (!t) return '';
    const [hStr, mStr] = t.slice(0, 5).split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${mStr} ${ampm}`;
};

// ─── Poster Canvas ─────────────────────────────────────────────────────────
export const Poster: React.FC<{ data: PosterData; qrDataUrl: string }> = ({ data, qrDataUrl }) => {
    const hasDate = !!data.date;
    const hasTime = !!data.startTime;

    return (
        <div
            style={{
                width: 540,
                minHeight: 560,
                background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 50%, #0c1a35 100%)',
                borderRadius: 24,
                position: 'relative',
                overflow: 'hidden',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* ── Background accent blobs ── */}
            <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,146,60,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: -60, width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

            {/* ── Hero image (if available) ── */}
            {data.imageUrl && (
                <div style={{ width: '100%', height: 220, position: 'relative', overflow: 'hidden' }}>
                    <img
                        src={data.imageUrl}
                        alt="Court"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
                        crossOrigin="anonymous"
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, #0f172a 100%)' }} />
                </div>
            )}

            {/* ── Header: Brand ── */}
            <div style={{ padding: data.imageUrl ? '12px 32px 0' : '20px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2, marginTop: data.imageUrl ? -60 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(249,115,22,0.4)' }}>
                        <span style={{ fontSize: 18 }}>🏓</span>
                    </div>
                    <span style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.5px', color: '#ffffff' }}>
                        Pickle<span style={{ color: '#f97316' }}>Play</span>
                    </span>
                </div>
                {data.courtType && (
                    <span style={{ background: data.courtType === 'Indoor' ? 'rgba(99,102,241,0.25)' : 'rgba(34,197,94,0.2)', border: `1px solid ${data.courtType === 'Indoor' ? 'rgba(99,102,241,0.5)' : 'rgba(34,197,94,0.4)'}`, color: data.courtType === 'Indoor' ? '#a5b4fc' : '#86efac', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                        {data.courtType}
                    </span>
                )}
            </div>

            {/* ── Divider bar ── */}
            <div style={{ margin: '8px 32px', height: 2, background: 'linear-gradient(to right, #f97316, rgba(249,115,22,0.1))', borderRadius: 2, position: 'relative', zIndex: 2 }} />

            {/* ── Court Name ── */}
            <div style={{ padding: '0 32px', position: 'relative', zIndex: 2 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: 3, textTransform: 'uppercase', margin: 0, marginBottom: 6 }}>NOW BOOKING</p>
                <h1 style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.05, margin: 0, letterSpacing: '-1.5px', color: '#ffffff' }}>
                    {data.courtName}
                </h1>
            </div>

            {/* ── Location ── */}
            {(data.locationName || data.address || data.city) && (
                <div style={{ padding: '6px 32px 0', display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 2 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(249,115,22,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></svg>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
                        {[data.locationName, data.address, data.city].filter(Boolean).join(' • ')}
                    </span>
                </div>
            )}

            {/* ── Date & Time ── */}
            {(hasDate || hasTime) && (
                <div style={{ padding: '12px 32px 0', display: 'flex', gap: 12, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
                    {hasDate && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '8px 14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{formatDate(data.date)}</span>
                        </div>
                    )}
                    {hasTime && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '8px 14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0' }}>{formatTime(data.startTime)}{data.endTime ? ` – ${formatTime(data.endTime)}` : ''}</span>
                        </div>
                    )}
                </div>
            )}

            {/* ── Badges: Slots + Skill Level ── */}
            <div style={{ padding: '10px 32px 0', display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
                {data.availableSlots !== undefined && data.availableSlots > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(34,197,94,0.15)', borderRadius: 20, padding: '6px 14px', border: '1px solid rgba(34,197,94,0.35)' }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#4ade80" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#4ade80', letterSpacing: 0.5 }}>{data.availableSlots} Slot{data.availableSlots !== 1 ? 's' : ''} Available</span>
                    </div>
                )}
                {data.availableSlots === 0 && (
                    <div style={{ background: 'rgba(239,68,68,0.15)', borderRadius: 20, padding: '6px 14px', border: '1px solid rgba(239,68,68,0.35)' }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#f87171', letterSpacing: 0.5 }}>Fully Booked</span>
                    </div>
                )}
                {data.skillLevel && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(249,115,22,0.15)', borderRadius: 20, padding: '6px 14px', border: '1px solid rgba(249,115,22,0.35)' }}>
                        <svg width="12" height="12" fill="#fb923c" viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2" /></svg>
                        <span style={{ fontSize: 11, fontWeight: 800, color: '#fb923c', letterSpacing: 0.5 }}>{data.skillLevel}</span>
                    </div>
                )}
            </div>

            {/* ── Amenities (if any) ── */}
            {data.amenities && data.amenities.length > 0 && (
                <div style={{ padding: '14px 32px 0', display: 'flex', gap: 8, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
                    {data.amenities.slice(0, 4).map((a, i) => (
                        <span key={i} style={{ fontSize: 10, fontWeight: 600, color: '#64748b', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '3px 10px', border: '1px solid rgba(255,255,255,0.08)', letterSpacing: 0.5 }}>{a}</span>
                    ))}
                </div>
            )}

            {/* ── Spacer ── */}
            <div style={{ flex: 1, minHeight: 0 }} />

            {/* ── Bottom section: QR + CTA ── */}
            <div style={{ margin: '10px 32px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 12, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 2 }}>
                {/* QR Code */}
                {qrDataUrl && (
                    <div style={{ background: '#ffffff', borderRadius: 12, padding: 6, flexShrink: 0, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                        <img src={qrDataUrl} alt="QR Code" style={{ width: 80, height: 80, display: 'block' }} />
                    </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: 2, textTransform: 'uppercase', margin: 0, marginBottom: 4 }}>Scan to Book</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', margin: 0, marginBottom: 8, lineHeight: 1.4 }}>
                        Join the game on PicklePlay — the #1 pickleball platform in the Philippines!
                    </p>
                    {data.joinLink && (
                        <p style={{ fontSize: 10, fontWeight: 600, color: '#475569', margin: 0, wordBreak: 'break-all', letterSpacing: 0.3 }}>
                            {data.joinLink.length > 50 ? data.joinLink.slice(0, 50) + '…' : data.joinLink}
                        </p>
                    )}
                </div>
            </div>

            {/* ── Footer ── */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1, textTransform: 'uppercase' }}>
                    🏓 PicklePlay Philippines
                </span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', letterSpacing: 1 }}>
                    pickleplay.ph
                </span>
            </div>
        </div>
    );
};
