import React, { useState, useEffect } from 'react';
import {
  User, Star, Trophy, Calendar, AlertTriangle, CheckCircle2, XCircle,
  Clock, Shield, Phone, FileText, BadgeCheck, ThumbsUp, Award,
  TrendingUp, TrendingDown, ChevronDown, ChevronUp, MessageSquare,
  ExternalLink
} from 'lucide-react';
import type {
  PendingRegistrationDetailed,
  PlayerApprovalDetails,
  ApprovalRecommendation
} from '../../services/tournaments';
import { getApprovalRecommendation } from '../../services/tournaments';

interface PlayerApprovalCardProps {
  registration: PendingRegistrationDetailed;
  tournamentId: string;
  onApprove: (playerId: string) => void;
  onReject: (playerId: string, reason?: string) => void;
  onViewProfile?: (playerId: string) => void;
  isProcessing?: boolean;
}

const PlayerApprovalCard: React.FC<PlayerApprovalCardProps> = ({
  registration,
  tournamentId,
  onApprove,
  onReject,
  onViewProfile,
  isProcessing = false
}) => {
  const [expanded, setExpanded] = useState(false);
  const [recommendation, setRecommendation] = useState<ApprovalRecommendation | null>(null);
  const [loadingRec, setLoadingRec] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const player = registration.player;

  // Calculate age from date of birth
  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(player.dateOfBirth);

  // Load recommendation when expanded
  useEffect(() => {
    if (expanded && !recommendation && !loadingRec) {
      setLoadingRec(true);
      getApprovalRecommendation(registration.playerId, tournamentId, player)
        .then(rec => setRecommendation(rec))
        .catch(err => console.error('Failed to load recommendation:', err))
        .finally(() => setLoadingRec(false));
    }
  }, [expanded, recommendation, loadingRec, registration.playerId, tournamentId, player]);

  // Verification count
  const verificationCount = [
    player.verification.emailVerified,
    player.verification.phoneVerified,
    player.verification.idVerified,
    player.verification.skillVerified
  ].filter(Boolean).length;

  // Red flags
  const hasRedFlags = player.noShowCount > 0 || player.recentLateCancels > 0;

  // Recommendation colors
  const getRecColor = (action: string) => {
    switch (action) {
      case 'approve': return 'bg-emerald-50 border-emerald-200 text-emerald-700';
      case 'review': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'reject': return 'bg-rose-50 border-rose-200 text-rose-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const getRecIcon = (action: string) => {
    switch (action) {
      case 'approve': return <CheckCircle2 className="w-4 h-4" />;
      case 'review': return <AlertTriangle className="w-4 h-4" />;
      case 'reject': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleReject = () => {
    onReject(registration.playerId, rejectReason || undefined);
    setShowRejectDialog(false);
    setRejectReason('');
  };

  return (
    <div className={`bg-white border rounded-2xl overflow-hidden transition-all ${
      hasRedFlags ? 'border-rose-200' : 'border-slate-200'
    }`}>
      {/* Main Content Row */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {player.avatarUrl ? (
              <img
                src={player.avatarUrl}
                alt={player.fullName || player.username}
                className="w-14 h-14 rounded-full object-cover border-2 border-slate-100"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
            )}
            {/* Verification badge */}
            {verificationCount >= 3 && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                <BadgeCheck className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-slate-900 truncate">
                {player.fullName || player.username || `Player ${registration.playerId.slice(0, 8)}`}
              </h4>
              {player.username && player.fullName && (
                <span className="text-xs text-slate-400">@{player.username}</span>
              )}
            </div>

            {/* Quick Stats Row */}
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
              {age && (
                <span>{age} years</span>
              )}
              {player.gender && (
                <span className="capitalize">{player.gender}</span>
              )}
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" />
                <span className="font-bold text-slate-700">{player.skillRating.toFixed(1)}</span>
              </span>
              {player.duprRating && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 rounded text-amber-700 font-bold">
                  DUPR {player.duprRating}
                </span>
              )}
            </div>

            {/* Verification Badges */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              {player.verification.emailVerified && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Email
                </span>
              )}
              {player.verification.phoneVerified && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase flex items-center gap-1">
                  <Phone className="w-2.5 h-2.5" /> Phone
                </span>
              )}
              {player.verification.idVerified && (
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[9px] font-bold uppercase flex items-center gap-1">
                  <FileText className="w-2.5 h-2.5" /> ID
                </span>
              )}
              {player.verification.skillVerified && (
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 text-[9px] font-bold uppercase flex items-center gap-1">
                  <BadgeCheck className="w-2.5 h-2.5" /> Skill
                </span>
              )}
              {verificationCount === 0 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 text-[9px] font-bold uppercase">
                  Not verified
                </span>
              )}
            </div>

            {/* Red Flags */}
            {hasRedFlags && (
              <div className="flex items-center gap-2 mt-2">
                {player.noShowCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[9px] font-bold uppercase flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> {player.noShowCount} No-show{player.noShowCount > 1 ? 's' : ''}
                  </span>
                )}
                {player.recentLateCancels > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 text-[9px] font-bold uppercase flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> {player.recentLateCancels} Recent Cancel
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Stats Preview */}
          <div className="hidden sm:flex items-center gap-4 text-center">
            <div>
              <p className="text-lg font-black text-slate-900">{player.tournamentsPlayed}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Played</p>
            </div>
            <div>
              <p className="text-lg font-black text-emerald-600">{player.winRate}%</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Win Rate</p>
            </div>
            <div>
              <p className="text-lg font-black text-amber-600">{player.tournamentsWon}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Wins</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onApprove(registration.playerId)}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => setShowRejectDialog(true)}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest hover:bg-rose-200 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>

        {/* Applied Date & Message */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Applied {new Date(registration.registeredAt).toLocaleDateString()}
          </p>
          
          {registration.applicationMessage && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-lg">
              <MessageSquare className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] text-blue-600 font-bold">Has message</span>
            </div>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700"
          >
            {expanded ? 'Less' : 'More Details'}
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-4">
          {/* Recommendation Banner */}
          {loadingRec ? (
            <div className="flex items-center justify-center py-3 text-slate-400 text-sm">
              Loading recommendation...
            </div>
          ) : recommendation && (
            <div className={`p-3 rounded-xl border ${getRecColor(recommendation.action)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getRecIcon(recommendation.action)}
                  <span className="font-bold text-sm capitalize">
                    {recommendation.action === 'approve' && 'Recommended for Approval'}
                    {recommendation.action === 'review' && 'Manual Review Suggested'}
                    {recommendation.action === 'reject' && 'Not Recommended'}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase opacity-70">
                  {recommendation.confidence} confidence • Score: {recommendation.score}
                </span>
              </div>
              <ul className="space-y-1">
                {recommendation.reasons.map((reason, i) => (
                  <li key={i} className="text-xs">{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Application Message */}
          {registration.applicationMessage && (
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Player's Message</p>
              <p className="text-sm text-slate-700 italic">"{registration.applicationMessage}"</p>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <Trophy className="w-5 h-5 text-amber-500 mx-auto mb-1" />
              <p className="text-lg font-black text-slate-900">{player.tournamentsPlayed}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Tournaments</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <Award className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              <p className="text-lg font-black text-emerald-600">{player.tournamentsWon}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Wins</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-lg font-black text-blue-600">{player.matchesWon}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Matches Won</p>
            </div>
            <div className="bg-white p-3 rounded-xl border border-slate-200 text-center">
              <TrendingDown className="w-5 h-5 text-rose-400 mx-auto mb-1" />
              <p className="text-lg font-black text-rose-500">{player.matchesLost}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase">Matches Lost</p>
            </div>
          </div>

          {/* Social Proof */}
          <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= Math.round(player.socialProof.avgRating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                  />
                ))}
              </div>
              <span className="text-sm font-bold text-slate-700">
                {player.socialProof.avgRating.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400">
                ({player.socialProof.reviewCount} reviews)
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <ThumbsUp className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-slate-700">{player.socialProof.endorsements}</span>
              <span className="text-slate-400">endorsements</span>
            </div>
          </div>

          {/* Tournament History */}
          {player.tournamentHistory && player.tournamentHistory.length > 0 && (
            <div className="p-3 bg-white rounded-xl border border-slate-200">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Recent Tournaments</p>
              <div className="space-y-2">
                {player.tournamentHistory.slice(0, 3).map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700 truncate flex-1">{t.name}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      t.status === 'confirmed' ? 'bg-emerald-100 text-emerald-600' :
                      t.status === 'withdrawn' ? 'bg-slate-100 text-slate-500' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Experience & Membership */}
          <div className="flex items-center gap-4 text-xs text-slate-500">
            {player.playingSince && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Playing since {new Date(player.playingSince).getFullYear()}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Member since {new Date(player.memberSince).toLocaleDateString()}
            </span>
            {onViewProfile && (
              <button
                onClick={() => onViewProfile(registration.playerId)}
                className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-3 h-3" />
                View Full Profile
              </button>
            )}
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="font-black text-lg text-slate-900 mb-2">Reject Application</h3>
            <p className="text-sm text-slate-500 mb-4">
              Optionally provide a reason for rejection. This will be visible to the player.
            </p>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional)"
              className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRejectDialog(false)}
                className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="flex-1 py-2 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerApprovalCard;
