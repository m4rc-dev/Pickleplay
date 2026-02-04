import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Trophy, Users, Calendar, MapPin, Plus, ArrowRight, Star, Clock, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Skeleton } from '../ui/Skeleton';

interface Clinic {
    id: string;
    title: string;
    level: 'Intro' | 'Intermediate' | 'Advanced';
    participants: number;
    capacity: number;
    date: string;
    time: string;
    location: string;
    price: number;
    status: 'active' | 'completed' | 'cancelled';
}

interface ClinicsProps {
    currentUserId: string | null;
}

const Clinics: React.FC<ClinicsProps> = ({ currentUserId }) => {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (currentUserId) {
            fetchClinics();
        }
    }, [currentUserId]);

    const fetchClinics = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('clinics')
                .select('*')
                .eq('coach_id', currentUserId)
                .order('date', { ascending: true });

            if (error) throw error;
            setClinics(data || []);
        } catch (err) {
            console.error('Error fetching clinics:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateClinic = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        const newClinic = {
            coach_id: currentUserId,
            title: formData.get('title') as string,
            level: formData.get('level') as string,
            capacity: parseInt(formData.get('capacity') as string),
            date: formData.get('date') as string,
            time: formData.get('time') as string,
            location: formData.get('location') as string,
            price: parseFloat(formData.get('price') as string),
            status: 'active'
        };

        try {
            const { error } = await supabase.from('clinics').insert([newClinic]);
            if (error) throw error;

            setIsCreateModalOpen(false);
            fetchClinics();
        } catch (err) {
            console.error('Error creating clinic:', err);
            alert('Failed to create clinic.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="space-y-8 animate-in fade-in duration-700 pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Manage Clinics</h1>
                        <p className="text-slate-500 font-medium tracking-tight">Organize group sessions and masterclasses.</p>
                    </div>

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-2 shadow-xl shadow-rose-200 active:scale-95"
                    >
                        <Plus size={18} /> Create New Clinic
                    </button>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {isLoading ? (
                        Array(4).fill(0).map((_, i) => (
                            <div key={i} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-6">
                                <div className="flex gap-4">
                                    <Skeleton className="w-14 h-14 rounded-2xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="w-48 h-6" />
                                        <Skeleton className="w-32 h-4" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <Skeleton className="w-full h-12 rounded-xl" />
                                    <Skeleton className="w-full h-12 rounded-xl" />
                                </div>
                            </div>
                        ))
                    ) : clinics.length > 0 ? (
                        clinics.map((clinic) => (
                            <ClinicCard key={clinic.id} clinic={clinic} />
                        ))
                    ) : (
                        <div className="lg:col-span-2 py-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-center">
                            <Trophy className="mx-auto text-slate-200 mb-4" size={48} />
                            <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">No clinics found</h3>
                            <p className="text-slate-400 font-medium">Create your first group session to get started.</p>
                        </div>
                    )}
                </div>

                {/* Floating Action Button (Mobile) */}
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="lg:hidden fixed bottom-24 right-6 w-16 h-16 bg-rose-600 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce z-[100]"
                >
                    <Plus size={28} />
                </button>
            </div>

            {/* Create Modal - Backdrop behind sidebar (z-40) to show blur in rounded corners, Card on top (z-[100]) */}
            {isCreateModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100]">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">New Clinic</h2>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateClinic} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clinic Title</label>
                                <input required name="title" type="text" placeholder="e.g. Pickleball Fundamentals" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Level</label>
                                    <select name="level" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold">
                                        <option value="Intro">Intro</option>
                                        <option value="Intermediate">Intermediate</option>
                                        <option value="Advanced">Advanced</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Capacity</label>
                                    <input required name="capacity" type="number" defaultValue="8" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                    <input required name="date" type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time</label>
                                    <input required name="time" type="text" placeholder="10:00 AM" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                                    <input required name="location" type="text" placeholder="e.g. Court A1" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₱)</label>
                                    <input required name="price" type="number" defaultValue="45" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold" />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-5 ${isSubmitting ? 'bg-slate-100 text-slate-400' : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xl shadow-rose-100'} rounded-2xl font-black text-xs uppercase tracking-widest transition-all`}
                            >
                                {isSubmitting ? 'CREATING...' : 'CREATE CLINIC'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

const ClinicCard: React.FC<{ clinic: Clinic }> = ({ clinic }) => {
    const isFull = clinic.participants >= clinic.capacity;

    return (
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col md:flex-row gap-8">
            <div className="flex-1 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${clinic.level === 'Intro' ? 'bg-emerald-50 text-emerald-600' : clinic.level === 'Advanced' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                            <Trophy size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-tight group-hover:text-rose-600 transition-colors">{clinic.title}</h3>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{clinic.level} LEVEL</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">₱{clinic.price} / Session</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Calendar size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Schedule</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700">{new Date(clinic.date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                        <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                            <Clock size={12} /> {clinic.time}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-slate-400">
                            <MapPin size={14} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Location</span>
                        </div>
                        <p className="text-sm font-bold text-slate-700">{clinic.location}</p>
                        <p className="text-xs text-slate-400">BGC Sports Center</p>
                    </div>
                </div>

                <div className="mt-2">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Participants</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isFull ? 'text-rose-600' : 'text-slate-900'}`}>{clinic.participants} / {clinic.capacity}</span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                        <div
                            className={`h-full rounded-full transition-all duration-1000 ${isFull ? 'bg-rose-500' : 'bg-rose-600'}`}
                            style={{ width: `${(clinic.participants / clinic.capacity) * 100}%` }}
                        />
                    </div>
                </div>
            </div>

            <div className="flex flex-row md:flex-col gap-3 md:justify-end">
                <button className="flex-1 md:flex-none p-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-2 group/btn">
                    Roster <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
                <button className="p-4 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-2xl border border-slate-100 transition-colors">
                    Edit
                </button>
            </div>
        </div>
    );
};

export default Clinics;
