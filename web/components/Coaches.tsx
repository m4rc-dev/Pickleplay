import React, { useState, useEffect } from 'react';
import { Search, GraduationCap, Star, MapPin, Trophy, Calendar, Clock, ArrowRight, CheckCircle2, Loader2, X, Plus } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Skeleton } from './ui/Skeleton';
import ReactDOM from 'react-dom';

interface Coach {
    id: string;
    full_name: string;
    avatar_url: string;
    description?: string;
    specialties?: string[];
    rating?: number;
    experience_years?: number;
}

interface Clinic {
    id: string;
    coach_id: string;
    title: string;
    level: string;
    participants: number;
    capacity: number;
    date: string;
    time: string;
    location: string;
    price: number;
    status: string;
}

interface CoachesProps {
    currentUserId: string | null;
}

const Coaches: React.FC<CoachesProps> = ({ currentUserId }) => {
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isEnrolling, setIsEnrolling] = useState<string | null>(null);
    const [selectedSpecialty, setSelectedSpecialty] = useState<string | null>(null);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
    const [clinicCoachFilter, setClinicCoachFilter] = useState<string | null>(null);
    const clinicsSectionRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchCoachesAndClinics();
        if (currentUserId) {
            fetchCurrentUserProfile();
        }
    }, [currentUserId]);

    const fetchCurrentUserProfile = async () => {
        const { data } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', currentUserId)
            .single();
        if (data) setCurrentUserProfile(data);
    };

    const fetchCoachesAndClinics = async () => {
        setIsLoading(true);
        try {
            // Fetch coaches
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('*')
                .contains('roles', ['COACH']);

            if (profilesError) throw profilesError;

            // Fetch active clinics with real participant count
            const { data: clinicsData, error: clinicsError } = await supabase
                .from('clinics')
                .select('*, clinic_participants(count)')
                .eq('status', 'active')
                .order('date', { ascending: true });

            if (clinicsError) throw clinicsError;

            // Map data to handle the nested count structure from Supabase
            const flattenedClinics = (clinicsData || []).map((clinic: any) => ({
                ...clinic,
                participants: clinic.clinic_participants?.[0]?.count || 0
            }));

            setCoaches(profiles || []);
            setClinics(flattenedClinics);
        } catch (err) {
            console.error('Error fetching coach data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleEnrollClinic = async (clinic: Clinic) => {
        if (!currentUserId) {
            alert('Please log in to enroll in clinics.');
            return;
        }

        if (clinic.participants >= clinic.capacity) {
            alert('This clinic is already full.');
            return;
        }

        setIsEnrolling(clinic.id);
        try {
            // 1. Add to clinic_participants
            const { error: enrollError } = await supabase
                .from('clinic_participants')
                .insert({
                    clinic_id: clinic.id,
                    player_id: currentUserId
                });

            if (enrollError) {
                if (enrollError.code === '23505') {
                    throw new Error('You are already enrolled in this clinic.');
                }
                throw enrollError;
            }

            // 2. Increment participant count in clinics table
            const { error: updateError } = await supabase
                .from('clinics')
                .update({ participants: clinic.participants + 1 })
                .eq('id', clinic.id);

            if (updateError) throw updateError;

            // 3. Notify Coach
            await supabase
                .from('notifications')
                .insert({
                    user_id: clinic.coach_id,
                    actor_id: currentUserId,
                    type: 'CLINIC_ENROLL',
                    message: `${currentUserProfile?.full_name || 'A player'} has enrolled in your clinic: ${clinic.title}`
                });

            alert('Successfully enrolled in the clinic!');
            fetchCoachesAndClinics();
        } catch (err: any) {
            console.error('Enrollment error:', err);
            alert(err.message || 'Failed to enroll in clinic.');
        } finally {
            setIsEnrolling(null);
        }
    };

    const handleViewClinics = (coachId: string) => {
        setClinicCoachFilter(coachId);
        clinicsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleRequestLesson = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!currentUserId || !selectedCoach) return;

        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        try {
            const { error } = await supabase
                .from('lessons')
                .insert({
                    coach_id: selectedCoach.id,
                    student_id: currentUserId,
                    date: formData.get('date'),
                    time: formData.get('time'),
                    duration: formData.get('duration'),
                    type: formData.get('type'),
                    location: formData.get('location'),
                    status: 'pending'
                });

            if (error) throw error;

            // 2. Notify Coach
            await supabase
                .from('notifications')
                .insert({
                    user_id: selectedCoach.id,
                    actor_id: currentUserId,
                    type: 'LESSON_BOOKING',
                    message: `requested a private lesson for ${formData.get('date')} at ${formData.get('time')}`
                });

            alert('Lesson request sent successfully!');
            setIsLessonModalOpen(false);
        } catch (err: any) {
            console.error('Lesson request error:', err);
            alert(err.message || 'Failed to request lesson.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCoaches = coaches.filter(c => {
        const matchesSearch = searchQuery === '' ||
            c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.specialties?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesSpecialty = !selectedSpecialty ||
            c.specialties?.includes(selectedSpecialty);

        return matchesSearch && matchesSpecialty;
    });

    // Get all unique specialties from all coaches
    const allSpecialties = Array.from(
        new Set(
            coaches.flatMap(c => c.specialties || [])
        )
    );

    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="max-w-xl">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">PICKLEPLAY / COACH NETWORK</p>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">Find. Book. <br /><span className="text-blue-600">Level Up.</span></h1>
                    <p className="mt-6 text-slate-500 font-medium text-lg leading-relaxed">Connect with certified PH coaches and master the dink game through elite clinics or private sessions.</p>
                </div>

                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Search by name or specialty..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-[32px] py-6 pl-16 pr-8 text-sm font-bold outline-none focus:ring-8 focus:ring-blue-500/5 focus:border-blue-400 transition-all shadow-sm"
                    />
                </div>
            </div>

            {/* Specialty Filter Chips */}
            {allSpecialties.length > 0 && (
                <div className="flex flex-wrap gap-3 items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Filter by specialty:</span>
                    <button
                        onClick={() => setSelectedSpecialty(null)}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${!selectedSpecialty
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                            : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300'
                            }`}
                    >
                        All
                    </button>
                    {allSpecialties.map((specialty) => (
                        <button
                            key={specialty}
                            onClick={() => setSelectedSpecialty(specialty === selectedSpecialty ? null : specialty)}
                            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${selectedSpecialty === specialty
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                                : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-300'
                                }`}
                        >
                            {specialty}
                        </button>
                    ))}
                </div>
            )}

            {/* Coaches Listing */}
            <section className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-blue-600 rounded-full" />
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Certified Coaches</h2>
                        {!isLoading && (
                            <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-black rounded-full">
                                {filteredCoaches.length} {filteredCoaches.length === 1 ? 'Coach' : 'Coaches'}
                            </span>
                        )}
                    </div>
                    {(searchQuery || selectedSpecialty) && (
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setSelectedSpecialty(null);
                            }}
                            className="text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-2"
                        >
                            <X size={14} />
                            Clear Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                    {isLoading ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm space-y-6">
                                <div className="flex gap-6">
                                    <Skeleton className="w-20 h-20 rounded-[28px]" />
                                    <div className="space-y-3">
                                        <Skeleton className="w-48 h-6" />
                                        <Skeleton className="w-32 h-4" />
                                    </div>
                                </div>
                                <Skeleton className="w-full h-24 rounded-3xl" />
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="w-full h-14 rounded-2xl" />
                                    <Skeleton className="w-full h-14 rounded-2xl" />
                                </div>
                            </div>
                        ))
                    ) : filteredCoaches.length > 0 ? (
                        filteredCoaches.map((coach) => (
                            <div key={coach.id} className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -z-10 group-hover:scale-110 transition-transform duration-500" />

                                <div className="flex gap-6 mb-8">
                                    <img
                                        src={coach.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${coach.id}`}
                                        alt={coach.full_name}
                                        className="w-20 h-20 rounded-[28px] object-cover shadow-lg border-2 border-white ring-4 ring-blue-50"
                                    />
                                    <div>
                                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors">{coach.full_name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            {coach.rating ? (
                                                <>
                                                    <div className="flex text-amber-500"><Star size={14} fill="currentColor" /></div>
                                                    <span className="text-sm font-black text-slate-900">{coach.rating.toFixed(1)}</span>
                                                </>
                                            ) : (
                                                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase tracking-tighter">New Coach</span>
                                            )}
                                            <span className="text-xs font-bold text-slate-400">
                                                {coach.experience_years ? `(${coach.experience_years}y Experience)` : '(Exp. pending)'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {coach.description && (
                                    <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8 line-clamp-3">
                                        {coach.description}
                                    </p>
                                )}

                                {coach.specialties && coach.specialties.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-8">
                                        {coach.specialties.map((tag, i) => (
                                            <span key={i} className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-100">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => {
                                            setSelectedCoach(coach);
                                            setIsLessonModalOpen(true);
                                        }}
                                        className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                                    >
                                        Private <ArrowRight size={14} />
                                    </button>
                                    <button
                                        onClick={() => handleViewClinics(coach.id)}
                                        className="py-4 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:border-blue-400 transition-all"
                                    >
                                        Clinics
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="lg:col-span-3 py-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-center">
                            <GraduationCap className="mx-auto text-slate-200 mb-4" size={48} />
                            <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">No coaches found</h3>
                            <p className="text-slate-400 font-medium italic">Try adjusting your search criteria.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Clinics Listing */}
            <section ref={clinicsSectionRef} className="space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-8 bg-lime-500 rounded-full" />
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Featured Clinics</h2>
                    </div>
                    {clinicCoachFilter && (
                        <button
                            onClick={() => setClinicCoachFilter(null)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full"
                        >
                            <X size={14} />
                            Reset Filters
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {isLoading ? (
                        Array(2).fill(0).map((_, i) => (
                            <div key={i} className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm space-y-6">
                                <div className="flex gap-6">
                                    <Skeleton className="w-14 h-14 rounded-2xl" />
                                    <div className="space-y-2">
                                        <Skeleton className="w-64 h-6" />
                                        <Skeleton className="w-48 h-4" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <Skeleton className="w-full h-12 rounded-xl" />
                                    <Skeleton className="w-full h-12 rounded-xl" />
                                </div>
                            </div>
                        ))
                    ) : clinics.length > 0 ? (
                        clinics
                            .filter(c => !clinicCoachFilter || c.coach_id === clinicCoachFilter)
                            .map((clinic) => {
                                const coach = coaches.find(c => c.id === clinic.coach_id);
                                const isFull = clinic.participants >= clinic.capacity;

                                return (
                                    <div key={clinic.id} className="bg-white p-8 rounded-[48px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-500 group flex flex-col md:flex-row gap-8 relative overflow-hidden">
                                        <div className={`absolute top-0 right-0 w-24 h-24 opacity-5 pointer-events-none ${clinic.level === 'Intro' ? 'text-emerald-500' : 'text-blue-500'}`}>
                                            <Trophy size={96} />
                                        </div>

                                        <div className="flex-1 space-y-6">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${clinic.level === 'Intro' ? 'bg-emerald-50 text-emerald-600' : clinic.level === 'Advanced' ? 'bg-indigo-50 text-indigo-600' : 'bg-blue-50 text-blue-600'}`}>
                                                    <Trophy size={28} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-none mb-2">{clinic.title}</h3>
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Masterclass by <span className="text-blue-600">{coach?.full_name || 'Pro Coach'}</span></p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <Calendar size={14} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Date & Time</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-700">{new Date(clinic.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                                                    <p className="text-xs text-slate-400 font-medium">{clinic.time}</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 text-slate-400">
                                                        <MapPin size={14} />
                                                        <span className="text-[10px] font-black uppercase tracking-widest">Location</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-700">{clinic.location}</p>
                                                    <p className="text-xs text-slate-400 font-medium">BGC Sports Hub</p>
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Enrollment Status</span>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isFull ? 'text-rose-600' : 'text-slate-900'}`}>{clinic.participants} / {clinic.capacity} Spots</span>
                                                </div>
                                                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-1000 ${isFull ? 'bg-rose-500' : 'bg-blue-600'}`}
                                                        style={{ width: `${(clinic.participants / clinic.capacity) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-row md:flex-col gap-3 justify-center md:min-w-[140px]">
                                            <div className="flex-1 md:flex-none text-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</p>
                                                <p className="text-2xl font-black text-slate-900 tracking-tighter">₱{clinic.price}</p>
                                            </div>
                                            <button
                                                onClick={() => handleEnrollClinic(clinic)}
                                                disabled={isFull || isEnrolling === clinic.id}
                                                className={`flex-[2] md:flex-none py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${isFull ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95'}`}
                                            >
                                                {isEnrolling === clinic.id ? <Loader2 size={16} className="animate-spin" /> : (isFull ? 'Clinic Full' : 'Join Session')}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                    ) : (
                        <div className="md:col-span-2 py-20 bg-white rounded-[40px] border border-dashed border-slate-200 text-center">
                            <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
                            <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">No active clinics</h3>
                            <p className="text-slate-400 font-medium italic">Check back later for new group sessions.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Lesson Request Modal */}
            {isLessonModalOpen && selectedCoach && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[48px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[100px] -z-10" />

                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase mb-1">Request Private Lesson</h2>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Coaching by <span className="text-blue-600">{selectedCoach.full_name}</span></p>
                            </div>
                            <button onClick={() => setIsLessonModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400 group">
                                <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                            </button>
                        </div>

                        <form onSubmit={handleRequestLesson} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Date</label>
                                    <input required name="date" type="date" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preferred Time</label>
                                    <input required name="time" type="text" placeholder="e.g. 08:30 AM" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Duration</label>
                                    <select name="duration" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold">
                                        <option value="60 min">60 minutes</option>
                                        <option value="90 min">90 minutes</option>
                                        <option value="120 min">120 minutes</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Session Type</label>
                                    <select name="type" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold">
                                        <option value="Private">Private (1-on-1)</option>
                                        <option value="Semi-Private">Semi-Private (2-3 players)</option>
                                        <option value="Group">Small Group (4+ players)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proposed Location</label>
                                <input required name="location" type="text" placeholder="e.g. BGC Court 1 or your preferred club" className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold" />
                            </div>

                            <p className="text-xs text-slate-400 font-medium italic mt-2">
                                * Your request will be sent to the coach for confirmation. Pricing will be settled upon confirmation.
                            </p>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isSubmitting ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 hover:bg-blue-600 text-white shadow-xl shadow-slate-100'}`}
                            >
                                {isSubmitting ? 'SENDING REQUEST...' : 'SEND LESSON REQUEST'}
                            </button>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default Coaches;
