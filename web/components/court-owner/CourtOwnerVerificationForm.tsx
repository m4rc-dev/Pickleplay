import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  AlertCircle,
  Briefcase,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  HelpCircle,
  IdCard,
  Loader2,
  MapPin,
  Shield,
  ShieldCheck,
  Target,
  Trash2,
  Upload,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import {
  BUSINESS_DOC_OPTIONS,
  GOVERNMENT_ID_OPTIONS,
  IDS_NEEDING_BACK,
  OWNERSHIP_DOC_OPTIONS,
  uploadVerificationFile,
  submitVerification,
} from '../../services/courtOwnerVerification';
import { checkImageBlur, type BlurCheckResult } from '../../services/imageValidation';
import CameraCapture from '../ui/CameraCapture';

type ClassifyResult = null; // kept for compatibility if we re-introduce classifier later

const STEPS = [
  { id: 'location', label: 'Location', icon: MapPin },
  { id: 'id', label: 'Government ID', icon: IdCard },
  { id: 'ownership', label: 'Ownership', icon: FileText },
  { id: 'business', label: 'Business', icon: Briefcase },
  { id: 'photos', label: 'Court Photos', icon: Camera },
  { id: 'review', label: 'Review & Submit', icon: ShieldCheck },
] as const;

const DRAFT_KEY = 'court-owner-verification-draft-v2';
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];

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

interface LocationForm {
  courtName: string;
  phone: string;
  email: string;
  street: string;
  barangay: string;
  city: string;
  province: string;
  zipCode: string;
  googleMapsLink: string;
}

const EMPTY_LOCATION: LocationForm = {
  courtName: '',
  phone: '',
  email: '',
  street: '',
  barangay: '',
  city: '',
  province: '',
  zipCode: '',
  googleMapsLink: '',
};

interface Coords { lat: number | null; lng: number | null; }

const parseAddress = (components: any[], fallbackFormatted?: string) => {
  const find = (types: string[]) => components.find((c: any) => types.some(t => c.types?.includes(t)))?.long_name || '';
  const streetNum = find(['street_number']);
  const route = find(['route']);
  const barangay = find([
    'sublocality_level_2',
    'sublocality_level_1',
    'neighborhood',
    'administrative_area_level_3',
    'administrative_area_level_4',
    'administrative_area_level_5',
  ]);
  const city = find(['locality', 'administrative_area_level_2']);
  const province = find(['administrative_area_level_1']);
  const zipCode = find(['postal_code']);
  return {
    street: `${streetNum} ${route}`.trim() || (fallbackFormatted?.split(',')[0] || ''),
    barangay,
    city,
    province,
    zipCode,
  };
};

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return `${file.name}: Invalid file type. Use JPEG, PNG, WebP, or PDF.`;
  if (file.size > MAX_FILE_SIZE) return `${file.name}: File too large (max 10MB).`;
  return null;
}

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

const MapPicker: React.FC<{
  coords: Coords;
  onCoordsChange: (c: Coords) => void;
  onAddressChange?: (addr: { street?: string; barangay?: string; city?: string; province?: string; zipCode?: string }) => void;
}> = ({ coords, onCoordsChange, onAddressChange }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [isLocating, setIsLocating] = useState(false);

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!window.google?.maps || !onAddressChange) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: string) => {
      if (status !== 'OK' || !results?.length) return;
      const parsed = parseAddress(results[0].address_components || [], results[0].formatted_address);
      const updates: { street?: string; barangay?: string; city?: string; province?: string; zipCode?: string } = {};
      if (parsed.street) updates.street = parsed.street;
      if (parsed.barangay) updates.barangay = parsed.barangay;
      if (parsed.city) updates.city = parsed.city;
      if (parsed.province) updates.province = parsed.province;
      if (parsed.zipCode) updates.zipCode = parsed.zipCode;
      if (Object.keys(updates).length) onAddressChange(updates);
    });
  }, [onAddressChange]);

  useEffect(() => {
    if (!mapRef.current || !window.google?.maps) return;
    if (!mapInstance.current) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: coords.lat && coords.lng ? { lat: coords.lat, lng: coords.lng } : { lat: 14.5995, lng: 120.9842 },
        zoom: 15,
        disableDefaultUI: true,
        zoomControl: true,
        gestureHandling: 'greedy',
      });
      markerRef.current = new window.google.maps.Marker({
        map: mapInstance.current,
        draggable: true,
        visible: !!(coords.lat && coords.lng),
        position: coords.lat && coords.lng ? { lat: coords.lat, lng: coords.lng } : undefined,
        icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: '#2563eb', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
      });
      mapInstance.current.addListener('click', (e: any) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        onCoordsChange({ lat, lng });
        markerRef.current.setVisible(true);
        markerRef.current.setPosition({ lat, lng });
        reverseGeocode(lat, lng);
      });
      markerRef.current.addListener('dragend', () => {
        const pos = markerRef.current.getPosition();
        const lat = pos.lat();
        const lng = pos.lng();
        onCoordsChange({ lat, lng });
        reverseGeocode(lat, lng);
      });
    } else if (coords.lat && coords.lng) {
      mapInstance.current.panTo({ lat: coords.lat, lng: coords.lng });
      markerRef.current.setVisible(true);
      markerRef.current.setPosition({ lat: coords.lat, lng: coords.lng });
      reverseGeocode(coords.lat, coords.lng);
    }
  }, [coords, onCoordsChange, reverseGeocode]);

  const handlePinToGPS = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        onCoordsChange({ lat, lng });
        if (mapInstance.current) mapInstance.current.panTo({ lat, lng });
        if (markerRef.current) {
          markerRef.current.setVisible(true);
          markerRef.current.setPosition({ lat, lng });
        }
        reverseGeocode(lat, lng);
        setIsLocating(false);
      },
      () => { alert('Could not get your location.'); setIsLocating(false); },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative h-72 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
      <div ref={mapRef} className="absolute inset-0" />
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button
          type="button"
          onClick={handlePinToGPS}
          disabled={isLocating}
          className="bg-white px-3 py-2 rounded-xl shadow-lg border border-slate-100 text-slate-900 flex items-center gap-2 text-xs font-bold hover:bg-slate-900 hover:text-white"
        >
          {isLocating ? <Loader2 size={14} className="animate-spin" /> : <Target size={14} />} Near Me
        </button>
      </div>
    </div>
  );
};

const CourtOwnerVerificationForm: React.FC<CourtOwnerVerificationFormProps> = ({ open, onClose, onSuccess, applicationId, onSubmitApplication }) => {
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState('');
  const [touchedSteps, setTouchedSteps] = useState<Record<string, boolean>>({});

  const [locationForm, setLocationForm] = useState<LocationForm>(EMPTY_LOCATION);
  const [coords, setCoords] = useState<Coords>({ lat: null, lng: null });
  const [nearMeLoading, setNearMeLoading] = useState(false);
  const [locationToast, setLocationToast] = useState('');

  const [govIdType, setGovIdType] = useState('');
  const [govIdFront, setGovIdFront] = useState<File | null>(null);
  const [govIdFrontPreview, setGovIdFrontPreview] = useState('');
  const [govIdBack, setGovIdBack] = useState<File | null>(null);
  const [govIdBackPreview, setGovIdBackPreview] = useState('');
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState('');

  const [ownershipDocType, setOwnershipDocType] = useState('');
  const [ownershipDoc, setOwnershipDoc] = useState<File | null>(null);
  const [ownershipDocPreview, setOwnershipDocPreview] = useState('');

  const [businessType, setBusinessType] = useState<'personal' | 'commercial' | ''>('');
  const [businessDocType, setBusinessDocType] = useState('');
  const [businessDoc, setBusinessDoc] = useState<File | null>(null);
  const [businessDocPreview, setBusinessDocPreview] = useState('');

  const [courtPhotos, setCourtPhotos] = useState<File[]>([]);
  const [courtPhotoPreviews, setCourtPhotoPreviews] = useState<string[]>([]);
  const [entrancePhoto, setEntrancePhoto] = useState<File | null>(null);
  const [entrancePhotoPreview, setEntrancePhotoPreview] = useState('');
  const [facilityPhoto, setFacilityPhoto] = useState<File | null>(null);
  const [facilityPhotoPreview, setFacilityPhotoPreview] = useState('');
  const [courtLinesPhoto, setCourtLinesPhoto] = useState<File | null>(null);
  const [courtLinesPhotoPreview, setCourtLinesPhotoPreview] = useState('');

  const [blurResults, setBlurResults] = useState<Record<string, BlurCheckResult>>({});
  const [isScanning, setIsScanning] = useState('');
  const [classifyResult] = useState<ClassifyResult>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<{
    setFile: (f: File | null) => void;
    setPreview: (s: string) => void;
    fieldName?: string;
  } | null>(null);

  const needsBack = IDS_NEEDING_BACK.includes(govIdType);
  const coordsSet = coords.lat !== null && coords.lng !== null;
  const businessDocRequired = businessType === 'commercial';

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      setLocationForm(data.locationForm || EMPTY_LOCATION);
      setCoords(data.coords || { lat: null, lng: null });
      setGovIdType(data.govIdType || '');
      setGovIdFrontPreview('');
      setGovIdBackPreview('');
      setSelfiePreview('');
      setOwnershipDocType(data.ownershipDocType || '');
      setBusinessType(data.businessType || '');
      setBusinessDocType(data.businessDocType || '');
      setCourtPhotoPreviews([]);
      setEntrancePhotoPreview('');
      setFacilityPhotoPreview('');
      setCourtLinesPhotoPreview('');
      setDraftSaved('Draft loaded');
      setTimeout(() => setDraftSaved(''), 3000);
    } catch (e) {
      console.error('Draft load failed', e);
    }
  }, []);

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      const payload = {
        locationForm,
        coords,
        govIdType,
        ownershipDocType,
        businessType,
        businessDocType,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
      setDraftSaved('Draft saved. Come back anytime.');
      setTimeout(() => setDraftSaved(''), 4000);
    } finally {
      setSavingDraft(false);
    }
  };

  useEffect(() => {
    if (open) loadDraft();
  }, [open, loadDraft]);

  const markTouched = (id: string) => setTouchedSteps(prev => ({ ...prev, [id]: true }));
  const showErrorsFor = (id: string) => touchedSteps[id] || touchedSteps['__submit'];

  const handleSingleFile = useCallback((
    file: File,
    setFile: (f: File | null) => void,
    setPreview: (s: string) => void,
    fieldName?: string
  ) => {
    const err = validateFile(file);
    if (err) { setError(err); return; }
    setError('');
    const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : 'pdf';
    setFile(file);
    setPreview(previewUrl);
    if (file.type.startsWith('image/') && fieldName) {
      setIsScanning(fieldName);
      checkImageBlur(file).then((res) => {
        setBlurResults(prev => ({ ...prev, [fieldName]: res }));
        if (res.isBlurry) {
          if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
          setPreview('');
          setFile(null);
          setError(res.message);
        }
        setIsScanning('');
      }).catch(() => setIsScanning(''));
    }
  }, []);

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
    setFiles([...existingFiles, ...valid]);
    const previews = valid.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : 'pdf');
    setPreviews(prev => [...prev, ...previews]);
  }, []);

  const handleNearMe = () => {
    if (!navigator.geolocation) { setError('Geolocation is not supported by your browser'); return; }
    setNearMeLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lng: longitude });
          // Try client-side reverse geocode via Maps JS API to auto-fill address
          if (window.google?.maps) {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: string) => {
              if (status === 'OK' && results?.length) {
                const parsed = parseAddress(results[0].address_components || [], results[0].formatted_address);
                setLocationForm((f) => ({
                  ...f,
                  street: parsed.street || f.street,
                  barangay: parsed.barangay || f.barangay,
                  city: parsed.city || f.city,
                  province: parsed.province || f.province,
                  zipCode: parsed.zipCode || f.zipCode,
                }));
              }
            });
          }
          setLocationToast('Location detected and filled');
          setTimeout(() => setLocationToast(''), 4000);
        } catch (err) {
          console.error(err);
          setError('Failed to fetch address from location');
        } finally {
          setNearMeLoading(false);
        }
      },
      (err) => { console.error(err); setError('Could not get your location. Please enable GPS.'); setNearMeLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const isStepValid = (idx: number) => {
    const id = STEPS[idx]?.id;
    switch (id) {
      case 'location':
        return !!(locationForm.courtName && locationForm.phone && locationForm.email && locationForm.street && locationForm.barangay && locationForm.city && locationForm.province && locationForm.zipCode && coordsSet);
      case 'id':
        if (!govIdType || !govIdFront || !selfieFile) return false;
        if (needsBack && !govIdBack) return false;
        if (blurResults['id_front']?.isBlurry || blurResults['id_back']?.isBlurry || blurResults['selfie']?.isBlurry) return false;
        return true;
      case 'ownership':
        return !!(ownershipDocType && ownershipDoc);
      case 'business':
        if (!businessType) return false;
        if (businessDocRequired && (!businessDocType || !businessDoc)) return false;
        return true;
      case 'photos':
        return courtPhotos.length >= 3 && !!entrancePhoto;
      case 'review':
        return STEPS.slice(0, 5).every((_, i) => isStepValid(i));
      default:
        return false;
    }
  };

  const goNext = () => {
    if (!isStepValid(step)) { markTouched(STEPS[step].id); return; }
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const goBack = () => {
    if (step === 0) {
      saveDraft().then(onClose);
      return;
    }
    setStep((s) => Math.max(0, s - 1));
  };

  const handleSubmit = async () => {
    const invalidIdx = STEPS.findIndex((_, i) => !isStepValid(i));
    if (invalidIdx !== -1) {
      setTouchedSteps(prev => ({ ...prev, [STEPS[invalidIdx].id]: true, __submit: true }));
      setStep(invalidIdx);
      setError('Please complete all required steps before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated. Please log in and try again.');
      const uid = session.user.id;

      const uploadPromises: Promise<string>[] = [];
      const keys: string[] = [];

      uploadPromises.push(govIdFront ? uploadVerificationFile(uid, govIdFront, 'gov-id') : Promise.resolve(''));
      keys.push('govFront');
      uploadPromises.push((needsBack && govIdBack) ? uploadVerificationFile(uid, govIdBack, 'gov-id') : Promise.resolve(''));
      keys.push('govBack');
      uploadPromises.push(selfieFile ? uploadVerificationFile(uid, selfieFile, 'selfie') : Promise.resolve(''));
      keys.push('selfie');

      uploadPromises.push(ownershipDoc ? uploadVerificationFile(uid, ownershipDoc, 'ownership') : Promise.resolve(''));
      keys.push('ownership');

      uploadPromises.push(businessDoc ? uploadVerificationFile(uid, businessDoc, 'business') : Promise.resolve(''));
      keys.push('business');

      for (const f of courtPhotos) { uploadPromises.push(uploadVerificationFile(uid, f, 'court-photos')); keys.push('courtPhoto'); }
      uploadPromises.push(entrancePhoto ? uploadVerificationFile(uid, entrancePhoto, 'entrance') : Promise.resolve(''));
      keys.push('entrance');
      uploadPromises.push(facilityPhoto ? uploadVerificationFile(uid, facilityPhoto, 'facility') : Promise.resolve(''));
      keys.push('facility');
      uploadPromises.push(courtLinesPhoto ? uploadVerificationFile(uid, courtLinesPhoto, 'court-lines') : Promise.resolve(''));
      keys.push('courtLines');

      const uploads = await Promise.all(uploadPromises);
      let idx = 0;
      const govFrontUrl = uploads[idx++] || undefined;
      const govBackUrl = uploads[idx++] || undefined;
      const selfieUrl = uploads[idx++] || undefined;
      const ownerUrl = uploads[idx++] || undefined;
      const bizUrl = uploads[idx++] || undefined;
      const courtPhotoUrls: string[] = [];
      for (let i = 0; i < courtPhotos.length; i++) courtPhotoUrls.push(uploads[idx++] || '');
      const entranceUrl = uploads[idx++] || undefined;
      const facilityUrl = uploads[idx++] || undefined;
      const courtLinesUrl = uploads[idx++] || undefined;

      if (onSubmitApplication) {
        onSubmitApplication({
          playerId: uid,
          playerName: session.user.email || 'Court Owner',
          requestedRole: 'COURT_OWNER',
          experienceSummary: 'Court Owner verification with location and documents',
          documentName: 'Verification documents uploaded',
        });
      }

      await submitVerification({
        profile_id: uid,
        application_id: applicationId,
        verification_path: 'court_ownership',
        status: 'PENDING_REVIEW',
        government_id_type: govIdType,
        government_id_front_url: govFrontUrl,
        government_id_back_url: govBackUrl,
        selfie_with_id_url: selfieUrl,
        ownership_doc_type: ownershipDocType,
        ownership_doc_url: ownerUrl,
        business_type: businessType || undefined,
        business_doc_type: businessDocType || undefined,
        business_doc_url: bizUrl,
        court_photo_urls: courtPhotoUrls,
        entrance_photo_url: entranceUrl,
        facility_photo_url: facilityUrl,
        court_lines_photo_url: courtLinesUrl,
        google_maps_link: locationForm.googleMapsLink || undefined,
        latitude: coords.lat || undefined,
        longitude: coords.lng || undefined,
        court_location_name: locationForm.courtName,
        contact_phone: locationForm.phone,
        contact_email: locationForm.email,
        address_street: locationForm.street,
        address_barangay: locationForm.barangay,
        address_city: locationForm.city,
        address_province: locationForm.province,
        address_zip_code: locationForm.zipCode,
      });

      localStorage.removeItem(DRAFT_KEY);
      onSuccess();
    } catch (err: any) {
      console.error('Verification submission error:', err);
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRequiredBadge = (text: string) => (
    <span className="ml-2 text-[9px] font-bold text-slate-400 flex items-center gap-1">
      <HelpCircle size={12} className="text-slate-300" title={text} />
      <span className="text-red-500">*</span>
    </span>
  );

  if (!open) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[36px] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-8 pt-7 pb-4 rounded-t-[36px] border-b border-slate-100 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100/50">
                <Shield size={24} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Court Owner Verification</h2>
                <p className="text-xs text-slate-500 font-semibold">Guided steps to verify your court and location</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={saveDraft}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                disabled={savingDraft}
              >
                {savingDraft ? <Loader2 size={14} className="animate-spin" /> : 'Save & Continue Later'}
              </button>
              <button
                onClick={() => { saveDraft().then(onClose); }}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
            <p className="text-[11px] font-black text-slate-500">Step {step + 1} of {STEPS.length}</p>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <button
                  key={s.id}
                  onClick={() => { if (i <= step && isStepValid(step)) setStep(i); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide border ${done ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : active ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                >
                  {done ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
              );
            })}
          </div>
          {draftSaved && <p className="text-[11px] font-bold text-emerald-600">{draftSaved}</p>}
        </div>

        <div className="px-8 py-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-xs font-bold">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {STEPS[step].id === 'location' && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-xs font-bold text-slate-700 flex items-center gap-2">Court Location Details <span className="text-[10px] text-blue-500">Enter your court’s basic information so players can find you بسهولة</span></p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] flex items-center">Court / Location Name{renderRequiredBadge('Players see this name')}</label>
                  <input
                    value={locationForm.courtName}
                    onChange={(e) => setLocationForm({ ...locationForm, courtName: e.target.value })}
                    placeholder="e.g. Cebu Pickleball Center"
                    className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold"
                  />
                  {showErrorsFor('location') && !locationForm.courtName && <p className="text-xs text-red-500">Court name is required.</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em]">Phone Number{renderRequiredBadge('We may contact you')}</label>
                    <input
                      value={locationForm.phone}
                      onChange={(e) => setLocationForm({ ...locationForm, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold"
                    />
                    {showErrorsFor('location') && !locationForm.phone && <p className="text-xs text-red-500">Phone is required.</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em]">Email Address{renderRequiredBadge('Status updates')}</label>
                    <input
                      type="email"
                      value={locationForm.email}
                      onChange={(e) => setLocationForm({ ...locationForm, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold"
                    />
                    {showErrorsFor('location') && !locationForm.email && <p className="text-xs text-red-500">Email is required.</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em] flex items-center">Full Address Group{renderRequiredBadge('Needed for verification')}</label>
                    <input value={locationForm.street} onChange={(e) => setLocationForm({ ...locationForm, street: e.target.value })} placeholder="Street" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold" />
                    {showErrorsFor('location') && !locationForm.street && <p className="text-xs text-red-500">Street is required.</p>}
                    <input value={locationForm.barangay} onChange={(e) => setLocationForm({ ...locationForm, barangay: e.target.value })} placeholder="Barangay" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold" />
                    {showErrorsFor('location') && !locationForm.barangay && <p className="text-xs text-red-500">Barangay is required.</p>}
                    <input value={locationForm.city} onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })} placeholder="City" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold" />
                    {showErrorsFor('location') && !locationForm.city && <p className="text-xs text-red-500">City is required.</p>}
                    <input value={locationForm.province} onChange={(e) => setLocationForm({ ...locationForm, province: e.target.value })} placeholder="Province" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold" />
                    {showErrorsFor('location') && !locationForm.province && <p className="text-xs text-red-500">Province is required.</p>}
                    <input value={locationForm.zipCode} onChange={(e) => setLocationForm({ ...locationForm, zipCode: e.target.value })} placeholder="ZIP Code" className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold" />
                    {showErrorsFor('location') && !locationForm.zipCode && <p className="text-xs text-red-500">ZIP Code is required.</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.1em]">Google Maps Link</label>
                    <input
                      value={locationForm.googleMapsLink}
                      onChange={(e) => setLocationForm({ ...locationForm, googleMapsLink: e.target.value })}
                      placeholder="https://maps.google.com/?q=14.5176,121.0509"
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleNearMe}
                    disabled={nearMeLoading}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white font-black rounded-xl text-[11px] uppercase tracking-widest shadow-lg hover:bg-blue-700 disabled:opacity-60"
                  >
                    {nearMeLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />} 📍 Use My Current Location
                  </button>
                  {locationToast && <p className="text-xs text-emerald-600 font-bold">{locationToast}</p>}
                  {showErrorsFor('location') && !coordsSet && <p className="text-xs text-red-500">Map pin is required.</p>}
                </div>
                <div className="space-y-3">
                  <MapPicker
                    coords={coords}
                    onCoordsChange={(c) => { setCoords(c); setLocationForm({ ...locationForm, googleMapsLink: locationForm.googleMapsLink }); }}
                    onAddressChange={(addr) => setLocationForm((prev) => ({ ...prev, ...addr }))}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={coords.lat ?? ''} onChange={(e) => setCoords({ ...coords, lat: parseFloat(e.target.value) || null })} placeholder="Latitude" className="px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold" />
                    <input value={coords.lng ?? ''} onChange={(e) => setCoords({ ...coords, lng: parseFloat(e.target.value) || null })} placeholder="Longitude" className="px-4 py-3 rounded-xl border-2 border-slate-100 bg-slate-50 text-sm font-semibold" />
                  </div>
                  <p className="text-[11px] text-slate-500 font-semibold">Tip: Drag the map pin or click on the map to refine your location.</p>
                </div>
              </div>
            </div>
          )}

          {STEPS[step].id === 'id' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 flex items-center gap-2"><IdCard size={16} /> Government ID Verification</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">ID Type <span className="text-red-500">*</span></label>
                <select
                  value={govIdType}
                  onChange={(e) => { setGovIdType(e.target.value); if (!IDS_NEEDING_BACK.includes(e.target.value)) { setGovIdBack(null); setGovIdBackPreview(''); } }}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 focus:outline-none focus:border-blue-500 appearance-none transition-all text-sm"
                >
                  <option value="">Select Government ID...</option>
                  {GOVERNMENT_ID_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {showErrorsFor('id') && !govIdType && <p className="text-xs text-red-500">ID Type is required.</p>}
              </div>

              {govIdType && (
                <div className="space-y-4">
                  <UploadZone
                    label="ID Front Photo"
                    required
                    preview={govIdFrontPreview}
                    onFile={(f) => handleSingleFile(f, setGovIdFront, setGovIdFrontPreview, 'id_front')}
                    onRemove={() => { if (govIdFrontPreview.startsWith('blob:')) URL.revokeObjectURL(govIdFrontPreview); setGovIdFront(null); setGovIdFrontPreview(''); setBlurResults(prev => { const n = { ...prev }; delete n['id_front']; return n; }); }}
                    hint="Clear photo of the front side"
                    onCamera={() => { setCameraTarget({ setFile: setGovIdFront, setPreview: setGovIdFrontPreview, fieldName: 'id_front' }); setCameraOpen(true); }}
                    acceptPdf={false}
                  />
                  {isScanning === 'id_front' && <p className="text-[11px] text-blue-600 font-semibold">Scanning ID quality...</p>}
                  {blurResults['id_front'] && <p className={`text-[11px] font-semibold ${blurResults['id_front'].isBlurry ? 'text-red-500' : 'text-emerald-600'}`}>{blurResults['id_front'].message}</p>}

                  {needsBack && (
                    <UploadZone
                      label="ID Back Photo"
                      required
                      preview={govIdBackPreview}
                      onFile={(f) => handleSingleFile(f, setGovIdBack, setGovIdBackPreview, 'id_back')}
                      onRemove={() => { if (govIdBackPreview.startsWith('blob:')) URL.revokeObjectURL(govIdBackPreview); setGovIdBack(null); setGovIdBackPreview(''); setBlurResults(prev => { const n = { ...prev }; delete n['id_back']; return n; }); }}
                      onCamera={() => { setCameraTarget({ setFile: setGovIdBack, setPreview: setGovIdBackPreview, fieldName: 'id_back' }); setCameraOpen(true); }}
                      acceptPdf={false}
                      hint="Back side if applicable"
                    />
                  )}

                  <UploadZone
                    label="Selfie With ID"
                    required
                    preview={selfiePreview}
                    onFile={(f) => handleSingleFile(f, setSelfieFile, setSelfiePreview, 'selfie')}
                    onRemove={() => { if (selfiePreview.startsWith('blob:')) URL.revokeObjectURL(selfiePreview); setSelfieFile(null); setSelfiePreview(''); setBlurResults(prev => { const n = { ...prev }; delete n['selfie']; return n; }); }}
                    onCamera={() => { setCameraTarget({ setFile: setSelfieFile, setPreview: setSelfiePreview, fieldName: 'selfie' }); setCameraOpen(true); }}
                    acceptPdf={false}
                    hint="Hold your ID next to your face"
                  />
                  {blurResults['selfie'] && <p className={`text-[11px] font-semibold ${blurResults['selfie'].isBlurry ? 'text-red-500' : 'text-emerald-600'}`}>{blurResults['selfie'].message}</p>}
                  {showErrorsFor('id') && (!govIdFront || !selfieFile || (needsBack && !govIdBack)) && <p className="text-xs text-red-500">Front ID, selfie, and back (if applicable) are required.</p>}
                </div>
              )}
            </div>
          )}

          {STEPS[step].id === 'ownership' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                <p className="text-xs font-bold text-indigo-700 flex items-center gap-2"><FileText size={16} /> Court Ownership Documents</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Document Type <span className="text-red-500">*</span></label>
                <select
                  value={ownershipDocType}
                  onChange={(e) => setOwnershipDocType(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 focus:outline-none focus:border-blue-500 appearance-none transition-all text-sm"
                >
                  <option value="">Select document type...</option>
                  {OWNERSHIP_DOC_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
                {showErrorsFor('ownership') && !ownershipDocType && <p className="text-xs text-red-500">Choose a document type.</p>}
              </div>
              {ownershipDocType && (
                <UploadZone
                  label="Upload Document"
                  required
                  preview={ownershipDocPreview}
                  onFile={(f) => handleSingleFile(f, setOwnershipDoc, setOwnershipDocPreview)}
                  onRemove={() => { if (ownershipDocPreview.startsWith('blob:')) URL.revokeObjectURL(ownershipDocPreview); setOwnershipDoc(null); setOwnershipDocPreview(''); }}
                  hint="Upload at least one ownership proof"
                />
              )}
              {showErrorsFor('ownership') && !ownershipDoc && <p className="text-xs text-red-500">Ownership document is required.</p>}
            </div>
          )}

          {STEPS[step].id === 'business' && (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-2"><Briefcase size={16} /> Business Documents (Conditional)</p>
              </div>

              <div className="flex gap-3 flex-wrap">
                {['personal', 'commercial'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setBusinessType(type as 'personal' | 'commercial'); if (type === 'personal') { setBusinessDoc(null); setBusinessDocPreview(''); setBusinessDocType(''); } }}
                    className={`px-4 py-3 rounded-xl border text-sm font-black ${businessType === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}
                  >
                    {type === 'personal' ? 'Personal Court' : 'Commercial Facility'}
                  </button>
                ))}
              </div>
              {showErrorsFor('business') && !businessType && <p className="text-xs text-red-500">Select business type.</p>}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-2">
                  Business Document {businessDocRequired ? <span className="text-red-500">*</span> : <span className="text-slate-400 text-[9px]">(Optional for personal)</span>}
                </label>
                <select
                  value={businessDocType}
                  onChange={(e) => setBusinessDocType(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-black text-slate-900 focus:outline-none focus:border-blue-500 appearance-none transition-all text-sm"
                >
                  <option value="">{businessDocRequired ? 'Select document...' : 'Skip or select...'}</option>
                  {BUSINESS_DOC_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              {businessDocType && (
                <UploadZone
                  label="Upload Business Document"
                  required={businessDocRequired}
                  preview={businessDocPreview}
                  onFile={(f) => handleSingleFile(f, setBusinessDoc, setBusinessDocPreview)}
                  onRemove={() => { if (businessDocPreview.startsWith('blob:')) URL.revokeObjectURL(businessDocPreview); setBusinessDoc(null); setBusinessDocPreview(''); }}
                  hint={businessDocRequired ? 'Required for commercial' : 'Optional'}
                />
              )}
              {showErrorsFor('business') && businessDocRequired && (!businessDocType || !businessDoc) && <p className="text-xs text-red-500">Upload at least one business document for commercial facilities.</p>}
            </div>
          )}

          {STEPS[step].id === 'photos' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 flex items-center gap-2"><Camera size={16} /> Court Photos</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Pickleball Court Photos <span className="text-red-500">*</span> <span className="text-[9px] text-blue-500 ml-1">Minimum 3</span></label>
                <div className="grid grid-cols-3 gap-3">
                  {courtPhotoPreviews.map((preview, idx) => (
                    <div key={idx} className="relative group rounded-2xl overflow-hidden border-2 border-blue-200">
                      {preview === 'pdf' ? (
                        <div className="flex items-center justify-center h-24 bg-blue-50 text-blue-600"><FileText size={20} /></div>
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
                        ✕
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
                        onChange={(e) => { const files = Array.from(e.target.files || []); handleMultipleFiles(files, courtPhotos, setCourtPhotos, courtPhotoPreviews, setCourtPhotoPreviews); e.target.value = ''; }}
                      />
                      <Upload size={16} className="text-slate-300" />
                      <p className="text-[8px] font-bold text-slate-400 mt-1">Add Photos</p>
                    </label>
                  )}
                </div>
                <p className="text-[9px] text-slate-500">{courtPhotos.length}/3 minimum • {courtPhotos.length}/10 maximum</p>
                {showErrorsFor('photos') && courtPhotos.length < 3 && <p className="text-xs text-red-500">Upload at least 3 court photos.</p>}
              </div>

              <UploadZone
                label="Court Entrance / Signage"
                required
                preview={entrancePhotoPreview}
                onFile={(f) => handleSingleFile(f, setEntrancePhoto, setEntrancePhotoPreview)}
                onRemove={() => { if (entrancePhotoPreview.startsWith('blob:')) URL.revokeObjectURL(entrancePhotoPreview); setEntrancePhoto(null); setEntrancePhotoPreview(''); }}
                hint="Required: 1 entrance photo"
                onCamera={() => { setCameraTarget({ setFile: setEntrancePhoto, setPreview: setEntrancePhotoPreview }); setCameraOpen(true); }}
                acceptPdf={false}
              />
              {showErrorsFor('photos') && !entrancePhoto && <p className="text-xs text-red-500">Entrance photo is required.</p>}

              <UploadZone
                label="Whole Facility (Optional)"
                preview={facilityPhotoPreview}
                onFile={(f) => handleSingleFile(f, setFacilityPhoto, setFacilityPhotoPreview)}
                onRemove={() => { if (facilityPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(facilityPhotoPreview); setFacilityPhoto(null); setFacilityPhotoPreview(''); }}
                hint="Optional overview"
                onCamera={() => { setCameraTarget({ setFile: setFacilityPhoto, setPreview: setFacilityPhotoPreview }); setCameraOpen(true); }}
                acceptPdf={false}
              />

              <UploadZone
                label="Court Lines and Nets (Optional)"
                preview={courtLinesPhotoPreview}
                onFile={(f) => handleSingleFile(f, setCourtLinesPhoto, setCourtLinesPhotoPreview)}
                onRemove={() => { if (courtLinesPhotoPreview.startsWith('blob:')) URL.revokeObjectURL(courtLinesPhotoPreview); setCourtLinesPhoto(null); setCourtLinesPhotoPreview(''); }}
                hint="Optional close-up"
                onCamera={() => { setCameraTarget({ setFile: setCourtLinesPhoto, setPreview: setCourtLinesPhotoPreview }); setCameraOpen(true); }}
                acceptPdf={false}
              />
            </div>
          )}

          {STEPS[step].id === 'review' && (
            <div className="space-y-4">
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <p className="text-xs font-bold text-emerald-700 flex items-center gap-2"><ShieldCheck size={16} /> Review & Submit</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px] text-slate-700 font-semibold bg-slate-50 border border-slate-100 rounded-2xl p-4">
                <div>
                  <p className="font-black text-slate-900">Location Info</p>
                  <p>{locationForm.courtName}</p>
                  <p>{locationForm.street}, {locationForm.barangay}, {locationForm.city}, {locationForm.province} {locationForm.zipCode}</p>
                  <p>Phone: {locationForm.phone}</p>
                  <p>Email: {locationForm.email}</p>
                  <p>Map Pin: {coordsSet ? 'Set ✓' : 'Missing'}</p>
                </div>
                <div>
                  <p className="font-black text-slate-900">Documents</p>
                  <p>ID: {govIdType ? 'Ready' : 'Missing'}</p>
                  <p>Ownership: {ownershipDocType ? 'Ready' : 'Missing'}</p>
                  <p>Business: {businessType ? businessType : 'Missing'}</p>
                  <p>Photos: {courtPhotos.length >= 3 && entrancePhoto ? 'Ready' : 'Missing'}</p>
                </div>
              </div>
              <div className="bg-slate-900 text-white rounded-2xl p-4 text-sm font-semibold">
                Your personal and business documents are सुरक्षित and used only for verification.
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] font-bold text-slate-600">
                <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">Status: Incomplete → Ready for Review → Pending Review → Verified / Rejected</span>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-100 px-8 py-5 rounded-b-[36px] flex items-center justify-between">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200"
          >
            <ChevronLeft size={14} /> {step === 0 ? 'Save & Exit' : 'Back'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={!isStepValid(step)}
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting || !isStepValid(step)}
              className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (<><Loader2 size={14} className="animate-spin" /> Submitting...</>) : (<><CheckCircle2 size={14} /> Submit Application</>)}
            </button>
          )}
        </div>

        <CameraCapture
          open={cameraOpen}
          onClose={() => { setCameraOpen(false); setCameraTarget(null); }}
          onCapture={(file) => {
            if (cameraTarget) {
              handleSingleFile(file, cameraTarget.setFile, cameraTarget.setPreview, cameraTarget.fieldName);
            }
            setCameraOpen(false);
            setCameraTarget(null);
          }}
          label={cameraTarget?.fieldName?.replace(/_/g, ' ') || 'Take Photo'}
        />
      </div>
    </div>,
    document.body
  );
};

export default CourtOwnerVerificationForm;