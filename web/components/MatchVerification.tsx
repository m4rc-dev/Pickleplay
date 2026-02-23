import React, { useState, useEffect, useRef } from 'react';
import { QrCode, X, Camera, CheckCircle2, AlertCircle, RefreshCw, Star, Users, Zap, Smile, Shield, Award, MessageSquare } from 'lucide-react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { Match, MatchType } from '../types';
import { createMatch, verifyMatchParticipation, getMatchDetails, submitPlayerRating } from '../services/matches';

interface MatchVerificationProps {
    userId: string;
    onClose: () => void;
    onMatchCreated?: (match: Match) => void;
    onMatchVerified?: (matchId: string) => void;
}

type Mode = 'selection' | 'host' | 'join' | 'rating' | 'done';

interface RatingDimension {
    id: string;
    label: string;
    icon: React.ReactNode;
    color: string;
    desc: string;
}

const DIMENSIONS: RatingDimension[] = [
    { id: 'skill_level', label: 'Skill Level', icon: <Zap size={18} />, color: 'text-blue-500', desc: 'How well did they play?' },
    { id: 'sportsmanship', label: 'Sportsmanship', icon: <Smile size={18} />, color: 'text-rose-500', desc: 'Respectful & positive?' },
    { id: 'reliability', label: 'Reliability', icon: <Shield size={18} />, color: 'text-blue-500', desc: 'Showed up & stayed?' },
    { id: 'fair_play', label: 'Fair Play', icon: <Award size={18} />, color: 'text-emerald-500', desc: 'Called lines fairly?' },
];

const MatchVerification: React.FC<MatchVerificationProps> = ({ userId, onClose, onMatchCreated, onMatchVerified }) => {
    const [mode, setMode] = useState<Mode>('selection');
    const [matchType, setMatchType] = useState<MatchType>('Singles');
    const [isCreating, setIsCreating] = useState(false);
    const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [participants, setParticipants] = useState<any[]>([]);
    const [isVerifying, setIsVerifying] = useState(false);

    // Rating state (shown after scanning)
    const [verifiedMatchId, setVerifiedMatchId] = useState<string>('');
    const [opponentId, setOpponentId] = useState<string>('');
    const [opponentName, setOpponentName] = useState<string>('Opponent');
    const [ratings, setRatings] = useState({ skill_level: 0, sportsmanship: 0, reliability: 0, fair_play: 0 });
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [ratingError, setRatingError] = useState<string>('');

    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    // Poll for participants when hosting (host is waiting for others to scan)
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (mode === 'host' && currentMatch) {
            interval = setInterval(async () => {
                const { data } = await getMatchDetails(currentMatch.id);
                if (data?.players) {
                    setParticipants(data.players);
                    const target = matchType === 'Singles' ? 2 : 4;
                    if (data.players.length >= target) clearInterval(interval);
                }
            }, 3000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [mode, currentMatch, matchType]);

    // Cleanup scanner on unmount
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().catch(() => { });
            }
        };
    }, []);

    // ─── Handlers ───────────────────────────────────────────────────────────────

    const handleCreateMatch = async () => {
        setIsCreating(true);
        setError('');
        const { data, error: createError } = await createMatch(userId, matchType);
        if (createError) { setError(createError); setIsCreating(false); return; }
        if (!data) { setError('Could not create match. Try again.'); setIsCreating(false); return; }

        setCurrentMatch(data);
        onMatchCreated?.(data);

        // Build QR URL
        const url = `${window.location.origin}/#/match-verify?id=${data.id}&code=${data.verification_code}`;
        const qr = await QRCode.toDataURL(url, { width: 300, margin: 2 });
        setQrDataUrl(qr);
        setMode('host');
        setIsCreating(false);
    };

    const startScanner = async () => {
        setMode('join');
        setError('');

        setTimeout(async () => {
            const el = document.getElementById('match-qr-reader');
            if (!el) return;
            try {
                const html5QrCode = new Html5Qrcode('match-qr-reader');
                html5QrCodeRef.current = html5QrCode;

                await html5QrCode.start(
                    { facingMode: 'environment' },
                    {
                        fps: 10,
                        qrbox: (w: number, h: number) => {
                            const s = Math.floor(Math.min(w, h) * 0.7);
                            return { width: s, height: s };
                        },
                        aspectRatio: 1.0,
                    },
                    async (decodedText) => {
                        try {
                            let mId = '', code = '';
                            if (decodedText.startsWith('http') || decodedText.includes('match-verify')) {
                                const parsed = new URL(decodedText.replace('#/', '/'));
                                mId = parsed.searchParams.get('id') || '';
                                code = parsed.searchParams.get('code') || '';
                            } else {
                                const d = JSON.parse(decodedText);
                                mId = d.matchId; code = d.code;
                            }
                            if (!mId || !code) throw new Error('Invalid QR Data');

                            setIsVerifying(true);
                            await html5QrCode.stop();

                            const { success, error: verifyError } = await verifyMatchParticipation(userId, mId, code);
                            if (success) {
                                // Fetch match details to find opponent
                                const { data: matchData } = await getMatchDetails(mId);
                                const others = matchData?.players?.filter((p: any) => p.player_id !== userId) ?? [];
                                const opp = others[0];

                                setVerifiedMatchId(mId);
                                setOpponentId(opp?.player_id ?? '');
                                setOpponentName(opp?.profiles?.full_name ?? opp?.profiles?.username ?? 'Opponent');
                                onMatchVerified?.(mId);
                                setMode('rating');
                            } else {
                                setError(verifyError || 'Verification failed.');
                            }
                        } catch {
                            setError('Invalid Match QR Code');
                        } finally {
                            setIsVerifying(false);
                        }
                    },
                    () => { } // silent scan errors
                );
            } catch {
                setError('Could not access camera. Please check permissions.');
            }
        }, 100);
    };

    const handleRatingChange = (dim: string, val: number) =>
        setRatings(prev => ({ ...prev, [dim]: val }));

    const handleSubmitRating = async () => {
        if (Object.values(ratings).some(v => v === 0)) {
            setRatingError('Please rate all 4 dimensions before submitting.');
            return;
        }
        if (!opponentId) {
            setRatingError('Could not identify opponent. Please close and try again.');
            return;
        }
        setIsSubmitting(true);
        setRatingError('');

        const { success, error: submitError } = await submitPlayerRating({
            match_id: verifiedMatchId,
            rater_id: userId,
            ratee_id: opponentId,
            skill_level: ratings.skill_level,
            sportsmanship: ratings.sportsmanship,
            reliability: ratings.reliability,
            fair_play: ratings.fair_play,
            comment,
        });

        if (success) {
            setMode('done');
        } else {
            setRatingError(submitError || 'Failed to submit rating.');
            setIsSubmitting(false);
        }
    };

    // ─── Render ──────────────────────────────────────────────────────────────────

    const headerLabel: Record<Mode, string> = {
        selection: 'Log Your Match',
        host: 'Share QR with Opponents',
        join: 'Scan to Confirm',
        rating: 'Rate Your Opponent',
        done: 'All Done!',
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[40px] shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${mode === 'host' ? 'bg-lime-100 text-lime-600' :
                            mode === 'rating' ? 'bg-indigo-100 text-indigo-600' :
                                mode === 'done' ? 'bg-emerald-100 text-emerald-600' :
                                    'bg-blue-100 text-blue-600'
                            }`}>
                            {mode === 'rating' || mode === 'done' ? <Star size={24} fill="currentColor" /> : <QrCode size={24} />}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Match Verification</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{headerLabel[mode]}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">

                    {/* ── MODE: selection ── */}
                    {mode === 'selection' && (
                        <div className="space-y-4">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 text-center mb-6">
                                After your match, verify participation and rate your opponents.
                            </p>

                            {/* HOST */}
                            <button
                                onClick={handleCreateMatch}
                                disabled={isCreating}
                                className="w-full p-8 bg-lime-50 border-2 border-lime-100 rounded-[32px] text-left group hover:border-lime-400 transition-all"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-white text-lime-600 rounded-2xl shadow-sm group-hover:bg-lime-600 group-hover:text-white transition-all">
                                        {isCreating ? <RefreshCw size={24} className="animate-spin" /> : <QrCode size={24} />}
                                    </div>
                                    <div className="flex bg-white rounded-xl p-1 border border-lime-200">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setMatchType('Singles'); }}
                                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${matchType === 'Singles' ? 'bg-lime-600 text-white' : 'text-lime-600 hover:bg-lime-50'}`}
                                        >Singles</button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setMatchType('Doubles'); }}
                                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${matchType === 'Doubles' ? 'bg-lime-600 text-white' : 'text-lime-600 hover:bg-lime-50'}`}
                                        >Doubles</button>
                                    </div>
                                </div>
                                <h4 className="font-black text-lime-900 text-lg uppercase tracking-tight">I Hosted the Match</h4>
                                <p className="text-xs text-lime-700/70 font-bold uppercase tracking-widest mt-1">Generate a QR code for your opponents to scan</p>
                            </button>

                            <div className="relative my-2">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100" /></div>
                                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest bg-white px-4 text-slate-400">OR</div>
                            </div>

                            {/* JOIN */}
                            <button
                                onClick={startScanner}
                                className="w-full p-8 bg-blue-50 border-2 border-blue-100 rounded-[32px] text-left group hover:border-blue-400 transition-all"
                            >
                                <div className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all w-fit mb-4">
                                    <Camera size={24} />
                                </div>
                                <h4 className="font-black text-blue-900 text-lg uppercase tracking-tight">Scan Opponent's QR</h4>
                                <p className="text-xs text-blue-700/70 font-bold uppercase tracking-widest mt-1">Confirm your participation & rate your opponent</p>
                            </button>

                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                                    <AlertCircle size={20} /> {error}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── MODE: host (show QR) ── */}
                    {mode === 'host' && (
                        <div className="text-center space-y-6">
                            <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-inner inline-block mx-auto">
                                {qrDataUrl
                                    ? <img src={qrDataUrl} alt="Match QR" className="w-48 h-48" />
                                    : <div className="w-48 h-48 flex items-center justify-center bg-slate-50 animate-pulse"><QrCode className="text-slate-200" size={64} /></div>
                                }
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-slate-950 uppercase tracking-tight">Verification Code</h4>
                                <div className="text-4xl font-black text-indigo-600 tracking-[0.2em] my-4">{currentMatch?.verification_code}</div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                    Have your opponents scan this QR or enter the code.<br />
                                    Waiting for participants to confirm…
                                </p>
                            </div>
                            {/* Participation dots */}
                            <div className="flex gap-2 justify-center items-center">
                                <Users size={16} className="text-slate-300" />
                                {Array(matchType === 'Singles' ? 2 : 4).fill(0).map((_, i) => (
                                    <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < participants.length ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-200'}`} />
                                ))}
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{participants.length}/{matchType === 'Singles' ? 2 : 4}</span>
                            </div>
                            <button onClick={() => setMode('selection')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors">
                                Cancel
                            </button>
                        </div>
                    )}

                    {/* ── MODE: join (camera scanner) ── */}
                    {mode === 'join' && (
                        <div className="space-y-6">
                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                                    <AlertCircle size={20} /> {error}
                                </div>
                            )}
                            <div
                                id="match-qr-reader"
                                className="rounded-[32px] overflow-hidden border-2 border-slate-100 bg-black aspect-square relative [&_video]:!object-cover [&_video]:!h-full [&_video]:!w-full"
                            />
                            <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-3 text-blue-800 text-xs font-bold">
                                <Camera size={20} className="text-blue-500" />
                                Position the QR code within the frame to verify.
                            </div>
                            {isVerifying && (
                                <div className="text-center text-xs font-black text-indigo-600 uppercase tracking-widest animate-pulse">
                                    Verifying Participation…
                                </div>
                            )}
                            <button onClick={() => setMode('selection')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors text-center">
                                Back to Selection
                            </button>
                        </div>
                    )}

                    {/* ── MODE: rating ── */}
                    {mode === 'rating' && (
                        <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-1">
                            <div className="text-center">
                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                                    Participation confirmed! Rate your match with
                                </p>
                                <p className="text-lg font-black text-slate-900 uppercase tracking-tight">{opponentName}</p>
                            </div>

                            {ratingError && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                                    <AlertCircle size={20} /> {ratingError}
                                </div>
                            )}

                            <div className="grid gap-5">
                                {DIMENSIONS.map((dim) => (
                                    <div key={dim.id} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={dim.color}>{dim.icon}</span>
                                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{dim.label}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{dim.desc}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => handleRatingChange(dim.id, star)}
                                                    className={`flex-1 py-4 rounded-2xl border-2 transition-all flex items-center justify-center ${(ratings as any)[dim.id] >= star
                                                        ? `${dim.color.replace('text', 'bg').replace('-500', '-50')} ${dim.color.replace('text', 'border')} shadow-lg`
                                                        : 'border-slate-100 hover:border-slate-200'
                                                        }`}
                                                >
                                                    <Star
                                                        size={20}
                                                        fill={(ratings as any)[dim.id] >= star ? 'currentColor' : 'transparent'}
                                                        className={(ratings as any)[dim.id] >= star ? dim.color : 'text-slate-200'}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={18} className="text-indigo-600" />
                                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Additional Feedback</span>
                                </div>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Any other details about your experience…"
                                    className="w-full bg-slate-50 border-none rounded-3xl p-5 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all h-24 resize-none"
                                />
                            </div>

                            <button
                                onClick={handleSubmitRating}
                                disabled={isSubmitting}
                                className="w-full bg-slate-950 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? 'Submitting…' : 'Submit Verified Rating'}
                            </button>
                        </div>
                    )}

                    {/* ── MODE: done ── */}
                    {mode === 'done' && (
                        <div className="text-center py-8 space-y-6">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-50 animate-bounce">
                                <CheckCircle2 size={40} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Rating Submitted!</h4>
                                <p className="text-sm text-slate-500 font-medium mt-2">
                                    Thank you for helping keep the PicklePlay community trusted and fair.
                                </p>
                            </div>
                            <button onClick={onClose} className="w-full bg-slate-950 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-emerald-600 transition-all">
                                Done
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default MatchVerification;
