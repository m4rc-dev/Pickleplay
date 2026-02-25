import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Poster, PosterData } from './Poster';
import { Loader2, Calendar, UserPlus, Ticket } from 'lucide-react';
import useSEO from '../hooks/useSEO';
import QRCode from 'qrcode';

const PosterPage: React.FC = () => {
    const { username, bookingId } = useParams<{ username: string; bookingId: string }>();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState<any>(null);
    const [posterOverrides, setPosterOverrides] = useState<any>(null);
    const [sharerName, setSharerName] = useState<string>('');
    const [qrDataUrl, setQrDataUrl] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!bookingId) return;
            try {
                // 1. Fetch the primary booking data
                const { data: bookingData, error: bookingError } = await supabase
                    .from('bookings')
                    .select(`
                        *,
                        profile:profiles(full_name, username, avatar_url),
                        court:courts(
                            id,
                            name,
                            court_type,
                            amenities,
                            image_url,
                            location:locations(name, city, address)
                        )
                    `)
                    .eq('id', bookingId)
                    .single();

                if (bookingError) throw bookingError;
                setBooking(bookingData);
                setSharerName(bookingData.profile?.full_name || username || 'A Player');

                // 2. Fetch any persistent poster overrides (customizations)
                const { data: overrides } = await supabase
                    .from('marketing_posters')
                    .select('*')
                    .eq('booking_id', bookingId)
                    .maybeSingle();

                if (overrides) {
                    setPosterOverrides(overrides);
                }

                // Generate QR code for the booking
                const joinLink = `${window.location.origin}/court/${bookingData.court?.id}`;
                const qr = await QRCode.toDataURL(joinLink, { width: 200, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } });
                setQrDataUrl(qr);
            } catch (err) {
                console.error('Error fetching data for poster:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [bookingId, username]);

    const posterData: PosterData | null = booking ? {
        courtName: posterOverrides?.court_name || booking.court?.name || 'Pickleball Court',
        locationName: booking.court?.location?.name || '',
        address: booking.court?.location?.address || '',
        city: booking.court?.location?.city || '',
        date: posterOverrides?.date || booking.date,
        startTime: booking.start_time,
        endTime: booking.end_time,
        courtType: booking.court?.court_type,
        imageUrl: booking.court?.image_url,
        availableSlots: posterOverrides?.available_slots !== undefined ? posterOverrides.available_slots : undefined,
        skillLevel: posterOverrides?.skill_level || undefined,
        amenities: Array.isArray(booking.court?.amenities) ? booking.court.amenities : [],
        joinLink: `${window.location.origin}/court/${booking.court?.id}`,
    } : null;

    useSEO({
        title: posterData ? `${sharerName} invites you to play at ${posterData.courtName}` : 'PicklePlay Invitation',
        description: posterData
            ? `${sharerName} is booking a pickleball session at ${posterData.courtName}${posterData.city ? ` in ${posterData.city}` : ''}. Join them on PicklePlay!`
            : undefined,
        image: posterData?.imageUrl,
    });

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
                <Loader2 className="animate-spin text-orange-500" size={48} />
                <p className="text-slate-400 font-black uppercase tracking-widest text-sm">Loading Poster...</p>
            </div>
        );
    }

    if (!posterData) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)' }}>
                <div className="w-20 h-20 bg-slate-900 rounded-[32px] flex items-center justify-center mb-6">
                    <Calendar size={32} className="text-slate-700" />
                </div>
                <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Poster Not Found</h1>
                <p className="text-slate-500 max-w-xs mx-auto mb-8">This booking might have been cancelled or the link is invalid.</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-8 py-4 bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-orange-700 transition-all"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen py-12 px-4 flex flex-col items-center gap-8" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0c1a35 100%)' }}>
            {/* ── Brand Header ── */}
            <div className="w-full max-w-[540px] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #f97316, #fb923c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 18 }}>🏓</span>
                    </div>
                    <span className="font-black text-lg text-white tracking-tight">
                        Pickle<span className="text-orange-400">Play</span>
                    </span>
                </div>
                <button
                    onClick={() => navigate(`/court/${booking.court?.id}`)}
                    className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-orange-950/30 flex items-center gap-2"
                >
                    <Ticket size={14} />
                    Book a Slot
                </button>
            </div>

            {/* ── "Shared by" Banner ── */}
            <div className="w-full max-w-[540px] flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                {booking.profile?.avatar_url ? (
                    <img
                        src={booking.profile.avatar_url}
                        alt={sharerName}
                        className="w-9 h-9 rounded-full border-2 border-orange-400/50 shrink-0 object-cover"
                    />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-orange-500/20 border-2 border-orange-400/30 flex items-center justify-center shrink-0">
                        <span className="text-orange-300 text-xs font-black">{sharerName.charAt(0).toUpperCase()}</span>
                    </div>
                )}
                <div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Shared by</p>
                    <p className="text-sm text-white font-black leading-tight">{sharerName}</p>
                </div>
                <div className="ml-auto">
                    <span className="text-[10px] text-orange-400 font-bold uppercase tracking-widest">Join the game!</span>
                </div>
            </div>

            {/* ── Poster Preview ── */}
            <div className="shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] rounded-[24px] overflow-hidden w-full max-w-[540px]" style={{ transform: 'scale(0.95)', transformOrigin: 'top' }}>
                <Poster data={posterData} qrDataUrl={qrDataUrl} />
            </div>

            {/* ── CTA ── */}
            <div className="w-full max-w-[540px] flex flex-col items-center gap-4">
                <button
                    onClick={() => navigate(`/court/${booking.court?.id}`)}
                    className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl shadow-orange-950/40 flex items-center justify-center gap-3"
                >
                    <UserPlus size={18} />
                    Book Your Slot Now
                </button>
                <p className="text-slate-600 text-[10px] font-medium text-center uppercase tracking-widest">
                    Powered by PicklePlay Philippines — The home of pickleball
                </p>
            </div>
        </div>
    );
};

export default PosterPage;
