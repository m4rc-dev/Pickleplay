import React, { useState, useEffect, useMemo } from 'react';
import { X, Users, AlertCircle, HeartPulse, CheckCircle2, Shuffle, Save, Loader2 } from 'lucide-react';
import type { TournamentMatch, TournamentRosterPlayer, MatchLineup, SquadRegistration } from '../../types';
import { getMatchLineup, setMatchLineup, markPlayerInjured } from '../../services/tournaments';

interface Props {
  match: TournamentMatch;
  squadRegistration: SquadRegistration;
  teamSize: number;
  isSquadOwner: boolean;
  isRosterLocked: boolean;
  tournamentMode: string; // 'casual' | 'competitive'
  onClose: () => void;
  onSaved: () => void;
}

interface TeamSlot {
  playerId: string;
  partnerId: string | null;
  teamNumber: number;
  isBench: boolean;
}

export default function MatchLineupPanel({
  match,
  squadRegistration,
  teamSize,
  isSquadOwner,
  isRosterLocked,
  tournamentMode,
  onClose,
  onSaved,
}: Props) {
  const [existingLineup, setExistingLineup] = useState<MatchLineup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Track team assignments: array of { playerId, teamNumber }
  // teamNumber=0 means bench
  const [assignments, setAssignments] = useState<Map<string, number>>(new Map());
  // For doubles: track partner pairings within each team
  const [teamPairs, setTeamPairs] = useState<Map<number, [string, string]>>(new Map());

  const roster = squadRegistration.roster || [];
  const activePlayers = roster.filter(p => p.status === 'active');
  const injuredPlayers = roster.filter(p => p.status === 'inactive_injured' || p.status === 'substituted');

  // Load existing lineup on mount
  useEffect(() => {
    loadLineup();
  }, [match.id, squadRegistration.id]);

  const loadLineup = async () => {
    setLoading(true);
    try {
      const lineup = await getMatchLineup(match.id, squadRegistration.id);
      setExistingLineup(lineup);

      // Pre-populate assignments from existing lineup
      const map = new Map<string, number>();
      lineup.forEach(l => {
        map.set(l.playerId, l.isBench ? 0 : l.teamNumber);
      });
      setAssignments(map);

      // Pre-populate pairs
      const pairMap = new Map<number, [string, string]>();
      lineup.filter(l => !l.isBench && l.partnerId).forEach(l => {
        if (!pairMap.has(l.teamNumber)) {
          pairMap.set(l.teamNumber, [l.playerId, l.partnerId!]);
        }
      });
      setTeamPairs(pairMap);
    } catch (err: any) {
      console.error('Failed to load lineup:', err);
    } finally {
      setLoading(false);
    }
  };

  // Derived counts
  const assignedPlayers = Array.from(assignments.entries()).filter(([_, t]) => t > 0);
  const benchPlayers = Array.from(assignments.entries()).filter(([_, t]) => t === 0);
  const unassigned = activePlayers.filter(p => !assignments.has(p.playerId));

  const teamsCount = assignments.size > 0
    ? Math.max(...(Array.from(assignments.values()) as number[]))
    : 0;

  const maxTeams = Math.floor(activePlayers.length / teamSize);

  // Auto-assign players to teams
  const handleAutoAssign = () => {
    const map = new Map<string, number>();
    let teamNum = 1;
    let inTeam = 0;

    activePlayers.forEach((p, i) => {
      if (inTeam >= teamSize) {
        teamNum++;
        inTeam = 0;
      }
      if (teamNum <= maxTeams) {
        map.set(p.playerId, teamNum);
        inTeam++;
      } else {
        map.set(p.playerId, 0); // bench
      }
    });

    setAssignments(map);
  };

  // Toggle player into a specific team or bench
  const cycleAssignment = (playerId: string) => {
    const current = assignments.get(playerId) ?? -1;
    const next = current + 1;

    const map = new Map(assignments);
    if (next > maxTeams) {
      map.delete(playerId); // unassigned
    } else {
      map.set(playerId, next); // 0=bench, 1..n=team
    }
    setAssignments(map);
  };

  // Mark player injured (inline)
  const handleMarkInjured = async (rosterPlayerId: string) => {
    try {
      const result = await markPlayerInjured(rosterPlayerId);
      if (result.insufficientPlayers) {
        setError(`Warning: Only ${result.activeCount} active players remaining — may be insufficient for matches.`);
      }
      onSaved(); // reload parent data
    } catch (err: any) {
      setError(err.message || 'Failed to mark player injured');
    }
  };

  // Save lineup
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      // Build teams array
      const teams: { playerId: string; partnerId?: string; teamNumber: number }[] = [];
      const benchIds: string[] = [];

      // Group by team number
      const teamGroups = new Map<number, string[]>();
      assignments.forEach((teamNum, playerId) => {
        if (teamNum === 0) {
          benchIds.push(playerId);
        } else {
          if (!teamGroups.has(teamNum)) teamGroups.set(teamNum, []);
          teamGroups.get(teamNum)!.push(playerId);
        }
      });

      // Convert team groups to team entries
      teamGroups.forEach((players, teamNum) => {
        if (teamSize === 2 && players.length === 2) {
          teams.push({ playerId: players[0], partnerId: players[1], teamNumber: teamNum });
        } else if (teamSize === 1) {
          players.forEach(p => teams.push({ playerId: p, partnerId: undefined, teamNumber: teamNum }));
        } else {
          // Generic: first player is primary, second is partner
          for (let i = 0; i < players.length; i += teamSize) {
            const chunk = players.slice(i, i + teamSize);
            teams.push({
              playerId: chunk[0],
              partnerId: chunk.length > 1 ? chunk[1] : undefined,
              teamNumber: teamNum,
            });
          }
        }
      });

      if (teams.length === 0) {
        setError('Assign at least one team before saving.');
        setSaving(false);
        return;
      }

      await setMatchLineup(match.id, squadRegistration.id, teams, benchIds);
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save lineup');
    } finally {
      setSaving(false);
    }
  };

  const getPlayerById = (id: string): TournamentRosterPlayer | undefined =>
    roster.find(p => p.playerId === id);

  const teamColor = (num: number): string => {
    const colors = [
      'bg-slate-100 text-slate-500', // 0 = bench
      'bg-indigo-100 text-indigo-600',
      'bg-emerald-100 text-emerald-600',
      'bg-amber-100 text-amber-600',
      'bg-rose-100 text-rose-600',
      'bg-cyan-100 text-cyan-600',
      'bg-purple-100 text-purple-600',
    ];
    return colors[num % colors.length];
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 text-center">
          <Loader2 size={32} className="animate-spin text-indigo-500 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">Loading lineup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-hidden animate-in zoom-in duration-200 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
              <Users size={20} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="font-black text-base uppercase tracking-tight text-slate-900">Set Lineup</h3>
              <p className="text-[10px] text-slate-400 font-bold">
                Match #{match.matchNumber} • {squadRegistration.squad?.name || 'Your Squad'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-rose-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-bold text-rose-600">{error}</p>
            </div>
          )}

          {/* Status info */}
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <span>{activePlayers.length} active</span>
            <span>•</span>
            <span>{maxTeams} max team{maxTeams !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span>Team size: {teamSize}</span>
            {isRosterLocked && (
              <>
                <span>•</span>
                <span className="text-indigo-500">Roster locked</span>
              </>
            )}
          </div>

          {/* Auto-assign button */}
          {isSquadOwner && (
            <button
              onClick={handleAutoAssign}
              className="w-full py-2.5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
            >
              <Shuffle size={14} /> Auto-Assign Teams
            </button>
          )}

          {/* Player list */}
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Tap a player to cycle: Unassigned → Bench → Team 1 → Team 2 → …
            </p>
            {activePlayers.map(rp => {
              const teamNum = assignments.get(rp.playerId);
              const label = teamNum === undefined
                ? 'Unassigned'
                : teamNum === 0
                  ? 'Bench'
                  : `Team ${teamNum}`;
              const badgeColor = teamNum === undefined
                ? 'bg-slate-50 text-slate-400 border-slate-200'
                : teamColor(teamNum);

              return (
                <button
                  key={rp.id}
                  onClick={() => isSquadOwner && cycleAssignment(rp.playerId)}
                  disabled={!isSquadOwner}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                    isSquadOwner ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'
                  } ${teamNum !== undefined && teamNum > 0 ? 'bg-white border border-slate-100' : 'bg-slate-50/50'}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0 ${
                    teamNum !== undefined && teamNum > 0 ? teamColor(teamNum) : 'bg-slate-100 text-slate-400'
                  }`}>
                    {(rp.player?.full_name || '?')[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-700 truncate">{rp.player?.full_name || rp.playerId.slice(0, 8)}</p>
                    {rp.player?.rating && (
                      <p className="text-[10px] text-slate-400 font-bold">{rp.player.rating} rating</p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeColor}`}>
                    {label}
                  </span>
                </button>
              );
            })}

            {/* Injured / inactive players */}
            {injuredPlayers.length > 0 && (
              <>
                <div className="pt-2 pb-1">
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
                    <HeartPulse size={12} /> Inactive / Injured
                  </p>
                </div>
                {injuredPlayers.map(rp => (
                  <div
                    key={rp.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl bg-rose-50/50 opacity-60"
                  >
                    <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <HeartPulse size={14} className="text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-500 truncate">{rp.player?.full_name || rp.playerId.slice(0, 8)}</p>
                      {rp.injuryNote && <p className="text-[10px] text-rose-400">{rp.injuryNote}</p>}
                    </div>
                    <span className="text-[9px] font-black uppercase text-rose-400">{rp.status?.replace('_', ' ')}</span>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Insufficient players warning */}
          {activePlayers.length < teamSize && (
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 flex items-start gap-2">
              <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700">Insufficient Active Players</p>
                <p className="text-xs text-amber-600">
                  You need at least {teamSize} active players to field a team.
                  {tournamentMode === 'competitive' && ' Request an emergency substitution from the organizer.'}
                </p>
              </div>
            </div>
          )}

          {/* Mark injured (pre-lock, squad owner only) */}
          {isSquadOwner && !isRosterLocked && activePlayers.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors list-none flex items-center gap-1">
                <HeartPulse size={12} /> Report Injury
                <span className="ml-auto text-slate-300 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="mt-2 space-y-1">
                {activePlayers.map(rp => (
                  <div key={rp.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50">
                    <span className="text-sm font-bold text-slate-600 flex-1">{rp.player?.full_name || rp.playerId.slice(0, 8)}</span>
                    <button
                      onClick={() => handleMarkInjured(rp.id)}
                      className="px-2.5 py-1 bg-rose-50 text-rose-500 border border-rose-100 rounded-lg text-[9px] font-black uppercase hover:bg-rose-100 transition-colors"
                    >
                      Mark Injured
                    </button>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Footer actions */}
        {isSquadOwner && (
          <div className="p-5 border-t border-slate-100 flex-shrink-0 space-y-2">
            <button
              onClick={handleSave}
              disabled={saving || assignedPlayers.length === 0}
              className="w-full py-3.5 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {saving ? (
                <><Loader2 size={16} className="animate-spin" /> Saving...</>
              ) : (
                <><Save size={16} /> Confirm Lineup ({assignedPlayers.length} playing, {benchPlayers.length} bench)</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
