import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Calendar, Clock, MapPin, Video, CheckCircle, ChevronLeft, ChevronRight, Plus, Users, GraduationCap, X } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Skeleton } from '../ui/Skeleton';

interface Lesson {
    id: string;
    student_id: string | null;
    studentName?: string;
    time: string;
    date: string;
    duration: string;
    location: string;
    type: 'Private' | 'Semi-Private' | 'Group';
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

interface ScheduleProps {
    currentUserId: string | null;
}

const Schedule: React.FC<ScheduleProps> = ({ currentUserId }) => {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (currentUserId) {
            fetchLessons();
        }
    }, [currentUserId, selectedDate]);

    const fetchLessons = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('lessons')
                .select('*, student:profiles(full_name)')
                .eq('coach_id', currentUserId)
                .eq('date', selectedDate)
                .order('time', { ascending: true });

            if (error) throw error;

            const transformedData = (data || []).map(l => ({
                ...l,
                studentName: l.student?.full_name || 'Anonymous Student'
            }));

            setLessons(transformedData);
        } catch (err) {
            console.error('Error fetching lessons:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleScheduleLesson = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        try {
            const { error } = await supabase.from('lessons').insert([{
                coach_id: currentUserId,
                date: formData.get('date') as string,
                time: formData.get('time') as string,
                duration: formData.get('duration') as string,
                type: formData.get('type') as string,
                location: formData.get('location') as string,
                status: 'confirmed'
            }]);

            if (error) throw error;

            setIsModalOpen(false);
            fetchLessons();
        } catch (err) {
            console.error('Error scheduling lesson:', err);
            alert('Failed to schedule lesson.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Date navigation
    const changeDate = (days: number) => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + days);
        setSelectedDate(d.toISOString().split('T')[0]);
    };

    const displayDate = new Date(selectedDate);

    return (
        <>
            <div className="space-y-10 animate-in fade-in duration-700 pb-12">
                {/* Header with Date Selector */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2 text-center md:text-left">Lesson Schedule</h1>
                        <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
                            <button onClick={() => changeDate(-1)} className="text-slate-400 hover:text-rose-600 transition-colors"><ChevronLeft size={20} /></button>
                            <div className="flex flex-col items-center min-w-[140px]">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{displayDate.toLocaleDateString(undefined, { weekday: 'long' })}</span>
                                <span className="text-lg font-black text-slate-900 tracking-tight">{displayDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
                            </div>
                            <button onClick={() => changeDate(1)} className="text-slate-400 hover:text-rose-600 transition-colors"><ChevronRight size={20} /></button>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-full md:w-auto px-8 py-5 bg-slate-900 text-white rounded-3xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-600 transition-all flex items-center justify-center gap-3 shadow-2xl active:scale-95"
                    >
                        <Plus size={20} /> Schedule Lesson
                    </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                    {/* Main Timeline */}
                    <div className="xl:col-span-2 space-y-6">
                        <div className="flex items-center justify-between mb-4 px-2">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Timeline</h2>
                            <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full uppercase">{lessons.length} Lessons Scheduled</span>
                        </div>

                        <div className="relative space-y-12 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 min-h-[400px]">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="pl-14">
                                        <Skeleton className="w-full h-32 rounded-[32px]" />
                                    </div>
                                ))
                            ) : lessons.length > 0 ? (
                                lessons.map((lesson) => (
                                    <TimelineEvent key={lesson.id} lesson={lesson} />
                                ))
                            ) : (
                                <div className="pl-14 py-20 text-center text-slate-400 font-medium italic">
                                    No lessons scheduled for this day.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar Widgets */}
                    <div className="space-y-8">
                        {/* Insights */}
                        <div className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Daily Summary</h3>
                            <div className="space-y-6">
                                <StatRow icon={<GraduationCap className="text-rose-500" size={18} />} label="Day's Total" count={lessons.length.toString()} />
                                <StatRow icon={<Clock className="text-amber-500" size={18} />} label="Peak Hours" count="08-10 AM" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Schedule Modal - Backdrop behind sidebar (z-40) to show blur in rounded corners, Card on top (z-[100]) */}
            {isModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100]">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Schedule Lesson</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleScheduleLesson} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                                    <input required name="date" type="date" defaultValue={selectedDate} className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Time</label>
                                    <input required name="time" type="text" placeholder="08:30 AM" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration</label>
                                    <input required name="duration" type="text" defaultValue="60 min" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Type</label>
                                    <select name="type" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold">
                                        <option value="Private">Private</option>
                                        <option value="Semi-Private">Semi-Private</option>
                                        <option value="Group">Group</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label>
                                <input required name="location" type="text" placeholder="e.g. Court A1" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-rose-500/10 font-bold" />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-5 ${isSubmitting ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 hover:bg-rose-600 text-white shadow-xl shadow-slate-100'} rounded-2xl font-black text-xs uppercase tracking-widest transition-all`}
                            >
                                {isSubmitting ? 'SCHEDULING...' : 'CONFIRM LESSON'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

const TimelineEvent: React.FC<{ lesson: Lesson }> = ({ lesson }) => (
    <div className="relative pl-14 group">
        {/* Dot */}
        <div className={`absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-lg transition-all duration-500 group-hover:scale-110 z-10 ${lesson.status === 'completed' ? 'bg-emerald-500 text-white' : lesson.status === 'confirmed' ? 'bg-blue-600 text-white animate-pulse' : 'bg-white text-slate-300'}`}>
            {lesson.status === 'completed' ? <CheckCircle size={16} /> : <Clock size={16} />}
        </div>

        {/* Content Card */}
        <div className={`p-6 rounded-[32px] border transition-all duration-500 ${lesson.status === 'confirmed' ? 'bg-white border-blue-100 shadow-xl shadow-blue-50/50 -translate-y-1' : 'bg-white border-slate-100 shadow-sm opacity-60 grayscale hover:grayscale-0 hover:opacity-100'} hover:shadow-xl`}>
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
                        {lesson.status === 'confirmed' && (
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
