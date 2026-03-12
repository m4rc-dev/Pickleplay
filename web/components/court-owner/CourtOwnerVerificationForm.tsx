import React, { useState, useRef, useCallback, useEffect, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom';
import {
  Shield,
  Camera,
  Upload,
  MapPin,
  Building2,
  FileText,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  X,
  Image,
  Trash2,
  HelpCircle,
  ExternalLink,
  Loader2,
  IdCard,
  Briefcase,
  Map,
  ScanLine,
  Eye,
  ShieldAlert,
  ShieldCheck,
  Brain,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  GOVERNMENT_ID_OPTIONS,
  OWNERSHIP_DOC_OPTIONS,
  BUSINESS_DOC_OPTIONS,
  IDS_NEEDING_BACK,
  uploadVerificationFile,
  submitVerification,
} from '../../services/courtOwnerVerification';
import {
  checkImageBlur,
  checkNameMatch,
  type BlurCheckResult,
  type NameMatchResult,
} from '../../services/imageValidation';
import CameraCapture from '../ui/CameraCapture';

// Lazy-load TF.js classifier (heavy — only load when needed)
const classifierPromise = () => import('../../services/idClassifier.ts');
type ClassifyResult = Awaited<ReturnType<Awaited<ReturnType<typeof classifierPromise>>['classifyID']>>;

interface CourtOwnerVerificationFormProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  applicationId?: string;
  onSubmitApplication?: (app: {
    playerId: string;
    playerName: string;
    requestedRole: string;
    experienceSummary: string;
    documentName: string;
  }) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return `${file.name}: Invalid file type. Use JPEG, PNG, WebP, or PDF.`;
  if (file.size > MAX_FILE_SIZE) return `${file.name}: File too large (max 10MB).`;
  return null;
}

const ALL_STEPS = {
  choose: { id: 'choose', label: 'Choose Path', icon: Shield },
  id: { id: 'id', label: 'Government ID', icon: IdCard },
  ownership: { id: 'ownership', label: 'Court Ownership', icon: FileText },
  business: { id: 'business', label: 'Business Docs', icon: Briefcase },
  photos: { id: 'photos', label: 'Court Photos', icon: Camera },
  location: { id: 'location', label: 'Location', icon: Map },
};

// ─── Upload Zone Component (extracted to avoid re-mount on re-render) ───
const UploadZone: React.FC<{
  label: string;
  required?: boolean;
  preview: string;
  onFile: (f: File) => void;
  onRemove: () => void;
  hint?: string;
  onCamera?: () => void;
  acceptPdf?: boolean;
}> = ({ label, required, preview, onFile, onRemove, hint, onCamera, acceptPdf = true }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {preview ? (
      <div className="relative group rounded-2xl overflow-hidden border-2 border-blue-200 bg-blue-50">
        {preview === 'pdf' ? (
          <div className="flex items-center justify-center h-32 text-blue-600">
            <FileText size={32} />
            <span className="ml-2 text-sm font-bold">PDF Document</span>
          </div>
        ) : (
          <img src={preview} alt={label} className="w-full h-40 object-cover" />
        )}
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
        >
          <Trash2 size={14} />
        </button>
      </div>
    ) : (
      <div className="flex gap-2">
        {/* Upload button */}
        <label className="flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
          <input
            type="file"
            accept={acceptPdf ? 'image/*,application/pdf' : 'image/*'}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = '';
            }}
          />
          <Upload size={20} className="text-slate-300 mb-1" />
          <p className="text-[10px] font-black text-slate-400 uppercase">Upload</p>
          {hint && <p className="text-[9px] text-slate-300 mt-0.5 text-center px-2">{hint}</p>}
        </label>
        {/* Camera button */}
        {onCamera && (
          <button
            type="button"
            onClick={onCamera}
            className="w-28 flex flex-col items-center justify-center h-32 border-2 border-dashed border-emerald-200 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50/50 transition-all"
          >
            <Camera size={20} className="text-emerald-400 mb-1" />
            <p className="text-[10px] font-black text-emerald-500 uppercase">Camera</p>
            <p className="text-[8px] text-emerald-400 mt-0.5">Take Photo</p>
          </button>
        )}
      </div>
    )}
  </div>
);

const CourtOwnerVerificationForm: React.FC<CourtOwnerVerificationFormProps> = ({
  open,
  onClose,
  onSuccess,
  applicationId,
  onSubmitApplication,
}) => {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ─── Verification Path Selection ───
  const [verificationPath, setVerificationPath] = useState<'government_id' | 'court_ownership' | ''>('');

  // Compute dynamic steps based on chosen path
  const STEPS = (() => {
    if (verificationPath === 'government_id') {
      return [ALL_STEPS.choose, ALL_STEPS.id, ALL_STEPS.business, ALL_STEPS.photos, ALL_STEPS.location];
    } else if (verificationPath === 'court_ownership') {
      return [ALL_STEPS.choose, ALL_STEPS.ownership, ALL_STEPS.business, ALL_STEPS.photos, ALL_STEPS.location];
    }
    // No path selected yet — only the choose step
    return [ALL_STEPS.choose];
  })();

  // ─── Image Validation State ───
  const [profileFullName, setProfileFullName] = useState('');
  const [isScanning, setIsScanning] = useState<string>(''); // which field is being scanned
  const [blurResults, setBlurResults] = useState<Record<string, BlurCheckResult>>({});
  const [nameMatchResult, setNameMatchResult] = useState<NameMatchResult | null>(null);
  const [nameWarningDismissed, setNameWarningDismissed] = useState(false);

  // ─── ID Classification State (TF.js) ───
  const [classifyResult, setClassifyResult] = useState<ClassifyResult | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifierReady, setClassifierReady] = useState(false);
  const [classifyWarningDismissed, setClassifyWarningDismissed] = useState(false);

  // ─── Camera Capture State ───
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<{
    setFile: (f: File | null) => void;
    setPreview: (s: string) => void;
    fieldName?: string;
    runNameCheck?: boolean;
  } | null>(null);

  // Fetch user's profile name on mount
  useEffect(() => {
    const fetchProfileName = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
        if (data?.full_name) setProfileFullName(data.full_name);
      } catch (err) {
        console.error('Failed to fetch profile name:', err);
      }
    };
    fetchProfileName();

    // Pre-warm TF.js classifier in background (non-blocking)
    classifierPromise().then(async (mod) => {
      try {
        const trained = await mod.isClassifierTrained();
        if (trained) {
          await mod.initClassifier();
          setClassifierReady(true);
        }
      } catch (e) {
        console.warn('ID classifier pre-warm skipped:', e);
      }
    }).catch(() => {});
  }, []);

  // Step 1: Government ID
  const [govIdType, setGovIdType] = useState('');
  const [govIdFront, setGovIdFront] = useState<File | null>(null);
  const [govIdFrontPreview, setGovIdFrontPreview] = useState<string>('');
  const [govIdBack, setGovIdBack] = useState<File | null>(null);
  const [govIdBackPreview, setGovIdBackPreview] = useState<string>('');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>('');

  // Step 2: Court Ownership
  const [ownershipDocType, setOwnershipDocType] = useState('');
  const [ownershipDoc, setOwnershipDoc] = useState<File | null>(null);
  const [ownershipDocPreview, setOwnershipDocPreview] = useState<string>('');

  // Step 3: Business Legitimacy (optional)
  const [businessDocType, setBusinessDocType] = useState('');
  const [businessDoc, setBusinessDoc] = useState<File | null>(null);
  const [businessDocPreview, setBusinessDocPreview] = useState<string>('');

  // Step 4: Court Photos
  const [courtPhotos, setCourtPhotos] = useState<File[]>([]);
  const [courtPhotoPreviews, setCourtPhotoPreviews] = useState<string[]>([]);
  const [entrancePhoto, setEntrancePhoto] = useState<File | null>(null);
  const [entrancePhotoPreview, setEntrancePhotoPreview] = useState<string>('');
  const [facilityPhoto, setFacilityPhoto] = useState<File | null>(null);
  const [facilityPhotoPreview, setFacilityPhotoPreview] = useState<string>('');
  const [courtLinesPhoto, setCourtLinesPhoto] = useState<File | null>(null);
  const [courtLinesPhotoPreview, setCourtLinesPhotoPreview] = useState<string>('');

  // Step 5: Location
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  const needsBack = IDS_NEEDING_BACK.includes(govIdType);

  // ─── File handler helpers ───
  const handleSingleFile = useCallback((
    file: File,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
    fieldName?: string,
    runNameCheck?: boolean
  ) => {
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError('');

    // 1) Set file AND preview IMMEDIATELY — never block the user
    const previewUrl = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : 'pdf';
    setFile(file);
    setPreview(previewUrl);

    // 2) Run image validation in the BACKGROUND (non-blocking)
    if (file.type.startsWith('image/') && fieldName) {
      // Defer heavy processing so the UI paints the preview first
      setTimeout(() => {
        setIsScanning(fieldName);

        checkImageBlur(file).then((blurResult) => {
          setBlurResults(prev => ({ ...prev, [fieldName]: blurResult }));

          if (blurResult.isBlurry) {
            // Revoke preview URL & clear file
            if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
            setPreview('');
            setFile(null);
            setError(`⚠️ Your ${fieldName.replace(/_/g, ' ')} photo is too blurry. Please retake with better lighting and hold your camera steady.`);
            setIsScanning('');
            return;
          }

          // Run ID template classification (TF.js) for front ID
          if (fieldName === 'id_front' && govIdType) {
            setIsClassifying(true);
            classifierPromise().then(async (mod) => {
              try {
                if (await mod.isClassifierTrained()) {
                  if (!mod.isReady()) await mod.initClassifier();
                  const result = await mod.classifyID(file, govIdType);
                  setClassifyResult(result);
                  setClassifyWarningDismissed(false);
                }
              } catch (e) {
                console.warn('ID classification skipped:', e);
              } finally {
                setIsClassifying(false);
              }
            }).catch(() => setIsClassifying(false));
          }

          // Run OCR name check if this is the front ID
          if (runNameCheck && profileFullName) {
            checkNameMatch(file, profileFullName).then((nameResult) => {
              setNameMatchResult(nameResult);
              setNameWarningDismissed(false);
              setIsScanning('');
            }).catch(() => setIsScanning(''));
          } else {
            setIsScanning('');
          }
        }).catch(() => {
          setIsScanning('');
        });
      }, 50); // small delay lets the browser paint the preview first
    }
  }, [profileFullName, govIdType]);

  const handleMultipleFiles = useCallback((
    files: File[],
    existingFiles: File[],
    setFiles: (f: File[]) => void,
    existingPreviews: string[],
    setPreviews: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const valid: File[] = [];
    for (const f of files) {
      const err = validateFile(f);
      if (err) { setError(err); return; }
      valid.push(f);
    }
    setError('');
    const newFiles = [...existingFiles, ...valid];
    setFiles(newFiles);

    // Generate previews instantly via createObjectURL (no base64 overhead)
    const newPreviews = valid.map(f =>
      f.type.startsWith('image/') ? URL.createObjectURL(f) : 'pdf'
    );
    setPreviews(prev => [...prev, ...newPreviews]);
  }, []);

  // ─── Step validation ───
  const isStepValid = (s: number): boolean => {
    const currentStepId = STEPS[s]?.id;
    switch (currentStepId) {
      case 'choose': // Path selection
        return verificationPath !== '';
      case 'id': // Gov ID
        if (!govIdType || !govIdFront || !selfieFile) return false;
        if (needsBack && !govIdBack) return false;
        // Block if any ID image is blurry
        if (blurResults['id_front']?.isBlurry) return false;
        if (blurResults['id_back']?.isBlurry) return false;
        if (blurResults['selfie']?.isBlurry) return false;
        // Block if name mismatch and not dismissed
        if (nameMatchResult && !nameMatchResult.matched && !nameWarningDismissed) return false;
        // Block if ID template mismatch and not dismissed
        if (classifyResult && !classifyResult.matchesSelected && !classifyWarningDismissed) return false;
        return true;
      case 'ownership': // Ownership
        return !!ownershipDocType && !!ownershipDoc;
      case 'business': // Business (optional, always valid)
        return true;
      case 'photos': // Court Photos
        return courtPhotos.length >= 3 && !!entrancePhoto;
      case 'location': // Location
        return true; // Optional but encouraged
      default:
        return false;
    }
  };

  // ─── Submit ───
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated. Please log in and try again.');

      const uid = session.user.id;

      // Build upload list based on chosen path
      const uploadPromises: Promise<string>[] = [];
      const uploadKeys: string[] = [];

      if (verificationPath === 'government_id') {
        // Gov ID path
        uploadPromises.push(govIdFront ? uploadVerificationFile(uid, govIdFront, 'gov-id') : Promise.resolve(''));
        uploadKeys.push('govFront');
        uploadPromises.push((needsBack && govIdBack) ? uploadVerificationFile(uid, govIdBack, 'gov-id') : Promise.resolve(''));
        uploadKeys.push('govBack');
        uploadPromises.push(selfieFile ? uploadVerificationFile(uid, selfieFile, 'selfie') : Promise.resolve(''));
        uploadKeys.push('selfie');
      } else if (verificationPath === 'court_ownership') {
        // Ownership path
        uploadPromises.push(ownershipDoc ? uploadVerificationFile(uid, ownershipDoc, 'ownership') : Promise.resolve(''));
        uploadKeys.push('ownership');
      }

      // Business doc (optional, shared by both paths)
      uploadPromises.push(businessDoc ? uploadVerificationFile(uid, businessDoc, 'business') : Promise.resolve(''));
      uploadKeys.push('business');

      // Court photos
      for (const f of courtPhotos) {
        uploadPromises.push(uploadVerificationFile(uid, f, 'court-photos'));
        uploadKeys.push('courtPhoto');
      }
      uploadPromises.push(entrancePhoto ? uploadVerificationFile(uid, entrancePhoto, 'entrance') : Promise.resolve(''));
      uploadKeys.push('entrance');
      uploadPromises.push(facilityPhoto ? uploadVerificationFile(uid, facilityPhoto, 'facility') : Promise.resolve(''));
      uploadKeys.push('facility');
      uploadPromises.push(courtLinesPhoto ? uploadVerificationFile(uid, courtLinesPhoto, 'court-lines') : Promise.resolve(''));
      uploadKeys.push('courtLines');

      const uploads = await Promise.all(uploadPromises);

      // Map results by key
      const urlMap: Record<string, string> = {};
      uploadKeys.forEach((key, i) => { urlMap[key + '_' + i] = uploads[i]; });

      // Parse uploaded URLs based on path
      let govFrontUrl: string | undefined;
      let govBackUrl: string | undefined;
      let selfieUrl: string | undefined;
      let ownerUrl: string | undefined;

      let idx = 0;
      if (verificationPath === 'government_id') {
        govFrontUrl = uploads[idx++];
        govBackUrl = uploads[idx++] || undefined;
        selfieUrl = uploads[idx++];
      } else {
        ownerUrl = uploads[idx++];
      }

      const bizUrl = uploads[idx++] || undefined;

      // Court photos
      const courtPhotoUrls: string[] = [];
      for (let i = 0; i < courtPhotos.length; i++) {
        courtPhotoUrls.push(uploads[idx++]);
      }
      const entranceUrl = uploads[idx++];
      const facilityUrl = uploads[idx++] || undefined;
      const courtLinesUrl = uploads[idx++] || undefined;

      // Parse coordinates from Google Maps link
      let lat: number | undefined;
      let lng: number | undefined;
      if (googleMapsLink) {
        const coordMatch = googleMapsLink.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        const qMatch = googleMapsLink.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        const match = coordMatch || qMatch;
        if (match) {
          lat = parseFloat(match[1]);
          lng = parseFloat(match[2]);
        }
      }
      if (latitude && longitude) {
        lat = parseFloat(latitude);
        lng = parseFloat(longitude);
      }

      // Create the professional application record now (at actual submission time)
      if (onSubmitApplication) {
        onSubmitApplication({
          playerId: uid,
          playerName: session.user.email || 'Unknown',
          requestedRole: 'COURT_OWNER',
          experienceSummary: `Court Owner verification (${verificationPath === 'government_id' ? 'Government ID' : 'Court Ownership'}) — documents submitted`,
          documentName: 'Verification documents uploaded',
        });
      }

      await submitVerification({
        profile_id: uid,
        application_id: applicationId,
        verification_path: verificationPath as 'government_id' | 'court_ownership',
        government_id_type: govFrontUrl ? govIdType : undefined,
        government_id_front_url: govFrontUrl,
        government_id_back_url: govBackUrl,
        selfie_with_id_url: selfieUrl,
        ownership_doc_type: ownerUrl ? ownershipDocType : undefined,
        ownership_doc_url: ownerUrl,
        business_doc_type: businessDocType || undefined,
        business_doc_url: bizUrl,
        court_photo_urls: courtPhotoUrls,
        entrance_photo_url: entranceUrl,
        facility_photo_url: facilityUrl,
        court_lines_photo_url: courtLinesUrl,
        google_maps_link: googleMapsLink || undefined,
        latitude: lat,
        longitude: lng,
      });

      onSuccess();
    } catch (err: any) {
      console.error('Verification submission error:', err);
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Camera handler: open camera for a specific field ───
  const openCameraFor = useCallback((
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
    fieldName?: string,
    runNameCheck?: boolean
  ) => {
    setCameraTarget({ setFile, setPreview, fieldName, runNameCheck });
    setCameraOpen(true);
  }, []);

  const handleCameraCapture = useCallback((file: File) => {
    setCameraOpen(false);
    if (cameraTarget) {
      handleSingleFile(
        file,
        cameraTarget.setFile,
        cameraTarget.setPreview,
        cameraTarget.fieldName,
        cameraTarget.runNameCheck
      );
    }
    setCameraTarget(null);
  }, [cameraTarget, handleSingleFile]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-8 pt-8 pb-4 rounded-t-[40px] border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100/50">
                <Shield size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Court Owner Verification</h2>
                <p className="text-xs text-slate-400 font-medium">Complete all required steps to verify your court</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (window.confirm('Your progress will be saved. You can continue later by selecting Court Owner again.')) {
                  onClose();
                }
              }}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {/* Step Progress */}
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const isActive = i === step;
              const isDone = i < step;
              return (
                <button
                  key={s.id}
                  onClick={() => { if (i < step || isStepValid(step)) setStep(i); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                    isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' :
                    isDone ? 'bg-emerald-50 text-emerald-600' :
                    'bg-slate-50 text-slate-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 size={12} /> : <StepIcon size={12} />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {/* ═══ STEP: Choose Verification Path ═══ */}
          {STEPS[step]?.id === 'choose' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 flex items-center gap-2">
                  <Shield size={16} />
                  Choose how you want to verify your court ownership
                </p>
              </div>

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] px-1">Select One Verification Method <span className="text-red-500">*</span></p>

              <div className="space-y-3">
                {/* Option 1: Government ID */}
                <button
                  type="button"
                  onClick={() => { setVerificationPath('government_id'); }}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                    verificationPath === 'government_id'
                      ? 'border-blue-500 bg-blue-50/80 shadow-lg shadow-blue-100'
                      : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      verificationPath === 'government_id' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <IdCard size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Government ID Verification</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">Upload a valid Philippine Government ID with front photo, back photo (if applicable), and a selfie holding the ID</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {['Passport', "Driver's License", 'PhilSys ID', 'UMID', 'PRC ID', 'Postal ID', "Voter's ID"].map(id => (
                          <span key={id} className="text-[8px] font-bold bg-white/80 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">{id}</span>
                        ))}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                      verificationPath === 'government_id' ? 'border-blue-600 bg-blue-600' : 'border-slate-200'
                    }`}>
                      {verificationPath === 'government_id' && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                  </div>
                </button>

                {/* Option 2: Court Ownership Documents */}
                <button
                  type="button"
                  onClick={() => { setVerificationPath('court_ownership'); }}
                  className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${
                    verificationPath === 'court_ownership'
                      ? 'border-indigo-500 bg-indigo-50/80 shadow-lg shadow-indigo-100'
                      : 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      verificationPath === 'court_ownership' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <FileText size={24} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Court Ownership Documents</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1">Upload proof that you own or manage the court facility (e.g. title, lease, permit, tax declaration)</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {['Land Title', 'Lease Agreement', 'Business Permit', 'Tax Declaration', 'Transfer Certificate'].map(doc => (
                          <span key={doc} className="text-[8px] font-bold bg-white/80 text-slate-500 px-2 py-0.5 rounded-full border border-slate-100">{doc}</span>
                        ))}
                      </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                      verificationPath === 'court_ownership' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-200'
                    }`}>
                      {verificationPath === 'court_ownership' && <CheckCircle2 size={14} className="text-white" />}
                    </div>
                  </div>
                </button>
              </div>

              {verificationPath && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[10px] font-bold ${
                  verificationPath === 'government_id' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                }`}>
                  <CheckCircle2 size={14} />
                  Selected: {verificationPath === 'government_id' ? 'Government ID Verification' : 'Court Ownership Documents'} — Click "Next" to continue
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP: Government ID ═══ */}
          {STEPS[step]?.id === 'id' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 flex items-center gap-2">
                  <IdCard size={16} />
                  Select your Government ID and upload clear photos
                </p>
              </div>

              {/* ID Type Dropdown */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  ID Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={govIdType}
                  onChange={(e) => {
                    setGovIdType(e.target.value);
                    // Clear back if switching to an ID that doesn't need it
                    if (!IDS_NEEDING_BACK.includes(e.target.value)) {
                      setGovIdBack(null);
                      setGovIdBackPreview('');
                    }
                  }}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 focus:outline-none focus:border-blue-500 appearance-none transition-all text-sm"
                >
                  <option value="">Select Government ID...</option>
                  {GOVERNMENT_ID_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {govIdType && (
                <>
                  {/* ID Front */}
                  <UploadZone
                    label="ID Front Photo"
                    required
                    preview={govIdFrontPreview}
                    onFile={(f) => handleSingleFile(f, setGovIdFront, setGovIdFrontPreview, 'id_front', true)}
                    onRemove={() => { if (govIdFrontPreview.startsWith('blob:')) URL.revokeObjectURL(govIdFrontPreview); setGovIdFront(null); setGovIdFrontPreview(''); setBlurResults(prev => { const n = {...prev}; delete n['id_front']; return n; }); setNameMatchResult(null); setClassifyResult(null); }}
                    hint="Clear photo of the front side"
                    onCamera={() => openCameraFor(setGovIdFront, setGovIdFrontPreview, 'id_front', true)}
                    acceptPdf={false}
                  />

                  {/* Scanning indicator for ID Front */}
                  {isScanning === 'id_front' && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl animate-pulse">
                      <Loader2 size={16} className="text-blue-600 animate-spin" />
                      <div>
                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Scanning ID Photo...</p>
                        <p className="text-[9px] font-bold text-blue-500">Checking image quality and reading name from ID</p>
                      </div>
                    </div>
                  )}

                  {/* Blur check result for front */}
                  {blurResults['id_front'] && !isScanning && (
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold ${
                      blurResults['id_front'].isBlurry
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {blurResults['id_front'].isBlurry ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                      {blurResults['id_front'].message}
                    </div>
                  )}

                  {/* Name match result */}
                  {nameMatchResult && !isScanning && (
                    <div className={`rounded-2xl p-4 border ${
                      nameMatchResult.matched
                        ? 'bg-emerald-50 border-emerald-100'
                        : 'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        {nameMatchResult.matched ? (
                          <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`text-[10px] font-black uppercase tracking-wider ${
                            nameMatchResult.matched ? 'text-emerald-700' : 'text-amber-700'
                          }`}>
                            {nameMatchResult.matched ? 'Name Verified ✓' : 'Name Mismatch Detected'}
                          </p>
                          <p className={`text-[10px] font-bold mt-1 ${
                            nameMatchResult.matched ? 'text-emerald-600' : 'text-amber-600'
                          }`}>
                            {nameMatchResult.matchDetails}
                          </p>
                          {!nameMatchResult.matched && (
                            <div className="mt-3 space-y-2">
                              <p className="text-[9px] font-bold text-amber-500">
                                Your profile name: <span className="text-amber-800">{profileFullName}</span>
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGovIdFront(null);
                                    setGovIdFrontPreview('');
                                    setNameMatchResult(null);
                                    setBlurResults(prev => { const n = {...prev}; delete n['id_front']; return n; });
                                  }}
                                  className="flex-1 py-2 bg-amber-600 text-white font-black rounded-xl text-[9px] uppercase tracking-wider hover:bg-amber-700 transition-all"
                                >
                                  Upload Different ID
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setNameWarningDismissed(true)}
                                  className="flex-1 py-2 bg-white text-amber-700 border border-amber-200 font-black rounded-xl text-[9px] uppercase tracking-wider hover:bg-amber-50 transition-all"
                                >
                                  Continue Anyway
                                </button>
                              </div>
                              <p className="text-[8px] text-amber-400 font-bold italic">
                                Note: Mismatched IDs may cause your application to be rejected during admin review.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ID Template Classification Result (TF.js) */}
                  {isClassifying && (
                    <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-100 rounded-2xl animate-pulse">
                      <Brain size={16} className="text-violet-600 animate-spin" />
                      <div>
                        <p className="text-[10px] font-black text-violet-700 uppercase tracking-wider">Verifying ID Template...</p>
                        <p className="text-[9px] font-bold text-violet-500">AI is checking if this matches the selected ID type</p>
                      </div>
                    </div>
                  )}

                  {classifyResult && !isClassifying && (
                    <div className={`rounded-2xl p-4 border ${
                      classifyResult.matchesSelected
                        ? 'bg-emerald-50 border-emerald-100'
                        : 'bg-orange-50 border-orange-200'
                    }`}>
                      <div className="flex items-start gap-2">
                        {classifyResult.matchesSelected ? (
                          <Brain size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Brain size={16} className="text-orange-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className={`text-[10px] font-black uppercase tracking-wider ${
                            classifyResult.matchesSelected ? 'text-emerald-700' : 'text-orange-700'
                          }`}>
                            {classifyResult.matchesSelected ? 'ID Template Verified ✓' : 'ID Template Mismatch'}
                          </p>
                          <p className={`text-[10px] font-bold mt-1 ${
                            classifyResult.matchesSelected ? 'text-emerald-600' : 'text-orange-600'
                          }`}>
                            {classifyResult.message}
                          </p>
                          {!classifyResult.matchesSelected && (
                            <div className="mt-3 space-y-2">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setGovIdFront(null);
                                    setGovIdFrontPreview('');
                                    setClassifyResult(null);
                                    setBlurResults(prev => { const n = {...prev}; delete n['id_front']; return n; });
                                    setNameMatchResult(null);
                                  }}
                                  className="flex-1 py-2 bg-orange-600 text-white font-black rounded-xl text-[9px] uppercase tracking-wider hover:bg-orange-700 transition-all"
                                >
                                  Upload Correct ID
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setClassifyWarningDismissed(true)}
                                  className="flex-1 py-2 bg-white text-orange-700 border border-orange-200 font-black rounded-xl text-[9px] uppercase tracking-wider hover:bg-orange-50 transition-all"
                                >
                                  Continue Anyway
                                </button>
                              </div>
                              <p className="text-[8px] text-orange-400 font-bold italic">
                                Note: ID type mismatches may cause delays in admin review.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ID Back (only if needed) */}
                  {needsBack && (
                    <>
                    <UploadZone
                      label="ID Back Photo"
                      required
                      preview={govIdBackPreview}
                      onFile={(f) => handleSingleFile(f, setGovIdBack, setGovIdBackPreview, 'id_back')}
                      onRemove={() => { if (govIdBackPreview.startsWith('blob:')) URL.revokeObjectURL(govIdBackPreview); setGovIdBack(null); setGovIdBackPreview(''); setBlurResults(prev => { const n = {...prev}; delete n['id_back']; return n; }); }}
                      onCamera={() => openCameraFor(setGovIdBack, setGovIdBackPreview, 'id_back')}
                      acceptPdf={false}
                      hint={
                        govIdType === 'philippine_drivers_license' ? 'Back contains barcode & details' :
                        govIdType === 'philsys_national_id' ? 'Back contains QR code & signature' :
                        govIdType === 'sss_umid_card' ? 'Back contains chip/barcode info' :
                        govIdType === 'prc_id' ? 'Back contains license details' :
                        govIdType === 'postal_id' ? 'Back contains barcode/security features' :
                        'Clear photo of the back side'
                      }
                    />
                    {isScanning === 'id_back' && (
                      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-2xl animate-pulse">
                        <Loader2 size={14} className="text-blue-600 animate-spin" />
                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Checking image quality...</p>
                      </div>
                    )}
                    {blurResults['id_back'] && !isScanning && (
                      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold ${
                        blurResults['id_back'].isBlurry
                          ? 'bg-red-50 text-red-700 border border-red-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}>
                        {blurResults['id_back'].isBlurry ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                        {blurResults['id_back'].message}
                      </div>
                    )}
                    </>
                  )}

                  {!needsBack && govIdType === 'philippine_passport' && (
                    <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-4 py-2.5 rounded-xl flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      Philippine Passport — Only the bio/photo page is needed
                    </div>
                  )}

                  {/* Selfie */}
                  <UploadZone
                    label="Selfie Holding Your ID"
                    required
                    preview={selfiePreview}
                    onFile={(f) => handleSingleFile(f, setSelfieFile, setSelfiePreview, 'selfie')}
                    onRemove={() => { if (selfiePreview.startsWith('blob:')) URL.revokeObjectURL(selfiePreview); setSelfieFile(null); setSelfiePreview(''); setBlurResults(prev => { const n = {...prev}; delete n['selfie']; return n; }); }}
                    hint="Hold your ID next to your face"
                    onCamera={() => openCameraFor(setSelfieFile, setSelfiePreview, 'selfie')}
                    acceptPdf={false}
                  />
                  {isScanning === 'selfie' && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-2xl animate-pulse">
                      <Loader2 size={14} className="text-blue-600 animate-spin" />
                      <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">Checking selfie quality...</p>
                    </div>
                  )}
                  {blurResults['selfie'] && !isScanning && (
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-bold ${
                      blurResults['selfie'].isBlurry
                        ? 'bg-red-50 text-red-700 border border-red-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    }`}>
                      {blurResults['selfie'].isBlurry ? <ShieldAlert size={14} /> : <ShieldCheck size={14} />}
                      {blurResults['selfie'].message}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ═══ STEP: Court Ownership ═══ */}
          {STEPS[step]?.id === 'ownership' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 flex items-center gap-2">
                  <FileText size={16} />
                  Upload proof that you own or manage the court facility
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={ownershipDocType}
                  onChange={(e) => setOwnershipDocType(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 focus:outline-none focus:border-blue-500 appearance-none transition-all text-sm"
                >
                  <option value="">Select document type...</option>
                  {OWNERSHIP_DOC_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {ownershipDocType && (
                <UploadZone
                  label="Ownership Document"
                  required
                  preview={ownershipDocPreview}
                  onFile={(f) => handleSingleFile(f, setOwnershipDoc, setOwnershipDocPreview)}
                  onRemove={() => { if (ownershipDocPreview.startsWith('blob:')) URL.revokeObjectURL(ownershipDocPreview); setOwnershipDoc(null); setOwnershipDocPreview(''); }}
                  hint="PDF or clear photo of the document"
                />
              )}
            </div>
          )}

          {/* ═══ STEP: Business Legitimacy (Optional) ═══ */}
          {STEPS[step]?.id === 'business' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-amber-50/50 rounded-2xl p-4 border border-amber-100">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-2">
                  <Briefcase size={16} />
                  Optional — Upload business documents if your court is a commercial facility
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  Document Type <span className="text-[9px] text-blue-500 italic normal-case font-bold ml-1">Optional</span>
                </label>
                <select
                  value={businessDocType}
                  onChange={(e) => setBusinessDocType(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 focus:outline-none focus:border-blue-500 appearance-none transition-all text-sm"
                >
                  <option value="">Skip or select...</option>
                  {BUSINESS_DOC_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {businessDocType && (
                <UploadZone
                  label="Business Document"
                  preview={businessDocPreview}
                  onFile={(f) => handleSingleFile(f, setBusinessDoc, setBusinessDocPreview)}
                  onRemove={() => { if (businessDocPreview.startsWith('blob:')) URL.revokeObjectURL(businessDocPreview); setBusinessDoc(null); setBusinessDocPreview(''); }}
                  hint="PDF or clear photo"
                />
              )}
            </div>
          )}

          {/* ═══ STEP: Court Photos ═══ */}
          {STEPS[step]?.id === 'photos' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 flex items-center gap-2">
                  <Camera size={16} />
                  Upload photos of your pickleball court facility
                </p>
              </div>

              {/* Court Photos (min 3) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  Pickleball Court Photos <span className="text-red-500">*</span>
                  <span className="text-[9px] text-blue-500 italic normal-case font-bold ml-1">Minimum 3 photos</span>
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {courtPhotoPreviews.map((preview, idx) => (
                    <div key={idx} className="relative group rounded-2xl overflow-hidden border-2 border-blue-200">
                      {preview === 'pdf' ? (
                        <div className="flex items-center justify-center h-24 bg-blue-50 text-blue-600">
                          <FileText size={20} />
                        </div>
                      ) : (
                        <img src={preview} alt={`Court ${idx + 1}`} className="w-full h-24 object-cover" />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          const removedPreview = courtPhotoPreviews[idx];
                          if (removedPreview && removedPreview.startsWith('blob:')) URL.revokeObjectURL(removedPreview);
                          setCourtPhotos(prev => prev.filter((_, i) => i !== idx));
                          setCourtPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
                        }}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  {courtPhotos.length < 10 && (
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 transition-all">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          handleMultipleFiles(files, courtPhotos, setCourtPhotos, courtPhotoPreviews, setCourtPhotoPreviews);
                          e.target.value = '';
                        }}
                      />
                      <Upload size={16} className="text-slate-300" />
                      <p className="text-[8px] font-bold text-slate-400 mt-1">Add Photos</p>
                    </label>
                  )}
                </div>
                <p className="text-[9px] text-slate-400">{courtPhotos.length}/3 minimum • {courtPhotos.length}/10 maximum</p>
              </div>

              {/* Entrance Photo (required) */}
              <UploadZone
                label="Court Entrance / Signage"
                required
                preview={entrancePhotoPreview}
                onFile={(f) => handleSingleFile(f, setEntrancePhoto, setEntrancePhotoPreview)}
                onRemove={() => { if (entrancePhotoPreview.startsWith('blob:')) URL.revokeObjectURL(entrancePhotoPreview); setEntrancePhoto(null); setEntrancePhotoPreview(''); }}
                hint="1 photo of the entrance or signage"
                onCamera={() => openCameraFor(setEntrancePhoto, setEntrancePhotoPreview)}
                acceptPdf={false}
              />

              {/* Facility Photo (optional) */}
              <UploadZone
                label="Whole Facility"
                preview={facilityPhotoPreview}
                onFile={(f) => handleSingleFile(f, setFacilityPhoto, setFacilityPhotoPreview)}
                onRemove={() => { if (facilityPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(facilityPhotoPreview); setFacilityPhoto(null); setFacilityPhotoPreview(''); }}
                hint="Optional — Overview of the whole venue"
                onCamera={() => openCameraFor(setFacilityPhoto, setFacilityPhotoPreview)}
                acceptPdf={false}
              />

              {/* Court Lines/Nets (optional) */}
              <UploadZone
                label="Court Lines and Nets"
                preview={courtLinesPhotoPreview}
                onFile={(f) => handleSingleFile(f, setCourtLinesPhoto, setCourtLinesPhotoPreview)}
                onRemove={() => { if (courtLinesPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(courtLinesPhotoPreview); setCourtLinesPhoto(null); setCourtLinesPhotoPreview(''); }}
                hint="Optional — Close-up of lines and nets"
                onCamera={() => openCameraFor(setCourtLinesPhoto, setCourtLinesPhotoPreview)}
                acceptPdf={false}
              />
            </div>
          )}

          {/* ═══ STEP: Google Maps Location ═══ */}
          {STEPS[step]?.id === 'location' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                <p className="text-xs font-bold text-emerald-700 flex items-center gap-2">
                  <MapPin size={16} />
                  Help players find your court with an accurate location
                </p>
              </div>

              {/* Google Maps Link */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  Google Maps Link
                  <span className="text-[9px] text-blue-500 italic normal-case font-bold ml-1">Recommended</span>
                </label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/?q=14.5176,121.0509"
                  value={googleMapsLink}
                  onChange={(e) => setGoogleMapsLink(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium text-sm text-slate-900 focus:outline-none focus:border-blue-500 transition-all"
                />
              </div>

              {/* How to get location */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-3">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
                  <HelpCircle size={14} /> How to get your Google Maps location
                </p>
                <div className="space-y-2 text-[11px] text-slate-500 font-medium">
                  <p><strong className="text-slate-700">Method 1:</strong> Open Google Maps → Search your court → Click Share → Copy link</p>
                  <p><strong className="text-slate-700">Method 2:</strong> Right-click on map → Copy coordinates (e.g. 14.5176, 121.0509)</p>
                  <p><strong className="text-slate-700">Mobile:</strong> Open Google Maps → Tap and hold location → Tap Share → Copy link</p>
                </div>
              </div>

              {/* Manual Coordinates */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">
                  Or Enter Coordinates Manually
                  <span className="text-[9px] text-slate-400 italic normal-case font-bold ml-1">Optional</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude (e.g. 14.5176)"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 font-medium text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (e.g. 121.0509)"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 font-medium text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {/* Preview Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100 space-y-3">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-wider">📋 Application Summary</p>
                <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 font-bold">
                  <span>Verification Path:</span>
                  <span className="text-slate-900">{verificationPath === 'government_id' ? '📄 Government ID' : '🏢 Court Ownership'}</span>
                  {verificationPath === 'government_id' && (<>
                    <span>Government ID:</span>
                    <span className="text-slate-900">{GOVERNMENT_ID_OPTIONS.find(o => o.value === govIdType)?.label || '—'}</span>
                    <span>ID Quality:</span>
                    <span className={blurResults['id_front'] && !blurResults['id_front'].isBlurry ? 'text-emerald-600' : 'text-slate-400'}>
                      {blurResults['id_front'] ? (blurResults['id_front'].isBlurry ? '❌ Blurry' : '✅ Clear') : '—'}
                    </span>
                    <span>Name Match:</span>
                    <span className={nameMatchResult?.matched ? 'text-emerald-600' : nameMatchResult ? 'text-amber-600' : 'text-slate-400'}>
                      {nameMatchResult ? (nameMatchResult.matched ? '✅ Verified' : '⚠️ Mismatch (acknowledged)') : '—'}
                    </span>
                    <span>Template AI:</span>
                    <span className={classifyResult?.matchesSelected ? 'text-emerald-600' : classifyResult ? 'text-orange-600' : 'text-slate-400'}>
                      {classifyResult ? (classifyResult.matchesSelected ? `✅ ${classifyResult.confidence}% match` : '⚠️ Mismatch (acknowledged)') : classifierReady ? '⏳ Pending' : '— Not trained'}
                    </span>
                  </>)}
                  {verificationPath === 'court_ownership' && (<>
                    <span>Ownership Doc:</span>
                    <span className="text-slate-900">{OWNERSHIP_DOC_OPTIONS.find(o => o.value === ownershipDocType)?.label || '—'}</span>
                  </>)}
                  <span>Business Doc:</span>
                  <span className="text-slate-900">{BUSINESS_DOC_OPTIONS.find(o => o.value === businessDocType)?.label || 'Skipped'}</span>
                  <span>Court Photos:</span>
                  <span className="text-slate-900">{courtPhotos.length} uploaded</span>
                  <span>Location:</span>
                  <span className="text-slate-900">{googleMapsLink ? 'Provided' : latitude ? 'Coordinates' : 'Not provided'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 px-8 py-5 rounded-b-[40px] flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (step > 0) {
                setStep(step - 1);
              } else {
                if (window.confirm('Your progress will be saved. You can continue later by selecting Court Owner again.')) {
                  onClose();
                }
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
          >
            <ChevronLeft size={14} />
            {step === 0 ? 'Save & Exit' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!isStepValid(step) || !!isScanning}
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isScanning ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Scanning...
                </>
              ) : (
                <>Next <ChevronRight size={14} /></>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting || !isStepValid(0) || !isStepValid(1) || !isStepValid(step)}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  Submit Application
                </>
              )}
            </button>
          )}
        </div>

        {/* Camera Capture Modal */}
        <CameraCapture
          open={cameraOpen}
          onClose={() => { setCameraOpen(false); setCameraTarget(null); }}
          onCapture={handleCameraCapture}
          label={cameraTarget?.fieldName?.replace(/_/g, ' ') || 'Take Photo'}
        />
      </div>
    </div>,
    document.body
  );
};

export default CourtOwnerVerificationForm;
