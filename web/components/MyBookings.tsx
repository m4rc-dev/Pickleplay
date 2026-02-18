import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CalendarIcon, Clock, Loader2, Calendar, MapPin, Star, MessageCircle, X, Send, Receipt as ReceiptIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { submitCourtReview, hasUserReviewedBooking } from '../services/reviews';
import Receipt from './Receipt';

const MyBookings: React.FC = () => {
    const [myBookings, setMyBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userFullName, setUserFullName] = useState<string>('');
    const navigate = useNavigate();

    // Review State
    const [reviewedBookings, setReviewedBookings] = useState<Set<string>>(new Set());
    const [selectedBookingForReview, setSelectedBookingForReview] = useState<any | null>(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);

    // Receipt State
    const [selectedBookingForReceipt, setSelectedBookingForReceipt] = useState<any | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    useEffect(() => {
        fetchMyBookings();
    }, []);

    const fetchMyBookings = async () => {
        setIsLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                navigate('/login');
                return;
            }

            // Fetch user profile for receipt - use maybeSingle to avoid errors if no profile exists
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, username')
                    .eq('id', session.user.id)
                    .maybeSingle();

                if (profile) {
                    setUserFullName(profile.full_name || profile.username || 'User');
                }
            } catch (pErr) {
                console.warn('Error fetching profile:', pErr);
            }

            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    court:courts(
                        id,
                        name,
                        location:locations(name, city)
                    ),
                    review:court_reviews(rating)
                `)
                .eq('player_id', session.user.id)
                .order('date', { ascending: false });

            if (error) throw error;

            const processedData = (data || []).map(b => {
                const myReview = (b.review as any)?.[0];
                return {
                    ...b,
                    myRating: myReview?.rating || 0
                };
            });

            setMyBookings(processedData);

            // Check which ones are already reviewed
            if (data && data.length > 0) {
                const reviewedSet = new Set<string>();
                for (const booking of data) {
                    const hasReviewed = await hasUserReviewedBooking(booking.id, session.user.id);
                    if (hasReviewed) {
                        reviewedSet.add(booking.id);
                    }
                }
                setReviewedBookings(reviewedSet);
            }
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenReview = (booking: any) => {
        setSelectedBookingForReview(booking);
        setReviewRating(5);
        setReviewComment('');
        setShowReviewModal(true);
    };

    const handleSubmitReview = async () => {
        if (!selectedBookingForReview || !reviewComment.trim()) return;

        setIsSubmittingReview(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            const result = await submitCourtReview(
                selectedBookingForReview.court_id,
                session.user.id,
                reviewRating,
                reviewComment,
                undefined, // title
                selectedBookingForReview.id
            );

            if (result.success) {
                setReviewedBookings(prev => new Set(prev).add(selectedBookingForReview.id));
                setShowReviewModal(false);
                fetchMyBookings(); // Refresh to show the new rating
                alert('Thank you! Your review has been submitted.');
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (err) {
            console.error('Error submit review:', err);
            alert('Failed to submit review. Please try again.');
        } finally {
            setIsSubmittingReview(false);
        }
    };

    const handleOpenReceipt = (booking: any) => {
        setSelectedBookingForReceipt({
            id: booking.id,
            courtName: booking.court?.name || 'Pickleball Court',
            courtLocation: booking.court?.location
                ? `${booking.court.location.address || ''}, ${booking.court.location.city || ''}`
                : 'PicklePlay Facility',
            locationName: booking.court?.location?.name || '',
            date: booking.date,
            startTime: booking.start_time,
            endTime: booking.end_time,
            pricePerHour: booking.total_price, // Assuming 1hr slot
            totalPrice: booking.total_price,
            playerName: userFullName,
            status: booking.status,
            confirmedAt: booking.status === 'confirmed' ? booking.updated_at : undefined,
            paymentMethod: booking.payment_method,
            paymentStatus: booking.payment_status,
            amountTendered: booking.amount_tendered,
            changeAmount: booking.change_amount
        });
        setShowReceiptModal(true);
    };

    return (
        <>
            <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">RESERVATIONS / 2026</p>
                        <h1 className="text-5xl md:text-7xl font-black text-slate-950 tracking-tighter uppercase leading-[0.8] mb-4">
                            My Booked <span className="text-blue-600">Courts.</span>
                        </h1>
                    </div>
                    <button
                        onClick={() => navigate('/booking')}
                        className="px-10 py-5 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-blue-600 transition-all shadow-2xl shadow-slate-200/50 flex items-center gap-3"
                    >
                        <Calendar size={20} /> Book A Court
                    </button>
                </div>

                <div className="bg-white rounded-[48px] border-2 border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
                    <div className="p-10">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-blue-600" size={48} />
                                <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Retrieving your court history...</p>
                            </div>
                        ) : myBookings.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {myBookings.map((b) => (
                                    <div key={b.id} className="p-8 bg-slate-50 rounded-[40px] border-2 border-transparent hover:border-blue-200 hover:bg-white transition-all duration-500 group relative overflow-hidden">
                                        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 blur-3xl" />
                                        <div className="flex justify-between items-start mb-6 relative z-10">
                                            <div>
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none">REFERENCE: #{b.id.slice(0, 8)}</p>
                                                    {b.myRating > 0 && (
                                                        <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                                            <Star size={10} className="text-amber-500 fill-amber-500" />
                                                            <span className="text-[9px] font-black text-amber-700">{b.myRating}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{b.court?.name}</h4>
                                                <div className="flex items-center gap-1.5 mt-2 text-slate-400">
                                                    <MapPin size={12} />
                                                    <p className="text-[10px] font-bold uppercase tracking-wide">{b.court?.location?.city || 'PicklePlay Facility'}</p>
                                                </div>
                                            </div>
                                            <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${b.payment_status === 'paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                                b.status === 'confirmed' ? 'bg-blue-50 border-blue-100 text-blue-600' :
                                                    b.status === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                        'bg-slate-200 border-slate-300 text-slate-500'
                                                }`}>
                                                {b.payment_status === 'paid' ? 'Paid' : b.status}
                                            </span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-y-4 gap-x-8 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                                                    <CalendarIcon size={18} className="text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Date</p>
                                                    <p className="text-xs font-black text-slate-900 uppercase">{new Date(b.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
                                                    <Clock size={18} className="text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Time Slot</p>
                                                    <p className="text-xs font-black text-slate-900 uppercase">{b.start_time.slice(0, 5)} - {b.end_time.slice(0, 5)}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 ml-auto">
                                                <div className="text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Amount Paid</p>
                                                    <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">₱{b.total_price}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-2">
                                                {b.status === 'confirmed' && !reviewedBookings.has(b.id) && (
                                                    <button
                                                        onClick={() => handleOpenReview(b)}
                                                        className="px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-900 hover:text-white transition-all flex items-center gap-2"
                                                    >
                                                        <Star size={14} /> Review Court
                                                    </button>
                                                )}
                                                {reviewedBookings.has(b.id) && (
                                                    <span className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 font-black text-[9px] uppercase tracking-widest rounded-xl">
                                                        <MessageCircle size={14} /> Review Submitted
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => handleOpenReceipt(b)}
                                                    className="px-6 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-900 transition-all flex items-center gap-2"
                                                >
                                                    <ReceiptIcon size={14} /> View Receipt
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/court/${b.court_id}`)}
                                                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                            >
                                                View Venue details
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-32 space-y-6">
                                <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto border-2 border-dashed border-slate-200">
                                    <Calendar size={40} className="text-slate-300" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">No Bookings Found</h3>
                                    <p className="text-slate-500 font-medium mt-2">Ready to hit the court? Start your first reservation today.</p>
                                </div>
                                <button
                                    onClick={() => navigate('/booking')}
                                    className="px-10 py-5 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-slate-900 transition-all shadow-2xl shadow-blue-100"
                                >
                                    Book Your First Court
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showReviewModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => setShowReviewModal(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-[48px] shadow-3xl p-10 space-y-8 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-3xl font-black text-slate-950 uppercase tracking-tight leading-none mb-2">Leave a Review</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">How was your game at {selectedBookingForReview?.court?.name}?</p>
                            </div>
                            <button onClick={() => setShowReviewModal(false)} className="p-2 text-slate-400 hover:text-slate-950 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex flex-col items-center gap-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate your experience</p>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setReviewRating(star)}
                                            className="transition-all hover:scale-125 active:scale-95"
                                        >
                                            <Star
                                                size={36}
                                                className={`${star <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} transition-colors`}
                                            />
                                        </button>
                                    ))}
                                </div>
                                <span className="text-xs font-black text-amber-600 uppercase tracking-widest">
                                    {reviewRating === 5 ? 'Excellent!' : reviewRating === 4 ? 'Great' : reviewRating === 3 ? 'Good' : reviewRating === 2 ? 'Fair' : 'Poor'}
                                </span>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Share your thoughts</p>
                                <textarea
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Write something about the court surface, amenities, or staff..."
                                    className="w-full h-32 p-6 bg-slate-50 border-2 border-slate-100 rounded-[32px] font-bold text-slate-700 outline-none focus:border-blue-400 focus:bg-white transition-all resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="flex-1 py-5 bg-slate-50 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-all"
                            >
                                Not Now
                            </button>
                            <button
                                onClick={handleSubmitReview}
                                disabled={isSubmittingReview || !reviewComment.trim()}
                                className="flex-1 py-5 bg-slate-950 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-600 disabled:opacity-50 disabled:bg-slate-200 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200"
                            >
                                {isSubmittingReview ? <Loader2 className="animate-spin" size={18} /> : (
                                    <>
                                        <Send size={18} />
                                        Submit Review
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showReceiptModal && selectedBookingForReceipt && (
                <Receipt
                    bookingData={selectedBookingForReceipt}
                    onClose={() => setShowReceiptModal(false)}
                />
            )}
        </>
    );
};

export default MyBookings;
