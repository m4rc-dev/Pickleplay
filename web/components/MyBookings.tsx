import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { CalendarIcon, Clock, Loader2, Calendar, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MyBookings: React.FC = () => {
    const [myBookings, setMyBookings] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

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

            const { data, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    court:courts(name, location:locations(name, city))
                `)
                .eq('player_id', session.user.id)
                .order('date', { ascending: false });

            if (error) throw error;
            setMyBookings(data || []);
        } catch (err) {
            console.error('Error fetching bookings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
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
                    className="px-10 py-5 bg-slate-950 text-white font-black text-xs uppercase tracking-[0.3em] rounded-2xl hover:bg-blue-600 transition-all shadow-2xl shadow-slate-200/50 flex items-center gap-3"
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
                                    {/* Background Graphic */}
                                    <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-700 blur-3xl" />

                                    <div className="flex justify-between items-start mb-6 relative z-10">
                                        <div>
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2 leading-none">REFERENCE: #{b.id.slice(0, 8)}</p>
                                            <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">{b.court?.name}</h4>
                                            <div className="flex items-center gap-1.5 mt-2 text-slate-400">
                                                <MapPin size={12} />
                                                <p className="text-[10px] font-bold uppercase tracking-wide">{b.court?.location?.city || 'PicklePlay Facility'}</p>
                                            </div>
                                        </div>
                                        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${b.status === 'confirmed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                                b.status === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                    'bg-slate-200 border-slate-300 text-slate-500'
                                            }`}>
                                            {b.status}
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
    );
};

export default MyBookings;
