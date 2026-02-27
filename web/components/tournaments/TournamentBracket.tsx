import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Trophy, Circle, Download, Star } from 'lucide-react';
import { toPng } from 'html-to-image';
import { supabase } from '../../services/supabase';
import { fetchRounds, resolveParticipantNames } from '../../services/tournaments';
import type { TournamentRound, TournamentMatch } from '../../types';

interface Props {
  tournamentId: string;
  format?: string;
  currentUserId?: string | null;
  onMatchClick?: (match: TournamentMatch) => void;
  /** Court-owner action: manually set a scheduled match to live */
  onSetLive?: (match: TournamentMatch) => void;
  /** Court-owner action: auto-advance a player with no opponent */
  onAutoAdvance?: (match: TournamentMatch) => void;
  /** Court-owner action: declare a winner on a live match directly */
  onDeclareWinner?: (match: TournamentMatch, winnerId: string) => void;
  /** When provided, the component uses these rounds directly (no fetch / no mock generation). */
  externalRounds?: TournamentRound[];
  /** When provided alongside externalRounds, used for participant name resolution. */
  externalNames?: Map<string, { name: string; avatar?: string }>;
}

// ─── Mock bracket generator ───────────────────────────────────────────────────
function generateMockBracket(tournamentId: string): TournamentRound[] {
  const players = ['pm-alex', 'pm-sarah', 'pm-marcus', 'pm-emily', 'pm-david', 'pm-lisa', 'pm-tom', 'pm-jenna'];
  
  // Round 1: Quarterfinals (4 matches) — all scheduled, ready for organizer to run
  const round1: TournamentRound = {
    id: 'mock-round-1',
    tournamentId,
    roundNumber: 1,
    roundName: 'Quarterfinals',
    matches: [
      { id: 'mock-m1', tournamentId, roundId: 'mock-round-1', matchNumber: 1, participantAId: players[0], participantBId: players[1], status: 'scheduled' },
      { id: 'mock-m2', tournamentId, roundId: 'mock-round-1', matchNumber: 2, participantAId: players[2], participantBId: players[3], status: 'scheduled' },
      { id: 'mock-m3', tournamentId, roundId: 'mock-round-1', matchNumber: 3, participantAId: players[4], participantBId: players[5], status: 'scheduled' },
      { id: 'mock-m4', tournamentId, roundId: 'mock-round-1', matchNumber: 4, participantAId: players[6], participantBId: players[7], status: 'scheduled' },
    ],
  };

  // Round 2: Semifinals — empty slots waiting for QF winners
  const round2: TournamentRound = {
    id: 'mock-round-2',
    tournamentId,
    roundNumber: 2,
    roundName: 'Semifinals',
    matches: [
      { id: 'mock-m5', tournamentId, roundId: 'mock-round-2', matchNumber: 1, status: 'scheduled' },
      { id: 'mock-m6', tournamentId, roundId: 'mock-round-2', matchNumber: 2, status: 'scheduled' },
    ],
  };

  // Round 3: Finals — empty slot waiting for SF winners
  const round3: TournamentRound = {
    id: 'mock-round-3',
    tournamentId,
    roundNumber: 3,
    roundName: 'Finals',
    matches: [
      { id: 'mock-m7', tournamentId, roundId: 'mock-round-3', matchNumber: 1, status: 'scheduled' },
    ],
  };

  return [round1, round2, round3];
}
// ──────────────────────────────────────────────────────────────────────────────

const TournamentBracket: React.FC<Props> = ({ tournamentId, format, currentUserId, onMatchClick, onSetLive, onAutoAdvance, onDeclareWinner, externalRounds, externalNames }) => {
  const [rounds, setRounds] = useState<TournamentRound[]>([]);
  const [names, setNames] = useState<Map<string, { name: string; avatar?: string }>>(new Map());
  const [loading, setLoading] = useState(true);
  const bracketRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!bracketRef.current || isDownloading) return;
    setIsDownloading(true);
    try {
      const el = bracketRef.current;
      // Expand to full scrollable width so nothing is clipped
      const origOverflow = el.style.overflow;
      const origWidth = el.style.width;
      el.style.overflow = 'visible';
      el.style.width = `${el.scrollWidth}px`;

      const dataUrl = await toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: false,
      });

      // Restore
      el.style.overflow = origOverflow;
      el.style.width = origWidth;

      const link = document.createElement('a');
      link.download = `bracket-${tournamentId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to capture bracket:', err);
    } finally {
      setIsDownloading(false);
    }
  }, [tournamentId, isDownloading]);

  // If external data is provided, use it directly (skip fetching)
  useEffect(() => {
    if (externalRounds) {
      setRounds(externalRounds);
      if (externalNames) setNames(externalNames);
      setLoading(false);
      return;
    }
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
  }, [tournamentId, externalRounds, externalNames]);

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
        <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto">The bracket will appear once the organizer sets up the matches. Check back when the tournament starts!</p>
      </div>
    );
  }

  // ── Status Legend ──
  const Legend = () => (
    <div className="flex flex-wrap items-center gap-3 mb-5 px-1">
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-1">Status:</span>
      <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border-2 border-slate-200 shadow-sm">
        <span className="w-3 h-3 rounded-full bg-slate-300 border border-slate-400" />
        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Scheduled</span>
      </span>
      <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-100 border-2 border-amber-400 shadow-sm shadow-amber-100">
        <Circle size={10} className="fill-amber-500 text-amber-500 animate-pulse" />
        <span className="text-[9px] font-black text-amber-700 uppercase tracking-widest">Live</span>
      </span>
      <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-100 border-2 border-emerald-400 shadow-sm shadow-emerald-100">
        <span className="w-3 h-3 rounded-full bg-emerald-500 border border-emerald-600" />
        <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Completed</span>
      </span>
      <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-100 border-2 border-blue-300 shadow-sm shadow-blue-100">
        <span className="w-3 h-3 rounded-full bg-blue-500 border border-blue-600" />
        <span className="text-[9px] font-black text-blue-700 uppercase tracking-widest">Auto-Advance</span>
      </span>
      {/* Download bracket button */}
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white shadow-sm hover:bg-indigo-600 transition-all disabled:opacity-50"
        title="Download bracket as PNG"
      >
        <Download size={12} />
        <span className="text-[9px] font-black uppercase tracking-widest">
          {isDownloading ? 'Saving…' : 'Download'}
        </span>
      </button>
    </div>
  );

  if (format === 'round_robin') {
    return <><Legend /><div ref={bracketRef}><RoundRobinView rounds={rounds} names={names} currentUserId={currentUserId} onMatchClick={onMatchClick} onSetLive={onSetLive} onAutoAdvance={onAutoAdvance} onDeclareWinner={onDeclareWinner} /></div></>;
  }

  if (format === 'double_elim') {
    return <><Legend /><div ref={bracketRef}><DoubleElimView rounds={rounds} names={names} currentUserId={currentUserId} onMatchClick={onMatchClick} onSetLive={onSetLive} onAutoAdvance={onAutoAdvance} onDeclareWinner={onDeclareWinner} /></div></>;
  }

  return <><Legend /><div ref={bracketRef}><EliminationView rounds={rounds} names={names} currentUserId={currentUserId} onMatchClick={onMatchClick} onSetLive={onSetLive} onAutoAdvance={onAutoAdvance} onDeclareWinner={onDeclareWinner} /></div></>;
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
  currentUserId?: string | null;
  onMatchClick?: (match: TournamentMatch) => void;
  onSetLive?: (match: TournamentMatch) => void;
  onAutoAdvance?: (match: TournamentMatch) => void;
  onDeclareWinner?: (match: TournamentMatch, winnerId: string) => void;
}> = ({ rounds, names, currentUserId, onMatchClick, onSetLive, onAutoAdvance, onDeclareWinner }) => {
  // Detect champion: last round, first match, completed with a winner
  const lastRound = rounds[rounds.length - 1];
  const finalsMatch = lastRound?.matches?.[0];
  const championId = finalsMatch?.status === 'completed' ? finalsMatch.winnerId : null;
  const championInfo = championId ? names.get(championId) : null;
  const lastRoundIndex = rounds.length - 1;

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
                    {ri === rounds.length - 1 && matches.length === 1 && !round.roundName?.toLowerCase().includes('final') && ' (Final)'}
                  </p>
                </div>

                {/* Matches */}
                <div className="flex flex-col" style={{ gap: gapOf(ri), paddingTop: topPadOf(ri) }}>
                  {matches.map((match) => (
                    <div key={match.id} style={{ height: CARD_H }}>
                      <MatchCard
                        match={match}
                        names={names}
                        currentUserId={currentUserId}
                        onClick={() => onMatchClick?.(match)}
                        onSetLive={onSetLive ? () => onSetLive(match) : undefined}
                        onAutoAdvance={onAutoAdvance ? () => onAutoAdvance(match) : undefined}
                        onDeclareWinner={onDeclareWinner ? (winnerId: string) => onDeclareWinner(match, winnerId) : undefined}
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

        {/* ── Champion column (appears after Finals when winner is decided) ── */}
        {championId && championInfo && (
          <>
            {/* Connector from Finals to Champion card */}
            <svg
              width={CONN_W + 8}
              height={HEADER_H + topPadOf(lastRoundIndex) + CARD_H}
              style={{ flexShrink: 0, overflow: 'visible' }}
            >
              <g stroke="#eab308" strokeWidth={2} fill="none" strokeLinecap="round">
                <line
                  x1={0}
                  y1={matchCenterY(lastRoundIndex, 0)}
                  x2={CONN_W + 8}
                  y2={matchCenterY(lastRoundIndex, 0)}
                />
              </g>
            </svg>

            {/* Champion card */}
            <div style={{ flex: '0 0 180px', minWidth: 0 }}>
              <div className="flex items-center justify-center" style={{ height: HEADER_H }}>
                <p className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.2em] flex items-center gap-1">
                  <Trophy size={10} className="text-yellow-500" /> Champion
                </p>
              </div>
              <div style={{ paddingTop: topPadOf(lastRoundIndex) }}>
                <div
                  style={{ height: CARD_H }}
                  className="rounded-2xl border-2 border-yellow-400 bg-gradient-to-br from-yellow-50 to-amber-100 shadow-lg shadow-yellow-200 flex flex-col items-center justify-center gap-1.5 px-3 relative overflow-hidden"
                >
                  {/* Shimmer strip */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12 animate-pulse" />
                  <Trophy size={22} className="text-yellow-500 drop-shadow-sm relative z-10" />
                  <p className="text-[8px] font-black text-yellow-600 uppercase tracking-widest relative z-10">Winner</p>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight text-center leading-tight relative z-10 truncate w-full text-center">
                    {championInfo.name}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

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
  currentUserId?: string | null;
  onMatchClick?: (match: TournamentMatch) => void;
  onSetLive?: (match: TournamentMatch) => void;
  onAutoAdvance?: (match: TournamentMatch) => void;
  onDeclareWinner?: (match: TournamentMatch, winnerId: string) => void;
}> = ({ rounds, names, currentUserId, onMatchClick, onSetLive, onAutoAdvance, onDeclareWinner }) => {
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
          <EliminationView rounds={wb} names={names} currentUserId={currentUserId} onMatchClick={onMatchClick} onSetLive={onSetLive} onAutoAdvance={onAutoAdvance} onDeclareWinner={onDeclareWinner} />
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
          <EliminationView rounds={lb} names={names} currentUserId={currentUserId} onMatchClick={onMatchClick} onSetLive={onSetLive} onAutoAdvance={onAutoAdvance} onDeclareWinner={onDeclareWinner} />
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
            <EliminationView rounds={gf} names={names} currentUserId={currentUserId} onMatchClick={onMatchClick} onSetLive={onSetLive} onAutoAdvance={onAutoAdvance} onDeclareWinner={onDeclareWinner} />
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
  currentUserId?: string | null;
  onMatchClick?: (match: TournamentMatch) => void;
  onSetLive?: (match: TournamentMatch) => void;
  onAutoAdvance?: (match: TournamentMatch) => void;
  onDeclareWinner?: (match: TournamentMatch, winnerId: string) => void;
}> = ({ rounds, names, currentUserId, onMatchClick, onSetLive, onAutoAdvance, onDeclareWinner }) => {
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
                <MatchCard key={match.id} match={match} names={names} currentUserId={currentUserId} onClick={() => onMatchClick?.(match)} onSetLive={onSetLive ? () => onSetLive(match) : undefined} onAutoAdvance={onAutoAdvance ? () => onAutoAdvance(match) : undefined} onDeclareWinner={onDeclareWinner ? (winnerId: string) => onDeclareWinner(match, winnerId) : undefined} />
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
  currentUserId?: string | null;
  onClick?: () => void;
  onSetLive?: () => void;
  onAutoAdvance?: () => void;
  onDeclareWinner?: (winnerId: string) => void;
}> = ({ match, names, currentUserId, onClick, onSetLive, onAutoAdvance, onDeclareWinner }) => {
  const nameA = match.participantAId ? (names.get(match.participantAId)?.name ?? 'TBD') : '—';
  const nameB = match.participantBId ? (names.get(match.participantBId)?.name ?? 'TBD') : '—';
  const isComplete = match.status === 'completed';
  const isLive = match.status === 'live';
  const isBye = match.status === 'bye';
  const isYourMatch = currentUserId && (match.participantAId === currentUserId || match.participantBId === currentUserId);
  const isWaitingForPlayers = !match.participantAId && !match.participantBId && match.status === 'scheduled';

  // If both slots empty, show a "waiting" state instead of a regular card
  if (isWaitingForPlayers) {
    return (
      <div className="w-full h-full text-left rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-3 flex flex-col items-center justify-center">
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Waiting for</p>
        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">previous winners</p>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`w-full h-full text-left rounded-2xl border-2 p-3 transition-colors cursor-pointer flex flex-col justify-between shadow-sm ${
        isYourMatch ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200 shadow-indigo-100' :
        isComplete ? 'border-emerald-400 bg-emerald-100' :
        isLive ? 'border-amber-400 bg-amber-100 shadow-amber-100' :
        isBye ? 'border-blue-300 bg-blue-100' :
        'border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50'
      }`}
      disabled={isBye}
    >
      {/* Status dot + Your Match indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${
          isYourMatch ? 'text-indigo-700' : isComplete ? 'text-emerald-700' : isLive ? 'text-amber-700' : isBye ? 'text-blue-600' : 'text-slate-500'
        }`}>
          {isLive && <Circle size={6} className="fill-amber-500 text-amber-500 animate-pulse" />}
          {isYourMatch && !isLive && <Star size={8} className="text-indigo-500 fill-indigo-500" />}
          {isYourMatch ? 'Your Match' : isBye ? 'Auto-Advance' : match.status}
        </span>
        {match.courtNumber && (
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
            Court {match.courtNumber}
          </span>
        )}
      </div>
      {/* Player A */}
      <div className={`flex items-center justify-between py-1.5 ${isComplete && match.winnerId === match.participantAId ? 'font-black' : ''}`}>
        <span className={`text-xs truncate max-w-[120px] flex items-center gap-1 ${match.winnerId === match.participantAId ? 'text-emerald-800 font-black' : 'text-slate-800 font-bold'}`}>
          {nameA === '—' ? <span className="text-slate-300 italic text-[10px]">Waiting...</span> : nameA}
          {currentUserId && match.participantAId === currentUserId && <span className="text-[7px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase shrink-0">You</span>}
        </span>
        {isComplete && <span className="text-xs font-black text-slate-900">{match.scoreA}</span>}
      </div>
      <div className={`h-px my-0.5 ${isYourMatch ? 'bg-indigo-200' : isComplete ? 'bg-emerald-200' : isLive ? 'bg-amber-200' : isBye ? 'bg-blue-200' : 'bg-slate-100'}`} />
      {/* Player B */}
      <div className={`flex items-center justify-between py-1.5 ${isComplete && match.winnerId === match.participantBId ? 'font-black' : ''}`}>
        <span className={`text-xs truncate max-w-[120px] flex items-center gap-1 ${match.winnerId === match.participantBId ? 'text-emerald-800 font-black' : 'text-slate-800 font-bold'}`}>
          {nameB === '—' ? <span className="text-slate-300 italic text-[10px]">Waiting...</span> : nameB}
          {currentUserId && match.participantBId === currentUserId && <span className="text-[7px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase shrink-0">You</span>}
        </span>
        {isComplete && <span className="text-xs font-black text-slate-900">{match.scoreB}</span>}
      </div>

      {/* Action buttons */}
      {!isComplete && !isBye && (
        <div className="flex gap-1.5 mt-1.5 pt-1.5 border-t border-dashed border-slate-200">
          {match.status === 'scheduled' && match.participantAId && match.participantBId && onSetLive && (
            <button
              onClick={(e) => { e.stopPropagation(); onSetLive(); }}
              className="flex-1 py-1 px-2 bg-amber-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all flex items-center justify-center gap-1"
            >
              <Circle size={6} className="fill-white" /> Go Live
            </button>
          )}
          {match.status === 'scheduled' && match.participantAId && !match.participantBId && onAutoAdvance && (
            <button
              onClick={(e) => { e.stopPropagation(); onAutoAdvance(); }}
              className="flex-1 py-1 px-2 bg-blue-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-1"
            >
              Advance →
            </button>
          )}
          {match.status === 'live' && match.participantAId && match.participantBId && onDeclareWinner && (
            <div className="flex gap-1 w-full">
              <button
                onClick={(e) => { e.stopPropagation(); onDeclareWinner(match.participantAId!); }}
                className="flex-1 py-1 px-1 bg-emerald-500 text-white rounded-lg text-[7px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all truncate"
                title={`${nameA} wins`}
              >
                ✓ {nameA.split(' ')[0]}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDeclareWinner(match.participantBId!); }}
                className="flex-1 py-1 px-1 bg-emerald-500 text-white rounded-lg text-[7px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all truncate"
                title={`${nameB} wins`}
              >
                ✓ {nameB.split(' ')[0]}
              </button>
            </div>
          )}
        </div>
      )}
    </button>
  );
};

export default TournamentBracket;
