import React, { useState, useEffect, useRef } from 'react';
import { QrCode, X, Camera, CheckCircle2, AlertCircle, RefreshCw, Trophy, Users } from 'lucide-react';
import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';
import { Match, MatchType } from '../types';
import { createMatch, verifyMatchParticipation, getMatchDetails } from '../services/matches';
import { supabase } from '../services/supabase';

interface MatchVerificationProps {
    userId: string;
    onClose: () => void;
    onMatchCreated?: (match: Match) => void;
    onMatchVerified?: (matchId: string) => void;
}

const MatchVerification: React.FC<MatchVerificationProps> = ({ userId, onClose, onMatchCreated, onMatchVerified }) => {
    const [mode, setMode] = useState<'selection' | 'host' | 'join'>('selection');
    const [matchType, setMatchType] = useState<MatchType>('Singles');
    const [isCreating, setIsCreating] = useState(false);
    const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);

    // Poll for participants when hosting
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (mode === 'host' && currentMatch) {
            interval = setInterval(async () => {
                const { data, error: fetchError } = await getMatchDetails(currentMatch.id);
                if (data && data.players) {
                    setParticipants(data.players);
                    // If a new participant joined (Singles needs 2 total, Doubles 4)
                    const target = matchType === 'Singles' ? 2 : 4;
                    if (data.players.length >= target) {
                        setSuccess(true);
                        clearInterval(interval);
                    }
                }
            }, 3000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [mode, currentMatch, matchType]);

    // Scanner Refs
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    const handleCreateMatch = async () => {
        setIsCreating(true);
        setError('');
        const { data, error: createError } = await createMatch(userId, matchType);
        if (createError) {
            setError(createError);
            setIsCreating(false);
            return;
        }
        if (data) {
            setCurrentMatch(data);
            // Generate URL-based QR Code for native phone camera scanning
            // In production, window.location.origin will be 'https://www.pickleplay.ph'
            const baseUrl = window.location.origin;
            const qrUrl = `${baseUrl}/match-verify?id=${data.id}&code=${data.verification_code}`;
            const url = await QRCode.toDataURL(qrUrl);
            setQrDataUrl(url);
            setMode('host');
            onMatchCreated?.(data);
        }
        setIsCreating(false);
    };

    const startScanner = async () => {
        setMode('join');
        setError('');

        // Short delay to ensure the DOM element #match-qr-reader is rendered
        setTimeout(async () => {
            const qrReaderElement = document.getElementById('match-qr-reader');
            if (!qrReaderElement) return;

            try {
                const html5QrCode = new Html5Qrcode('match-qr-reader');
                html5QrCodeRef.current = html5QrCode;

                const config = {
                    fps: 10,
                    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
                        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
                        const qrboxSize = Math.floor(minEdge * 0.7);
                        return { width: qrboxSize, height: qrboxSize };
                    },
                    aspectRatio: 1.0
                };

                await html5QrCode.start(
                    { facingMode: 'environment' },
                    config,
                    async (decodedText) => {
                        try {
                            let mId = '';
                            let code = '';

                            if (decodedText.startsWith('http') || decodedText.includes('match-verify')) {
                                // Handle URL format: /match-verify?id=...&code=...
                                // We use URL object which handles both hash and path based query params
                                const url = new URL(decodedText.replace('#/', '/'));
                                mId = url.searchParams.get('id') || '';
                                code = url.searchParams.get('code') || '';
                            } else {
                                // Handle legacy JSON format (optional fallback)
                                const data = JSON.parse(decodedText);
                                mId = data.matchId;
                                code = data.code;
                            }

                            if (!mId || !code) throw new Error('Invalid QR Data');

                            setIsVerifying(true);
                            // Stop scanner
                            await html5QrCode.stop();

                            const { success: verifySuccess, error: verifyError } = await verifyMatchParticipation(userId, mId, code);

                            if (verifySuccess) {
                                setSuccess(true);
                                onMatchVerified?.(mId);
                            } else {
                                setError(verifyError || 'Failed to verify');
                            }
                        } catch (err) {
                            setError('Invalid Match QR Code');
                        } finally {
                            setIsVerifying(false);
                        }
                    },
                    (errorMessage) => {
                        // Silently handle scan errors (common during active scanning)
                    }
                );
            } catch (err: any) {
                console.error('Camera start error:', err);
                setError('Could not access camera. Please check permissions.');
            }
        }, 100);
    };

    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                html5QrCodeRef.current.stop().catch(e => console.error('Stop error:', e));
            }
        };
    }, []);

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-[40px] shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${mode === 'host' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                            <QrCode size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Match Verification</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{mode === 'selection' ? 'Choose Action' : mode === 'host' ? 'Ready for Opponent' : 'Scan to Join'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                            <AlertCircle size={20} />
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="text-center py-8 space-y-6">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-50 scale-110 animate-bounce">
                                <CheckCircle2 size={40} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Match Verified!</h4>
                                <p className="text-sm text-slate-500 font-medium mt-2">Participation confirmed. You can now start the match.</p>
                            </div>
                            <button onClick={onClose} className="w-full bg-slate-950 text-white py-5 rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-600 transition-all">
                                LET'S PLAY
                            </button>
                        </div>
                    ) : mode === 'selection' ? (
                        <div className="space-y-4">
                            <button
                                onClick={handleCreateMatch}
                                disabled={isCreating}
                                className="w-full p-8 bg-amber-50 border-2 border-amber-100 rounded-[32px] text-left group hover:border-amber-400 transition-all"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-3 bg-white text-amber-600 rounded-2xl shadow-sm group-hover:bg-amber-600 group-hover:text-white transition-all">
                                        <Trophy size={24} />
                                    </div>
                                    <div className="flex bg-white rounded-xl p-1 border border-amber-200">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setMatchType('Singles'); }}
                                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${matchType === 'Singles' ? 'bg-amber-600 text-white' : 'text-amber-600 hover:bg-amber-50'}`}
                                        >Singles</button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setMatchType('Doubles'); }}
                                            className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${matchType === 'Doubles' ? 'bg-amber-600 text-white' : 'text-amber-600 hover:bg-amber-50'}`}
                                        >Doubles</button>
                                    </div>
                                </div>
                                <h4 className="font-black text-amber-900 text-lg uppercase tracking-tight">Host a Match</h4>
                                <p className="text-xs text-amber-700/70 font-bold uppercase tracking-widest mt-1">Generate a QR code for your opponent to scan</p>
                                {isCreating && <RefreshCw size={16} className="animate-spin mt-4 text-amber-600" />}
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest bg-white px-4 text-slate-400">OR</div>
                            </div>

                            <button
                                onClick={startScanner}
                                className="w-full p-8 bg-blue-50 border-2 border-blue-100 rounded-[32px] text-left group hover:border-blue-400 transition-all"
                            >
                                <div className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-all w-fit mb-4">
                                    <Users size={24} />
                                </div>
                                <h4 className="font-black text-blue-900 text-lg uppercase tracking-tight">Join a Match</h4>
                                <p className="text-xs text-blue-700/70 font-bold uppercase tracking-widest mt-1">Scan your opponent's QR code to verify participation</p>
                            </button>
                        </div>
                    ) : mode === 'host' ? (
                        <div className="text-center space-y-6">
                            <div className="bg-white p-6 rounded-[32px] border-2 border-slate-100 shadow-inner inline-block mx-auto mb-4">
                                {qrDataUrl ? (
                                    <img src={qrDataUrl} alt="Match QR" className="w-48 h-48" />
                                ) : (
                                    <div className="w-48 h-48 flex items-center justify-center bg-slate-50 animate-pulse"><QrCode className="text-slate-200" size={64} /></div>
                                )}
                            </div>
                            <div>
                                <h4 className="text-xl font-black text-slate-950 uppercase tracking-tight">VERIFICATION CODE</h4>
                                <div className="text-4xl font-black text-indigo-600 tracking-[0.2em] my-4">{currentMatch?.verification_code}</div>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                                    Your opponent can scan this with their <span className="text-indigo-600">phone camera</span> or enter the code manually.<br />
                                    Waiting for players to join...
                                </p>
                            </div>
                            <div className="flex gap-2 justify-center">
                                {Array(matchType === 'Singles' ? 2 : 4).fill(0).map((_, i) => (
                                    <div key={i} className={`w-3 h-3 rounded-full ${i < participants.length ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-200'}`} />
                                ))}
                            </div>
                            <button onClick={() => setMode('selection')} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors">
                                Cancel Match
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div
                                id="match-qr-reader"
                                className="rounded-[32px] overflow-hidden border-2 border-slate-100 bg-black aspect-square relative [&_video]:!object-cover [&_video]:!h-full [&_video]:!w-full"
                            ></div>
                            <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-3 text-blue-800 text-xs font-bold">
                                <Camera size={20} className="text-blue-500" />
                                Position the QR code within the frame to verify.
                            </div>
                            {isVerifying && <div className="text-center text-xs font-black text-indigo-600 uppercase tracking-widest animate-pulse">Verifying Participation...</div>}
                            <button onClick={() => setMode('selection')} className="w-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors text-center">
                                Back to Selection
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MatchVerification;
