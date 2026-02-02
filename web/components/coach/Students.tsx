import React, { useState } from 'react';
import { GraduationCap, Users, Calendar, MessageSquare, TrendingUp, Search, Filter, MoreVertical, Star, Link as LinkIcon } from 'lucide-react';

interface Student {
    id: string;
    name: string;
    dupr: number;
    lastLesson: string;
    lessonsCompleted: number;
    level: 'Beginner' | 'Intermediate' | 'Advanced';
    status: 'Active' | 'Paused';
}

const MOCK_STUDENTS: Student[] = [
    { id: '1', name: 'James Wilson', dupr: 3.85, lastLesson: '2024-03-15', lessonsCompleted: 12, level: 'Intermediate', status: 'Active' },
    { id: '2', name: 'Sarah Lee', dupr: 4.20, lastLesson: '2024-03-14', lessonsCompleted: 24, level: 'Advanced', status: 'Active' },
    { id: '3', name: 'Mike Johnson', dupr: 2.50, lastLesson: '2024-03-10', lessonsCompleted: 4, level: 'Beginner', status: 'Active' },
    { id: '4', name: 'Emma Brown', dupr: 3.10, lastLesson: '2024-02-28', lessonsCompleted: 8, level: 'Beginner', status: 'Paused' },
    { id: '5', name: 'David Chen', dupr: 4.80, lastLesson: '2024-03-16', lessonsCompleted: 45, level: 'Advanced', status: 'Active' },
];

const Students: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredStudents = MOCK_STUDENTS.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
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
                    <button className="p-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-colors">
                        <Filter size={20} />
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    icon={<Users className="text-rose-600" size={24} />}
                    label="Total Students"
                    value={MOCK_STUDENTS.length.toString()}
                    trend="+2 this month"
                />
                <MetricCard
                    icon={<Calendar className="text-rose-600" size={24} />}
                    label="Lessons This Week"
                    value="18"
                    trend="85% capacity"
                />
                <MetricCard
                    icon={<TrendingUp className="text-rose-600" size={24} />}
                    label="Avg. DUPR Growth"
                    value="+0.45"
                    trend="Last 90 days"
                />
            </div>

            {/* Student List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map((student) => (
                    <StudentCard key={student.id} student={student} />
                ))}
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
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`}
                        alt={student.name}
                        className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100"
                    />
                    {student.status === 'Active' && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                    )}
                </div>
                <div>
                    <h3 className="font-black text-slate-900 tracking-tight text-lg leading-tight uppercase">{student.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
                            {student.level}
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
                <span className="text-xl font-black text-slate-900 tracking-tighter">{student.dupr.toFixed(2)}</span>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                <div className="flex items-center gap-2 mb-1">
                    <Calendar size={12} className="text-rose-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Last Lesson</span>
                </div>
                <span className="text-sm font-black text-slate-900 tracking-tighter uppercase">{new Date(student.lastLesson).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </div>
        </div>

        <div className="flex items-center gap-3 mt-auto">
            <button className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200 active:scale-95">
                Book Lesson
            </button>
            <button className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all border border-slate-100">
                <MessageSquare size={18} />
            </button>
        </div>
    </div>
);

export default Students;
