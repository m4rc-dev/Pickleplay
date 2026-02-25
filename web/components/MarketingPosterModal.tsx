import React, { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { toPng } from 'html-to-image';
import QRCode from 'qrcode';
import {
    X, Megaphone, CheckCircle, Copy
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { Poster, PosterData } from './Poster';

interface MarketingPosterModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: PosterData;
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
const MarketingPosterModal: React.FC<MarketingPosterModalProps> = ({ isOpen, onClose, data }) => {
    const posterRef = useRef<HTMLDivElement>(null);
    const [qrDataUrl, setQrDataUrl] = useState('');
    const [copied, setCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [posterData, setPosterData] = useState<PosterData>(data);

    // The link embedded in the QR code (typically the booking/court page)
    const qrLink = posterData.joinLink || window.location.origin + '/booking';

    // The link shared to social media (the public poster page, with readable username)
    const shareLink = posterData.bookingId
        ? `${window.location.origin}/p/${posterData.sharerUsername || 'player'}/${posterData.bookingId}`
        : qrLink;

    // Generate QR code when link changes
    useEffect(() => {
        if (!isOpen) return;
        QRCode.toDataURL(qrLink, { width: 200, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
            .then(url => setQrDataUrl(url))
            .catch(() => setQrDataUrl(''));
    }, [qrLink, isOpen]);

    // Sync data prop → local state
    useEffect(() => {
        if (isOpen) setPosterData(data);
    }, [isOpen, data]);

    /** Persists the current poster customization to the database */
    const savePosterData = async () => {
        if (!posterData.bookingId) return;
        setIsSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const { error } = await supabase
                .from('marketing_posters')
                .upsert({
                    booking_id: posterData.bookingId,
                    profile_id: session.user.id,
                    court_name: posterData.courtName,
                    skill_level: posterData.skillLevel,
                    date: posterData.date,
                    available_slots: posterData.availableSlots,
                }, { onConflict: 'booking_id' });

            if (error) throw error;
            console.log('Poster data saved successfully');
        } catch (err) {
            console.error('Failed to save poster data:', err);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    // ── Copy Link ──
    const handleCopyLink = async () => {
        try {
            await savePosterData();
            await navigator.clipboard.writeText(shareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
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
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Share Marketing Poster</h2>
                            <p className="text-[10px] font-bold text-slate-400">Share this booking with your friends</p>
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
                    <div className="w-full lg:w-80 p-4 space-y-2 shrink-0 border-t lg:border-t-0 lg:border-l border-slate-100 bg-white overflow-y-auto">
                        {/* Customize */}
                        <div className="space-y-2">
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
                        </div>

                        {/* Divider */}
                        <div className="border-t border-slate-100" />

                        {/* Export & Share Links */}
                        <div className="space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Share Link</p>

                            <button
                                onClick={handleCopyLink}
                                disabled={isSaving}
                                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all duration-200 shadow-xl shadow-orange-100 flex items-center justify-center gap-2.5 active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : copied ? (
                                    <CheckCircle size={16} />
                                ) : (
                                    <Copy size={16} />
                                )}
                                {isSaving ? 'Saving...' : copied ? 'Copied Link!' : 'Copy Share Link'}
                            </button>

                            <p className="text-[9px] text-slate-400 text-center font-medium leading-relaxed">
                                Tip: The link points to a beautiful, standalone page with these details!
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
export type { PosterData };
