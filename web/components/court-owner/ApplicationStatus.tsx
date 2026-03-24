import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  FileText,
  Camera,
  MapPin,
  ExternalLink,
  Upload,
  Trash2,
  Loader2,
  ArrowLeft,
  Image,
  IdCard,
  Briefcase,
  Building2,
  AlertCircle,
  X,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  CourtOwnerVerification,
  getMyVerification,
  resubmitVerification,
  uploadVerificationFile,
  GOVERNMENT_ID_OPTIONS,
  OWNERSHIP_DOC_OPTIONS,
  BUSINESS_DOC_OPTIONS,
  VERIFICATION_FIELD_LABELS,
  IDS_NEEDING_BACK,
} from '../../services/courtOwnerVerification';

const STATUS_CONFIG = {
  PENDING: {
    color: 'amber',
    icon: Clock,
    label: 'Pending Review',
    message: 'Your application has been submitted successfully! Our team will review your documents within 3–5 business days. You will be notified once reviewed.',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    iconBg: 'bg-amber-100',
  },
  PENDING_REVIEW: {
    color: 'amber',
    icon: Clock,
    label: 'Queued for Review',
    message: 'We received your submission and placed it in the review queue. You will be notified once an admin starts the review.',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    iconBg: 'bg-amber-100',
  },
  READY_FOR_REVIEW: {
    color: 'blue',
    icon: Shield,
    label: 'Ready for Review',
    message: 'Your documents look good and are ready for an admin to review. Please wait for the final check.',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    iconBg: 'bg-blue-100',
  },
  INCOMPLETE: {
    color: 'orange',
    icon: AlertTriangle,
    label: 'Incomplete',
    message: 'Some required fields or documents are missing. Please update your submission to continue.',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    iconBg: 'bg-orange-100',
  },
  UNDER_REVIEW: {
    color: 'blue',
    icon: Shield,
    label: 'Under Review',
    message: 'An admin is currently reviewing your submitted documents. Please wait for the review to be completed.',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    iconBg: 'bg-blue-100',
  },
  RESUBMISSION_REQUESTED: {
    color: 'orange',
    icon: AlertTriangle,
    label: 'Resubmission Required',
    message: 'Some of your documents need to be updated. Please check the details below and resubmit the requested items.',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-700',
    iconBg: 'bg-orange-100',
  },
  APPROVED: {
    color: 'emerald',
    icon: CheckCircle2,
    label: 'Approved',
    message: 'Congratulations! Your court owner verification has been approved. You now have full access to court management features.',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
  },
  VERIFIED: {
    color: 'emerald',
    icon: CheckCircle2,
    label: 'Verified',
    message: 'Your court owner verification is fully verified. Enjoy full access to court management features.',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    iconBg: 'bg-emerald-100',
  },
  REJECTED: {
    color: 'red',
    icon: XCircle,
    label: 'Rejected',
    message: 'Unfortunately, your verification was not approved. You may submit a new application with updated documents.',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-700',
    iconBg: 'bg-red-100',
  },
};

const ApplicationStatus: React.FC = () => {
  const navigate = useNavigate();
  const [verification, setVerification] = useState<CourtOwnerVerification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  // Resubmission state
  const [resubFiles, setResubFiles] = useState<Record<string, File | null>>({});
  const [resubPreviews, setResubPreviews] = useState<Record<string, string>>({});
  const [resubCourtPhotos, setResubCourtPhotos] = useState<File[]>([]);
  const [resubCourtPhotoPreviews, setResubCourtPhotoPreviews] = useState<string[]>([]);
  const [resubGoogleMaps, setResubGoogleMaps] = useState('');

  useEffect(() => {
    fetchVerification();
  }, []);

  const fetchVerification = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      const v = await getMyVerification(user.id);
      setVerification(v);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmitFile = (field: string, file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) { setError('Invalid file type'); return; }
    if (file.size > 10 * 1024 * 1024) { setError('File too large (max 10MB)'); return; }
    setError('');
    setResubFiles(prev => ({ ...prev, [field]: file }));
    if (file.type.startsWith('image/')) {
      setResubPreviews(prev => ({ ...prev, [field]: URL.createObjectURL(file) }));
    } else {
      setResubPreviews(prev => ({ ...prev, [field]: 'pdf' }));
    }
  };

  const handleSubmitResubmission = async () => {
    if (!verification) return;
    setResubmitting(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updates: Partial<CourtOwnerVerification> = {};

      // Upload each resubmission file
      for (const [field, file] of Object.entries(resubFiles)) {
        if (!file) continue;
        const url = await uploadVerificationFile(user.id, file as File, `resub-${field}`);
        switch (field) {
          case 'government_id_front': updates.government_id_front_url = url; break;
          case 'government_id_back': updates.government_id_back_url = url; break;
          case 'selfie_with_id': updates.selfie_with_id_url = url; break;
          case 'ownership_doc': updates.ownership_doc_url = url; break;
          case 'business_doc': updates.business_doc_url = url; break;
          case 'entrance_photo': updates.entrance_photo_url = url; break;
          case 'facility_photo': updates.facility_photo_url = url; break;
          case 'court_lines_photo': updates.court_lines_photo_url = url; break;
        }
      }

      // Court photos
      if (resubCourtPhotos.length > 0) {
        const urls = await Promise.all(
          resubCourtPhotos.map(f => uploadVerificationFile(user.id, f, 'court-photos-resub'))
        );
        updates.court_photo_urls = urls;
      }

      // Google Maps
      if (resubGoogleMaps) {
        updates.google_maps_link = resubGoogleMaps;
      }

      await resubmitVerification(verification.id, updates);
      await fetchVerification();

      // Reset
      setResubFiles({});
      setResubPreviews({});
      setResubCourtPhotos([]);
      setResubCourtPhotoPreviews([]);
      setResubGoogleMaps('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!verification) {
    return (
      <div className="max-w-2xl mx-auto p-6 md:p-10 pt-24 md:pt-32">
        <div className="bg-white rounded-[40px] p-10 md:p-14 border border-slate-200 shadow-sm text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <FileText size={36} className="text-slate-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter mb-2">No Application Found</h2>
          <p className="text-slate-500 font-medium text-sm mb-8">
            You haven't submitted a court owner verification yet. Go to your dashboard to start the application process.
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const config = STATUS_CONFIG[verification.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = config.icon;
  const needsResub = verification.status === 'RESUBMISSION_REQUESTED';
  const resubFields = verification.resubmission_fields || [];

  const contactAndLocation = [
    { label: 'Court / Location Name', value: verification.court_location_name },
    { label: 'Phone', value: verification.contact_phone },
    { label: 'Email', value: verification.contact_email },
  ];

  const addressItems = [
    { label: 'Street', value: verification.address_street },
    { label: 'Barangay', value: verification.address_barangay },
    { label: 'City', value: verification.address_city },
    { label: 'Province', value: verification.address_province },
    { label: 'ZIP Code', value: verification.address_zip_code },
  ];

  const businessItems = [
    { label: 'Business Type', value: verification.business_type ? verification.business_type === 'commercial' ? 'Commercial' : 'Personal' : null },
    { label: 'Business Document', value: verification.business_doc_type ? BUSINESS_DOC_OPTIONS.find(o => o.value === verification.business_doc_type)?.label : null },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 pt-20 md:pt-28 space-y-8">
      {/* Back button */}
      <button
        onClick={() => navigate('/dashboard')}
        className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold text-sm transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* Status Header Card */}
      <div className={`${config.bg} ${config.border} border-2 rounded-[40px] p-8 md:p-12`}>
        <div className="flex items-center gap-5 mb-6">
          <div className={`w-16 h-16 ${config.iconBg} rounded-2xl flex items-center justify-center`}>
            <StatusIcon size={32} className={config.text} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter">
              Application Status
            </h1>
            <div className={`inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full ${config.bg} ${config.text} text-[10px] font-black uppercase tracking-widest border ${config.border}`}>
              <StatusIcon size={12} />
              {config.label}
            </div>
          </div>
        </div>
        <p className={`${config.text} font-medium text-sm leading-relaxed`}>
          {config.message}
        </p>
        {verification.resubmission_count > 0 && (
          <p className="mt-3 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
            Resubmission count: {verification.resubmission_count}
          </p>
        )}
      </div>

      {/* Contact + Location Details */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-3">
          <MapPin size={18} className="text-red-600" />
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Court & Contact Details</h3>
        </div>
        <div className="p-8 space-y-6">
          <InfoGroup title="Contact" items={contactAndLocation} />
          <InfoGroup title="Address" items={addressItems} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoTile
              label="Google Maps"
              value={verification.google_maps_link ? (
                <a href={verification.google_maps_link} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold text-xs hover:text-blue-800 inline-flex items-center gap-2">
                  <ExternalLink size={12} /> View on Maps
                </a>
              ) : 'Not provided'}
            />
            <InfoTile
              label="Coordinates"
              value={(verification.latitude && verification.longitude) ? `${verification.latitude}, ${verification.longitude}` : 'Not provided'}
            />
          </div>
          <InfoGroup title="Business" items={businessItems} />
        </div>
      </div>

      {/* Admin Note (if resubmission) */}
      {needsResub && verification.resubmission_note && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-[32px] p-6 md:p-8">
          <h3 className="text-sm font-black text-orange-800 uppercase tracking-tight mb-3 flex items-center gap-2">
            <AlertTriangle size={16} />
            Admin Feedback
          </h3>
          <p className="text-orange-700 font-medium text-sm leading-relaxed whitespace-pre-line">
            {verification.resubmission_note}
          </p>
        </div>
      )}

      {/* Per-Field Admin Comments (if resubmission) */}
      {needsResub && verification.field_comments && Object.keys(verification.field_comments).length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-[32px] p-6 md:p-8 space-y-4">
          <h3 className="text-sm font-black text-orange-800 uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle size={16} />
            Fields Needing Correction
          </h3>
          {Object.entries(verification.field_comments).map(([field, comment]) => (
            <div key={field} className="bg-white rounded-xl border border-orange-200 p-4 flex items-start gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
                <AlertCircle size={14} className="text-orange-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest">
                  {VERIFICATION_FIELD_LABELS[field] || field}
                </p>
                <p className="text-xs text-orange-600 font-medium mt-0.5">{comment}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Document Summary */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Submitted Documents</h3>
        </div>

        <div className="p-8 space-y-6">
          {/* Government ID */}
          <DocumentRow
            label="Government ID"
            icon={<IdCard size={18} className="text-blue-600" />}
            value={GOVERNMENT_ID_OPTIONS.find(o => o.value === verification.government_id_type)?.label || '—'}
            files={[
              { label: 'Front', url: verification.government_id_front_url },
              ...(verification.government_id_back_url ? [{ label: 'Back', url: verification.government_id_back_url }] : []),
              { label: 'Selfie', url: verification.selfie_with_id_url },
            ]}
            needsResub={needsResub && (resubFields.includes('government_id_front') || resubFields.includes('government_id_back') || resubFields.includes('selfie_with_id'))}
          />

          {/* Ownership */}
          <DocumentRow
            label="Proof of Ownership"
            icon={<FileText size={18} className="text-emerald-600" />}
            value={OWNERSHIP_DOC_OPTIONS.find(o => o.value === verification.ownership_doc_type)?.label || '—'}
            files={[{ label: 'Document', url: verification.ownership_doc_url }]}
            needsResub={needsResub && resubFields.includes('ownership_doc')}
          />

          {/* Business */}
          {verification.business_doc_type && (
            <DocumentRow
              label="Business Legitimacy"
              icon={<Briefcase size={18} className="text-purple-600" />}
              value={BUSINESS_DOC_OPTIONS.find(o => o.value === verification.business_doc_type)?.label || '—'}
              files={[{ label: 'Document', url: verification.business_doc_url }]}
              needsResub={needsResub && resubFields.includes('business_doc')}
            />
          )}

          {/* Court Photos */}
          <div className={`p-5 rounded-2xl border ${needsResub && resubFields.includes('court_photos') ? 'border-orange-300 bg-orange-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="flex items-center gap-3 mb-3">
              <Camera size={18} className="text-amber-600" />
              <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Court Photos</span>
              <span className="text-[10px] font-bold text-slate-400">{verification.court_photo_urls?.length || 0} photos</span>
              {needsResub && resubFields.includes('court_photos') && (
                <span className="ml-auto px-2 py-0.5 bg-orange-200 text-orange-700 text-[9px] font-black uppercase rounded-full">Needs Update</span>
              )}
            </div>
            {verification.court_photo_urls && verification.court_photo_urls.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {verification.court_photo_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition-all">
                    <img src={url} alt={`Court ${i + 1}`} className="w-full h-20 object-cover" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Location */}
          <div className={`p-5 rounded-2xl border ${needsResub && resubFields.includes('google_maps_link') ? 'border-orange-300 bg-orange-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-red-600" />
              <span className="text-sm font-black text-slate-900 uppercase tracking-tight">Location</span>
              {needsResub && resubFields.includes('google_maps_link') && (
                <span className="ml-auto px-2 py-0.5 bg-orange-200 text-orange-700 text-[9px] font-black uppercase rounded-full">Needs Update</span>
              )}
            </div>
            {verification.google_maps_link ? (
              <a
                href={verification.google_maps_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-2 text-xs text-blue-600 font-bold hover:text-blue-800 transition-colors"
              >
                <ExternalLink size={12} /> View on Google Maps
              </a>
            ) : (
              <p className="mt-2 text-xs text-slate-400 font-medium">Not provided</p>
            )}
            {verification.latitude && verification.longitude && (
              <p className="text-[10px] text-slate-400 mt-1">Coordinates: {verification.latitude}, {verification.longitude}</p>
            )}
          </div>
        </div>
      </div>

      {/* Resubmission Form */}
      {needsResub && (
        <div className="bg-white rounded-[40px] border-2 border-orange-200 shadow-sm overflow-hidden">
          <div className="px-8 py-6 bg-orange-50 border-b border-orange-100">
            <h3 className="text-lg font-black text-orange-800 uppercase tracking-tight flex items-center gap-2">
              <RefreshCw size={18} />
              Resubmit Documents
            </h3>
            <p className="text-orange-600 text-xs font-medium mt-1">Update the items highlighted below and submit</p>
          </div>

          <div className="p-8 space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {resubFields.map(field => {
              if (field === 'court_photos') {
                return (
                  <div key={field} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                      {VERIFICATION_FIELD_LABELS[field]} <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {resubCourtPhotoPreviews.map((p, i) => (
                        <div key={i} className="relative group rounded-xl overflow-hidden border border-blue-200">
                          <img src={p} alt="" className="w-full h-20 object-cover" />
                          <button
                            onClick={() => {
                              setResubCourtPhotos(prev => prev.filter((_, idx) => idx !== i));
                              setResubCourtPhotoPreviews(prev => prev.filter((_, idx) => idx !== i));
                            }}
                            className="absolute top-1 right-1 p-0.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 transition-all">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []) as File[];
                            files.forEach((f: File) => {
                              if (f.size > 10 * 1024 * 1024) return;
                              setResubCourtPhotos(prev => [...prev, f]);
                              setResubCourtPhotoPreviews(prev => [...prev, URL.createObjectURL(f)]);
                            });
                            if (e.target) e.target.value = '';
                          }}
                        />
                        <Upload size={14} className="text-slate-300" />
                      </label>
                    </div>
                  </div>
                );
              }

              if (field === 'google_maps_link') {
                return (
                  <div key={field} className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                      {VERIFICATION_FIELD_LABELS[field]}
                    </label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={resubGoogleMaps}
                      onChange={(e) => setResubGoogleMaps(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 font-medium text-sm focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>
                );
              }

              // Regular file upload field
              return (
                <div key={field} className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                    {VERIFICATION_FIELD_LABELS[field]} <span className="text-red-500">*</span>
                  </label>
                  {resubPreviews[field] ? (
                    <div className="relative group rounded-2xl overflow-hidden border-2 border-blue-200 bg-blue-50">
                      {resubPreviews[field] === 'pdf' ? (
                        <div className="flex items-center justify-center h-28 text-blue-600">
                          <FileText size={24} />
                          <span className="ml-2 text-sm font-bold">PDF</span>
                        </div>
                      ) : (
                        <img src={resubPreviews[field]} alt={field} className="w-full h-32 object-cover" />
                      )}
                      <button
                        onClick={() => {
                          setResubFiles(prev => ({ ...prev, [field]: null }));
                          setResubPreviews(prev => ({ ...prev, [field]: '' }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-orange-200 bg-orange-50/50 rounded-2xl cursor-pointer hover:border-blue-400 transition-all">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleResubmitFile(field, f);
                          if (e.target) e.target.value = '';
                        }}
                      />
                      <Upload size={18} className="text-orange-300 mb-1" />
                      <p className="text-[10px] font-black text-orange-400 uppercase">Upload New</p>
                    </label>
                  )}
                </div>
              );
            })}

            <button
              disabled={resubmitting}
              onClick={handleSubmitResubmission}
              className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {resubmitting ? (
                <><Loader2 size={14} className="animate-spin" /> Resubmitting...</>
              ) : (
                <><RefreshCw size={14} /> Submit Updated Documents</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-slate-50 rounded-[32px] border border-slate-100 p-6 flex flex-wrap gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Submitted: {new Date(verification.submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        {verification.reviewed_at && (
          <span>Last Reviewed: {new Date(verification.reviewed_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        )}
        <span>Updated: {new Date(verification.updated_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </div>
  );
};

// ─── Document Row Component ───
const DocumentRow: React.FC<{
  label: string;
  icon: React.ReactNode;
  value: string;
  files: { label: string; url: string | null }[];
  needsResub?: boolean;
}> = ({ label, icon, value, files, needsResub }) => (
  <div className={`p-5 rounded-2xl border ${needsResub ? 'border-orange-300 bg-orange-50/50' : 'border-slate-100 bg-slate-50/50'}`}>
    <div className="flex items-center gap-3 mb-2">
      {icon}
      <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{label}</span>
      <span className="text-[10px] font-bold text-slate-400">{value}</span>
      {needsResub && (
        <span className="ml-auto px-2 py-0.5 bg-orange-200 text-orange-700 text-[9px] font-black uppercase rounded-full">Needs Update</span>
      )}
    </div>
    <div className="flex flex-wrap gap-2 mt-2">
      {files.map((f, i) =>
        f.url ? (
          <a
            key={i}
            href={f.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-blue-600 hover:border-blue-300 transition-colors"
          >
            <ExternalLink size={10} /> {f.label}
          </a>
        ) : null
      )}
    </div>
  </div>
);

const InfoGroup: React.FC<{ title: string; items: { label: string; value: React.ReactNode }[] }> = ({ title, items }) => (
  <div className="space-y-2">
    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em]">{title}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map(({ label, value }) => (
        <InfoTile key={label} label={label} value={value || 'Not provided'} />
      ))}
    </div>
  </div>
);

const InfoTile: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.12em]">{label}</p>
    <div className="mt-1 text-sm font-semibold text-slate-800 break-words">{value}</div>
  </div>
);

export default ApplicationStatus;
