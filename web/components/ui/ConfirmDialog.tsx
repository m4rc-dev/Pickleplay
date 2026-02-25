import React from 'react';
import ReactDOM from 'react-dom';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'warning' | 'danger' | 'info';
  confirmText?: string;
  cancelText?: string;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  variant = 'warning',
  confirmText = 'Continue',
  cancelText = 'Cancel',
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-amber-100 border border-amber-200',
      iconColor: 'text-amber-600',
      confirmBg: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200',
    },
    danger: {
      icon: AlertTriangle,
      iconBg: 'bg-rose-100 border border-rose-200',
      iconColor: 'text-rose-600',
      confirmBg: 'bg-rose-500 hover:bg-rose-600 shadow-rose-200',
    },
    info: {
      icon: CheckCircle2,
      iconBg: 'bg-indigo-100 border border-indigo-200',
      iconColor: 'text-indigo-600',
      confirmBg: 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-200',
    },
  };

  const style = variantStyles[variant];
  const Icon = style.icon;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className={`w-16 h-16 rounded-2xl ${style.iconBg} flex items-center justify-center`}>
              <Icon size={32} className={style.iconColor} />
            </div>
          </div>

          {/* Title */}
          <h3 className="text-2xl font-black text-slate-900 text-center mb-3 uppercase tracking-tight">
            {title}
          </h3>

          {/* Message */}
          <p className="text-slate-600 text-center text-sm font-medium leading-relaxed mb-8">
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-2xl bg-white text-slate-600 font-black text-[11px] uppercase tracking-widest hover:bg-slate-50 transition-all border border-slate-200"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3.5 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest transition-all shadow-lg ${style.confirmBg}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmDialog;
