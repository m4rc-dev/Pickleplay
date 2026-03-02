import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  X, Send, CheckCircle, AlertCircle, Calendar,
  MapPin, ChevronRight, Zap,
} from 'lucide-react';
import {
  sendPlayInvite,
  sendInvitation,
  getMyUpcomingBookings,
  type UpcomingBooking,
} from '../../services/invitations';

interface Player {
  id: string;
  full_name: string;
  avatar_url?: string;
  dupr_rating?: number;
  location?: string;
}

interface InvitePlayerModalProps {
  player: Player;
  onClose: () => void;
}

// ── Helpers ─────────────────────────────────
const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });

const fmtTime = (t: string) => {
  const [h, m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr - 12 : hr || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
};

// ── Component ────────────────────────────────
export const InvitePlayerModal: React.FC<InvitePlayerModalProps> = ({ player, onClose }) => {
  const [step, setStep] = useState<'pick' | 'message'>('pick');
  const [bookings, setBookings] = useState<UpcomingBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<UpcomingBooking | null>(undefined as any);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    getMyUpcomingBookings().then(data => {
      setBookings(data);
      setLoadingBookings(false);
    });
  }, []);

  const handleSelectBooking = (booking: UpcomingBooking | null) => {
    setSelectedBooking(booking);
    setStep('message');
  };

  const handleSend = async () => {
    setStatus('sending');
    setErrorMsg('');
    let result;
    if (selectedBooking) {
      result = await sendInvitation({ bookingId: selectedBooking.id, inviteeId: player.id, message });
    } else {
      result = await sendPlayInvite({ inviteeId: player.id, message });
    }
    if (result.success) {
      setStatus('success');
    } else {
      setStatus('error');
      setErrorMsg(result.error || 'Failed to send invite.');
    }
  };

  const modal = (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-[9999] p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-[#0f1117] border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-hidden flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            {step === 'message' && (
              <button
                onClick={() => { setStep('pick'); setStatus('idle'); setErrorMsg(''); }}
                className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <ChevronRight size={17} className="text-slate-400 rotate-180" />
              </button>
            )}
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider leading-tight">
                Invite to Play
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                {step === 'pick' ? 'Choose a court session' : 'Write a message'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-800 transition-colors">
            <X size={17} className="text-slate-400" />
          </button>
        </div>

        {/* ── Player strip ── */}
        <div className="flex items-center gap-3 px-5 py-2.5 bg-slate-900/60 border-b border-slate-800/50 shrink-0">
          <img
            src={
              player.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=1e40af&color=fff&size=96`
            }
            alt={player.full_name}
            className="w-8 h-8 rounded-xl object-cover shrink-0"
          />
          <div>
            <p className="text-xs font-black text-white uppercase tracking-tight leading-tight">
              {player.full_name}
            </p>
            {player.dupr_rating != null && (
              <p className="text-[10px] text-blue-400 font-bold leading-tight">
                DUPR {player.dupr_rating.toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── STEP 1: Pick a booking ─── */}
          {step === 'pick' && (
            <div className="p-4 space-y-2">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pb-1">
                Your upcoming courts
              </p>

              {loadingBookings ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="h-16 bg-slate-800/60 rounded-xl animate-pulse" />
                ))
              ) : bookings.length === 0 ? (
                <div className="text-center py-6">
                  <Calendar className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs font-black text-slate-500 uppercase">No upcoming bookings</p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Book a court first, or send a general invite below.
                  </p>
                </div>
              ) : (
                bookings.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBooking(b)}
                    className="w-full flex items-center gap-3 p-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl transition-all text-left group"
                  >
                    <div className="w-10 h-10 bg-blue-900/40 border border-blue-800/50 rounded-xl flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                        {b.court?.name ?? 'Court'}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {fmtDate(b.date)} · {fmtTime(b.start_time)}–{fmtTime(b.end_time)}
                      </p>
                      {b.court?.location && (
                        <p className="text-[10px] text-slate-600 truncate">
                          {b.court.location.name}, {b.court.location.city}
                        </p>
                      )}
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-slate-700 group-hover:text-slate-400 shrink-0 transition-colors"
                    />
                  </button>
                ))
              )}

              {/* General invite option */}
              <button
                onClick={() => handleSelectBooking(null)}
                className="w-full flex items-center gap-3 p-3.5 border border-dashed border-slate-700 hover:border-slate-500 hover:bg-slate-900/50 rounded-xl transition-all text-left group mt-2"
              >
                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shrink-0">
                  <Zap size={16} className="text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-slate-300 uppercase tracking-tight">General Invite</p>
                  <p className="text-[11px] text-slate-500">No specific court yet — just reaching out</p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-slate-700 group-hover:text-slate-400 shrink-0 transition-colors"
                />
              </button>
            </div>
          )}

          {/* ─── STEP 2: Message + send ─── */}
          {step === 'message' && (
            <div className="p-5">
              {status === 'success' ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <CheckCircle size={48} className="text-lime-400" />
                  <p className="font-black text-white text-base uppercase tracking-tight">Invite Sent!</p>
                  <p className="text-sm text-slate-400">
                    {player.full_name.split(' ')[0]} will be notified.
                  </p>
                  <button
                    onClick={onClose}
                    className="mt-3 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm uppercase tracking-wide transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Selected booking summary */}
                  {selectedBooking ? (
                    <div className="flex items-center gap-3 p-3 bg-blue-900/20 border border-blue-800/40 rounded-xl mb-4">
                      <MapPin size={14} className="text-blue-400 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-white uppercase truncate">
                          {selectedBooking.court?.name}
                        </p>
                        <p className="text-[11px] text-blue-300">
                          {fmtDate(selectedBooking.date)} · {fmtTime(selectedBooking.start_time)}–{fmtTime(selectedBooking.end_time)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-slate-800/60 border border-slate-700 rounded-xl mb-4">
                      <Zap size={14} className="text-slate-400 shrink-0" />
                      <p className="text-xs font-black text-slate-300 uppercase tracking-tight">
                        General Invite — No court yet
                      </p>
                    </div>
                  )}

                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Message (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Hey ${player.full_name.split(' ')[0]}, want to play pickleball?`}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 focus:border-blue-500/60 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-500/30 resize-none transition-all"
                  />

                  {status === 'error' && (
                    <div className="flex items-center gap-2 mt-3 p-3 bg-rose-900/30 border border-rose-800/50 rounded-xl text-rose-400 text-xs font-medium">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => { setStep('pick'); setStatus('idle'); setErrorMsg(''); }}
                      className="flex-1 px-4 py-2.5 border border-slate-700 hover:bg-slate-800 rounded-xl text-sm font-black text-slate-400 uppercase tracking-wide transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={status === 'sending'}
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-sm font-black uppercase tracking-wide transition-colors flex items-center justify-center gap-2"
                    >
                      {status === 'sending' ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <Send size={14} />
                      )}
                      {status === 'sending' ? 'Sending…' : 'Send Invite'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modal, document.body);
};

export default InvitePlayerModal;
