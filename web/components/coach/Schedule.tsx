import React from 'react';
import { Calendar, Clock, MapPin, Video, CheckCircle, ChevronLeft, ChevronRight, Plus, Users, GraduationCap } from 'lucide-react';

interface Lesson {
    id: string;
    studentName: string;
    time: string;
    duration: string;
    location: string;
    type: 'Private' | 'Semi-Private' | 'Group';
    status: 'Confirmed' | 'Completed' | 'Upcoming';
}

const MOCK_LESSONS: Lesson[] = [
    { id: '1', studentName: 'James Wilson', time: '08:30 AM', duration: '60 min', location: 'Court A1', type: 'Private', status: 'Completed' },
    { id: '2', studentName: 'Sarah & Tom', time: '10:00 AM', duration: '90 min', location: 'Court B2', type: 'Semi-Private', status: 'Confirmed' },
    { id: '3', studentName: 'Advanced Group', time: '02:30 PM', duration: '120 min', location: 'Main Arena', type: 'Group', status: 'Upcoming' },
    { id: '4', studentName: 'Mike Johnson', time: '05:00 PM', duration: '60 min', location: 'Court A1', type: 'Private', status: 'Upcoming' },
];

const Schedule: React.FC = () => {
    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-12">
            {/* Header with Date Selector */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2 text-center md:text-left">Lesson Schedule</h1>
                    <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                        <button className="text-slate-400 hover:text-rose-600 transition-colors"><ChevronLeft size={20} /></button>
                        <div className="flex flex-col items-center min-w-[140px]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monday</span>
                            <span className="text-lg font-black text-slate-900 tracking-tight">MARCH 18, 2024</span>
                        </div>
                        <button className="text-slate-400 hover:text-rose-600 transition-colors"><ChevronRight size={20} /></button>
                    </div>
                </div>

                <button className="w-full md:w-auto px-8 py-5 bg-slate-900 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95">
                    <Plus size={20} /> Schedule Lesson
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Main Timeline */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="flex items-center justify-between mb-4 px-2">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Today's Timeline</h2>
                        <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full uppercase">4 Lessons Today</span>
                    </div>

                    <div className="relative space-y-12 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                        {MOCK_LESSONS.map((lesson) => (
                            <TimelineEvent key={lesson.id} lesson={lesson} />
                        ))}
                    </div>
                </div>

                {/* Sidebar Widgets */}
                <div className="space-y-8">
                    {/* Spotlight Slot */}
                    <div className="bg-rose-600 p-8 rounded-[48px] text-white shadow-2xl shadow-rose-200 relative overflow-hidden group">
                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                        <div className="relative z-10">
                            <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">Next Spotlight</span>
                            <h3 className="text-3xl font-black mt-6 leading-tight tracking-tighter uppercase">Sarah & Tom</h3>
                            <p className="text-rose-100 font-medium mt-2 leading-relaxed opacity-80 uppercase text-xs tracking-widest">10:00 AM • INTERMEDIATE DRILLS</p>

                            <div className="mt-8 flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-rose-600 shadow-xl">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Ready to start?</p>
                                    <p className="text-sm font-bold">Check-in Student</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Monthly Stats */}
                    <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Insights</h3>
                        <div className="space-y-6">
                            <StatRow icon={<GraduationCap className="text-rose-500" size={18} />} label="Total Lessons" count="124" />
                            <StatRow icon={<Users className="text-blue-500" size={18} />} label="New Students" count="+8" />
                            <StatRow icon={<Clock className="text-amber-500" size={18} />} label="Avg. Match Time" count="72m" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const TimelineEvent: React.FC<{ lesson: Lesson }> = ({ lesson }) => (
    <div className="relative pl-14 group">
        {/* Dot */}
        <div className={`absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 z-10 ${lesson.status === 'Completed' ? 'bg-emerald-500 text-white' : lesson.status === 'Confirmed' ? 'bg-blue-600 text-white animate-pulse' : 'bg-white text-slate-300'}`}>
            {lesson.status === 'Completed' ? <CheckCircle size={16} /> : <Clock size={16} />}
        </div>

        {/* Content Card */}
        <div className={`p-6 rounded-[32px] border transition-all duration-500 ${lesson.status === 'Confirmed' ? 'bg-white border-blue-100 shadow-xl shadow-blue-50/50 -translate-y-1' : 'bg-white border-slate-100 shadow-sm opacity-60 grayscale hover:grayscale-0 hover:opacity-100'} hover:shadow-xl`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-black text-slate-900 tracking-tight uppercase">{lesson.time}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                        <span className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">{lesson.type} SESSION</span>
                    </div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{lesson.studentName}</h4>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={16} />
                        <span className="text-xs font-black uppercase tracking-widest">{lesson.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Clock size={16} />
                        <span className="text-xs font-black uppercase tracking-widest">{lesson.duration}</span>
                    </div>

                    <div className="flex gap-2">
                        <button className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all">Details</button>
                        {lesson.status === 'Confirmed' && (
                            <button className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">Check-in</button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const StatRow: React.FC<{ icon: React.ReactNode, label: string, count: string }> = ({ icon, label, count }) => (
    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-xl shadow-sm">{icon}</div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
        </div>
        <span className="text-lg font-black text-slate-900 tracking-tighter">{count}</span>
    </div>
);

export default Schedule;
