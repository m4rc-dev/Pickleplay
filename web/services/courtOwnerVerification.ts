import { supabase } from './supabase';

// ============================================================
// Court Owner Verification Service
// Secure endpoints for verification document management
// ============================================================

export interface CourtOwnerVerification {
  id: string;
  profile_id: string;
  application_id?: string;
  verification_path?: 'government_id' | 'court_ownership' | null;
  status: 'PENDING' | 'UNDER_REVIEW' | 'RESUBMISSION_REQUESTED' | 'APPROVED' | 'REJECTED';

  // Government ID
  government_id_type: string | null;
  government_id_front_url: string | null;
  government_id_back_url: string | null;
  selfie_with_id_url: string | null;

  // Ownership
  ownership_doc_type: string | null;
  ownership_doc_url: string | null;

  // Business
  business_doc_type: string | null;
  business_doc_url: string | null;

  // Court Photos
  court_photo_urls: string[];
  entrance_photo_url: string | null;
  facility_photo_url: string | null;
  court_lines_photo_url: string | null;

  // Maps
  google_maps_link: string | null;
  latitude: number | null;
  longitude: number | null;

  // Resubmission
  resubmission_fields: string[];
  resubmission_note: string | null;
  resubmission_count: number;
  field_comments: Record<string, string> | null;

  // Admin
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_notes: string | null;

  // Timestamps
  submitted_at: string;
  updated_at: string;

  // Joined
  profiles?: { full_name: string; avatar_url: string; email: string };
}

// ─── ID Types that need back photo ───
export const IDS_NEEDING_BACK = [
  'philippine_drivers_license',
  'philsys_national_id',
  'sss_umid_card',
  'prc_id',
  'postal_id',
];

export const GOVERNMENT_ID_OPTIONS = [
  { value: 'philippine_passport', label: 'Philippine Passport' },
  { value: 'philippine_drivers_license', label: "Philippine Driver's License" },
  { value: 'philsys_national_id', label: 'PhilSys National ID' },
  { value: 'sss_umid_card', label: 'SSS UMID Card' },
  { value: 'prc_id', label: 'PRC ID' },
  { value: 'postal_id', label: 'Postal ID' },
  { value: 'voters_id', label: "Voter's ID" },
];

export const OWNERSHIP_DOC_OPTIONS = [
  { value: 'transfer_certificate_of_title', label: 'Transfer Certificate of Title' },
  { value: 'tax_declaration', label: 'Tax Declaration' },
  { value: 'land_title', label: 'Land Title' },
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'business_permit', label: 'Business Permit' },
];

export const BUSINESS_DOC_OPTIONS = [
  { value: 'dti_registration', label: 'DTI Business Name Registration' },
  { value: 'sec_certificate', label: 'SEC Certificate of Registration' },
  { value: 'barangay_clearance', label: 'Barangay Business Clearance' },
  { value: 'mayors_permit', label: "Mayor's Permit" },
];

// ─── All field labels (for resubmission UI) ───
export const VERIFICATION_FIELD_LABELS: Record<string, string> = {
  government_id_front: 'Government ID (Front)',
  government_id_back: 'Government ID (Back)',
  selfie_with_id: 'Selfie Holding ID',
  ownership_doc: 'Proof of Court Ownership',
  business_doc: 'Business Legitimacy Document',
  court_photos: 'Court Photos (min 3)',
  entrance_photo: 'Court Entrance/Signage Photo',
  facility_photo: 'Whole Facility Photo',
  court_lines_photo: 'Court Lines and Nets Photo',
  google_maps_link: 'Google Maps Location',
};

// ─── Upload a file to verification-documents bucket ───
export async function uploadVerificationFile(
  userId: string,
  file: File,
  folder: string
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from('application-documents')
    .upload(path, file, { upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from('application-documents')
    .getPublicUrl(path);

  return urlData.publicUrl;
}

// ─── Submit a new verification application ───
export async function submitVerification(data: {
  profile_id: string;
  application_id?: string;
  verification_path?: 'government_id' | 'court_ownership';
  government_id_type?: string;
  government_id_front_url?: string;
  government_id_back_url?: string;
  selfie_with_id_url?: string;
  ownership_doc_type?: string;
  ownership_doc_url?: string;
  business_doc_type?: string;
  business_doc_url?: string;
  court_photo_urls?: string[];
  entrance_photo_url?: string;
  facility_photo_url?: string;
  court_lines_photo_url?: string;
  google_maps_link?: string;
  latitude?: number;
  longitude?: number;
}): Promise<CourtOwnerVerification> {
  const { data: result, error } = await supabase
    .from('court_owner_verifications')
    .insert({
      ...data,
      status: 'PENDING',
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Submission failed: ${error.message}`);
  return result;
}

// ─── Get my verification status ───
export async function getMyVerification(profileId: string): Promise<CourtOwnerVerification | null> {
  const { data, error } = await supabase
    .from('court_owner_verifications')
    .select('*')
    .eq('profile_id', profileId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data;
}

// ─── Resubmit specific fields ───
export async function resubmitVerification(
  verificationId: string,
  updates: Partial<CourtOwnerVerification>
): Promise<CourtOwnerVerification> {
  const { data, error } = await supabase
    .from('court_owner_verifications')
    .update({
      ...updates,
      status: 'PENDING',
      resubmission_fields: [],
      resubmission_note: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', verificationId)
    .select()
    .single();

  if (error) throw new Error(`Resubmission failed: ${error.message}`);
  return data;
}

// ═══════════════════════════════════════════════════════════
// Admin-only endpoints (RLS ensures only admins can call)
// ═══════════════════════════════════════════════════════════

// ─── Get all verifications (admin) ───
export async function getAllVerifications(statusFilter?: string): Promise<CourtOwnerVerification[]> {
  let query = supabase
    .from('court_owner_verifications')
    .select('*, profiles!court_owner_verifications_profile_id_fkey(full_name, avatar_url, email)')
    .order('submitted_at', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Fetch all failed: ${error.message}`);
  return data || [];
}

// ─── Admin approve ───
export async function adminApproveVerification(
  verificationId: string,
  adminId: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('court_owner_verifications')
    .update({
      status: 'APPROVED',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes || null,
      resubmission_fields: [],
      resubmission_note: null,
    })
    .eq('id', verificationId);

  if (error) throw new Error(`Approval failed: ${error.message}`);
}

// ─── Admin reject ───
export async function adminRejectVerification(
  verificationId: string,
  adminId: string,
  notes?: string
): Promise<void> {
  const { error } = await supabase
    .from('court_owner_verifications')
    .update({
      status: 'REJECTED',
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      admin_notes: notes || null,
    })
    .eq('id', verificationId);

  if (error) throw new Error(`Rejection failed: ${error.message}`);
}

// ─── Admin request resubmission ───
export async function adminRequestResubmission(
  verificationId: string,
  adminId: string,
  fields: string[],
  note: string,
  resubmitAll: boolean = false,
  fieldComments?: Record<string, string>
): Promise<void> {
  const allFields = resubmitAll
    ? Object.keys(VERIFICATION_FIELD_LABELS)
    : fields;

  const { data: existing, error: fetchErr } = await supabase
    .from('court_owner_verifications')
    .select('resubmission_count')
    .eq('id', verificationId)
    .single();

  if (fetchErr) throw new Error(`Fetch failed: ${fetchErr.message}`);

  const { error } = await supabase
    .from('court_owner_verifications')
    .update({
      status: 'RESUBMISSION_REQUESTED',
      resubmission_fields: allFields,
      resubmission_note: note,
      resubmission_count: (existing?.resubmission_count || 0) + 1,
      reviewed_by: adminId,
      reviewed_at: new Date().toISOString(),
      field_comments: fieldComments || {},
    })
    .eq('id', verificationId);

  if (error) throw new Error(`Resubmission request failed: ${error.message}`);

  // Notify the user
  const { data: verification } = await supabase
    .from('court_owner_verifications')
    .select('profile_id')
    .eq('id', verificationId)
    .single();

  if (verification) {
    await supabase.from('notifications').insert({
      user_id: verification.profile_id,
      type: 'SYSTEM',
      message: `Your court owner verification requires resubmission: ${note}`,
      actor_id: adminId,
    });
  }
}
