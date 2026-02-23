import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    isVisible: boolean;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose, duration = 3000 }) => {
    const [shouldRender, setShouldRender] = useState(isVisible);

    useEffect(() => {
        if (isVisible) {
            setShouldRender(true);
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        } else {
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 300); // Wait for fade-out animation
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!shouldRender) return null;

    const config = {
        success: {
            icon: <CheckCircle2 className="text-lime-400" size={20} />,
            bg: 'bg-slate-950/80',
            border: 'border-lime-400/20',
            shadow: 'shadow-lime-400/10'
        },
        error: {
            icon: <XCircle className="text-red-400" size={20} />,
            bg: 'bg-slate-950/80',
            border: 'border-red-400/20',
            shadow: 'shadow-red-400/10'
        },
        info: {
            icon: <Info className="text-blue-400" size={20} />,
            bg: 'bg-slate-950/80',
            border: 'border-blue-400/20',
            shadow: 'shadow-blue-400/10'
        }
    };

    const { icon, bg, border, shadow } = config[type];

    return (
        <div className={`fixed top-8 right-8 z-[100] transition-all duration-300 transform ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-95'}`}>
            <div className={`${bg} backdrop-blur-xl border ${border} ${shadow} px-6 py-4 rounded-[24px] flex items-center gap-4 min-w-[320px] max-w-[420px] shadow-2xl`}>
                <div className="flex-shrink-0 animate-in zoom-in duration-500">{icon}</div>
                <p className="text-white font-bold text-sm tracking-tight flex-grow">{message}</p>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};

export default Toast;
