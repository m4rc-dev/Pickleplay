import React from 'react';
import { Trophy, Users, Calendar, MapPin, Plus, ArrowRight, Star, Clock } from 'lucide-react';

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
}

const MOCK_CLINICS: Clinic[] = [
    { id: '1', title: 'Pickleball Fundamentals', level: 'Intro', participants: 6, capacity: 8, date: '2024-03-20', time: '10:00 AM', location: 'Court A1', price: 45 },
    { id: '2', title: 'Advanced Serving Masterclass', level: 'Advanced', participants: 4, capacity: 4, date: '2024-03-21', time: '2:00 PM', location: 'Court B2', price: 75 },
    { id: '3', title: 'Kitchen Strategy Drills', level: 'Intermediate', participants: 10, capacity: 12, date: '2024-03-22', time: '9:00 AM', location: 'Court A2', price: 50 },
];

const Clinics: React.FC = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Manage Clinics</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Organize group sessions and masterclasses.</p>
                </div>

                <button className="px-8 py-4 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-2 shadow-xl shadow-rose-200 active:scale-95">
                    <Plus size={18} /> Create New Clinic
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {MOCK_CLINICS.map((clinic) => (
                    <ClinicCard key={clinic.id} clinic={clinic} />
                ))}
            </div>

            {/* Floating Action Button (Mobile) */}
            <button className="lg:hidden fixed bottom-24 right-6 w-16 h-16 bg-rose-600 text-white rounded-full shadow-2xl flex items-center justify-center animate-bounce z-[100]">
                <Plus size={28} />
            </button>
        </div>
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
