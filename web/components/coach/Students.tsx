import React, { useState, useEffect } from 'react';
import { GraduationCap, Users, Calendar, MessageSquare, TrendingUp, Search, Filter, MoreVertical, Star, Link as LinkIcon, Trophy } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { Skeleton } from '../ui/Skeleton';

interface Student {
    id: string;
    full_name: string;
    avatar_url: string | null;
    dupr_rating: number;
    lastLessonDate: string | null;
    totalLessons: number;
    level: string;
    status: 'Active' | 'Paused';
}

interface StudentsProps {
    currentUserId: string | null;
}

const Students: React.FC<StudentsProps> = ({ currentUserId }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (currentUserId) {
            fetchStudents();
        }
    }, [currentUserId]);

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            // 1. Fetch lessons with student profiles
            const { data: lessonsData, error: lessonsError } = await supabase
                .from('lessons')
                .select('student_id, date, student:profiles(*)')
                .eq('coach_id', currentUserId);

            if (lessonsError) throw lessonsError;

            // 2. Process unique students
            const studentMap = new Map<string, Student>();

            (lessonsData || []).forEach(lesson => {
                const profile = lesson.student as any;
                if (!profile) return;

                const studentId = profile.id;
                const lessonDate = lesson.date;

                if (!studentMap.has(studentId)) {
                    studentMap.set(studentId, {
                        id: studentId,
                        full_name: profile.full_name || 'Anonymous Player',
                        avatar_url: profile.avatar_url,
                        dupr_rating: profile.dupr_rating || 3.0,
                        lastLessonDate: lessonDate,
                        totalLessons: 1,
                        level: 'Intermediate', // Fallback or could map from dupr
                        status: 'Active'
                    });
                } else {
                    const existing = studentMap.get(studentId)!;
                    existing.totalLessons += 1;
                    if (lessonDate > (existing.lastLessonDate || '')) {
                        existing.lastLessonDate = lessonDate;
                    }
                }
            });

            setStudents(Array.from(studentMap.values()));
        } catch (err) {
            console.error('Error fetching students:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const filteredStudents = students.filter(s =>
        s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">My Students</h1>
                    <p className="text-slate-500 font-medium">Manage your roster and track student progress.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search students..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl w-full md:w-64 focus:ring-2 focus:ring-rose-500 outline-none transition-all font-medium"
                        />
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    icon={<Users className="text-rose-600" size={24} />}
                    label="Active Students"
                    value={isLoading ? '...' : students.length.toString()}
                    trend="Roster Count"
                />
                <MetricCard
                    icon={<Calendar className="text-rose-600" size={24} />}
                    label="Total Sessions"
                    value={isLoading ? '...' : students.reduce((acc, s) => acc + s.totalLessons, 0).toString()}
                    trend="Total History"
                />
                <MetricCard
                    icon={<TrendingUp className="text-rose-600" size={24} />}
                    label="Avg. Rating"
                    value={isLoading ? '...' : (students.length > 0 ? (students.reduce((acc, s) => acc + s.dupr_rating, 0) / students.length).toFixed(2) : '3.00')}
                    trend="Community Avg"
                />
            </div>

            {/* Student List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                        <Skeleton key={i} className="w-full h-64 rounded-[32px]" />
                    ))
                ) : filteredStudents.length > 0 ? (
                    filteredStudents.map((student) => (
                        <StudentCard key={student.id} student={student} />
                    ))
                ) : (
                    <div className="lg:col-span-3 py-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-center">
                        <Users className="mx-auto text-slate-200 mb-4" size={48} />
                        <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">No students found</h3>
                        <p className="text-slate-400 font-medium italic">Complete your first lesson to see students here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const MetricCard: React.FC<{ icon: React.ReactNode, label: string, value: string, trend: string }> = ({ icon, label, value, trend }) => (
    <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                {icon}
            </div>
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        <div className="flex items-end justify-between">
            <span className="text-3xl font-black text-slate-900 tracking-tighter">{value}</span>
            <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider bg-rose-50 px-3 py-1 rounded-full">{trend}</span>
        </div>
    </div>
);

const StudentCard: React.FC<{ student: Student }> = ({ student }) => (
    <div className="group bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 hover:-translate-y-1 flex flex-col gap-6">
        <div className="flex items-start justify-between">
            <div className="flex gap-4">
                <div className="relative">
                    <img
                        src={student.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.full_name}`}
                        alt={student.full_name}
                        className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100"
                    />
                    {student.status === 'Active' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                    )}
                </div>
                <div>
                    <h3 className="font-black text-slate-900 tracking-tight text-lg leading-tight uppercase">{student.full_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                            {student.level}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                            {student.totalLessons} Lessons
                        </span>
                    </div>
                </div>
            </div>
            <button className="text-slate-400 hover:text-slate-900 transition-colors p-1">
                <MoreVertical size={20} />
            </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                <div className="flex items-center gap-2 mb-1">
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">DUPR</span>
                </div>
                <span className="text-xl font-black text-slate-900 tracking-tighter">{student.dupr_rating.toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                <div className="flex items-center gap-2 mb-1">
                    <Calendar size={12} className="text-rose-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Session</span>
                </div>
                <span className="text-sm font-black text-slate-900 tracking-tighter uppercase">
                    {student.lastLessonDate ? new Date(student.lastLessonDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'N/A'}
                </span>
            </div>
        </div>

        <div className="flex items-center gap-3 mt-auto">
            <button className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 active:scale-95">
                Book Session
            </button>
            <button className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-100">
                <MessageSquare size={18} />
            </button>
        </div>
    </div>
);

export default Students;
