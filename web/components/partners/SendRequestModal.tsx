import React from 'react';
import ReactDOM from 'react-dom';
import { X, Send, Calendar, Clock, Users, Swords } from 'lucide-react';
import { PlaceholderAvatar } from './PlaceholderAvatar';

interface Player {
  id: string;
  full_name: string;
  avatar_url?: string;
  dupr_rating?: number;
  username?: string;
}

interface SendRequestModalProps {
  player: Player;
  form: {
    proposed_date: string;
    proposed_time: string;
    game_type: 'singles' | 'doubles' | 'mixed_doubles';
    message: string;
  };
  onChange: (form: SendRequestModalProps['form']) => void;
  onSend: () => void;
  onClose: () => void;
}

const GAME_TYPES = [
  { value: 'singles', label: 'Singles', icon: '1v1' },
  { value: 'doubles', label: 'Doubles', icon: '2v2' },
  { value: 'mixed_doubles', label: 'Mixed', icon: 'MX' },
] as const;

export const SendRequestModal: React.FC<SendRequestModalProps> = ({
  player,
  form,
  onChange,
  onSend,
  onClose,
}) => {
  const modal = (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <Swords size={17} className="text-blue-600" />
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider leading-tight">
                Match Request
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">Challenge to a game</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X size={17} className="text-slate-400" />
          </button>
        </div>

        {/* ── Player strip ── */}
        <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-100 shrink-0">
          {player.avatar_url ? (
            <img
              src={player.avatar_url}
              alt={player.full_name}
              className="h-8 w-8 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <PlaceholderAvatar
              roundedClassName="rounded-xl"
              className="h-8 w-8 shrink-0"
              iconSize={16}
            />
          )}
          <div>
            <p className="text-xs font-black text-slate-900 uppercase tracking-tight leading-tight">
              {player.full_name}
            </p>
            {player.dupr_rating != null ? (
              <p className="text-[10px] text-blue-600 font-bold leading-tight">
                DUPR {player.dupr_rating.toFixed(2)}
              </p>
            ) : player.username ? (
              <p className="text-[10px] text-slate-400 font-bold leading-tight">@{player.username}</p>
            ) : null}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="p-5 space-y-5">

          {/* Game Type — pill selector */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Game Type</p>
            <div className="grid grid-cols-3 gap-2">
              {GAME_TYPES.map(({ value, label, icon }) => {
                const active = form.game_type === value;
                return (
                  <button
                    key={value}
                    onClick={() => onChange({ ...form, game_type: value })}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                      active
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <span className={`text-[11px] font-black ${active ? 'text-blue-600' : 'text-slate-400'}`}>
                      {icon}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${active ? 'text-slate-900' : 'text-slate-500'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date + Time — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Calendar size={10} /> Date *
              </p>
              <input
                type="date"
                value={form.proposed_date}
                onChange={(e) => onChange({ ...form, proposed_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                required
                className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <Clock size={10} /> Time
              </p>
              <input
                type="time"
                value={form.proposed_time}
                onChange={(e) => onChange({ ...form, proposed_time: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-blue-400 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Message <span className="text-slate-300 normal-case font-medium">(optional)</span>
            </p>
            <textarea
              value={form.message}
              onChange={(e) => onChange({ ...form, message: e.target.value })}
              rows={3}
              placeholder={`Hey ${player.full_name.split(' ')[0]}, want to play a match?`}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-blue-400 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/10 resize-none transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-sm font-black text-slate-400 uppercase tracking-wide transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSend}
              disabled={!form.proposed_date}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-sm font-black uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
            >
              <Send size={14} />
              Send Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default SendRequestModal;
