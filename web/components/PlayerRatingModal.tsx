import React, { useState } from 'react';
import { Star, X, CheckCircle2, MessageSquare, Shield, Smile, Zap, Award, AlertCircle } from 'lucide-react';
import { submitPlayerRating } from '../services/matches';
import { PlayerRating } from '../types';

interface PlayerRatingModalProps {
    matchId: string;
    raterId: string;
    rateeId: string;
    rateeName: string;
    onClose: () => void;
    onSuccess?: () => void;
}

const PlayerRatingModal: React.FC<PlayerRatingModalProps> = ({
    matchId,
    raterId,
    rateeId,
    rateeName,
    onClose,
    onSuccess
}) => {
    const [ratings, setRatings] = useState({
        skill_level: 0,
        sportsmanship: 0,
        reliability: 0,
        fair_play: 0
    });
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string>('');

    const dimensions = [
        { id: 'skill_level', label: 'Skill Level', icon: <Zap size={18} />, color: 'text-amber-500', desc: 'How well did they play?' },
        { id: 'sportsmanship', label: 'Sportsmanship', icon: <Smile size={18} />, color: 'text-rose-500', desc: 'Were they respectful and positive?' },
        { id: 'reliability', label: 'Reliability', icon: <Shield size={18} />, color: 'text-blue-500', desc: 'Did they show up on time?' },
        { id: 'fair_play', label: 'Fair Play', icon: <Award size={18} />, color: 'text-emerald-500', desc: 'Did they call lines fairly?' }
    ];

    const handleRatingChange = (dim: string, val: number) => {
        setRatings(prev => ({ ...prev, [dim]: val }));
    };

    const handleSubmit = async () => {
        if (Object.values(ratings).some(v => v === 0)) {
            setError('Please provide a rating for all dimensions.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        const ratingData: Omit<PlayerRating, 'id' | 'created_at'> = {
            match_id: matchId,
            rater_id: raterId,
            ratee_id: rateeId,
            skill_level: ratings.skill_level,
            sportsmanship: ratings.sportsmanship,
            reliability: ratings.reliability,
            fair_play: ratings.fair_play,
            comment
        };

        const { success: submitSuccess, error: submitError } = await submitPlayerRating(ratingData);

        if (submitSuccess) {
            setSuccess(true);
            setTimeout(() => {
                onSuccess?.();
                onClose();
            }, 2000);
        } else {
            setError(submitError || 'Failed to submit rating');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
            <div className="bg-white rounded-[40px] shadow-2xl max-w-xl w-full overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                            <Star size={24} fill="currentColor" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-950 uppercase tracking-tight">Rate Opponent</h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Rate your match with {rateeName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto max-h-[70vh]">
                    {success ? (
                        <div className="text-center py-12 space-y-4">
                            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto animate-bounce">
                                <CheckCircle2 size={48} />
                            </div>
                            <div>
                                <h4 className="text-2xl font-black text-slate-950 uppercase tracking-tight">Rating Submitted</h4>
                                <p className="text-sm text-slate-500 font-medium mt-2">Thank you for helping keep the community fair and trusted.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {error && (
                                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-bold">
                                    <AlertCircle size={20} />
                                    {error}
                                </div>
                            )}

                            <div className="grid gap-6">
                                {dimensions.map((dim) => (
                                    <div key={dim.id} className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className={`${dim.color}`}>{dim.icon}</span>
                                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{dim.label}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{dim.desc}</span>
                                        </div>
                                        <div className="flex gap-2">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => handleRatingChange(dim.id, star)}
                                                    className={`flex-1 py-4 rounded-2xl border-2 transition-all flex items-center justify-center ${(ratings as any)[dim.id] >= star
                                                        ? `${dim.color.replace('text', 'bg').replace('-500', '-50')} ${dim.color.replace('text', 'border')} shadow-lg shadow-current/10`
                                                        : 'border-slate-100 hover:border-slate-200'
                                                        }`}
                                                >
                                                    <Star
                                                        size={20}
                                                        fill={(ratings as any)[dim.id] >= star ? 'currentColor' : 'transparent'}
                                                        className={(ratings as any)[dim.id] >= star ? dim.color : 'text-slate-200'}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <MessageSquare size={18} className="text-indigo-600" />
                                    <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Additional Feedback</span>
                                </div>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Share any other details about your experience..."
                                    className="w-full bg-slate-50 border-none rounded-3xl p-5 text-sm font-medium outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all h-24 resize-none"
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="w-full bg-slate-950 text-white py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? 'SUBMITTING...' : 'SUBMIT VERIFIED RATING'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PlayerRatingModal;
