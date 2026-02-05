# Professional Application with Document Upload

**Date**: February 5, 2026  
**Status**: ✅ Complete with Document Upload

## Summary of Changes

The verification system now includes a professional application modal that allows users to:
1. Fill out an application form
2. **Upload supporting documents** (certifications, licenses, proof of ownership)
3. Submit everything for admin review

---

## New Component: ProfessionalApplicationModal

### Location
`src/components/ProfessionalApplicationModal.js`

### Features
- **Application Type Selection**: Dropdown to choose between Coach or Court Owner
- **Experience Summary**: Text area for users to describe their qualifications
- **Document Upload**: 
  - Multiple file support (PDF, DOC, images)
  - Max 10MB per file
  - Visual list of uploaded documents
  - Remove individual documents before submission
- **Access Code**: Optional promotional code field
- **Form Validation**: Ensures required fields are filled
- **Document Storage**: Uploads to Supabase Storage bucket `professional-documents`

### Document Upload Flow
```
User clicks "Choose Files"
   ↓
expo-document-picker opens
   ↓
User selects one or multiple documents
   ↓
Files validated (size < 10MB)
   ↓
Documents listed with remove option
   ↓
On submit, each file uploaded to Supabase Storage
   ↓
Public URLs collected
   ↓
URLs stored in professional_applications.document_url (comma-separated)
```

### Storage Structure
```
professional-documents/
├── applications/
│   ├── COACH/
│   │   ├── {userId}_{timestamp}.pdf
│   │   ├── {userId}_{timestamp}.jpg
│   │   └── ...
│   └── COURT_OWNER/
│       ├── {userId}_{timestamp}.pdf
│       ├── {userId}_{timestamp}.jpg
│       └── ...
```

---

## Updated Screens

### HomeScreen.js
- Opens `ProfessionalApplicationModal` when user clicks "Become a Coach" or "List Your Court"
- Passes `applicationType` prop to pre-select the role
- Refreshes user data after successful submission

### CourtOwnerScreen.js
- Opens `ProfessionalApplicationModal` when user clicks "Request Court Owner Verification"
- Pre-fills application type as 'COURT_OWNER'
- Refreshes verification status after submission

### CoachScreen.js
- Opens `ProfessionalApplicationModal` when user clicks "Request Coach Verification"
- Pre-fills application type as 'COACH'
- Refreshes verification status after submission

---

## Database Schema Updates

### professional_applications Table
```sql
CREATE TABLE professional_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES profiles(id),
  requested_role USER_ROLE NOT NULL,
  status APPLICATION_STATUS DEFAULT 'PENDING',
  experience_summary text,              -- ✅ NEW: User's qualifications description
  document_url text,                     -- ✅ NEW: Comma-separated document URLs
  admin_notes text,
  submitted_at timestamp DEFAULT now(),
  processed_at timestamp,
  processed_by uuid REFERENCES profiles(id)
);
```

### Supabase Storage Bucket
```
Bucket Name: professional-documents
Public Access: No (requires authentication)
File Size Limit: 10MB per file
Allowed Types: PDF, DOC, DOCX, images (JPG, PNG, etc.)
```

---

## Admin Review Process

### What Admins See
When reviewing applications, admins can now access:

1. **Application Details**:
   - Requested role (Coach or Court Owner)
   - Submission date
   - Applicant's profile information

2. **Experience Summary**:
   - User's written description of their qualifications
   - Background information
   - Relevant experience

3. **Supporting Documents**:
   - Download/view all uploaded documents
   - Verify certifications for coaches
   - Verify proof of ownership for court owners
   - Check business licenses and permits

### Admin Query Example
```sql
SELECT 
  pa.id,
  pa.requested_role,
  pa.experience_summary,
  pa.document_url,
  pa.submitted_at,
  p.full_name,
  p.email,
  p.location
FROM professional_applications pa
JOIN profiles p ON pa.profile_id = p.id
WHERE pa.status = 'PENDING'
ORDER BY pa.submitted_at DESC;
```

### Document Access
```javascript
// Split comma-separated URLs
const documentUrls = application.document_url.split(',');

// Each URL is a publicly accessible link to view/download
documentUrls.forEach(url => {
  console.log('Document:', url);
  // Admin can open these URLs to review documents
});
```

---

## User Experience

### For Coaches Applying

**Step 1**: Click "Become a Coach" button on HomeScreen

**Step 2**: Modal opens with form:
- Application Type: Pre-selected as "Certified Coach"
- Experience Summary: Describe coaching background
- Upload Documents: 
  - ✅ Coaching certifications (USAPA, PPR, etc.)
  - ✅ Training credentials
  - ✅ References or recommendations
  - ✅ Resume/CV

**Step 3**: Submit application

**Step 4**: Wait for admin review (1-3 business days)

**Step 5**: Receive notification when approved

**Step 6**: Access CoachScreen features

### For Court Owners Applying

**Step 1**: Click "List Your Court" button on HomeScreen

**Step 2**: Modal opens with form:
- Application Type: Pre-selected as "Court Owner"
- Experience Summary: Describe facility and ownership
- Upload Documents:
  - ✅ Proof of ownership (deed, lease agreement)
  - ✅ Facility photos
  - ✅ Business license
  - ✅ Liability insurance
  - ✅ Facility permits

**Step 3**: Submit application

**Step 4**: Wait for admin review (1-3 business days)

**Step 5**: Receive notification when approved

**Step 6**: Access CourtOwnerScreen and add courts

---

## Required Documents Guidelines

### For Coach Applications
**Required:**
- Valid coaching certification (USAPA, PPR, IFP, etc.)
- Photo ID
- Background check (if available)

**Optional but Recommended:**
- Resume/CV
- References
- Training credentials
- Tournament experience documentation

### For Court Owner Applications
**Required:**
- Proof of court ownership or management authority
- Business registration/license
- Liability insurance certificate

**Optional but Recommended:**
- Facility photos (multiple angles)
- Court specifications document
- Safety certifications
- Amenities documentation

---

## Security Considerations

### Document Upload Security
- ✅ File size limits prevent large uploads (10MB max)
- ✅ File type validation (PDF, DOC, images only)
- ✅ Files stored in authenticated bucket
- ✅ Unique filenames prevent collisions
- ✅ User ID in filename for traceability

### Storage Policies
```sql
-- Only authenticated users can upload to their own folder
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'professional-documents' AND
  (storage.foldername(name))[1] = 'applications' AND
  auth.uid()::text = (storage.foldername(name))[3]
);

-- Admins can read all documents
CREATE POLICY "Admins can read all documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'professional-documents' AND
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND 'ADMIN' = ANY(roles)
  )
);

-- Users can read their own documents
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'professional-documents' AND
  auth.uid()::text = (storage.foldername(name))[3]
);
```

---

## Testing Checklist

### Application Form
- [ ] Modal opens when clicking application buttons
- [ ] Application type pre-fills correctly
- [ ] Experience summary text area works
- [ ] Document picker opens on click
- [ ] Multiple documents can be selected
- [ ] Documents display in list with names
- [ ] Remove document button works
- [ ] File size validation (> 10MB shows error)
- [ ] Form validation (requires experience summary)
- [ ] Submit button disabled while uploading
- [ ] Loading indicator shows during submission

### Document Upload
- [ ] Documents upload to correct Storage bucket
- [ ] File naming follows format: {userId}_{timestamp}.{ext}
- [ ] Public URLs generated correctly
- [ ] Multiple URLs stored comma-separated
- [ ] Documents accessible via URLs
- [ ] File types validated (PDF, DOC, images only)

### Application Submission
- [ ] Record created in professional_applications
- [ ] experience_summary field populated
- [ ] document_url field contains URLs
- [ ] status set to 'PENDING'
- [ ] Success message displays
- [ ] Modal closes after submission
- [ ] Pending card appears on screen
- [ ] User data refreshes automatically

### Admin Review
- [ ] Admin can query pending applications
- [ ] Document URLs accessible
- [ ] Can view/download all uploaded documents
- [ ] Experience summary readable
- [ ] Approval process works unchanged
- [ ] Rejection process works unchanged

---

## Installation Requirements

### NPM Packages
```json
{
  "expo-document-picker": "^11.x.x"
}
```

### Install Command
```bash
cd mobile/pickleplay
npm install expo-document-picker
```

### Supabase Setup
1. Create storage bucket named `professional-documents`
2. Set bucket to private (not public)
3. Apply storage policies for user and admin access
4. Configure file size limits (10MB)

---

## Error Handling

### User-Facing Errors
- "File too large" - File exceeds 10MB
- "Invalid file type" - File not PDF/DOC/image
- "Upload failed" - Network or storage error
- "Submission failed" - Database insert error

### Developer Logs
```javascript
console.error('Error picking document:', error);
console.error('Error uploading document:', error);
console.error('Error submitting application:', error);
```

---

## Future Enhancements

### Phase 2
- [ ] Admin dashboard to review applications with document viewer
- [ ] In-app document preview (PDF viewer)
- [ ] Image compression before upload
- [ ] Drag-and-drop document upload
- [ ] Application status tracking page
- [ ] Email notifications with document links

### Phase 3
- [ ] OCR for automatic document verification
- [ ] Document expiration tracking (certificates)
- [ ] Bulk document download for admins
- [ ] Application comments/messaging
- [ ] Document version history
- [ ] E-signature support

---

## Files Modified

1. ✅ **NEW**: `src/components/ProfessionalApplicationModal.js` - Application form modal
2. ✅ `src/screens/HomeScreen.js` - Integration with modal
3. ✅ `src/screens/CourtOwnerScreen.js` - Integration with modal
4. ✅ `src/screens/CoachScreen.js` - Integration with modal
5. ✅ `package.json` - Added expo-document-picker dependency

---

## Conclusion

The professional application system now includes comprehensive document upload functionality, allowing users to submit supporting documentation with their applications. This ensures admins have all necessary information to make informed verification decisions while maintaining security and data integrity.

**Key Improvements:**
✅ Professional application form with document upload  
✅ Support for multiple file types and sizes  
✅ Secure storage in Supabase  
✅ Admin access to review documents  
✅ User-friendly interface with validation  
✅ No changes to admin review workflow (just additional data)

---

**Last Updated:** February 5, 2026  
**Implementation Status:** ✅ Complete and Ready for Testing
