// ═══════════════════════════════════════════════════════════════
// Admin Verification Panel — Full Review for Court Owner Applications
// Per-field image preview, per-field comments, approve/reject/resubmit 
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  FileText,
  Camera,
  MapPin,
  IdCard,
  Briefcase,
  Building2,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  MessageSquare,
  Image as ImageIcon,
  ZoomIn,
  ThumbsUp,
  ThumbsDown,
  Send,
  RotateCcw,
  User,
  Calendar,
  Hash,
} from 'lucide-react';
import {
  CourtOwnerVerification,
  getAllVerifications,
  adminApproveVerification,
  adminRejectVerification,
  adminRequestResubmission,
  GOVERNMENT_ID_OPTIONS,
  OWNERSHIP_DOC_OPTIONS,
  BUSINESS_DOC_OPTIONS,
  VERIFICATION_FIELD_LABELS,
} from '../../services/courtOwnerVerification';

interface AdminVerificationPanelProps {
  currentAdminId: string;
}

type FilterStatus = 'all' | 'PENDING' | 'UNDER_REVIEW' | 'RESUBMISSION_REQUESTED' | 'APPROVED' | 'REJECTED';

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string; icon: React.ReactNode }> = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending Review', icon: <AlertTriangle size={12} /> },
  UNDER_REVIEW: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Under Review', icon: <Eye size={12} /> },
  RESUBMISSION_REQUESTED: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', label: 'Resubmission Requested', icon: <RefreshCw size={12} /> },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Approved', icon: <CheckCircle2 size={12} /> },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Rejected', icon: <XCircle size={12} /> },
};

// Map field keys to the verification object URLs
function getFieldUrl(v: CourtOwnerVerification, field: string): string | null {
  const map: Record<string, string | null> = {
    government_id_front: v.government_id_front_url,
    government_id_back: v.government_id_back_url,
    selfie_with_id: v.selfie_with_id_url,
    ownership_doc: v.ownership_doc_url,
    business_doc: v.business_doc_url,
    entrance_photo: v.entrance_photo_url,
    facility_photo: v.facility_photo_url,
    court_lines_photo: v.court_lines_photo_url,
    google_maps_link: v.google_maps_link,
  };
  return map[field] ?? null;
}

function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|webp)/i.test(url);
}

const AdminVerificationPanel: React.FC<AdminVerificationPanelProps> = ({ currentAdminId }) => {
  const [verifications, setVerifications] = useState<CourtOwnerVerification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  // Detail view
  const [selectedVerification, setSelectedVerification] = useState<CourtOwnerVerification | null>(null);

  // Per-field review state (when in detail view)
  const [fieldComments, setFieldComments] = useState<Record<string, string>>({});
  const [flaggedFields, setFlaggedFields] = useState<Set<string>>(new Set());
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Image zoom
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchVerifications();
  }, [filter]);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const data = await getAllVerifications(filter === 'all' ? undefined : filter);
      setVerifications(data);
    } catch (err: any) {
      console.error('Failed to fetch verifications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Open detail view for a verification
  const openDetail = (v: CourtOwnerVerification) => {
    setSelectedVerification(v);
    setFieldComments(v.field_comments || {});
    setFlaggedFields(new Set(v.resubmission_fields || []));
    setApprovalNote('');
    setRejectReason('');
  };

  const closeDetail = () => {
    setSelectedVerification(null);
    setFieldComments({});
    setFlaggedFields(new Set());
  };

  // ─── Actions ─────────────────────────────────────────────
  const handleApprove = async () => {
    if (!selectedVerification) return;
    setProcessing(selectedVerification.id);
    try {
      await adminApproveVerification(selectedVerification.id, currentAdminId, approvalNote || undefined);
      setVerifications(prev => prev.map(v => v.id === selectedVerification.id ? { ...v, status: 'APPROVED' as const } : v));
      closeDetail();
    } catch (err: any) {
      console.error('Approve failed:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedVerification) return;
    setProcessing(selectedVerification.id);
    try {
      await adminRejectVerification(selectedVerification.id, currentAdminId, rejectReason || undefined);
      setVerifications(prev => prev.map(v => v.id === selectedVerification.id ? { ...v, status: 'REJECTED' as const } : v));
      setShowRejectModal(false);
      closeDetail();
    } catch (err: any) {
      console.error('Reject failed:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleRequestResubmission = async () => {
    if (!selectedVerification || flaggedFields.size === 0) return;
    setProcessing(selectedVerification.id);

    // Build overall note from flagged field comments
    const fieldsArr = [...flaggedFields];
    const noteLines = fieldsArr.map(f => {
      const label = VERIFICATION_FIELD_LABELS[f] || f;
      const comment = fieldComments[f];
      return comment ? `• ${label}: ${comment}` : `• ${label}: Please resubmit`;
    });
    const overallNote = noteLines.join('\n');

    try {
      await adminRequestResubmission(
        selectedVerification.id,
        currentAdminId,
        fieldsArr,
        overallNote,
        false,
        fieldComments
      );
      setVerifications(prev => prev.map(v =>
        v.id === selectedVerification.id
          ? { ...v, status: 'RESUBMISSION_REQUESTED' as const, resubmission_fields: fieldsArr, resubmission_note: overallNote, field_comments: fieldComments }
          : v
      ));
      closeDetail();
    } catch (err: any) {
      console.error('Resubmission request failed:', err);
    } finally {
      setProcessing(null);
    }
  };

  // Toggle flag on a field
  const toggleFlag = (field: string) => {
    setFlaggedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        next.delete(field);
        // Clear comment too
        setFieldComments(fc => { const n = { ...fc }; delete n[field]; return n; });
      } else {
        next.add(field);
      }
      return next;
    });
  };

  const updateFieldComment = (field: string, comment: string) => {
    setFieldComments(prev => ({ ...prev, [field]: comment }));
  };

  const filteredVerifications = verifications.filter(v => {
    if (!search) return true;
    const name = v.profiles?.full_name?.toLowerCase() || '';
    const email = v.profiles?.email?.toLowerCase() || '';
    return name.includes(search.toLowerCase()) || email.includes(search.toLowerCase());
  });

  // Count by status
  const counts = {
    all: verifications.length,
    PENDING: verifications.filter(v => v.status === 'PENDING').length,
    UNDER_REVIEW: verifications.filter(v => v.status === 'UNDER_REVIEW').length,
    RESUBMISSION_REQUESTED: verifications.filter(v => v.status === 'RESUBMISSION_REQUESTED').length,
    APPROVED: verifications.filter(v => v.status === 'APPROVED').length,
    REJECTED: verifications.filter(v => v.status === 'REJECTED').length,
  };

  // ─── Get all fields that have data for this verification ────
  const getVerificationFields = (v: CourtOwnerVerification): { key: string; label: string; url: string | null; isArray?: boolean; urls?: string[] }[] => {
    const fields: { key: string; label: string; url: string | null; isArray?: boolean; urls?: string[] }[] = [];

    if (v.verification_path === 'government_id' || v.government_id_front_url) {
      fields.push({ key: 'government_id_front', label: 'Government ID (Front)', url: v.government_id_front_url });
      if (v.government_id_back_url) {
        fields.push({ key: 'government_id_back', label: 'Government ID (Back)', url: v.government_id_back_url });
      }
      fields.push({ key: 'selfie_with_id', label: 'Selfie Holding ID', url: v.selfie_with_id_url });
    }

    if (v.verification_path === 'court_ownership' || v.ownership_doc_url) {
      fields.push({ key: 'ownership_doc', label: 'Proof of Court Ownership', url: v.ownership_doc_url });
    }

    if (v.business_doc_url) {
      fields.push({ key: 'business_doc', label: 'Business Document', url: v.business_doc_url });
    }

    if (v.court_photo_urls && v.court_photo_urls.length > 0) {
      fields.push({ key: 'court_photos', label: `Court Photos (${v.court_photo_urls.length})`, url: null, isArray: true, urls: v.court_photo_urls });
    }

    if (v.entrance_photo_url) {
      fields.push({ key: 'entrance_photo', label: 'Court Entrance Photo', url: v.entrance_photo_url });
    }

    if (v.facility_photo_url) {
      fields.push({ key: 'facility_photo', label: 'Facility Photo', url: v.facility_photo_url });
    }

    if (v.court_lines_photo_url) {
      fields.push({ key: 'court_lines_photo', label: 'Court Lines & Nets', url: v.court_lines_photo_url });
    }

    fields.push({ key: 'google_maps_link', label: 'Google Maps Location', url: v.google_maps_link });

    return fields;
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER — Main List View
  // ═══════════════════════════════════════════════════════════
  if (!selectedVerification) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm p-8 md:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-200">
                <Shield size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Court Owner Applications</h2>
                <p className="text-xs text-slate-400 font-bold mt-0.5">Review, comment, approve or request resubmission on each field</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search applicant..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-11 pr-4 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 w-56 font-medium"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {(['all', 'PENDING', 'UNDER_REVIEW', 'RESUBMISSION_REQUESTED', 'APPROVED', 'REJECTED'] as FilterStatus[]).map(f => {
              const cfg = f === 'all' ? null : STATUS_CONFIG[f];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                    filter === f
                      ? 'bg-slate-900 text-white shadow-lg'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {f === 'all' ? 'All' : cfg?.label || f}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[8px] ${filter === f ? 'bg-white/20' : 'bg-slate-200'}`}>
                    {counts[f] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-blue-600" />
          </div>
        )}

        {/* Empty */}
        {!loading && filteredVerifications.length === 0 && (
          <div className="text-center py-20 bg-white rounded-[48px] border border-slate-200">
            <Shield size={40} className="mx-auto mb-4 text-slate-200" />
            <p className="text-slate-400 font-black uppercase text-sm tracking-widest">No Applications Found</p>
            <p className="text-xs text-slate-300 font-medium mt-1">No court owner verification applications match your filter</p>
          </div>
        )}

        {/* Application Cards */}
        {!loading && filteredVerifications.map(v => {
          const cfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.PENDING;

          return (
            <div
              key={v.id}
              onClick={() => openDetail(v)}
              className="bg-white rounded-[32px] border border-slate-200 shadow-sm p-6 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border-2 border-slate-200">
                  {v.profiles?.avatar_url ? (
                    <img src={v.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-slate-300" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-slate-900 text-sm truncate group-hover:text-blue-700 transition-colors">
                    {v.profiles?.full_name || 'Unknown Applicant'}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold truncate">{v.profiles?.email}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(v.submitted_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    {v.verification_path && (
                      <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                        {v.verification_path === 'government_id' ? <IdCard size={10} /> : <FileText size={10} />}
                        {v.verification_path === 'government_id' ? 'Gov ID Path' : 'Ownership Path'}
                      </span>
                    )}
                    {v.government_id_type && (
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-50 px-2 py-0.5 rounded-full">
                        {GOVERNMENT_ID_OPTIONS.find(o => o.value === v.government_id_type)?.label || v.government_id_type}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                  {cfg.icon}
                  {cfg.label}
                </div>

                {/* Arrow */}
                <ChevronDown size={18} className="text-slate-300 group-hover:text-blue-500 -rotate-90 transition-all" />
              </div>

              {/* Resubmission banner */}
              {v.status === 'RESUBMISSION_REQUESTED' && v.resubmission_note && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                  <MessageSquare size={12} className="text-orange-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-orange-600 font-bold line-clamp-2">{v.resubmission_note}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER — Detail Review View
  // ═══════════════════════════════════════════════════════════
  const v = selectedVerification;
  const cfg = STATUS_CONFIG[v.status] || STATUS_CONFIG.PENDING;
  const fields = getVerificationFields(v);
  const isActionable = v.status === 'PENDING' || v.status === 'UNDER_REVIEW' || v.status === 'RESUBMISSION_REQUESTED';
  const isProcessingThis = processing === v.id;

  return (
    <div className="space-y-6">
      {/* Back button + Header */}
      <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm p-8 md:p-10">
        <button
          onClick={closeDetail}
          className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-6"
        >
          <RotateCcw size={14} /> Back to All Applications
        </button>

        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border-2 border-slate-200">
            {v.profiles?.avatar_url ? (
              <img src={v.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User size={28} className="text-slate-300" />
            )}
          </div>

          <div className="flex-1">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              {v.profiles?.full_name || 'Unknown Applicant'}
            </h2>
            <p className="text-sm text-slate-400 font-bold">{v.profiles?.email}</p>
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                {cfg.icon} {cfg.label}
              </span>
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                <Calendar size={12} />
                Submitted {new Date(v.submitted_at).toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              {v.verification_path && (
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full flex items-center gap-1">
                  {v.verification_path === 'government_id' ? <IdCard size={12} /> : <FileText size={12} />}
                  Path: {v.verification_path === 'government_id' ? 'Government ID Verification' : 'Court Ownership Documents'}
                </span>
              )}
              {v.government_id_type && (
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                  {GOVERNMENT_ID_OPTIONS.find(o => o.value === v.government_id_type)?.label}
                </span>
              )}
              {v.ownership_doc_type && (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                  {OWNERSHIP_DOC_OPTIONS.find(o => o.value === v.ownership_doc_type)?.label}
                </span>
              )}
              {v.resubmission_count > 0 && (
                <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Hash size={10} /> Resubmission #{v.resubmission_count}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Previous admin note */}
        {v.resubmission_note && v.status === 'RESUBMISSION_REQUESTED' && (
          <div className="mt-4 bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-[10px] font-black text-orange-700 uppercase tracking-wider mb-1">Previous Resubmission Request</p>
            <p className="text-xs text-orange-600 font-medium whitespace-pre-line">{v.resubmission_note}</p>
          </div>
        )}
      </div>

      {/* Instructions banner */}
      {isActionable && (
        <div className="bg-blue-50 border border-blue-200 rounded-[32px] p-6 flex items-start gap-3">
          <Eye size={18} className="text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-black text-blue-900">Review Each Document Below</p>
            <p className="text-xs text-blue-600 font-medium mt-0.5">
              Click the <strong className="text-orange-600">🚩 Flag</strong> button on any field that needs correction. Add a comment explaining what's wrong.
              Then click <strong>"Send Resubmission Request"</strong> or <strong>"Approve"</strong> if everything looks good.
            </p>
          </div>
        </div>
      )}

      {/* ─── Document Review Cards ─── */}
      <div className="space-y-4">
        {fields.map(field => {
          const isFlagged = flaggedFields.has(field.key);
          const comment = fieldComments[field.key] || '';
          const hasUrl = !!field.url || (field.isArray && field.urls && field.urls.length > 0);

          return (
            <div
              key={field.key}
              className={`bg-white rounded-[32px] border-2 shadow-sm overflow-hidden transition-all ${
                isFlagged ? 'border-orange-300 bg-orange-50/30' : 'border-slate-200'
              }`}
            >
              {/* Field Header */}
              <div className="flex items-center justify-between p-5 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    !hasUrl ? 'bg-slate-100 text-slate-300' : isFlagged ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'
                  }`}>
                    {field.key.includes('id') || field.key === 'selfie_with_id' ? <IdCard size={18} /> :
                     field.key.includes('photo') || field.key.includes('court') || field.key.includes('entrance') || field.key.includes('facility') ? <Camera size={18} /> :
                     field.key.includes('map') || field.key.includes('location') ? <MapPin size={18} /> :
                     field.key.includes('business') ? <Briefcase size={18} /> :
                     <FileText size={18} />}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">{field.label}</h4>
                    {!hasUrl && (
                      <p className="text-[10px] text-slate-400 font-bold">Not submitted</p>
                    )}
                  </div>
                </div>

                {/* Flag button */}
                {isActionable && hasUrl && (
                  <button
                    onClick={() => toggleFlag(field.key)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      isFlagged
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-200'
                        : 'bg-slate-100 text-slate-400 hover:bg-orange-100 hover:text-orange-600'
                    }`}
                  >
                    {isFlagged ? <><XCircle size={12} /> Flagged</> : <><AlertTriangle size={12} /> Flag Issue</>}
                  </button>
                )}

                {!isActionable && hasUrl && (
                  <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 size={12} /> Submitted
                  </span>
                )}
              </div>

              {/* Content: Image Preview / Maps Link */}
              {hasUrl && (
                <div className="px-5 pb-3">
                  {field.key === 'google_maps_link' ? (
                    <div className="flex items-center gap-3">
                      {field.url ? (
                        <>
                          <a
                            href={field.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            <MapPin size={14} /> Open in Google Maps <ExternalLink size={10} />
                          </a>
                          {v.latitude && v.longitude && (
                            <span className="text-[10px] font-bold text-slate-400">
                              Coords: {v.latitude.toFixed(6)}, {v.longitude.toFixed(6)}
                            </span>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-slate-400">Not provided</p>
                      )}
                    </div>
                  ) : field.isArray && field.urls ? (
                    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {field.urls.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => setZoomedImage(url)}
                          className="rounded-xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all relative group aspect-square"
                        >
                          <img src={url} alt={`Court ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                            <ZoomIn size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : field.url && isImageUrl(field.url) ? (
                    <button
                      onClick={() => setZoomedImage(field.url!)}
                      className="rounded-2xl overflow-hidden border-2 border-slate-200 hover:border-blue-400 transition-all relative group inline-block"
                    >
                      <img src={field.url} alt={field.label} className="h-48 max-w-full object-contain bg-slate-50" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  ) : field.url ? (
                    <a
                      href={field.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <FileText size={14} /> View Document <ExternalLink size={10} />
                    </a>
                  ) : null}
                </div>
              )}

              {/* Per-field Comment Input (when flagged) */}
              {isFlagged && isActionable && (
                <div className="px-5 pb-5 pt-2">
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                    <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2 block flex items-center gap-1">
                      <MessageSquare size={10} /> Comment for Applicant
                    </label>
                    <textarea
                      value={comment}
                      onChange={(e) => updateFieldComment(field.key, e.target.value)}
                      placeholder={`Explain what's wrong with this ${field.label.toLowerCase()}...`}
                      className="w-full px-4 py-3 rounded-xl border border-orange-200 bg-white font-medium text-sm focus:outline-none focus:border-orange-400 min-h-[80px] resize-none transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Show existing comment from previous review (read-only) */}
              {!isActionable && v.field_comments && v.field_comments[field.key] && (
                <div className="px-5 pb-5">
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-start gap-2">
                    <MessageSquare size={12} className="text-orange-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] font-black text-orange-600 uppercase tracking-wider">Admin Comment</p>
                      <p className="text-xs text-orange-700 font-medium">{v.field_comments[field.key]}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ─── Action Bar ─── */}
      {isActionable && (
        <div className="bg-white rounded-[48px] border border-slate-200 shadow-sm p-8">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Review Decision</h3>

          {/* Flagged fields summary */}
          {flaggedFields.size > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4">
              <p className="text-[10px] font-black text-orange-700 uppercase tracking-wider mb-2">
                🚩 {flaggedFields.size} Field{flaggedFields.size > 1 ? 's' : ''} Flagged for Resubmission:
              </p>
              <div className="flex flex-wrap gap-2">
                {[...flaggedFields].map(f => (
                  <span key={f} className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-lg text-[10px] font-bold">
                    {VERIFICATION_FIELD_LABELS[f] || f}
                    {fieldComments[f] && <span className="text-orange-400 ml-1">💬</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Approval note */}
          {flaggedFields.size === 0 && (
            <div className="mb-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                Approval Note (optional)
              </label>
              <textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder="Add a note for your records..."
                className="w-full px-5 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium text-sm focus:outline-none focus:border-blue-500 min-h-[80px] resize-none transition-all"
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {flaggedFields.size > 0 ? (
              <button
                disabled={isProcessingThis}
                onClick={handleRequestResubmission}
                className="flex-1 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-orange-200 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isProcessingThis ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                Send Resubmission Request ({flaggedFields.size} field{flaggedFields.size > 1 ? 's' : ''})
              </button>
            ) : (
              <button
                disabled={isProcessingThis}
                onClick={handleApprove}
                className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:from-emerald-600 hover:to-green-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isProcessingThis ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />}
                Approve Application
              </button>
            )}

            <button
              disabled={isProcessingThis}
              onClick={() => setShowRejectModal(true)}
              className="px-8 py-4 bg-red-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-600 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              <ThumbsDown size={14} /> Reject
            </button>
          </div>
        </div>
      )}

      {/* ─── Image Zoom Modal ─── */}
      {zoomedImage && ReactDOM.createPortal(
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[120] flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <X size={24} className="text-white" />
          </button>
          <img
            src={zoomedImage}
            alt="Zoomed"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
        document.body
      )}

      {/* ─── Reject Confirmation Modal ─── */}
      {showRejectModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-300 p-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
                <XCircle size={24} className="text-red-500" /> Reject Application
              </h3>
              <button onClick={() => setShowRejectModal(false)} className="p-2 hover:bg-slate-100 rounded-xl">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <p className="text-sm text-slate-500 font-medium mb-4">
              This will permanently reject <strong>{v.profiles?.full_name || 'this applicant'}</strong>'s court owner verification.
            </p>

            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
              Rejection Reason
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this application is being rejected..."
              className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium text-sm focus:outline-none focus:border-red-500 min-h-[100px] resize-none transition-all mb-6"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={isProcessingThis}
                onClick={handleReject}
                className="flex-1 py-4 bg-red-500 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isProcessingThis ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminVerificationPanel;
