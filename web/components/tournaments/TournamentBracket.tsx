import React, { useEffect, useState, useMemo } from 'react';
import { Trophy, Circle } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { fetchRounds, resolveParticipantNames } from '../../services/tournaments';
import type { TournamentRound, TournamentMatch } from '../../types';

interface Props {
  tournamentId: string;
  format?: string;
  onMatchClick?: (match: TournamentMatch) => void;
}

// ─── Mock bracket generator ───────────────────────────────────────────────────
function generateMockBracket(tournamentId: string): TournamentRound[] {
  const players = ['pm-alex', 'pm-sarah', 'pm-marcus', 'pm-emily', 'pm-david', 'pm-lisa', 'pm-tom', 'pm-jenna'];
  
  // Round 1: Quarterfinals (4 matches)
  const round1: TournamentRound = {
    id: 'mock-round-1',
    tournamentId,
    roundNumber: 1,
    roundName: 'Quarterfinals',
    matches: [
      {
        id: 'mock-m1', tournamentId, roundId: 'mock-round-1', matchNumber: 1,
        participantAId: players[0], participantBId: players[1],
        scoreA: 11, scoreB: 7, winnerId: players[0], status: 'completed',
      },
      {
        id: 'mock-m2', tournamentId, roundId: 'mock-round-1', matchNumber: 2,
        participantAId: players[2], participantBId: players[3],
        scoreA: 11, scoreB: 9, winnerId: players[2], status: 'completed',
      },
      {
        id: 'mock-m3', tournamentId, roundId: 'mock-round-1', matchNumber: 3,
        participantAId: players[4], participantBId: players[5],
        scoreA: 11, scoreB: 5, winnerId: players[4], status: 'completed',
      },
      {
        id: 'mock-m4', tournamentId, roundId: 'mock-round-1', matchNumber: 4,
        participantAId: players[6], participantBId: players[7],
        scoreA: 8, scoreB: 11, winnerId: players[7], status: 'completed',
      },
    ],
  };

  // Round 2: Semifinals (2 matches) - winners advance
  const round2: TournamentRound = {
    id: 'mock-round-2',
    tournamentId,
    roundNumber: 2,
    roundName: 'Semifinals',
    matches: [
      {
        id: 'mock-m5', tournamentId, roundId: 'mock-round-2', matchNumber: 1,
        participantAId: players[0], participantBId: players[2],
        scoreA: 11, scoreB: 8, winnerId: players[0], status: 'completed',
      },
      {
        id: 'mock-m6', tournamentId, roundId: 'mock-round-2', matchNumber: 2,
        participantAId: players[4], participantBId: players[7],
        scoreA: 9, scoreB: 11, winnerId: players[7], status: 'completed',
      },
    ],
  };

  // Round 3: Finals (1 match) - live/scheduled
  const round3: TournamentRound = {
    id: 'mock-round-3',
    tournamentId,
    roundNumber: 3,
    roundName: 'Finals',
    matches: [
      {
        id: 'mock-m7', tournamentId, roundId: 'mock-round-3', matchNumber: 1,
        participantAId: players[0], participantBId: players[7],
        status: 'live', // Currently ongoing match
      },
    ],
  };

  return [round1, round2, round3];
}
// ──────────────────────────────────────────────────────────────────────────────

const TournamentBracket: React.FC<Props> = ({ tournamentId, format, onMatchClick }) => {
  const [rounds, setRounds] = useState<TournamentRound[]>([]);
  const [names, setNames] = useState<Map<string, { name: string; avatar?: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBracket();
    // Skip realtime subscription for mock tournaments
    if (tournamentId.startsWith('mock-')) return;
    
    // Realtime subscription for live score updates
    const channel = supabase
      .channel(`bracket-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournament_matches', filter: `tournament_id=eq.${tournamentId}` }, () => {
        loadBracket();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [tournamentId]);

  const loadBracket = async () => {
    try {
      // ── Mock bracket for presentations ──────────────────────────────────
      if (tournamentId.startsWith('mock-')) {
        const mockRounds = generateMockBracket(tournamentId);
        setRounds(mockRounds);
        const mockNames = new Map<string, { name: string; avatar?: string }>([
          ['pm-alex', { name: 'Alex Rodriguez' }],
          ['pm-sarah', { name: 'Sarah Chen' }],
          ['pm-marcus', { name: 'Marcus Johnson' }],
          ['pm-emily', { name: 'Emily Watts' }],
          ['pm-david', { name: 'David Kim' }],
          ['pm-lisa', { name: 'Lisa Park' }],
          ['pm-tom', { name: 'Tom Harris' }],
          ['pm-jenna', { name: 'Jenna Moore' }],
        ]);
        setNames(mockNames);
        setLoading(false);
        return;
      }
      // ────────────────────────────────────────────────────────────────────

      const r = await fetchRounds(tournamentId);
      setRounds(r);
      // Collect all participant IDs
      const ids: string[] = [];
      r.forEach(round => round.matches?.forEach(m => {
        if (m.participantAId) ids.push(m.participantAId);
        if (m.participantBId) ids.push(m.participantBId);
        if (m.winnerId) ids.push(m.winnerId);
      }));
      const resolved = await resolveParticipantNames(ids);
      setNames(resolved);
    } catch (err) {
      console.error('Failed to load bracket:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (rounds.length === 0) {
    return (
      <div className="text-center py-16">
        <Trophy className="w-12 h-12 text-slate-200 mx-auto mb-3" />
        <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Bracket not yet generated</p>
      </div>
    );
  }

  if (format === 'round_robin') {
    return <RoundRobinView rounds={rounds} names={names} onMatchClick={onMatchClick} />;
  }

  if (format === 'double_elim') {
    return <DoubleElimView rounds={rounds} names={names} onMatchClick={onMatchClick} />;
  }

  return <EliminationView rounds={rounds} names={names} onMatchClick={onMatchClick} />;
};


// ═══════════════════════════════════════════════════════════════
// Single / Double Elimination bracket (tree view with connectors)
// ═══════════════════════════════════════════════════════════════

// Fixed geometry constants — must match rendered card height
const CARD_H   = 96;  // px  →  h-24 wrapper on each match
const HEADER_H = 40;  // px  →  round label row height
const CONN_W   = 40;  // px  →  width of the SVG connector column
const BASE_UNIT = CARD_H + 12; // vertical cell unit for round 0  (CARD_H + 12 gap)

/** Height of one cell slot in round ri (doubles each round) */
const unitH = (ri: number) => Math.pow(2, ri) * BASE_UNIT;

/** Top padding before the first match in round ri so it aligns with the
 *  midpoint of its two parent matches. topPad(ri) = (2^ri - 1) * BASE_UNIT / 2 */
const topPadOf = (ri: number) => (Math.pow(2, ri) - 1) * BASE_UNIT / 2;

/** Gap between consecutive match slots in round ri */
const gapOf = (ri: number) => unitH(ri) - CARD_H;

/** Absolute Y-center of match[idx] in round[ri] from the very top of the bracket */
const matchCenterY = (ri: number, idx: number) =>
  HEADER_H + topPadOf(ri) + idx * unitH(ri) + CARD_H / 2;

const EliminationView: React.FC<{
  rounds: TournamentRound[];
  names: Map<string, { name: string; avatar?: string }>;
  onMatchClick?: (match: TournamentMatch) => void;
}> = ({ rounds, names, onMatchClick }) => {
  return (
    <div className="w-full pb-4" style={{ overflowX: 'auto', scrollbarWidth: 'none' }}>
      <div className="flex items-start w-full px-4">
        {rounds.map((round, ri) => {
          const matches = (round.matches || []).sort((a, b) => a.matchNumber - b.matchNumber);
          const isLast   = ri === rounds.length - 1;
          // SVG height = space needed by this round's columns
          const svgH = matches.length === 0
            ? HEADER_H
            : HEADER_H + topPadOf(ri) + (matches.length - 1) * unitH(ri) + CARD_H;

          return (
            <React.Fragment key={round.id}>
              {/* ── Round column ───────────────────────────── */}
              <div style={{ flex: '1 1 180px', minWidth: 0 }}>
                {/* Header */}
                <div
                  className="flex items-center justify-center"
                  style={{ height: HEADER_H }}
                >
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {round.roundName || `Round ${round.roundNumber}`}
                  </p>
                </div>

                {/* Matches */}
                <div className="flex flex-col" style={{ gap: gapOf(ri), paddingTop: topPadOf(ri) }}>
                  {matches.map((match) => (
                    <div key={match.id} style={{ height: CARD_H }}>
                      <MatchCard
                        match={match}
                        names={names}
                        onClick={() => onMatchClick?.(match)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Connector SVG between this round & next ─ */}
              {!isLast && (
                <svg
                  width={CONN_W}
                  height={svgH}
                  style={{ flexShrink: 0, overflow: 'visible' }}
                >
                  <g stroke="#cbd5e1" strokeWidth={1.5} fill="none" strokeLinecap="round">
                    {Array.from({ length: Math.floor(matches.length / 2) }, (_, k) => {
                      const yTop = matchCenterY(ri, k * 2);
                      const yBot = matchCenterY(ri, k * 2 + 1);
                      const yMid = (yTop + yBot) / 2;
                      const half = CONN_W / 2;
                      return (
                        <g key={k}>
                          {/* → from top match to fold point */}
                          <line x1={0} y1={yTop} x2={half} y2={yTop} />
                          {/* → from bottom match to fold point */}
                          <line x1={0} y1={yBot} x2={half} y2={yBot} />
                          {/* | vertical joining the two fold points */}
                          <line x1={half} y1={yTop} x2={half} y2={yBot} />
                          {/* → horizontal to next round at midpoint */}
                          <line x1={half} y1={yMid} x2={CONN_W} y2={yMid} />
                        </g>
                      );
                    })}
                    {/* Odd match (bye passthrough): single straight line */}
                    {matches.length % 2 === 1 && (() => {
                      const yLast = matchCenterY(ri, matches.length - 1);
                      return <line key="pass" x1={0} y1={yLast} x2={CONN_W} y2={yLast} />;
                    })()}
                  </g>
                </svg>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// Double Elimination — Winners + Losers + Grand Finals
// ═══════════════════════════════════════════════════════════════

const DoubleElimView: React.FC<{
  rounds: TournamentRound[];
  names: Map<string, { name: string; avatar?: string }>;
  onMatchClick?: (match: TournamentMatch) => void;
}> = ({ rounds, names, onMatchClick }) => {
  const wb = rounds.filter(r => (r.roundName || '').startsWith('WB'));
  const lb = rounds.filter(r => (r.roundName || '').startsWith('LB'));
  const gf = rounds.filter(r => r.roundName === 'Grand Finals');

  return (
    <div className="space-y-10">
      {/* Winners Bracket */}
      {wb.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-emerald-100" />
            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
              Winners Bracket
            </span>
            <div className="h-px flex-1 bg-emerald-100" />
          </div>
          <EliminationView rounds={wb} names={names} onMatchClick={onMatchClick} />
        </div>
      )}

      {/* Losers Bracket */}
      {lb.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-rose-100" />
            <span className="text-[9px] font-black text-rose-700 uppercase tracking-widest px-3 py-1.5 bg-rose-50 rounded-full border border-rose-200">
              Losers Bracket
            </span>
            <div className="h-px flex-1 bg-rose-100" />
          </div>
          <EliminationView rounds={lb} names={names} onMatchClick={onMatchClick} />
        </div>
      )}

      {/* Grand Finals */}
      {gf.length > 0 && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-px flex-1 bg-yellow-100" />
            <span className="text-[9px] font-black text-yellow-700 uppercase tracking-widest px-3 py-1.5 bg-yellow-50 rounded-full border border-yellow-200 flex items-center gap-1.5">
              <Trophy size={10} /> Grand Finals
            </span>
            <div className="h-px flex-1 bg-yellow-100" />
          </div>
          <div className="max-w-xs mx-auto">
            <EliminationView rounds={gf} names={names} onMatchClick={onMatchClick} />
          </div>
        </div>
      )}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// Round Robin standings table
// ═══════════════════════════════════════════════════════════════

const RoundRobinView: React.FC<{
  rounds: TournamentRound[];
  names: Map<string, { name: string; avatar?: string }>;
  onMatchClick?: (match: TournamentMatch) => void;
}> = ({ rounds, names, onMatchClick }) => {
  // Build standings from match results
  const allMatches = rounds.flatMap(r => r.matches || []);
  const standingsMap = useMemo(() => {
    const map = new Map<string, { wins: number; losses: number; played: number; pointsFor: number; pointsAgainst: number }>();
    allMatches.forEach(m => {
      if (m.status === 'bye') return;
      [m.participantAId, m.participantBId].filter(Boolean).forEach(id => {
        if (!map.has(id!)) map.set(id!, { wins: 0, losses: 0, played: 0, pointsFor: 0, pointsAgainst: 0 });
      });
      if (m.status === 'completed' && m.winnerId) {
        const loserId = m.winnerId === m.participantAId ? m.participantBId : m.participantAId;
        const w = map.get(m.winnerId)!;
        w.wins++; w.played++;
        w.pointsFor += m.winnerId === m.participantAId ? (m.scoreA ?? 0) : (m.scoreB ?? 0);
        w.pointsAgainst += m.winnerId === m.participantAId ? (m.scoreB ?? 0) : (m.scoreA ?? 0);
        if (loserId && map.has(loserId)) {
          const l = map.get(loserId)!;
          l.losses++; l.played++;
          l.pointsFor += loserId === m.participantAId ? (m.scoreA ?? 0) : (m.scoreB ?? 0);
          l.pointsAgainst += loserId === m.participantAId ? (m.scoreB ?? 0) : (m.scoreA ?? 0);
        }
      }
    });
    return map;
  }, [allMatches]);

  const standings = useMemo(() => {
    return [...standingsMap.entries()]
      .map(([id, s]) => ({ id, name: names.get(id)?.name || 'TBD', ...s }))
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses);
  }, [standingsMap, names]);

  return (
    <div className="space-y-8">
      {/* Standings table */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Standings</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <th className="text-left py-3 px-4">#</th>
              <th className="text-left py-3 px-4">Player</th>
              <th className="text-center py-3 px-4">W</th>
              <th className="text-center py-3 px-4">L</th>
              <th className="text-center py-3 px-4">PF</th>
              <th className="text-center py-3 px-4">PA</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => (
              <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 font-black text-slate-300">{i + 1}</td>
                <td className="py-3 px-4 font-bold text-slate-900">{s.name}</td>
                <td className="py-3 px-4 text-center font-black text-emerald-600">{s.wins}</td>
                <td className="py-3 px-4 text-center font-bold text-rose-500">{s.losses}</td>
                <td className="py-3 px-4 text-center font-bold text-slate-500">{s.pointsFor}</td>
                <td className="py-3 px-4 text-center font-bold text-slate-400">{s.pointsAgainst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Match list by round */}
      {rounds.map(round => (
        <div key={round.id}>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
            {round.roundName || `Round ${round.roundNumber}`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(round.matches || [])
              .filter(m => m.status !== 'bye')
              .sort((a, b) => a.matchNumber - b.matchNumber)
              .map(match => (
                <MatchCard key={match.id} match={match} names={names} onClick={() => onMatchClick?.(match)} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════
// Individual match card
// ═══════════════════════════════════════════════════════════════

const MatchCard: React.FC<{
  match: TournamentMatch;
  names: Map<string, { name: string; avatar?: string }>;
  onClick?: () => void;
}> = ({ match, names, onClick }) => {
  const nameA = match.participantAId ? (names.get(match.participantAId)?.name ?? 'TBD') : 'BYE';
  const nameB = match.participantBId ? (names.get(match.participantBId)?.name ?? 'TBD') : 'BYE';
  const isComplete = match.status === 'completed';
  const isLive = match.status === 'live';
  const isBye = match.status === 'bye';

  return (
    <button
      onClick={onClick}
      className={`w-full h-full text-left bg-white rounded-2xl border p-3 transition-colors cursor-pointer flex flex-col justify-between ${
        isComplete ? 'border-emerald-100 bg-emerald-50/30' :
        isLive ? 'border-amber-200 bg-amber-50/30' :
        isBye ? 'border-slate-100 bg-slate-50/50 opacity-50' :
        'border-slate-100 hover:border-blue-200 hover:bg-blue-50/20'
      }`}
      disabled={isBye}
    >
      {/* Status dot */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
          isComplete ? 'text-emerald-600' : isLive ? 'text-amber-600' : 'text-slate-400'
        }`}>
          {isLive && <Circle size={6} className="fill-amber-500 text-amber-500 animate-pulse" />}
          {match.status}
        </span>
        {match.courtNumber && (
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">
            Court {match.courtNumber}
          </span>
        )}
      </div>
      {/* Player A */}
      <div className={`flex items-center justify-between py-1.5 ${isComplete && match.winnerId === match.participantAId ? 'font-black' : ''}`}>
        <span className={`text-xs truncate max-w-[140px] ${match.winnerId === match.participantAId ? 'text-emerald-700 font-black' : 'text-slate-700 font-bold'}`}>
          {nameA}
        </span>
        {isComplete && <span className="text-xs font-black text-slate-900">{match.scoreA}</span>}
      </div>
      <div className="h-px bg-slate-100 my-0.5" />
      {/* Player B */}
      <div className={`flex items-center justify-between py-1.5 ${isComplete && match.winnerId === match.participantBId ? 'font-black' : ''}`}>
        <span className={`text-xs truncate max-w-[140px] ${match.winnerId === match.participantBId ? 'text-emerald-700 font-black' : 'text-slate-700 font-bold'}`}>
          {nameB}
        </span>
        {isComplete && <span className="text-xs font-black text-slate-900">{match.scoreB}</span>}
      </div>
    </button>
  );
};

export default TournamentBracket;
