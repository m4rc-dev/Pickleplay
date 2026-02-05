import React, { useState } from 'react';
import { User, Check, ArrowRight, Loader2, Sparkles } from 'lucide-react';

interface UsernameSetupModalProps {
    initialName: string;
    onConfirm: (newName: string) => Promise<void>;
    isLoading?: boolean;
}

const UsernameSetupModal: React.FC<UsernameSetupModalProps> = ({ initialName, onConfirm, isLoading = false }) => {
    const [name, setName] = useState(initialName || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 overflow-hidden">
            {/* Heavy Backdrop */}
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-500" />

            {/* Content Card */}
            <div className="relative w-full max-w-lg bg-white rounded-[48px] shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-500">
                {/* Decorative Background */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-blue-600 to-indigo-700 opacity-10" />

                <div className="p-8 md:p-12">
                    {/* Icon Header */}
                    <div className="relative mb-10 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-50 rounded-[32px] mb-6 shadow-xl shadow-blue-500/10 group">
                            <User className="text-blue-600 transition-transform group-hover:scale-110" size={32} />
                            <div className="absolute -top-2 -right-2 p-2 bg-lime-400 rounded-2xl shadow-lg animate-bounce">
                                <Sparkles size={16} className="text-slate-900" />
                            </div>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-950 tracking-tighter uppercase mb-3">One Last Thing.</h2>
                        <p className="text-slate-500 font-medium tracking-tight leading-relaxed">
                            Welcome to the network! How should we address you on the court?
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-6">Display Name</label>
                            <div className="relative">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2 bg-slate-50 rounded-xl">
                                    <User size={18} className="text-slate-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-[24px] py-5 pl-20 pr-8 text-slate-900 font-bold placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-lg"
                                    placeholder="Your Name..."
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="w-full py-5 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:scale-100 text-white font-black rounded-[24px] uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl shadow-slate-300"
                        >
                            {isLoading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <>
                                    Enter Dashboard <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <p className="mt-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                        You can change this anytime in your profile settings.
                    </p>
                </div>

                {/* Footer Branding */}
                <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">PicklePlay 2026</p>
                </div>
            </div>
        </div>
    );
};

export default UsernameSetupModal;
