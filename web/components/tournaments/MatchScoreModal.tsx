import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, Check, Trophy } from 'lucide-react';
import { submitMatchScore } from '../../services/tournaments';
import type { TournamentMatch } from '../../types';

interface Props {
  match: TournamentMatch;
  isOpen: boolean;
  onClose: () => void;
  onScored: () => void;
  participantNames?: Record<string, string>;
}

const MatchScoreModal: React.FC<Props> = ({ match, isOpen, onClose, onScored, participantNames = {} }) => {
  const [scoreA, setScoreA] = useState(match.scoreA ?? 0);
  const [scoreB, setScoreB] = useState(match.scoreB ?? 0);
  const [winner, setWinner] = useState<'a' | 'b' | null>(
    match.winnerId === match.participantAId ? 'a' :
    match.winnerId === match.participantBId ? 'b' : null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nameA = participantNames[match.participantAId || ''] || match.participantAId?.slice(0, 8) || 'TBD';
  const nameB = participantNames[match.participantBId || ''] || match.participantBId?.slice(0, 8) || 'TBD';

  const handleSubmit = async () => {
    if (winner === null) {
      alert('Please select a winner.');
      return;
    }
    setIsSubmitting(true);
    try {
      const winnerId = winner === 'a' ? match.participantAId! : match.participantBId!;
      await submitMatchScore(match.id, scoreA, scoreB, winnerId);
      onScored();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to submit score');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-3">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Enter Score</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          {/* Match info */}
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Round {match.roundId ? '—' : ''} Match #{match.matchNumber}
          </p>

          {/* Score entry */}
          <div className="flex items-center gap-4">
            {/* Player A */}
            <div className="flex-1 text-center">
              <button
                onClick={() => setWinner('a')}
                className={`w-full p-4 rounded-2xl border-2 transition-all ${
                  winner === 'a'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <p className="font-black text-sm text-slate-900 truncate mb-2">{nameA}</p>
                <input
                  type="number"
                  min={0}
                  value={scoreA}
                  onChange={e => setScoreA(Number(e.target.value))}
                  className="w-full text-center text-3xl font-black bg-transparent outline-none"
                  onClick={e => e.stopPropagation()}
                />
                {winner === 'a' && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-emerald-600">
                    <Trophy size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Winner</span>
                  </div>
                )}
              </button>
            </div>

            <span className="text-slate-300 font-black text-lg">VS</span>

            {/* Player B */}
            <div className="flex-1 text-center">
              <button
                onClick={() => setWinner('b')}
                className={`w-full p-4 rounded-2xl border-2 transition-all ${
                  winner === 'b'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <p className="font-black text-sm text-slate-900 truncate mb-2">{nameB}</p>
                <input
                  type="number"
                  min={0}
                  value={scoreB}
                  onChange={e => setScoreB(Number(e.target.value))}
                  className="w-full text-center text-3xl font-black bg-transparent outline-none"
                  onClick={e => e.stopPropagation()}
                />
                {winner === 'b' && (
                  <div className="flex items-center justify-center gap-1 mt-2 text-emerald-600">
                    <Trophy size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Winner</span>
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || winner === null}
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            {isSubmitting ? 'Submitting...' : <><Check size={16} /> Submit Score</>}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MatchScoreModal;
