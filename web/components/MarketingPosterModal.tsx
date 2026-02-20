import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import {
    X, Download, Share2, Megaphone, MapPin, Calendar, Clock,
    Users, Star, Wifi, Copy, CheckCircle
} from 'lucide-react';

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
}

interface MarketingPosterModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: PosterData;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatDate = (d?: string) => {
    if (!d) return '';
    return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
};

const formatTime = (t?: string) => {
    if (!t) return '';
    const [hStr, mStr] = t.slice(0, 5).split(':');
    let h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${h}:${mStr} ${ampm}`;
};

// ─── Social Share Config ──────────────────────────────────────────────────────
const makeFbUrl = (url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
const makeMsgUrl = (url: string) => `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&app_id=966242223397117&redirect_uri=${encodeURIComponent(url)}`;
const makeDiscordMsg = (c: PosterData) =>
    `🏓 **${c.courtName}** — Come play pickleball!\n📍 ${[c.locationName, c.city].filter(Boolean).join(', ')}\n${c.date ? `📅 ${formatDate(c.date)}` : ''}${c.startTime ? ` • ${formatTime(c.startTime)}${c.endTime ? ' – ' + formatTime(c.endTime) : ''}` : ''}\n${c.joinLink ? `🔗 ${c.joinLink}` : ''}\n#PicklePlay #Pickleball`;

// ─── Poster Canvas ─────────────────────────────────────────────────────────
const Poster: React.FC<{ data: PosterData; qrDataUrl: string }> = ({ data, qrDataUrl }) => {
    const hasDate = !!data.date;
    const hasTime = !!data.startTime;

    return (
        <div
            style={{
                width: 540,
                minHeight: 720,
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
            <div style={{ padding: data.imageUrl ? '20px 32px 0' : '32px 32px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 2, marginTop: data.imageUrl ? -60 : 0 }}>
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
            <div style={{ margin: '16px 32px', height: 2, background: 'linear-gradient(to right, #f97316, rgba(249,115,22,0.1))', borderRadius: 2, position: 'relative', zIndex: 2 }} />

            {/* ── Court Name ── */}
            <div style={{ padding: '0 32px', position: 'relative', zIndex: 2 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#f97316', letterSpacing: 3, textTransform: 'uppercase', margin: 0, marginBottom: 6 }}>NOW BOOKING</p>
                <h1 style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.05, margin: 0, letterSpacing: '-1.5px', color: '#ffffff' }}>
                    {data.courtName}
                </h1>
            </div>

            {/* ── Location ── */}
            {(data.locationName || data.address || data.city) && (
                <div style={{ padding: '10px 32px 0', display: 'flex', alignItems: 'center', gap: 8, position: 'relative', zIndex: 2 }}>
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
                <div style={{ padding: '20px 32px 0', display: 'flex', gap: 12, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
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
            <div style={{ padding: '16px 32px 0', display: 'flex', gap: 10, flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
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
            <div style={{ flex: 1, minHeight: 20 }} />

            {/* ── Bottom section: QR + CTA ── */}
            <div style={{ margin: '20px 32px 32px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 20, border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 2 }}>
                {/* QR Code */}
                {qrDataUrl && (
                    <div style={{ background: '#ffffff', borderRadius: 14, padding: 8, flexShrink: 0, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                        <img src={qrDataUrl} alt="QR Code" style={{ width: 88, height: 88, display: 'block' }} />
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

// ─── Social Share Button ──────────────────────────────────────────────────────
const SocialBtn: React.FC<{ label: string; icon: React.ReactNode; color: string; onClick: () => void }> = ({ label, icon, color, onClick }) => (
    <button
        onClick={onClick}
        style={{ background: color, border: 'none', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12, color: '#fff', transition: 'opacity 0.15s', whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
        {icon}
        <span>{label}</span>
    </button>
);

// ─── Main Modal ───────────────────────────────────────────────────────────────
const MarketingPosterModal: React.FC<MarketingPosterModalProps> = ({ isOpen, onClose, data }) => {
    const posterRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [posterData, setPosterData] = useState<PosterData>(data);

    // Default join link
    const joinLink = posterData.joinLink || window.location.origin + '/booking';

    // Generate QR code when link changes
    useEffect(() => {
        if (!isOpen) return;
        QRCode.toDataURL(joinLink, { width: 200, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
            .then(url => setQrDataUrl(url))
            .catch(() => setQrDataUrl(''));
    }, [joinLink, isOpen]);

    // Sync data prop → local state
    useEffect(() => {
        if (isOpen) setPosterData(data);
    }, [isOpen, data]);

    if (!isOpen) return null;

    // ── Download PNG ──
    const handleDownload = async () => {
        if (!posterRef.current) return;
        setIsDownloading(true);
        try {
            const dataUrl = await toPng(posterRef.current, { pixelRatio: 2, cacheBust: true });
            const link = document.createElement('a');
            link.download = `${posterData.courtName.replace(/\s+/g, '-')}-poster.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Download failed:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    // ── Social Handlers ──
    const openUrl = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
    const handleFacebook = () => openUrl(makeFbUrl(joinLink));
    const handleMessenger = () => openUrl(makeMsgUrl(joinLink));
    const handleDiscord = async () => {
        try {
            await navigator.clipboard.writeText(makeDiscordMsg(posterData));
            alert('Discord message copied to clipboard! Paste it in your Discord channel.');
        } catch { openUrl('https://discord.com'); }
    };
    const handleInstagram = async () => {
        try {
            await navigator.clipboard.writeText(joinLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch { /* fallback */ }
    };

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className="bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col"
                style={{ maxWidth: 980, width: '100%', maxHeight: '95vh', overflow: 'auto' }}
            >
                {/* ── Modal Header ── */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/60 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-200">
                            <Megaphone size={16} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Marketing Poster</h2>
                            <p className="text-[10px] font-bold text-slate-400">Download or share this court promotion</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-slate-700">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex flex-col lg:flex-row gap-0 overflow-auto">
                    {/* ── Poster Preview ── */}
                    <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-900 to-slate-800 min-h-[500px]">
                        <div ref={posterRef} style={{ display: 'inline-block' }}>
                            <Poster data={posterData} qrDataUrl={qrDataUrl} />
                        </div>
                    </div>

                    {/* ── Side Panel ── */}
                    <div className="w-full lg:w-80 p-6 space-y-6 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 bg-white overflow-y-auto">
                        {/* Customize */}
                        <div className="space-y-4">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Customize Poster</p>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Court Name</label>
                                <input
                                    value={posterData.courtName}
                                    onChange={e => setPosterData(p => ({ ...p, courtName: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Skill Level</label>
                                <select
                                    value={posterData.skillLevel || ''}
                                    onChange={e => setPosterData(p => ({ ...p, skillLevel: e.target.value }))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                                >
                                    <option value="">All Levels</option>
                                    <option value="Beginner">Beginner (1.0–2.5)</option>
                                    <option value="Intermediate">Intermediate (3.0–3.5)</option>
                                    <option value="Advanced">Advanced (4.0+)</option>
                                    <option value="Pro">Pro (5.0+)</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</label>
                                    <input
                                        type="date"
                                        value={posterData.date || ''}
                                        onChange={e => setPosterData(p => ({ ...p, date: e.target.value }))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Slots</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={99}
                                        value={posterData.availableSlots ?? ''}
                                        onChange={e => setPosterData(p => ({ ...p, availableSlots: e.target.value === '' ? undefined : Number(e.target.value) }))}
                                        placeholder="e.g. 4"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Join / Booking Link</label>
                                <input
                                    value={posterData.joinLink || ''}
                                    onChange={e => setPosterData(p => ({ ...p, joinLink: e.target.value }))}
                                    placeholder="https://..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400 transition-all"
                                />
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100" />

                        {/* Download */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Export</p>
                            <button
                                onClick={handleDownload}
                                disabled={isDownloading}
                                className="w-full py-3.5 bg-slate-900 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all duration-200 shadow-xl shadow-slate-200 disabled:bg-slate-300 flex items-center justify-center gap-2.5 active:scale-95"
                            >
                                <Download size={16} />
                                {isDownloading ? 'Generating…' : 'Download PNG'}
                            </button>
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100" />

                        {/* Share */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Share To</p>
                            <div className="grid grid-cols-2 gap-2.5">
                                {/* Facebook */}
                                <SocialBtn
                                    label="Facebook"
                                    icon={<svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" /></svg>}
                                    color="#1877F2"
                                    onClick={handleFacebook}
                                />
                                {/* Messenger */}
                                <SocialBtn
                                    label="Messenger"
                                    icon={<svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.146 2 11.243c0 2.951 1.386 5.591 3.574 7.369V22l3.193-1.774A10.5 10.5 0 0012 20.486c5.523 0 10-4.146 10-9.243S17.523 2 12 2zm1.021 12.44l-2.55-2.72-4.979 2.72 5.479-5.817 2.612 2.72 4.917-2.72-5.479 5.817z" /></svg>}
                                    color="#0084FF"
                                    onClick={handleMessenger}
                                />
                                {/* Discord */}
                                <SocialBtn
                                    label="Discord"
                                    icon={<svg width="14" height="14" fill="white" viewBox="0 0 24 24"><path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 00-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 00-5.487 0 12.36 12.36 0 00-.617-1.23A.077.077 0 008.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 00-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 00.031.055 20.03 20.03 0 005.993 2.98.078.078 0 00.084-.026c.462-.62.874-1.275 1.226-1.963.021-.04.001-.088-.041-.104a13.201 13.201 0 01-1.872-.878.075.075 0 01-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 01.078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 01.079.009c.12.098.245.195.372.288a.075.075 0 01-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 00-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 00.084.028 19.963 19.963 0 006.002-2.981.076.076 0 00.032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 00-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z" /></svg>}
                                    color="#5865F2"
                                    onClick={handleDiscord}
                                />
                                {/* Instagram (copy link) */}
                                <SocialBtn
                                    label={copied ? 'Copied!' : 'Instagram'}
                                    icon={copied
                                        ? <CheckCircle size={14} />
                                        : <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>}
                                    color={copied ? '#16a34a' : 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)'}
                                    onClick={handleInstagram}
                                />
                            </div>
                            {copied && (
                                <p className="text-[10px] font-bold text-emerald-600 text-center animate-pulse">
                                    ✓ Link copied — paste it in your Instagram story or bio!
                                </p>
                            )}
                            <p className="text-[9px] text-slate-400 text-center font-medium leading-relaxed">
                                💡 For Instagram: copy the link and paste it in your story or bio
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MarketingPosterModal;
