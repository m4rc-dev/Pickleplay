import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, MapPin, Plus, LayoutGrid, List, X, Search, ChevronRight, Clock, Trash2, Target, Phone, FileText, Camera, Image, Check, ChevronDown, Sparkles, Pencil, Loader2, Calendar, Shield, PhilippinePeso } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { uploadCourtImage, uploadCourtPhoto } from '../../../services/locations';
import { Location, LocationClosure, LocationClosureReason, CourtStatus, CourtManagerAssignment } from '../../../types';
import { approveCourtManager, assignCourtManager, copyCourtManagerInviteLink, getCourtManagerAssignments, getCurrentActiveRole, getCurrentCourtManagerContext, removeCourtManager, type CourtManagerContext } from '../../../services/courtManagers';
import type { ActiveCourtRole } from '../../../types/court-manager';
import { getCourtManagerStatusClasses, getCourtManagerStatusLabel, getCourtOperationsRoute } from '../../../lib/court-manager/mapper';
import ConfirmDialog from '../../ui/ConfirmDialog';

declare global {
    interface Window {
        google: any;
    }
}

interface CourtItem {
    id: string;
    location_id: string;
    owner_id: string;
    name: string;
    num_courts: number;
    surface_type: string;
    base_price: number;
    cleaning_time_minutes: number;
    is_active: boolean;
    amenities?: string[];
    latitude?: number;
    longitude?: number;
    image_url?: string;
    court_type?: 'Indoor' | 'Outdoor' | 'Both';
    status?: CourtStatus;
    location_name?: string;
    managerAssignment?: CourtManagerAssignment | null;
}

const LocationsList: React.FC = () => {
    const [locations, setLocations] = useState<Location[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLocationListModalOpen, setIsLocationListModalOpen] = useState(false);
    const [locationModalSearch, setLocationModalSearch] = useState('');
    const [activeRole, setActiveRole] = useState<ActiveCourtRole>('OTHER');
    const [managerContext, setManagerContext] = useState<CourtManagerContext | null>(null);
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const handledManagerDeepLinkRef = useRef<string | null>(null);

    // ── Court Management State ──
    const [allCourts, setAllCourts] = useState<CourtItem[]>([]);
    const [isLoadingCourts, setIsLoadingCourts] = useState(true);
    const [isAddCourtModalOpen, setIsAddCourtModalOpen] = useState(false);
    const [isEditCourtModalOpen, setIsEditCourtModalOpen] = useState(false);
    const [editingCourt, setEditingCourt] = useState<CourtItem | null>(null);
    const [isCourtSubmitting, setIsCourtSubmitting] = useState(false);
    const [courtSearchQuery, setCourtSearchQuery] = useState('');
    const [courtLocationFilter, setCourtLocationFilter] = useState('');
    const [isLocationFilterOpen, setIsLocationFilterOpen] = useState(false);
    const locationFilterRef = useRef<HTMLDivElement>(null);

    // Court detail view modal
    const [viewingCourt, setViewingCourt] = useState<CourtItem | null>(null);
    const [isViewCourtModalOpen, setIsViewCourtModalOpen] = useState(false);
    const [viewCourtBookings, setViewCourtBookings] = useState<any[]>([]);
    const [isLoadingViewBookings, setIsLoadingViewBookings] = useState(false);
    const [managerModalCourt, setManagerModalCourt] = useState<CourtItem | null>(null);
    const [managerActionKey, setManagerActionKey] = useState<string | null>(null);
    const [copiedInviteAssignmentId, setCopiedInviteAssignmentId] = useState<string | null>(null);

    // Today's bookings count per court (with time-aware availability)
    const [courtBookingCounts, setCourtBookingCounts] = useState<Record<string, { booked: number; passed: number; available: number; totalSlots: number }>>({});

    // Court form state
    const [courtLocationId, setCourtLocationId] = useState('');
    const [courtName, setCourtName] = useState('');
    const [courtType, setCourtType] = useState<'Indoor' | 'Outdoor'>('Indoor');
    const [courtStatus, setCourtStatus] = useState<CourtStatus>('Setup Required');
    const [courtSurface, setCourtSurface] = useState('');
    const [courtPrice, setCourtPrice] = useState(0);
    const [isCourtFree, setIsCourtFree] = useState(false);
    const [isSurfaceDropdownOpen, setIsSurfaceDropdownOpen] = useState(false);
    const [surfaceSearch, setSurfaceSearch] = useState('');
    const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
    const [locationDropdownSearch, setLocationDropdownSearch] = useState('');
    const [courtImageFile, setCourtImageFile] = useState<File | null>(null);
    const [courtImagePreview, setCourtImagePreview] = useState<string | null>(null);
    const [isImageGalleryOpen, setIsImageGalleryOpen] = useState(false);
    const [imageGalleryTarget, setImageGalleryTarget] = useState<'location' | 'court' | null>(null);
    const courtImageInputRef = useRef<HTMLInputElement>(null);
    const surfaceDropdownRef = useRef<HTMLDivElement>(null);
    const locationDropdownRef = useRef<HTMLDivElement>(null);

    const INDOOR_SURFACES = ['Wood', 'Synthetic', 'Sport Tile', 'Rubberized Flooring'];
    const OUTDOOR_SURFACES = ['Concrete', 'Asphalt', 'Acrylic-Coated', 'Sport Tiles'];

    // Form state
    const [formName, setFormName] = useState('');
    const [formAddress, setFormAddress] = useState('');
    const [formCity, setFormCity] = useState('');
    const [formPhone, setFormPhone] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formAmenities, setFormAmenities] = useState('');
    const [formCleaningTime, setFormCleaningTime] = useState(0);
    const [previewCoords, setPreviewCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [formImageFile, setFormImageFile] = useState<File | null>(null);
    const [formImagePreview, setFormImagePreview] = useState<string | null>(null);
    const [formCourtType, setFormCourtType] = useState<'Indoor' | 'Outdoor' | 'Both'>('Indoor');
    const [formStatus, setFormStatus] = useState<'Active' | 'Closed' | 'Maintenance' | 'Coming Soon'>('Coming Soon');

    // Amenities dropdown state (for Add/Edit Location form)
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [allKnownAmenities, setAllKnownAmenities] = useState<string[]>([]);
    const [amenitySearch, setAmenitySearch] = useState('');
    const [isAmenityDropdownOpen, setIsAmenityDropdownOpen] = useState(false);
    const amenityDropdownRef = React.useRef<HTMLDivElement>(null);

    // Master amenities modal state
    const [isMasterAmenitiesOpen, setIsMasterAmenitiesOpen] = useState(false);
    const [masterAmenities, setMasterAmenities] = useState<{ id: string; name: string }[]>([]);

    // Confirm dialog state
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant: 'warning' | 'danger' | 'info';
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { }, variant: 'warning' });

    // Confirm dialog helpers
    const showConfirm = (title: string, message: string, onConfirm: () => void, variant: 'warning' | 'danger' | 'info' = 'warning') => {
        setConfirmDialog({ isOpen: true, title, message, onConfirm, variant });
    };

    const closeConfirm = () => {
        setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => { }, variant: 'warning' });
    };

    const handleConfirm = () => {
        confirmDialog.onConfirm();
        closeConfirm();
    };
    const [newMasterAmenity, setNewMasterAmenity] = useState('');
    const [editingMasterIdx, setEditingMasterIdx] = useState<string | null>(null);
    const [editingMasterValue, setEditingMasterValue] = useState('');
    const [isSavingMaster, setIsSavingMaster] = useState(false);

    // PSGC Philippine Address cascading dropdown state
    const [formRegion, setFormRegion] = useState('');
    const [formBarangay, setFormBarangay] = useState('');
    const [psgcRegions, setPsgcRegions] = useState<{ code: string; name: string }[]>([]);
    const [psgcCities, setPsgcCities] = useState<{ code: string; name: string }[]>([]);
    const [psgcBarangays, setPsgcBarangays] = useState<{ code: string; name: string }[]>([]);
    const [selectedRegionCode, setSelectedRegionCode] = useState('');
    const [selectedCityCode, setSelectedCityCode] = useState('');
    const [isLoadingRegions, setIsLoadingRegions] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingBarangays, setIsLoadingBarangays] = useState(false);
    const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
    const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
    const [isBarangayDropdownOpen, setIsBarangayDropdownOpen] = useState(false);
    const [regionSearch, setRegionSearch] = useState('');
    const [citySearch, setCitySearch] = useState('');
    const [barangaySearch, setBarangaySearch] = useState('');
    const regionDropdownRef = useRef<HTMLDivElement>(null);
    const cityDropdownRef = useRef<HTMLDivElement>(null);
    const barangayDropdownRef = useRef<HTMLDivElement>(null);
    const isEditLoadingRef = useRef(false);

    // Location closures calendar state (Edit only)
    const [closures, setClosures] = useState<LocationClosure[]>([]);
    const [closureCalendarMonth, setClosureCalendarMonth] = useState(new Date());
    const [selectedClosureDate, setSelectedClosureDate] = useState<string | null>(null);
    const [closureReason, setClosureReason] = useState<LocationClosureReason>('Holiday');
    const [closureDescription, setClosureDescription] = useState('');
    const [isSavingClosure, setIsSavingClosure] = useState(false);

    const isOwnerView = activeRole === 'COURT_OWNER';
    const isManagerView = activeRole === 'COURT_MANAGER';
    const bookingsRoute = getCourtOperationsRoute(activeRole, 'bookings');
    const scheduleRoute = getCourtOperationsRoute(activeRole, 'schedule');

    const geocodeAddress = async (address: string, city: string): Promise<{ lat: number; lng: number } | null> => {
        if (!window.google || !address || !city) return null;
        const geocoder = new window.google.maps.Geocoder();
        const fullAddress = `${address}, ${city}, Philippines`;
        return new Promise((resolve) => {
            geocoder.geocode({ address: fullAddress }, (results: any, status: any) => {
                if (status === 'OK' && results[0]) {
                    const { lat, lng } = results[0].geometry.location;
                    resolve({ lat: lat(), lng: lng() });
                } else {
                    resolve(null);
                }
            });
        });
    };

    // Debounced geocoding
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (formAddress && formCity && (isAddModalOpen || isEditModalOpen)) {
                setIsGeocoding(true);
                const coords = await geocodeAddress(formAddress, formCity);
                setPreviewCoords(coords);
                setIsGeocoding(false);
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [formAddress, formCity, isAddModalOpen, isEditModalOpen]);

    // Close amenity dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (amenityDropdownRef.current && !amenityDropdownRef.current.contains(e.target as Node)) {
                setIsAmenityDropdownOpen(false);
            }
            if (regionDropdownRef.current && !regionDropdownRef.current.contains(e.target as Node)) {
                setIsRegionDropdownOpen(false);
            }
            if (cityDropdownRef.current && !cityDropdownRef.current.contains(e.target as Node)) {
                setIsCityDropdownOpen(false);
            }
            if (barangayDropdownRef.current && !barangayDropdownRef.current.contains(e.target as Node)) {
                setIsBarangayDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // PSGC: Fetch regions on mount
    useEffect(() => {
        const fetchRegions = async () => {
            setIsLoadingRegions(true);
            try {
                const res = await fetch('https://psgc.gitlab.io/api/regions/');
                const data = await res.json();
                const mapped = (data || []).map((r: any) => ({ code: r.code, name: r.name || r.regionName })).sort((a: any, b: any) => a.name.localeCompare(b.name));
                setPsgcRegions(mapped);
            } catch (err) {
                console.error('Error fetching PSGC regions:', err);
            } finally {
                setIsLoadingRegions(false);
            }
        };
        fetchRegions();
    }, []);

    // PSGC: Fetch cities when region changes
    useEffect(() => {
        if (!selectedRegionCode) { setPsgcCities([]); return; }
        if (isEditLoadingRef.current) return; // Skip when loading edit data
        const fetchCities = async () => {
            setIsLoadingCities(true);
            setPsgcCities([]);
            setPsgcBarangays([]);
            setFormCity('');
            setSelectedCityCode('');
            setFormBarangay('');
            setCitySearch('');
            setBarangaySearch('');
            try {
                const res = await fetch(`https://psgc.gitlab.io/api/regions/${selectedRegionCode}/cities-municipalities/`);
                const data = await res.json();
                const mapped = (data || []).map((c: any) => ({ code: c.code, name: c.name })).sort((a: any, b: any) => a.name.localeCompare(b.name));
                setPsgcCities(mapped);
            } catch (err) {
                console.error('Error fetching PSGC cities:', err);
            } finally {
                setIsLoadingCities(false);
            }
        };
        fetchCities();
    }, [selectedRegionCode]);

    // PSGC: Fetch barangays when city changes
    useEffect(() => {
        if (!selectedCityCode) { setPsgcBarangays([]); return; }
        if (isEditLoadingRef.current) return; // Skip when loading edit data
        const fetchBarangays = async () => {
            setIsLoadingBarangays(true);
            setPsgcBarangays([]);
            setFormBarangay('');
            setBarangaySearch('');
            try {
                const res = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${selectedCityCode}/barangays/`);
                const data = await res.json();
                const mapped = (data || []).map((b: any) => ({ code: b.code, name: b.name })).sort((a: any, b: any) => a.name.localeCompare(b.name));
                setPsgcBarangays(mapped);
            } catch (err) {
                console.error('Error fetching PSGC barangays:', err);
            } finally {
                setIsLoadingBarangays(false);
            }
        };
        fetchBarangays();
    }, [selectedCityCode]);

    // Fetch master amenities from owner_amenities table
    const fetchMasterAmenities = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            const { data, error } = await supabase
                .from('owner_amenities')
                .select('id, name')
                .eq('owner_id', session.user.id)
                .order('name');
            if (error) throw error;
            setMasterAmenities(data || []);
            setAllKnownAmenities((data || []).map(a => a.name));
        } catch (err) {
            console.error('Error fetching master amenities:', err);
            // Fallback: collect from locations
            const allAmenities = new Set<string>();
            locations.forEach(loc => {
                if (Array.isArray(loc.amenities)) loc.amenities.forEach(a => allAmenities.add(a));
            });
            setAllKnownAmenities(Array.from(allAmenities).sort());
        }
    };

    const handleAddMasterAmenity = async () => {
        const trimmed = newMasterAmenity.trim();
        if (!trimmed) return;
        if (masterAmenities.some(a => a.name.toLowerCase() === trimmed.toLowerCase())) {
            alert('This amenity already exists.');
            return;
        }
        setIsSavingMaster(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const { error } = await supabase
                .from('owner_amenities')
                .insert({ owner_id: user.id, name: trimmed });
            if (error) throw error;
            setNewMasterAmenity('');
            await fetchMasterAmenities();
        } catch (err: any) {
            console.error('Error adding amenity:', err);
            alert(`Failed to add amenity: ${err.message}`);
        } finally {
            setIsSavingMaster(false);
        }
    };

    const handleDeleteMasterAmenity = async (id: string) => {
        setIsSavingMaster(true);
        try {
            const { error } = await supabase.from('owner_amenities').delete().eq('id', id);
            if (error) throw error;
            await fetchMasterAmenities();
        } catch (err: any) {
            console.error('Error deleting amenity:', err);
            alert(`Failed to delete amenity: ${err.message}`);
        } finally {
            setIsSavingMaster(false);
        }
    };

    const handleSaveEditMasterAmenity = async () => {
        if (!editingMasterIdx) return;
        const trimmed = editingMasterValue.trim();
        if (!trimmed) return;
        if (masterAmenities.some(a => a.id !== editingMasterIdx && a.name.toLowerCase() === trimmed.toLowerCase())) {
            alert('This amenity already exists.');
            return;
        }
        setIsSavingMaster(true);
        try {
            const { error } = await supabase
                .from('owner_amenities')
                .update({ name: trimmed })
                .eq('id', editingMasterIdx);
            if (error) throw error;
            setEditingMasterIdx(null);
            setEditingMasterValue('');
            await fetchMasterAmenities();
        } catch (err: any) {
            console.error('Error updating amenity:', err);
            alert(`Failed to update amenity: ${err.message}`);
        } finally {
            setIsSavingMaster(false);
        }
    };

    useEffect(() => {
        initializePage();
    }, []);

    const initializePage = async () => {
        setIsLoading(true);
        setIsLoadingCourts(true);

        try {
            const role = await getCurrentActiveRole();
            const resolvedRole: ActiveCourtRole = role === 'COURT_MANAGER'
                ? 'COURT_MANAGER'
                : role === 'COURT_OWNER'
                    ? 'COURT_OWNER'
                    : 'OTHER';
            const context = resolvedRole === 'COURT_MANAGER'
                ? await getCurrentCourtManagerContext()
                : null;

            setActiveRole(resolvedRole);
            setManagerContext(context);

            if (resolvedRole === 'OTHER') {
                setLocations([]);
                setAllCourts([]);
                return;
            }

            await Promise.all([
                fetchLocations(resolvedRole, context),
                fetchAllCourts(resolvedRole, context),
                resolvedRole === 'COURT_OWNER' ? fetchMasterAmenities() : Promise.resolve(),
            ]);
        } catch (err) {
            console.error('Error initializing locations page:', err);
        } finally {
            setIsLoading(false);
            setIsLoadingCourts(false);
        }
    };

    const fetchLocations = async (
        roleOverride: ActiveCourtRole = activeRole,
        contextOverride: CourtManagerContext | null = managerContext
    ) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            let query = supabase
                .from('locations')
                .select('*, courts(id)');

            if (roleOverride === 'COURT_MANAGER') {
                if (!contextOverride?.court.location_id) {
                    setLocations([]);
                    return;
                }

                query = query.eq('id', contextOverride.court.location_id);
            } else {
                query = query
                    .eq('owner_id', user.id)
                    .order('created_at', { ascending: false });
            }

            const { data, error } = await query;

            if (error) throw error;

            const mapped = (data || []).map(loc => ({
                ...loc,
                amenities: Array.isArray(loc.amenities) ? loc.amenities : [],
                court_count: Array.isArray(loc.courts) ? loc.courts.length : 0
            }));

            setLocations(mapped);
        } catch (err) {
            console.error('Error fetching locations:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setFormName('');
        setFormAddress('');
        setFormCity('');
        setFormPhone('');
        setFormDescription('');
        setFormAmenities('');
        setSelectedAmenities([]);
        setAmenitySearch('');
        setIsAmenityDropdownOpen(false);
        setFormCleaningTime(0);
        setPreviewCoords(null);
        setFormImageFile(null);
        setFormImagePreview(null);
        setFormCourtType('Indoor');
        setFormStatus('Coming Soon');
        setClosures([]);
        setSelectedClosureDate(null);
        setClosureReason('Holiday');
        setClosureDescription('');
        // Reset PSGC address fields
        setFormRegion('');
        setFormBarangay('');
        setSelectedRegionCode('');
        setSelectedCityCode('');
        setPsgcCities([]);
        setPsgcBarangays([]);
        setRegionSearch('');
        setCitySearch('');
        setBarangaySearch('');
        setIsRegionDropdownOpen(false);
        setIsCityDropdownOpen(false);
        setIsBarangayDropdownOpen(false);
    };

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwnerView) return;
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Handle image upload if exists
            let imageUrl = formImagePreview;
            if (formImageFile) {
                const uploadResult = await uploadCourtImage(formImageFile, user.id);
                if (uploadResult.success) {
                    imageUrl = uploadResult.publicUrl;
                }
            }

            const { error } = await supabase
                .from('locations')
                .insert({
                    owner_id: user.id,
                    name: formName,
                    address: formAddress,
                    city: formCity,
                    region: formRegion || null,
                    barangay: formBarangay || null,
                    phone: formPhone || null,
                    description: formDescription || null,
                    amenities: selectedAmenities,
                    base_cleaning_time: formCleaningTime,
                    latitude: previewCoords?.lat || 14.5995,
                    longitude: previewCoords?.lng || 120.9842,
                    is_active: false,
                    status: 'Coming Soon',
                    image_url: imageUrl,
                    court_type: formCourtType
                });

            if (error) throw error;
            setIsAddModalOpen(false);
            resetForm();
            fetchLocations();
        } catch (err: any) {
            console.error('Error adding location:', err);
            alert(`Failed to add location: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwnerView) return;
        if (!editingLocation) return;
        setIsSubmitting(true);
        try {
            // 1. Handle image upload if exists
            let imageUrl = formImagePreview || editingLocation.image_url;
            if (formImageFile) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const uploadResult = await uploadCourtImage(formImageFile, user.id);
                    if (uploadResult.success) {
                        imageUrl = uploadResult.publicUrl;
                    }
                }
            }

            const { error } = await supabase
                .from('locations')
                .update({
                    name: formName,
                    address: formAddress,
                    city: formCity,
                    region: formRegion || null,
                    barangay: formBarangay || null,
                    phone: formPhone || null,
                    description: formDescription || null,
                    amenities: selectedAmenities,
                    base_cleaning_time: formCleaningTime,
                    latitude: previewCoords?.lat,
                    longitude: previewCoords?.lng,
                    image_url: imageUrl,
                    court_type: formCourtType,
                    status: formStatus,
                    is_active: formStatus === 'Active'
                })
                .eq('id', editingLocation.id);

            if (error) throw error;
            setIsEditModalOpen(false);
            setEditingLocation(null);
            resetForm();
            fetchLocations();
        } catch (err: any) {
            console.error('Error updating location:', err);
            alert(`Failed to update location: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteLocation = async (id: string) => {
        if (!isOwnerView) return;
        showConfirm(
            'Delete Location & All Courts?',
            'This will permanently delete this location and ALL courts within it, along with all associated bookings, closures, and data. This is the most destructive action and cannot be undone.',
            async () => {
                try {
                    const { error } = await supabase.from('locations').delete().eq('id', id);
                    if (error) throw error;
                    fetchLocations();
                    setIsEditModalOpen(false);
                    setEditingLocation(null);
                } catch (err) {
                    console.error('Error deleting location:', err);
                    alert('Failed to delete location.');
                }
            },
            'danger'
        );
    };

    const fetchClosures = async (locationId: string) => {
        try {
            const { data, error } = await supabase
                .from('location_closures')
                .select('*')
                .eq('location_id', locationId)
                .gte('date', new Date().toISOString().split('T')[0])
                .order('date', { ascending: true });
            if (!error && data) setClosures(data as LocationClosure[]);
        } catch (err) { console.error('Error fetching closures:', err); }
    };

    const handleAddClosure = async () => {
        if (!isOwnerView) return;
        if (!editingLocation || !selectedClosureDate) return;
        setIsSavingClosure(true);
        try {
            const { data, error } = await supabase
                .from('location_closures')
                .upsert({
                    location_id: editingLocation.id,
                    date: selectedClosureDate,
                    reason: closureReason,
                    description: closureDescription || null
                }, { onConflict: 'location_id,date' })
                .select()
                .single();
            if (error) throw error;
            await fetchClosures(editingLocation.id);
            setSelectedClosureDate(null);
            setClosureDescription('');
            setClosureReason('Holiday');
        } catch (err: any) {
            console.error('Error saving closure:', err);
            alert(`Failed to save closure: ${err.message}`);
        } finally { setIsSavingClosure(false); }
    };

    const handleRemoveClosure = async (closureId: string) => {
        if (!isOwnerView) return;
        if (!editingLocation) return;
        try {
            await supabase.from('location_closures').delete().eq('id', closureId);
            await fetchClosures(editingLocation.id);
        } catch (err) { console.error('Error removing closure:', err); }
    };

    const openEditModal = (loc: Location) => {
        if (!isOwnerView) return;
        setEditingLocation(loc);
        setFormName(loc.name);
        setFormAddress(loc.address);
        setFormCity(loc.city);
        setFormPhone(loc.phone || '');
        setFormDescription(loc.description || '');
        setFormAmenities(Array.isArray(loc.amenities) ? loc.amenities.join(', ') : '');
        setSelectedAmenities(Array.isArray(loc.amenities) ? [...loc.amenities] : []);
        setAmenitySearch('');
        setIsAmenityDropdownOpen(false);
        setFormCleaningTime(loc.base_cleaning_time || 0);
        fetchClosures(loc.id);
        setSelectedClosureDate(null);
        setClosureCalendarMonth(new Date());
        setClosureReason('Holiday');
        setClosureDescription('');
        if (loc.latitude && loc.longitude) {
            setPreviewCoords({ lat: loc.latitude, lng: loc.longitude });
        } else {
            setPreviewCoords(null);
        }
        setFormImagePreview(loc.image_url || null);
        setFormImageFile(null);
        setFormCourtType(loc.court_type || 'Indoor');
        setFormStatus(loc.status || (loc.is_active ? 'Active' : 'Closed'));

        // Restore PSGC address fields
        setFormRegion(loc.region || '');
        setFormBarangay(loc.barangay || '');
        setRegionSearch('');
        setCitySearch('');
        setBarangaySearch('');

        // Find region code to trigger city fetch cascade
        if (loc.region) {
            const regionMatch = psgcRegions.find(r => r.name === loc.region);
            if (regionMatch) {
                isEditLoadingRef.current = true;
                setSelectedRegionCode(regionMatch.code);
                // Fetch cities for this region, then find and set city code for barangay cascade
                fetch(`https://psgc.gitlab.io/api/regions/${regionMatch.code}/cities-municipalities/`)
                    .then(res => res.json())
                    .then(data => {
                        const mapped = (data || []).map((c: any) => ({ code: c.code, name: c.name })).sort((a: any, b: any) => a.name.localeCompare(b.name));
                        setPsgcCities(mapped);
                        if (loc.city) {
                            const cityMatch = mapped.find((c: any) => c.name === loc.city);
                            if (cityMatch) {
                                setSelectedCityCode(cityMatch.code);
                                // Fetch barangays for this city
                                fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityMatch.code}/barangays/`)
                                    .then(res => res.json())
                                    .then(bData => {
                                        const bMapped = (bData || []).map((b: any) => ({ code: b.code, name: b.name })).sort((a: any, b: any) => a.name.localeCompare(b.name));
                                        setPsgcBarangays(bMapped);
                                    })
                                    .catch(err => console.error('Error fetching barangays for edit:', err))
                                    .finally(() => { isEditLoadingRef.current = false; });
                            } else {
                                isEditLoadingRef.current = false;
                            }
                        } else {
                            isEditLoadingRef.current = false;
                        }
                    })
                    .catch(err => { console.error('Error fetching cities for edit:', err); isEditLoadingRef.current = false; });
            } else {
                setSelectedRegionCode('');
                setPsgcCities([]);
                setPsgcBarangays([]);
            }
        } else {
            setSelectedRegionCode('');
            setSelectedCityCode('');
            setPsgcCities([]);
            setPsgcBarangays([]);
        }

        setIsEditModalOpen(true);
    };

    // Auto-fill Region → City → Barangay from GPS reverse geocode
    const autoFillFromGPS = async (googleRegion: string, googleCity: string, googleBarangay: string) => {
        // Fuzzy match: Google returns e.g. "Central Visayas", PSGC has "Region VII (Central Visayas)"
        const normalise = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        const googleRegionNorm = normalise(googleRegion);

        const regionMatch = psgcRegions.find(r => {
            const n = normalise(r.name);
            return n === googleRegionNorm
                || n.includes(googleRegionNorm)
                || googleRegionNorm.includes(n)
                // Handle "Metro Manila" ↔ "National Capital Region (NCR)"
                || (googleRegionNorm.includes('metro manila') && n.includes('national capital'))
                || (n.includes('metro manila') && googleRegionNorm.includes('national capital'));
        });

        if (!regionMatch) {
            // Fallback: just set city name as text
            setFormCity(googleCity);
            return;
        }

        // Set region
        setFormRegion(regionMatch.name);
        setSelectedRegionCode(regionMatch.code);
        isEditLoadingRef.current = true;

        try {
            // Fetch cities for this region
            const citiesRes = await fetch(`https://psgc.gitlab.io/api/regions/${regionMatch.code}/cities-municipalities/`);
            const citiesData = await citiesRes.json();
            const cities = (citiesData || []).map((c: any) => ({ code: c.code, name: c.name })).sort((a: any, b: any) => a.name.localeCompare(b.name));
            setPsgcCities(cities);

            // Fuzzy match city
            const googleCityNorm = normalise(googleCity);
            const cityMatch = cities.find((c: any) => {
                const cn = normalise(c.name);
                return cn === googleCityNorm
                    || cn.includes(googleCityNorm)
                    || googleCityNorm.includes(cn)
                    // Handle "City of Cebu" ↔ "Cebu City"
                    || cn.replace('city of ', '') === googleCityNorm.replace(' city', '')
                    || googleCityNorm.replace('city of ', '') === cn.replace(' city', '');
            });

            if (cityMatch) {
                setFormCity(cityMatch.name);
                setSelectedCityCode(cityMatch.code);

                // Fetch barangays for this city
                const brgyRes = await fetch(`https://psgc.gitlab.io/api/cities-municipalities/${cityMatch.code}/barangays/`);
                const brgyData = await brgyRes.json();
                const barangays = (brgyData || []).map((b: any) => ({ code: b.code, name: b.name })).sort((a: any, b: any) => a.name.localeCompare(b.name));
                setPsgcBarangays(barangays);

                // Fuzzy match barangay
                if (googleBarangay) {
                    const googleBrgyNorm = normalise(googleBarangay);
                    // Also strip common prefixes for matching
                    const stripBrgyPrefix = (s: string) => s.replace(/^(barangay|brgy\.?|bgy\.?)\s*/i, '').trim();
                    const googleBrgyStripped = normalise(stripBrgyPrefix(googleBarangay));

                    const brgyMatch = barangays.find((b: any) => {
                        const bn = normalise(b.name);
                        const bnStripped = normalise(stripBrgyPrefix(b.name));
                        return bn === googleBrgyNorm
                            || bnStripped === googleBrgyStripped
                            || bn.includes(googleBrgyNorm)
                            || googleBrgyNorm.includes(bn)
                            || bnStripped.includes(googleBrgyStripped)
                            || googleBrgyStripped.includes(bnStripped);
                    });
                    if (brgyMatch) {
                        setFormBarangay(brgyMatch.name);
                    }
                }
            } else {
                setFormCity(googleCity);
            }
        } catch (err) {
            console.error('Error auto-filling from GPS:', err);
            setFormCity(googleCity);
        } finally {
            isEditLoadingRef.current = false;
        }
    };

    // ── Court Fetch & CRUD ──
    const fetchAllCourts = async (
        roleOverride: ActiveCourtRole = activeRole,
        contextOverride: CourtManagerContext | null = managerContext
    ) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;

            let query = supabase
                .from('courts')
                .select('*, locations(name)');

            if (roleOverride === 'COURT_MANAGER') {
                if (!contextOverride?.court.id) {
                    setAllCourts([]);
                    return;
                }

                query = query.eq('id', contextOverride.court.id);
            } else {
                query = query
                    .eq('owner_id', session.user.id)
                    .order('created_at', { ascending: false });
            }

            const { data, error } = await query;
            if (error) throw error;

            const assignments = roleOverride === 'COURT_OWNER'
                ? await getCourtManagerAssignments((data || []).map((court: any) => court.id))
                : contextOverride?.assignment
                    ? [contextOverride.assignment]
                    : [];
            const assignmentMap = new Map(assignments.map((assignment) => [assignment.court_id, assignment]));

            const mapped = (data || []).map((c: any) => ({
                ...c,
                location_name: c.locations?.name || 'Unknown',
                managerAssignment: assignmentMap.get(c.id) || null,
            }));
            setAllCourts(mapped);

            if (roleOverride === 'COURT_MANAGER' && contextOverride?.court.location_id) {
                setCourtLocationFilter(contextOverride.court.location_id);
            }
        } catch (err) {
            console.error('Error fetching courts:', err);
        } finally {
            setIsLoadingCourts(false);
        }
    };

    // Fetch today's booking counts with time-aware slot availability
    const fetchTodayBookingCounts = async (courts: CourtItem[]) => {
        if (courts.length === 0) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const courtIds = courts.map(c => c.id);
            const { data, error } = await supabase
                .from('bookings')
                .select('court_id, start_time')
                .in('court_id', courtIds)
                .eq('date', today)
                .not('status', 'eq', 'cancelled');
            if (error) throw error;

            const now = new Date();
            const currentHour = now.getHours();

            const counts: Record<string, { booked: number; passed: number; available: number; totalSlots: number }> = {};
            for (const court of courts) {
                const loc = locations.find(l => l.id === court.location_id);
                const openTime = loc?.opening_time || '08:00';
                const closeTime = loc?.closing_time || '18:00';
                const openHour = parseInt(openTime.split(':')[0]);
                const closeHour = parseInt(closeTime.split(':')[0]);
                const totalSlots = Math.max(closeHour - openHour, 1);

                // Get booked start hours for this court
                const courtBookings = (data || []).filter(b => b.court_id === court.id);
                const bookedHours = new Set(courtBookings.map(b => parseInt((b.start_time || '0').split(':')[0])));
                const booked = courtBookings.length;

                // Count passed slots that were NOT booked (time already gone, can't be used)
                let passedUnbooked = 0;
                for (let h = openHour; h < Math.min(currentHour, closeHour); h++) {
                    if (!bookedHours.has(h)) {
                        passedUnbooked++;
                    }
                }

                // Available = total - booked - passed unbooked
                const available = Math.max(totalSlots - booked - passedUnbooked, 0);
                counts[court.id] = { booked, passed: passedUnbooked, available, totalSlots };
            }
            setCourtBookingCounts(counts);
        } catch (err) {
            console.error('Error fetching booking counts:', err);
        }
    };

    // Re-fetch booking counts when courts or locations change
    useEffect(() => {
        if (allCourts.length > 0 && locations.length > 0) {
            fetchTodayBookingCounts(allCourts);
        }
    }, [allCourts, locations]);

    // Open court detail view modal
    const openViewCourtModal = async (court: CourtItem) => {
        setViewingCourt(court);
        setIsViewCourtModalOpen(true);
        setIsLoadingViewBookings(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('bookings')
                .select('*, profiles(full_name, email)')
                .eq('court_id', court.id)
                .gte('date', today)
                .not('status', 'eq', 'cancelled')
                .order('date', { ascending: true })
                .order('start_time', { ascending: true })
                .limit(20);
            if (error) throw error;
            setViewCourtBookings(data || []);
        } catch (err) {
            console.error('Error fetching court bookings:', err);
            setViewCourtBookings([]);
        } finally {
            setIsLoadingViewBookings(false);
        }
    };

    useEffect(() => {
        const targetCourtId = searchParams.get('court');
        const managerParam = searchParams.get('manager') || '';
        const deepLinkKey = targetCourtId ? `${targetCourtId}:${managerParam}` : null;
        if (!targetCourtId || allCourts.length === 0 || handledManagerDeepLinkRef.current === deepLinkKey) return;

        const matchedCourt = allCourts.find((court) => court.id === targetCourtId);
        if (!matchedCourt) return;

        handledManagerDeepLinkRef.current = deepLinkKey;

        if (managerParam === '1' && isOwnerView) {
            setManagerModalCourt(matchedCourt);
        } else {
            void openViewCourtModal(matchedCourt);
        }

        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('court');
        nextParams.delete('manager');
        setSearchParams(nextParams, { replace: true });
    }, [allCourts, isOwnerView, searchParams, setSearchParams]);

    // Close court dropdowns on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (surfaceDropdownRef.current && !surfaceDropdownRef.current.contains(e.target as Node)) {
                setIsSurfaceDropdownOpen(false);
            }
            if (locationDropdownRef.current && !locationDropdownRef.current.contains(e.target as Node)) {
                setIsLocationDropdownOpen(false);
            }
            if (locationFilterRef.current && !locationFilterRef.current.contains(e.target as Node)) {
                setIsLocationFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const resetCourtForm = () => {
        setCourtLocationId('');
        setCourtName('');
        setCourtType('Indoor');
        setCourtStatus('Setup Required');
        setCourtSurface('');
        setSurfaceSearch('');
        setCourtPrice(0);
        setIsCourtFree(false);
        setIsSurfaceDropdownOpen(false);
        setIsLocationDropdownOpen(false);
        setLocationDropdownSearch('');
        setCourtImageFile(null);
        setCourtImagePreview(null);
    };

    const handleAddCourt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwnerView) return;
        if (!courtLocationId) { alert('Please select a location.'); return; }
        setIsCourtSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const selectedLoc = locations.find(l => l.id === courtLocationId);

            // Upload image if provided
            let imageUrl: string | null = courtImagePreview;
            if (courtImageFile) {
                const uploadResult = await uploadCourtPhoto(courtImageFile, user.id);
                if (!uploadResult.success) throw new Error(`Image upload failed: ${uploadResult.message}`);
                imageUrl = uploadResult.publicUrl || null;
            }

            const initialStatus: CourtStatus = 'Setup Required';
            const initialActive = false;

            const { error } = await supabase
                .from('courts')
                .insert({
                    owner_id: user.id,
                    location_id: courtLocationId,
                    name: courtName,
                    surface_type: courtSurface,
                    base_price: 0,
                    court_type: courtType,
                    is_active: initialActive,
                    status: initialStatus,
                    setup_complete: false,
                    latitude: selectedLoc?.latitude,
                    longitude: selectedLoc?.longitude,
                    image_url: imageUrl,
                });
            if (error) throw error;
            setIsAddCourtModalOpen(false);
            resetCourtForm();
            fetchAllCourts();
            fetchLocations();
        } catch (err: any) {
            console.error('Error adding court:', err);
            alert(`Failed to add court: ${err.message || 'Unknown error'}`);
        } finally {
            setIsCourtSubmitting(false);
        }
    };

    const handleUpdateCourt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isOwnerView) return;
        if (!editingCourt) return;
        if (!courtLocationId) { alert('Please select a location.'); return; }
        setIsCourtSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');
            const selectedLoc = locations.find(l => l.id === courtLocationId);

            // Upload new image if provided, else keep existing
            let imageUrl: string | null | undefined = courtImagePreview || editingCourt.image_url;
            if (courtImageFile) {
                const uploadResult = await uploadCourtPhoto(courtImageFile, user.id, editingCourt.id);
                if (!uploadResult.success) throw new Error(`Image upload failed: ${uploadResult.message}`);
                imageUrl = uploadResult.publicUrl || null;
            }

            const { error } = await supabase
                .from('courts')
                .update({
                    location_id: courtLocationId,
                    name: courtName,
                    surface_type: courtSurface,
                    court_type: courtType,
                    is_active: courtStatus === 'Available',
                    status: courtStatus,
                    latitude: selectedLoc?.latitude,
                    longitude: selectedLoc?.longitude,
                    image_url: imageUrl,
                })
                .eq('id', editingCourt.id);
            if (error) throw error;
            setIsEditCourtModalOpen(false);
            setEditingCourt(null);
            resetCourtForm();
            fetchAllCourts();
            fetchLocations();
        } catch (err: any) {
            console.error('Error updating court:', err);
            alert(`Failed to update court: ${err.message || 'Unknown error'}`);
        } finally {
            setIsCourtSubmitting(false);
        }
    };

    const handleDeleteCourt = async (id: string) => {
        if (!isOwnerView) return;
        showConfirm(
            'Remove Court?',
            'This will permanently remove this court. All associated bookings data will be preserved but the court will no longer accept new bookings. This action cannot be undone.',
            async () => {
                try {
                    const { error } = await supabase.from('courts').delete().eq('id', id);
                    if (error) throw error;
                    setIsEditCourtModalOpen(false);
                    setEditingCourt(null);
                    fetchAllCourts();
                    fetchLocations();
                } catch (err) {
                    console.error('Error deleting court:', err);
                    alert('Failed to delete court.');
                }
            },
            'danger'
        );
    };

    const openEditCourtModal = (court: CourtItem) => {
        if (!isOwnerView) return;
        setEditingCourt(court);
        setCourtLocationId(court.location_id);
        setCourtName(court.name);
        setCourtType((court.court_type as 'Indoor' | 'Outdoor') || 'Indoor');
        setCourtStatus((court.status as CourtStatus) || 'Setup Required');
        setCourtSurface(court.surface_type || '');
        setSurfaceSearch('');
        setCourtPrice(court.base_price || 0);
        setIsCourtFree((court.base_price || 0) === 0);
        setIsSurfaceDropdownOpen(false);
        setIsLocationDropdownOpen(false);
        setLocationDropdownSearch('');
        // Load existing image into preview
        setCourtImageFile(null);
        setCourtImagePreview(court.image_url || null);
        setIsEditCourtModalOpen(true);
    };

    const handleManagerSubmit = async (payload: { fullName: string; email: string; contactNumber: string }) => {
        if (!managerModalCourt) return;

        const response = await assignCourtManager({
            courtId: managerModalCourt.id,
            fullName: payload.fullName,
            email: payload.email,
            contactNumber: payload.contactNumber,
        });

        if (viewingCourt?.id === managerModalCourt.id) {
            setViewingCourt((current) => current ? { ...current, managerAssignment: response.assignment } : current);
        }

        setManagerModalCourt(null);
        await fetchAllCourts();
    };

    const handleResendManagerInvite = async (court: CourtItem) => {
        const assignment = court.managerAssignment;
        if (!assignment || assignment.status !== 'pending_invite') return;

        setManagerActionKey(`resend:${assignment.id}`);
        try {
            const response = await assignCourtManager({
                courtId: court.id,
                fullName: assignment.manager_name,
                email: assignment.manager_email,
                contactNumber: assignment.manager_contact_number || '',
            });

            if (viewingCourt?.id === court.id) {
                setViewingCourt((current) => current ? { ...current, managerAssignment: response.assignment } : current);
            }
            if (managerModalCourt?.id === court.id) {
                setManagerModalCourt((current) => current ? { ...current, managerAssignment: response.assignment } : current);
            }

            await fetchAllCourts();
        } finally {
            setManagerActionKey(null);
        }
    };

    const handleCopyInviteLink = async (assignment: CourtManagerAssignment) => {
        setManagerActionKey(`copy:${assignment.id}`);
        try {
            const response = await copyCourtManagerInviteLink(assignment.id);
            await navigator.clipboard.writeText(response.inviteLink || '');
            setCopiedInviteAssignmentId(assignment.id);
            window.setTimeout(() => {
                setCopiedInviteAssignmentId((current) => current === assignment.id ? null : current);
            }, 2500);
            setViewingCourt((current) => current?.id === response.assignment.court_id
                ? { ...current, managerAssignment: response.assignment }
                : current);
            setManagerModalCourt((current) => current?.id === response.assignment.court_id
                ? { ...current, managerAssignment: response.assignment }
                : current);
            await fetchAllCourts();
        } catch (error) {
            console.error('Failed to copy court manager invite link:', error);
            alert('Failed to copy invite link.');
        } finally {
            setManagerActionKey(null);
        }
    };

    const handleApproveManager = async (assignmentId: string) => {
        setManagerActionKey(`approve:${assignmentId}`);
        try {
            const response = await approveCourtManager(assignmentId);
            setViewingCourt((current) => current?.id === response.assignment.court_id
                ? { ...current, managerAssignment: response.assignment }
                : current);
            setManagerModalCourt(null);
            await fetchAllCourts();
        } finally {
            setManagerActionKey(null);
        }
    };

    const renderManagerStatusPill = (status: CourtManagerAssignment['status']) => (
        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getCourtManagerStatusClasses(status)}`}>
            {getCourtManagerStatusLabel(status)}
        </span>
    );

    const renderManagerActionButtons = (court: CourtItem, context: 'table' | 'panel' = 'table') => {
        const assignment = court.managerAssignment;
        const baseButtonClass = context === 'table'
            ? 'rounded-xl border px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-all'
            : 'rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all';

        if (!assignment || assignment.status === 'removed') {
            return (
                <button
                    type="button"
                    onClick={() => setManagerModalCourt(court)}
                    className={`${baseButtonClass} border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100`}
                >
                    Assign Manager
                </button>
            );
        }

        if (assignment.status === 'pending_invite') {
            return (
                <>
                    <button
                        type="button"
                        onClick={() => void handleResendManagerInvite(court)}
                        disabled={managerActionKey === `resend:${assignment.id}`}
                        className={`${baseButtonClass} border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-60`}
                    >
                        {managerActionKey === `resend:${assignment.id}` ? 'Sending...' : 'Resend Invite'}
                    </button>
                    <button
                        type="button"
                        onClick={() => void handleCopyInviteLink(assignment)}
                        disabled={managerActionKey === `copy:${assignment.id}`}
                        className={`${baseButtonClass} border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-60`}
                    >
                        {copiedInviteAssignmentId === assignment.id ? 'Copied' : 'Copy Invite Link'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setManagerModalCourt(court)}
                        className={`${baseButtonClass} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
                    >
                        Edit Details
                    </button>
                    <button
                        type="button"
                        onClick={() => handleRemoveManager(assignment)}
                        className={`${baseButtonClass} border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100`}
                    >
                        Remove Invite
                    </button>
                </>
            );
        }

        if (assignment.status === 'pending_approval') {
            return (
                <>
                    <button
                        type="button"
                        onClick={() => void handleApproveManager(assignment.id)}
                        disabled={managerActionKey === `approve:${assignment.id}`}
                        className={`${baseButtonClass} border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-60`}
                    >
                        {managerActionKey === `approve:${assignment.id}` ? 'Approving...' : 'Approve Manager'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleRemoveManager(assignment)}
                        className={`${baseButtonClass} border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100`}
                    >
                        Reject
                    </button>
                    <button
                        type="button"
                        onClick={() => setManagerModalCourt(court)}
                        className={`${baseButtonClass} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`}
                    >
                        View Details
                    </button>
                </>
            );
        }

        return (
            <>
                <button
                    type="button"
                    onClick={() => setManagerModalCourt(court)}
                    className={`${baseButtonClass} border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100`}
                >
                    Manage Manager
                </button>
                <button
                    type="button"
                    onClick={() => handleRemoveManager(assignment)}
                    className={`${baseButtonClass} border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100`}
                >
                    Remove Manager
                </button>
            </>
        );
    };

    const handleRemoveManager = (assignment: CourtManagerAssignment) => {
        const removalTitle = assignment.status === 'pending_invite' ? 'Cancel invitation?' : 'Remove manager?';
        const removalMessage = assignment.status === 'pending_invite'
            ? `This will cancel the invitation for ${assignment.manager_email}. The invite link will stop working immediately.`
            : `This will remove ${assignment.manager_name || assignment.manager_email} from this court manager assignment.`;

        showConfirm(
            removalTitle,
            removalMessage,
            async () => {
                const response = await removeCourtManager(assignment.id);
                setViewingCourt((current) => current?.id === response.assignment.court_id
                    ? { ...current, managerAssignment: response.assignment }
                    : current);
                setManagerModalCourt(null);
                await fetchAllCourts();
            },
            'danger'
        );
    };

    const filteredLocations = locations.filter(loc =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredModalLocations = locations.filter(loc =>
        loc.name.toLowerCase().includes(locationModalSearch.toLowerCase()) ||
        loc.address.toLowerCase().includes(locationModalSearch.toLowerCase()) ||
        loc.city.toLowerCase().includes(locationModalSearch.toLowerCase())
    );

    const reusableImages = useMemo(() => {
        const urls = new Set<string>();
        locations.forEach(loc => { if (loc.image_url) urls.add(loc.image_url); });
        allCourts.forEach(court => { if (court.image_url) urls.add(court.image_url); });
        return Array.from(urls);
    }, [locations, allCourts]);

    const handleSelectGalleryImage = (url: string) => {
        if (imageGalleryTarget === 'location') {
            setFormImagePreview(url);
            setFormImageFile(null);
        } else if (imageGalleryTarget === 'court') {
            setCourtImagePreview(url);
            setCourtImageFile(null);
        }
        setIsImageGalleryOpen(false);
        setImageGalleryTarget(null);
    };

    const filteredCourts = allCourts.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(courtSearchQuery.toLowerCase()) ||
            (c.location_name || '').toLowerCase().includes(courtSearchQuery.toLowerCase()) ||
            (c.surface_type || '').toLowerCase().includes(courtSearchQuery.toLowerCase());
        const matchesLocation = !courtLocationFilter || c.location_id === courtLocationFilter;
        return matchesSearch && matchesLocation;
    });

    const totalCourts = allCourts.length;

    // Shared form JSX
    const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean) => (
        <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Column: Image & Form Fields */}
            <div className="space-y-6">

                {/* Image Upload */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 px-1 flex items-center gap-1.5">Court Image <span className="text-rose-500 font-black">*</span></label>
                    <div className="relative group">
                        <div className={`w-full h-40 rounded-[32px] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden bg-slate-50 ${formImagePreview ? 'border-blue-200 shadow-xl' : 'border-slate-100 hover:border-blue-300 hover:bg-blue-50/30'}`}>
                            {formImagePreview ? (
                                <>
                                    <img src={formImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <div className="bg-white/90 p-4 rounded-2xl shadow-xl flex items-center gap-2 scale-90 group-hover:scale-100 transition-transform">
                                            <Camera size={20} className="text-blue-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Change Photo</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl shadow-lg border border-slate-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                        <Image size={24} className="text-slate-200 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Click to upload <span className="text-blue-500 text-[10px]">location image</span></p>
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setFormImageFile(file);
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setFormImagePreview(reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                        </div>
                        {formImageFile && (
                            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-xl shadow-lg animate-in zoom-in duration-300">
                                <Check size={16} strokeWidth={4} />
                            </div>
                        )}
                    </div>
                    {reusableImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                            <button
                                type="button"
                                onClick={() => { setImageGalleryTarget('location'); setIsImageGalleryOpen(true); }}
                                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-all"
                            >
                                Use from Gallery
                            </button>
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-1.5">Venue Name <span className="text-rose-500 font-black">*</span></label>
                    <input required type="text" value={formName} onChange={e => setFormName(e.target.value)}
                        placeholder="e.g. Manila Sports Complex"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm text-slate-900 placeholder:text-slate-400" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Region Dropdown */}
                    <div className="space-y-2 col-span-2" ref={regionDropdownRef}>
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-1.5">Region <span className="text-rose-500 font-black">*</span></label>
                        <div className="relative">
                            <div
                                onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 cursor-pointer flex items-center justify-between hover:border-blue-200 transition-colors"
                            >
                                <input
                                    type="text"
                                    value={isRegionDropdownOpen ? regionSearch : formRegion}
                                    onChange={e => { setRegionSearch(e.target.value); setIsRegionDropdownOpen(true); }}
                                    onFocus={() => setIsRegionDropdownOpen(true)}
                                    placeholder="Select region..."
                                    className="bg-transparent outline-none font-bold text-sm flex-1 w-full text-slate-900 placeholder:text-slate-400"
                                    readOnly={false}
                                />
                                {isLoadingRegions ? (
                                    <Loader2 size={16} className="text-blue-500 animate-spin shrink-0" />
                                ) : (
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${isRegionDropdownOpen ? 'rotate-180' : ''}`} />
                                )}
                            </div>
                            {isRegionDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                    {psgcRegions
                                        .filter(r => r.name.toLowerCase().includes(regionSearch.toLowerCase()))
                                        .map(r => (
                                            <button type="button" key={r.code}
                                                onClick={() => {
                                                    setFormRegion(r.name);
                                                    setSelectedRegionCode(r.code);
                                                    setRegionSearch('');
                                                    setIsRegionDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors font-bold text-sm flex items-center gap-3 ${formRegion === r.name ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}
                                            >
                                                {formRegion === r.name && <Check size={14} className="text-blue-500 shrink-0" />}
                                                {r.name}
                                            </button>
                                        ))}
                                    {psgcRegions.filter(r => r.name.toLowerCase().includes(regionSearch.toLowerCase())).length === 0 && (
                                        <div className="px-5 py-4 text-center">
                                            <p className="text-[10px] text-slate-400 font-bold">No regions found.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* City/Municipality Dropdown */}
                    <div className="space-y-2" ref={cityDropdownRef}>
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-1.5">City / Municipality <span className="text-rose-500 font-black">*</span></label>
                        <div className="relative">
                            <div
                                onClick={() => { if (selectedRegionCode) setIsCityDropdownOpen(!isCityDropdownOpen); }}
                                className={`w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 flex items-center justify-between transition-colors ${selectedRegionCode ? 'cursor-pointer hover:border-blue-200' : 'opacity-50 cursor-not-allowed'}`}
                            >
                                <input
                                    type="text"
                                    value={isCityDropdownOpen ? citySearch : formCity}
                                    onChange={e => { setCitySearch(e.target.value); setIsCityDropdownOpen(true); }}
                                    onFocus={() => { if (selectedRegionCode) setIsCityDropdownOpen(true); }}
                                    placeholder={selectedRegionCode ? 'Select city...' : 'Select region first'}
                                    className="bg-transparent outline-none font-bold text-sm flex-1 w-full text-slate-900 placeholder:text-slate-400"
                                    disabled={!selectedRegionCode}
                                />
                                {isLoadingCities ? (
                                    <Loader2 size={16} className="text-blue-500 animate-spin shrink-0" />
                                ) : (
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${isCityDropdownOpen ? 'rotate-180' : ''}`} />
                                )}
                            </div>
                            {isCityDropdownOpen && psgcCities.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                    {psgcCities
                                        .filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()))
                                        .map(c => (
                                            <button type="button" key={c.code}
                                                onClick={() => {
                                                    setFormCity(c.name);
                                                    setSelectedCityCode(c.code);
                                                    setCitySearch('');
                                                    setIsCityDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors font-bold text-sm flex items-center gap-3 ${formCity === c.name ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}
                                            >
                                                {formCity === c.name && <Check size={14} className="text-blue-500 shrink-0" />}
                                                {c.name}
                                            </button>
                                        ))}
                                    {psgcCities.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase())).length === 0 && (
                                        <div className="px-5 py-4 text-center">
                                            <p className="text-[10px] text-slate-400 font-bold">No cities found.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-2">Phone <span className="text-[9px] font-bold text-slate-400 normal-case tracking-normal">(Optional)</span></label>
                        <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)}
                            placeholder="09XX XXX XXXX"
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm text-slate-900 placeholder:text-slate-400" />
                    </div>
                </div>

                {/* Barangay Dropdown */}
                <div className="space-y-2" ref={barangayDropdownRef}>
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-1.5">Barangay <span className="text-rose-500 font-black">*</span></label>
                    <div className="relative">
                        <div
                            onClick={() => { if (selectedCityCode) setIsBarangayDropdownOpen(!isBarangayDropdownOpen); }}
                            className={`w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 flex items-center justify-between transition-colors ${selectedCityCode ? 'cursor-pointer hover:border-blue-200' : 'opacity-50 cursor-not-allowed'}`}
                        >
                            <input
                                type="text"
                                value={isBarangayDropdownOpen ? barangaySearch : formBarangay}
                                onChange={e => { setBarangaySearch(e.target.value); setIsBarangayDropdownOpen(true); }}
                                onFocus={() => { if (selectedCityCode) setIsBarangayDropdownOpen(true); }}
                                placeholder={selectedCityCode ? 'Select barangay...' : 'Select city first'}
                                className="bg-transparent outline-none font-bold text-sm flex-1 w-full text-slate-900 placeholder:text-slate-400"
                                disabled={!selectedCityCode}
                            />
                            {isLoadingBarangays ? (
                                <Loader2 size={16} className="text-blue-500 animate-spin shrink-0" />
                            ) : (
                                <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${isBarangayDropdownOpen ? 'rotate-180' : ''}`} />
                            )}
                        </div>
                        {isBarangayDropdownOpen && psgcBarangays.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                {psgcBarangays
                                    .filter(b => b.name.toLowerCase().includes(barangaySearch.toLowerCase()))
                                    .map(b => (
                                        <button type="button" key={b.code}
                                            onClick={() => {
                                                setFormBarangay(b.name);
                                                setBarangaySearch('');
                                                setIsBarangayDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors font-bold text-sm flex items-center gap-3 ${formBarangay === b.name ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}
                                        >
                                            {formBarangay === b.name && <Check size={14} className="text-blue-500 shrink-0" />}
                                            {b.name}
                                        </button>
                                    ))}
                                {psgcBarangays.filter(b => b.name.toLowerCase().includes(barangaySearch.toLowerCase())).length === 0 && (
                                    <div className="px-5 py-4 text-center">
                                        <p className="text-[10px] text-slate-400 font-bold">No barangays found.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-1.5">Street Address <span className="text-rose-500 font-black">*</span></label>
                    <input required type="text" value={formAddress} onChange={e => setFormAddress(e.target.value)}
                        placeholder="e.g. 123 Rizal Street"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm text-slate-900 placeholder:text-slate-400" />
                    {(formAddress || formBarangay || formCity || formRegion) && (
                        <p className="text-[9px] text-slate-400 ml-4 mt-1">
                            <span className="font-black text-blue-500">Full Address: </span>
                            {[formAddress, formBarangay, formCity, formRegion].filter(Boolean).join(', ')}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-2">Description <span className="text-[9px] font-bold text-slate-400 normal-case tracking-normal">(Optional)</span></label>
                    <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                        placeholder="Brief description of your venue..."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm text-slate-900 placeholder:text-slate-400 resize-none" />
                </div>


            </div>

            {/* Right Column: Map & Submit */}
            <div className="flex flex-col h-full">
                <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-center ml-4">
                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Court Verification</label>
                        {isGeocoding && <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>}
                    </div>
                    <div className="h-64 lg:h-[380px] bg-slate-50 rounded-[32px] border border-slate-100 overflow-hidden relative shadow-inner">
                        <MapPreview
                            coords={previewCoords}
                            onCoordsChange={setPreviewCoords}
                            onAddressChange={(address, city, region, barangay) => {
                                setFormAddress(address);
                                // Auto-fill PSGC cascading dropdowns from GPS
                                if (region) {
                                    autoFillFromGPS(region, city, barangay || '');
                                } else {
                                    setFormCity(city);
                                }
                            }}
                        />
                        {!previewCoords && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm text-slate-300 gap-2">
                                <MapPin size={32} />
                                <p className="text-[10px] font-black uppercase tracking-widest">Enter address or use GPS</p>
                            </div>
                        )}
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-widest">
                        TIP: Drag the marker or click map to refine location
                    </p>

                    {/* ── Court Type & Status ── */}
                    <div className="space-y-4 pt-2">
                        {/* Court Type Selector */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4">Court Type</label>
                            <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 gap-1 shadow-inner h-[54px]">
                                {['Indoor', 'Outdoor', 'Both'].map((type) => (
                                    <button key={type} type="button" onClick={() => setFormCourtType(type as any)}
                                        className={`flex-1 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 ${formCourtType === type ? 'bg-white text-blue-500 shadow-lg shadow-blue-100/50' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isEdit && (
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4">Court Status</label>
                                <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 gap-1 shadow-inner h-[54px]">
                                    {(['Active', 'Closed', 'Maintenance', 'Coming Soon'] as const).map((s) => (
                                        <button key={s} type="button" onClick={() => setFormStatus(s)}
                                            className={`flex-1 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all duration-300 ${formStatus === s
                                                ? s === 'Active' ? 'bg-white text-emerald-500 shadow-lg shadow-emerald-100/50'
                                                    : s === 'Closed' ? 'bg-white text-rose-500 shadow-lg shadow-rose-100/50'
                                                        : 'bg-white text-blue-500 shadow-lg shadow-blue-100/50'
                                                : 'text-slate-400 hover:text-slate-600'}`}>
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Amenities Selector */}
                        <div className="space-y-2" ref={amenityDropdownRef}>
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-2">Amenities <span className="text-[9px] font-bold text-slate-400 normal-case tracking-normal">(Optional)</span></label>

                            {selectedAmenities.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2 px-1">
                                    {selectedAmenities.map((a, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                                            {a}
                                            <button type="button" onClick={() => setSelectedAmenities(prev => prev.filter((_, i) => i !== idx))}
                                                className="text-blue-400 hover:text-rose-500 transition-colors">
                                                <X size={12} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="relative">
                                <div
                                    onClick={() => setIsAmenityDropdownOpen(!isAmenityDropdownOpen)}
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 cursor-pointer flex items-center justify-between hover:border-blue-200 transition-colors"
                                >
                                    <input
                                        type="text"
                                        value={amenitySearch}
                                        onChange={e => { setAmenitySearch(e.target.value); setIsAmenityDropdownOpen(true); }}
                                        onFocus={() => setIsAmenityDropdownOpen(true)}
                                        placeholder={selectedAmenities.length > 0 ? 'Add more...' : 'Select or type amenities...'}
                                        className="bg-transparent outline-none font-bold text-sm flex-1 w-full text-slate-900 placeholder:text-slate-400"
                                    />
                                    <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${isAmenityDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {isAmenityDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                        {(() => {
                                            const filtered = allKnownAmenities.filter(a =>
                                                !selectedAmenities.some(s => s.toLowerCase() === a.toLowerCase()) &&
                                                a.toLowerCase().includes(amenitySearch.toLowerCase())
                                            );
                                            const trimmedSearch = amenitySearch.trim();
                                            const isCustom = trimmedSearch &&
                                                !allKnownAmenities.some(a => a.toLowerCase() === trimmedSearch.toLowerCase()) &&
                                                !selectedAmenities.some(a => a.toLowerCase() === trimmedSearch.toLowerCase());

                                            return (
                                                <>
                                                    {isCustom && (
                                                        <button type="button"
                                                            onClick={() => {
                                                                setSelectedAmenities(prev => [...prev, trimmedSearch]);
                                                                setAmenitySearch('');
                                                            }}
                                                            className="w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 border-b border-slate-100"
                                                        >
                                                            <Plus size={14} className="text-blue-600 shrink-0" />
                                                            <span className="font-bold text-sm text-blue-600">Add "{trimmedSearch}"</span>
                                                        </button>
                                                    )}
                                                    {filtered.length > 0 ? filtered.map((a, idx) => (
                                                        <button type="button" key={idx}
                                                            onClick={() => {
                                                                setSelectedAmenities(prev => [...prev, a]);
                                                                setAmenitySearch('');
                                                            }}
                                                            className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors font-bold text-sm text-slate-700 flex items-center gap-3"
                                                        >
                                                            <span className="w-5 h-5 rounded-md border border-slate-200 flex items-center justify-center shrink-0">
                                                                {selectedAmenities.includes(a) && <Check size={12} className="text-blue-600" />}
                                                            </span>
                                                            {a}
                                                        </button>
                                                    )) : !isCustom && (
                                                        <div className="px-5 py-4 text-center">
                                                            <p className="text-[10px] text-slate-400 font-bold">No amenities found. Type to add a custom one.</p>
                                                        </div>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ──── Location Closures Calendar (Edit Only) ──── */}
                {isEdit && (
                    <div className="mt-6 space-y-4">
                        <div className="flex items-center gap-2 ml-4">
                            <Calendar size={14} className="text-blue-500" />
                            <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Schedule Closures</label>
                        </div>
                        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-4">
                            {/* Calendar Month Navigation */}
                            <div className="flex items-center justify-between">
                                <button type="button" onClick={() => {
                                    const prev = new Date(closureCalendarMonth);
                                    prev.setMonth(prev.getMonth() - 1);
                                    setClosureCalendarMonth(prev);
                                }} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-700">
                                    <ChevronDown size={16} className="rotate-90" />
                                </button>
                                <span className="text-xs font-black text-slate-700 uppercase tracking-widest">
                                    {closureCalendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                                <button type="button" onClick={() => {
                                    const next = new Date(closureCalendarMonth);
                                    next.setMonth(next.getMonth() + 1);
                                    setClosureCalendarMonth(next);
                                }} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-700">
                                    <ChevronDown size={16} className="-rotate-90" />
                                </button>
                            </div>

                            {/* Calendar Day Headers */}
                            <div className="grid grid-cols-7 gap-1">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="text-center text-[8px] font-black text-slate-300 uppercase py-1">{d}</div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 gap-1">
                                {(() => {
                                    const year = closureCalendarMonth.getFullYear();
                                    const month = closureCalendarMonth.getMonth();
                                    const firstDay = new Date(year, month, 1).getDay();
                                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                                    const today = new Date().toISOString().split('T')[0];
                                    const cells: React.ReactNode[] = [];

                                    for (let i = 0; i < firstDay; i++) {
                                        cells.push(<div key={`empty-${i}`} />);
                                    }

                                    for (let day = 1; day <= daysInMonth; day++) {
                                        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                                        const isPast = dateStr < today;
                                        const closure = closures.find(c => c.date === dateStr);
                                        const isSelected = selectedClosureDate === dateStr;

                                        cells.push(
                                            <button
                                                type="button"
                                                key={dateStr}
                                                disabled={isPast}
                                                onClick={() => {
                                                    if (closure) {
                                                        // Toggle off if already a closure — show it for editing
                                                        setSelectedClosureDate(dateStr);
                                                        setClosureReason(closure.reason as LocationClosureReason);
                                                        setClosureDescription(closure.description || '');
                                                    } else {
                                                        setSelectedClosureDate(isSelected ? null : dateStr);
                                                        setClosureReason('Holiday');
                                                        setClosureDescription('');
                                                    }
                                                }}
                                                className={`aspect-square rounded-lg text-[11px] font-bold transition-all relative ${isPast
                                                    ? 'text-slate-200 cursor-not-allowed'
                                                    : closure
                                                        ? closure.reason === 'Tournament'
                                                            ? 'bg-blue-500 text-white shadow-md shadow-blue-200/50'
                                                            : closure.reason === 'Holiday'
                                                                ? 'bg-rose-500 text-white shadow-md shadow-rose-200/50'
                                                                : closure.reason === 'Maintenance'
                                                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/10/50'
                                                                    : 'bg-purple-500 text-white shadow-md shadow-purple-200/50'
                                                        : isSelected
                                                            ? 'bg-slate-900 text-white shadow-md'
                                                            : 'text-slate-600 hover:bg-white hover:shadow-sm'
                                                    }`}
                                                title={closure ? `${closure.reason}${closure.description ? ': ' + closure.description : ''}` : ''}
                                            >
                                                {day}
                                                {closure && (
                                                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60" />
                                                )}
                                            </button>
                                        );
                                    }
                                    return cells;
                                })()}
                            </div>

                            {/* Closure Legend */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60">
                                {[
                                    { color: 'bg-rose-500', label: 'Holiday' },
                                    { color: 'bg-blue-500', label: 'Tournament' },
                                    { color: 'bg-blue-600', label: 'Maintenance' },
                                    { color: 'bg-purple-500', label: 'Other' },
                                ].map(l => (
                                    <div key={l.label} className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${l.color}`} />
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{l.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Add/Edit Closure Form */}
                            {selectedClosureDate && (
                                <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
                                            📅 {new Date(selectedClosureDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                        </p>
                                        <button type="button" onClick={() => setSelectedClosureDate(null)} className="text-slate-300 hover:text-slate-500">
                                            <X size={14} />
                                        </button>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reason</label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(['Holiday', 'Tournament', 'Maintenance', 'Private Event', 'Weather', 'Other'] as const).map(r => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    onClick={() => setClosureReason(r)}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${closureReason === r
                                                        ? r === 'Holiday' ? 'bg-rose-500 text-white shadow-md'
                                                            : r === 'Tournament' ? 'bg-blue-500 text-white shadow-md'
                                                                : r === 'Maintenance' ? 'bg-blue-600 text-white shadow-md'
                                                                    : 'bg-purple-500 text-white shadow-md'
                                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description (Optional)</label>
                                        <input
                                            type="text"
                                            value={closureDescription}
                                            onChange={e => setClosureDescription(e.target.value)}
                                            placeholder="e.g. Christmas Day, Barangay Tournament..."
                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 outline-none font-bold text-xs focus:ring-2 focus:ring-blue-500/20"
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        {closures.find(c => c.date === selectedClosureDate) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const existing = closures.find(c => c.date === selectedClosureDate);
                                                    if (existing) handleRemoveClosure(existing.id);
                                                }}
                                                className="flex-1 py-2.5 border border-rose-200 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-all"
                                            >
                                                Remove
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handleAddClosure}
                                            disabled={isSavingClosure}
                                            className="flex-[2] py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all disabled:bg-slate-200"
                                        >
                                            {isSavingClosure ? 'Saving...' : closures.find(c => c.date === selectedClosureDate) ? 'Update Closure' : 'Set as Closed'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Upcoming Closures List */}
                            {closures.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-slate-200/60">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Upcoming Closures</p>
                                    <div className="max-h-32 overflow-y-auto space-y-1.5">
                                        {closures.map(c => (
                                            <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-100">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${c.reason === 'Holiday' ? 'bg-rose-500'
                                                        : c.reason === 'Tournament' ? 'bg-blue-500'
                                                            : c.reason === 'Maintenance' ? 'bg-blue-600'
                                                                : 'bg-purple-500'
                                                        }`} />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold text-slate-700 truncate">
                                                            {new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            <span className="text-slate-400 ml-1.5">{c.reason}</span>
                                                        </p>
                                                        {c.description && <p className="text-[9px] text-slate-400 truncate">{c.description}</p>}
                                                    </div>
                                                </div>
                                                <button type="button" onClick={() => handleRemoveClosure(c.id)} className="text-slate-300 hover:text-rose-500 shrink-0 ml-2">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className={`mt-8 ${isEdit ? 'flex gap-4' : ''}`}>
                    {isEdit && (
                        <button type="button" onClick={() => editingLocation && handleDeleteLocation(editingLocation.id)}
                            className="flex-1 h-16 border border-rose-100 text-rose-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2">
                            <Trash2 size={18} /> Remove
                        </button>
                    )}
                    <button type="submit" disabled={isSubmitting}
                        className={`${isEdit ? 'flex-[2]' : 'w-full'} h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 disabled:bg-slate-200 active:scale-95`}>
                        {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Court'}
                    </button>
                </div>
            </div>
        </form>
    );

    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-2">{isManagerView ? 'COURT MANAGER / 2026' : 'COURT OWNER / 2026'}</p>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">{isManagerView ? 'Assigned Court' : 'My Courts'}</h1>
                    <p className="text-slate-500 font-medium tracking-tight">
                        {isManagerView
                            ? 'Review your assigned court and jump into day-to-day court operations.'
                            : 'Manage your venues and courts in one place.'}
                    </p>
                </div>

                {isOwnerView ? (
                    <div className="flex gap-3">
                        <button onClick={() => { setIsLocationListModalOpen(true); setLocationModalSearch(''); }}
                            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2">
                            <Building2 size={16} /> Location
                        </button>
                        <button onClick={() => { resetCourtForm(); setIsAddCourtModalOpen(true); }}
                            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 flex items-center gap-2">
                            <Plus size={16} /> Court
                        </button>
                        <button onClick={() => navigate('/court-policies')}
                            className="px-8 py-4 bg-slate-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-slate-200 flex items-center gap-2">
                            <Shield size={16} /> Court Policies
                        </button>
                    </div>
                ) : (
                    <div className="flex gap-3">
                        <button onClick={() => navigate(bookingsRoute)}
                            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 flex items-center gap-2">
                            <Calendar size={16} /> Bookings
                        </button>
                        <button onClick={() => navigate(scheduleRoute)}
                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-950 transition-all shadow-xl shadow-slate-200 flex items-center gap-2">
                            <Clock size={16} /> Schedule
                        </button>
                    </div>
                )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard label={isManagerView ? 'Assigned Location' : 'Total Locations'} count={locations.length.toString()} subtext={isManagerView ? 'Visible to you' : 'Active venues'} />
                <MetricCard label={isManagerView ? 'Assigned Court' : 'Total Courts'} count={totalCourts.toString()} subtext={isManagerView ? 'Operational scope' : 'Across all locations'} color="text-blue-600" />
                <MetricCard label={isManagerView ? 'Ready Today' : 'Active'} count={allCourts.filter(c => c.is_active).length.toString()} subtext={isManagerView ? 'Available for bookings' : 'Ready for bookings'} color="text-emerald-500" />
            </div>

            {/* Search + Location Filter */}
            <div className="flex gap-3 items-center flex-wrap">
                <div className="relative max-w-md flex-1 min-w-[240px]">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={courtSearchQuery} onChange={e => setCourtSearchQuery(e.target.value)}
                        placeholder="Search courts..."
                        className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-14 pr-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                </div>
                <div className="relative" ref={locationFilterRef}>
                    <button onClick={() => setIsLocationFilterOpen(!isLocationFilterOpen)}
                        className={`flex items-center gap-2 px-5 py-3.5 border rounded-2xl text-sm font-bold transition-all ${courtLocationFilter
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}>
                        <Building2 size={16} />
                        <span className="max-w-[160px] truncate">
                            {courtLocationFilter ? (locations.find(l => l.id === courtLocationFilter)?.name || 'Location') : 'All Locations'}
                        </span>
                        <ChevronDown size={14} className={`transition-transform ${isLocationFilterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isLocationFilterOpen && (
                        <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 min-w-[240px] max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                            <button onClick={() => { setCourtLocationFilter(''); setIsLocationFilterOpen(false); }}
                                className={`w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors font-bold text-sm flex items-center gap-3 ${!courtLocationFilter ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
                                    }`}>
                                <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${!courtLocationFilter ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                                    }`}>
                                    {!courtLocationFilter && <Check size={12} className="text-blue-600" />}
                                </span>
                                All Locations
                            </button>
                            {locations.map(loc => (
                                <button key={loc.id} onClick={() => { setCourtLocationFilter(loc.id); setIsLocationFilterOpen(false); }}
                                    className={`w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors font-bold text-sm flex items-center gap-3 ${courtLocationFilter === loc.id ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'
                                        }`}>
                                    <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${courtLocationFilter === loc.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'
                                        }`}>
                                        {courtLocationFilter === loc.id && <Check size={12} className="text-blue-600" />}
                                    </span>
                                    <div>
                                        <p>{loc.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{loc.city}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Courts List */}
            {isLoadingCourts ? (
                <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="bg-white rounded-[28px] border border-slate-100 animate-pulse h-20"></div>
                    ))}
                </div>
            ) : filteredCourts.length > 0 ? (
                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Court Name</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Location</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Type</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Surface</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Pricing</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Today's Slots</th>
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                    {isOwnerView && (
                                        <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Manager</th>
                                    )}
                                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredCourts.map((court) => {
                                    const cStatus = court.status || (court.is_active ? 'Available' : 'Maintenance');
                                    const bookingInfo = courtBookingCounts[court.id];
                                    const todayBooked = bookingInfo?.booked || 0;
                                    const passedSlots = bookingInfo?.passed || 0;
                                    const totalSlots = bookingInfo?.totalSlots || 10;
                                    const availableSlots = bookingInfo?.available ?? Math.max(totalSlots - todayBooked, 0);
                                    const usedSlots = todayBooked + passedSlots; // booked + expired
                                    const isFull = availableSlots === 0;
                                    const slotPercent = totalSlots > 0 ? Math.min((usedSlots / totalSlots) * 100, 100) : 0;
                                    const isSetupRequired = cStatus === 'Setup Required';
                                    return (
                                        <tr key={court.id} className={`group hover:bg-blue-50/30 transition-colors ${isSetupRequired ? 'cursor-default' : 'cursor-pointer'}`}
                                            onClick={() => { if (!isSetupRequired) openViewCourtModal(court); }}>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-xl ${isFull ? 'bg-rose-50 text-rose-500'
                                                        : cStatus === 'Available' ? 'bg-emerald-50 text-emerald-600'
                                                            : cStatus === 'Maintenance' ? 'bg-amber-50 text-amber-600'
                                                                : 'bg-blue-50 text-blue-600'
                                                        }`}>
                                                        <MapPin size={16} />
                                                    </div>
                                                    <span className="text-sm font-black text-slate-900 tracking-tight uppercase">{court.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-xs font-bold text-slate-500">{court.location_name}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {isSetupRequired ? (
                                                    <span className="text-xs font-bold text-slate-300">—</span>
                                                ) : (
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${court.court_type === 'Indoor' ? 'bg-purple-50 border-purple-100 text-purple-600'
                                                        : court.court_type === 'Outdoor' ? 'bg-orange-50 border-orange-100 text-orange-600'
                                                            : 'bg-slate-50 border-slate-200 text-slate-400'
                                                        }`}>
                                                        {court.court_type || 'N/A'}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className={`text-xs font-bold ${isSetupRequired ? 'text-slate-300' : 'text-slate-500'}`}>{isSetupRequired ? '—' : (court.surface_type || '—')}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {isSetupRequired ? (
                                                    <span className="text-xs font-bold text-slate-300">—</span>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/court-pricing?court=${court.id}`); }}
                                                        className="text-xs font-black text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors">
                                                        Set Pricing
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {isSetupRequired ? (
                                                    <span className="text-xs font-bold text-slate-300">—</span>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-1.5">
                                                        {isFull ? (
                                                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-rose-50 border border-rose-100 text-rose-600">
                                                                {todayBooked > 0 && availableSlots === 0 ? 'Fully Booked' : 'No Slots Left'}
                                                            </span>
                                                        ) : availableSlots > 0 ? (
                                                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-emerald-50 border-emerald-100 text-emerald-600">
                                                                {availableSlots} Slot{availableSlots !== 1 ? 's' : ''} Left
                                                            </span>
                                                        ) : (
                                                            <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-50 border border-slate-100 text-slate-400">
                                                                Closed
                                                            </span>
                                                        )}
                                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className={`h-full rounded-full transition-all duration-500 ${isFull ? 'bg-rose-500' : slotPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
                                                                }`} style={{ width: `${slotPercent}%` }} />
                                                        </div>
                                                        {passedSlots > 0 && (
                                                            <span className="text-[8px] font-bold text-slate-400">{passedSlots} expired</span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                {isSetupRequired ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/court-pricing?court=${court.id}`); }}
                                                        className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100 transition-colors">
                                                        Setup Required →
                                                    </button>
                                                ) : (
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cStatus === 'Available' ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                                        : cStatus === 'Fully Booked' ? 'bg-blue-50 border-blue-100 text-blue-600'
                                                            : cStatus === 'Coming Soon' ? 'bg-violet-50 border-violet-100 text-violet-600'
                                                                : cStatus === 'Setup Required' ? 'bg-amber-50 border-amber-100 text-amber-600'
                                                                    : cStatus === 'Maintenance' ? 'bg-amber-50 border-amber-100 text-amber-600'
                                                                        : 'bg-slate-50 border-slate-200 text-slate-400'
                                                        }`}>
                                                        {cStatus}
                                                    </span>
                                                )}
                                            </td>
                                            {isOwnerView && (
                                                <td className="px-6 py-5 text-center">
                                                    {court.managerAssignment ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="text-center">
                                                                <p className="text-xs font-black text-slate-900">{court.managerAssignment.manager_name}</p>
                                                                <p className="text-[10px] font-bold text-slate-400">{court.managerAssignment.manager_email}</p>
                                                            </div>
                                                            {renderManagerStatusPill(court.managerAssignment.status)}
                                                            <div className="flex max-w-[15rem] flex-wrap justify-center gap-2">
                                                                {renderManagerActionButtons(court)}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Unassigned</span>
                                                            {renderManagerActionButtons(court)}
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                            <td className="px-6 py-5 text-right">
                                                {isSetupRequired ? (
                                                    <span className="text-xs font-bold text-slate-300">—</span>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                        <button onClick={() => navigate(`/court-pricing?court=${court.id}`)}
                                                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Set Pricing">
                                                            <PhilippinePeso size={16} />
                                                        </button>
                                                        <button onClick={() => openEditCourtModal(court)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit Court">
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button onClick={() => handleDeleteCourt(court.id)}
                                                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Delete Court">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="py-20 text-center bg-white rounded-[48px] border border-dashed border-slate-200">
                    <MapPin className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">
                        {(courtSearchQuery || courtLocationFilter) ? 'No courts match your filter' : isManagerView ? 'No assigned court found' : 'No courts yet'}
                    </h3>
                    <p className="text-slate-400 text-sm font-medium mb-6">
                        {(courtSearchQuery || courtLocationFilter)
                            ? 'Try a different search or filter.'
                            : isManagerView
                                ? 'This account needs an active court assignment from the court owner.'
                                : 'Add your first court to start accepting bookings.'}
                    </p>
                    {isOwnerView && !courtSearchQuery && !courtLocationFilter && (
                        <button onClick={() => { resetCourtForm(); setIsAddCourtModalOpen(true); }}
                            className="px-8 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-200 inline-flex items-center gap-2">
                            <Plus size={16} /> Add Your First Court
                        </button>
                    )}
                </div>
            )}

            {/* View Court Detail Modal */}
            {isViewCourtModalOpen && viewingCourt && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-hidden">
                        <div className="overflow-y-auto max-h-[90vh] p-10">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{viewingCourt.name}</h2>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{viewingCourt.location_name}</p>
                                </div>
                                <button onClick={() => { setIsViewCourtModalOpen(false); setViewingCourt(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                            </div>

                            {/* Court Photo Banner */}
                            {viewingCourt.image_url && (
                                <div className="mb-8 rounded-3xl overflow-hidden border border-slate-100 h-44 w-full relative">
                                    <img src={viewingCourt.image_url} alt={viewingCourt.name}
                                        className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent" />
                                </div>
                            )}

                            {/* Court Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Court Type</p>
                                    <p className="text-sm font-black text-slate-900">{viewingCourt.court_type || 'N/A'}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Surface</p>
                                    <p className="text-sm font-black text-slate-900">{viewingCourt.surface_type || '—'}</p>
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</p>
                                    {isOwnerView ? (
                                        <button
                                            onClick={() => { setViewingCourt(null); navigate(`/court-pricing?court=${viewingCourt.id}`); }}
                                            className="text-sm font-black text-blue-600 hover:text-blue-800 underline underline-offset-2 transition-colors">
                                            Manage Pricing
                                        </button>
                                    ) : (
                                        <p className="text-sm font-black uppercase tracking-widest text-slate-300">Owner only</p>
                                    )}
                                </div>
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${(viewingCourt.status || 'Available') === 'Available' ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                        : (viewingCourt.status) === 'Fully Booked' ? 'bg-blue-50 border-blue-100 text-blue-600'
                                            : (viewingCourt.status) === 'Coming Soon' ? 'bg-violet-50 border-violet-100 text-violet-600'
                                                : (viewingCourt.status) === 'Setup Required' ? 'bg-amber-50 border-amber-100 text-amber-600'
                                                    : (viewingCourt.status) === 'Maintenance' ? 'bg-amber-50 border-amber-100 text-amber-600'
                                                        : 'bg-slate-50 border-slate-200 text-slate-400'
                                        }`}>
                                        {viewingCourt.status || 'Available'}
                                    </span>
                                </div>
                                {(() => {
                                    const info = courtBookingCounts[viewingCourt.id];
                                    const booked = info?.booked || 0;
                                    const passed = info?.passed || 0;
                                    const total = info?.totalSlots || 10;
                                    const available = info?.available ?? Math.max(total - booked, 0);
                                    const usedSlots = booked + passed;
                                    const full = available === 0;
                                    const usedPercent = total > 0 ? Math.min((usedSlots / total) * 100, 100) : 0;
                                    const bookedPercent = total > 0 ? Math.min((booked / total) * 100, 100) : 0;
                                    return (
                                        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 col-span-2 md:col-span-2">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Today's Availability</p>
                                            {/* Slot breakdown */}
                                            <div className="flex gap-3 mb-3">
                                                <div className="flex-1 bg-white rounded-xl p-2.5 border border-slate-100 text-center">
                                                    <p className="text-lg font-black text-blue-600">{booked}</p>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Booked</p>
                                                </div>
                                                <div className="flex-1 bg-white rounded-xl p-2.5 border border-slate-100 text-center">
                                                    <p className="text-lg font-black text-slate-300">{passed}</p>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Expired</p>
                                                </div>
                                                <div className="flex-1 bg-white rounded-xl p-2.5 border border-slate-100 text-center">
                                                    <p className={`text-lg font-black ${available > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{available}</p>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Available</p>
                                                </div>
                                                <div className="flex-1 bg-white rounded-xl p-2.5 border border-slate-100 text-center">
                                                    <p className="text-lg font-black text-slate-900">{total}</p>
                                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                                                </div>
                                            </div>
                                            {/* Progress bar with segments */}
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex">
                                                        {bookedPercent > 0 && (
                                                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${bookedPercent}%` }} />
                                                        )}
                                                        {passed > 0 && (
                                                            <div className="h-full bg-slate-300 transition-all duration-500" style={{ width: `${total > 0 ? (passed / total) * 100 : 0}%` }} />
                                                        )}
                                                    </div>
                                                    <div className="flex gap-4 mt-1.5">
                                                        <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Booked</span>
                                                        <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-300"></span> Expired</span>
                                                        <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-100 border border-slate-200"></span> Available</span>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${full ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                                    }`}>
                                                    {full ? 'Full' : `${available}/${total}`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {isOwnerView && (
                                <div className="mb-8 rounded-3xl border border-slate-100 bg-slate-50 p-5">
                                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Court Manager</p>
                                            {viewingCourt.managerAssignment ? (
                                                <>
                                                    <p className="mt-2 text-lg font-black uppercase tracking-tight text-slate-900">{viewingCourt.managerAssignment.manager_name}</p>
                                                    <p className="text-sm font-bold text-slate-500">{viewingCourt.managerAssignment.manager_email}</p>
                                                    {viewingCourt.managerAssignment.manager_contact_number && (
                                                        <p className="text-xs font-bold text-slate-400">{viewingCourt.managerAssignment.manager_contact_number}</p>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="mt-2 text-sm font-bold text-slate-400">No manager assigned to this court yet.</p>
                                            )}
                                        </div>
                    <div className="flex flex-wrap items-center gap-3">
                                            {viewingCourt.managerAssignment && (
                                                renderManagerStatusPill(viewingCourt.managerAssignment.status)
                                            )}
                                            <div className="flex flex-wrap justify-end gap-2">
                                                {renderManagerActionButtons(viewingCourt, 'panel')}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Upcoming Bookings */}
                            <div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Calendar size={14} className="text-blue-600" /> Upcoming Bookings
                                </h3>
                                {isLoadingViewBookings ? (
                                    <div className="space-y-3">
                                        {Array(3).fill(0).map((_, i) => (
                                            <div key={i} className="bg-slate-50 rounded-2xl h-14 animate-pulse"></div>
                                        ))}
                                    </div>
                                ) : viewCourtBookings.length > 0 ? (
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                        {viewCourtBookings.map((booking: any) => {
                                            const bookDate = new Date(booking.date + 'T00:00:00');
                                            const isToday = booking.date === new Date().toISOString().split('T')[0];
                                            return (
                                                <div key={booking.id}
                                                    onClick={() => { setIsViewCourtModalOpen(false); setViewingCourt(null); navigate(bookingsRoute); }}
                                                    className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-3.5 border border-slate-100 hover:border-blue-300 hover:bg-blue-50/40 transition-all cursor-pointer group/booking">
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center text-center ${isToday ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
                                                            }`}>
                                                            <span className="text-[8px] font-black uppercase leading-none">{bookDate.toLocaleDateString('en-US', { month: 'short' })}</span>
                                                            <span className="text-sm font-black leading-none">{bookDate.getDate()}</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 group-hover/booking:text-blue-600 transition-colors">{booking.profiles?.full_name || 'Guest'}</p>
                                                            <p className="text-[10px] font-bold text-slate-400">{booking.start_time} - {booking.end_time}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${booking.status === 'confirmed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                                            : booking.status === 'pending' ? 'bg-amber-50 border-amber-100 text-amber-600'
                                                                : booking.status === 'completed' ? 'bg-blue-50 border-blue-100 text-blue-600'
                                                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                                                            }`}>
                                                            {booking.status}
                                                        </span>
                                                        <ChevronRight size={14} className="text-slate-300 group-hover/booking:text-blue-500 transition-colors" />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-10 text-center bg-slate-50 rounded-2xl border border-slate-100">
                                        <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No upcoming bookings</p>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 mt-8">
                                {isOwnerView ? (
                                    <>
                                        <button onClick={() => { setIsViewCourtModalOpen(false); setViewingCourt(null); openEditCourtModal(viewingCourt); }}
                                            className="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg flex items-center justify-center gap-2">
                                            <Pencil size={16} /> Edit Court
                                        </button>
                                        <button onClick={() => { setIsViewCourtModalOpen(false); setViewingCourt(null); handleDeleteCourt(viewingCourt.id); }}
                                            className="h-14 px-6 border border-rose-100 text-rose-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2">
                                            <Trash2 size={16} /> Remove
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => { setIsViewCourtModalOpen(false); setViewingCourt(null); navigate(bookingsRoute); }}
                                            className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg flex items-center justify-center gap-2">
                                            <Calendar size={16} /> Bookings
                                        </button>
                                        <button onClick={() => { setIsViewCourtModalOpen(false); setViewingCourt(null); navigate(scheduleRoute); }}
                                            className="flex-1 h-14 border border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                                            <Clock size={16} /> Schedule
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {managerModalCourt && (
                <CourtManagerModal
                    court={managerModalCourt}
                    onClose={() => setManagerModalCourt(null)}
                    onSubmit={handleManagerSubmit}
                    onApprove={handleApproveManager}
                    onResendInvite={handleResendManagerInvite}
                    onCopyInviteLink={handleCopyInviteLink}
                    onRemove={handleRemoveManager}
                    copiedInviteAssignmentId={copiedInviteAssignmentId}
                    managerActionKey={managerActionKey}
                />
            )}

            {/* Add Court Modal */}
            {isAddCourtModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-hidden">
                        <div className="overflow-y-auto max-h-[90vh] p-10">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Add New Court</h2>
                                <button onClick={() => setIsAddCourtModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleAddCourt} className="space-y-6">
                                {/* Location Dropdown */}
                                <div className="space-y-2" ref={locationDropdownRef}>
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-1.5">Location <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <div onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 cursor-pointer flex items-center justify-between hover:border-blue-200 transition-colors">
                                            <input type="text"
                                                value={isLocationDropdownOpen ? locationDropdownSearch : (locations.find(l => l.id === courtLocationId)?.name || '')}
                                                onChange={e => { setLocationDropdownSearch(e.target.value); setIsLocationDropdownOpen(true); }}
                                                onFocus={() => { setIsLocationDropdownOpen(true); setLocationDropdownSearch(''); }}
                                                placeholder="Select a location..."
                                                className="bg-transparent outline-none font-bold text-sm flex-1 w-full min-w-0" />
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ml-2 ${isLocationDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {isLocationDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                                {locations.filter(l => l.name.toLowerCase().includes(locationDropdownSearch.toLowerCase())).length > 0 ? (
                                                    locations.filter(l => l.name.toLowerCase().includes(locationDropdownSearch.toLowerCase())).map(loc => (
                                                        <button type="button" key={loc.id}
                                                            onClick={() => { setCourtLocationId(loc.id); setLocationDropdownSearch(''); setIsLocationDropdownOpen(false); }}
                                                            className={`w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors font-bold text-sm flex items-center gap-3 ${courtLocationId === loc.id ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}>
                                                            <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${courtLocationId === loc.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                                                                {courtLocationId === loc.id && <Check size={12} className="text-blue-600" />}
                                                            </span>
                                                            <div>
                                                                <p className="font-black text-sm">{loc.name}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">{loc.address}, {loc.city}</p>
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-5 py-4 text-center">
                                                        <p className="text-[10px] text-slate-400 font-bold">No locations found.</p>
                                                        <button type="button" onClick={() => { setIsAddCourtModalOpen(false); setIsLocationListModalOpen(true); }}
                                                            className="mt-2 text-[10px] font-black text-blue-600 hover:underline">Add a location first →</button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Court Name */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-1.5">Court Name <span className="text-rose-500">*</span></label>
                                    <input required type="text" value={courtName} onChange={e => setCourtName(e.target.value)}
                                        placeholder="e.g. Center Court, Court A"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm" />
                                </div>

                                {/* Court Type */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4">Court Type</label>
                                    <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 gap-1 shadow-inner h-[54px]">
                                        {['Indoor', 'Outdoor'].map((type) => (
                                            <button key={type} type="button"
                                                onClick={() => { setCourtType(type as 'Indoor' | 'Outdoor'); setCourtSurface(''); setSurfaceSearch(''); setIsSurfaceDropdownOpen(false); }}
                                                className={`flex-1 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 ${courtType === type
                                                    ? 'bg-white text-blue-600 shadow-lg shadow-blue-100/50'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}>
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Court Status is locked to Setup Required on create to prevent early booking */}

                                {/* Surface Type & Price */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2" ref={surfaceDropdownRef}>
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4">Surface Type</label>
                                        <div className="relative">
                                            <div onClick={() => setIsSurfaceDropdownOpen(!isSurfaceDropdownOpen)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 cursor-pointer flex items-center justify-between hover:border-blue-200 transition-colors">
                                                <input type="text"
                                                    value={isSurfaceDropdownOpen ? surfaceSearch : courtSurface}
                                                    onChange={e => { setSurfaceSearch(e.target.value); setIsSurfaceDropdownOpen(true); }}
                                                    onFocus={() => { setIsSurfaceDropdownOpen(true); setSurfaceSearch(''); }}
                                                    placeholder="Select surface..."
                                                    className="bg-transparent outline-none font-bold text-sm flex-1 w-full min-w-0" />
                                                <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ml-2 ${isSurfaceDropdownOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                            {isSurfaceDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                                    {(() => {
                                                        const options = courtType === 'Indoor' ? INDOOR_SURFACES : OUTDOOR_SURFACES;
                                                        const filtered = options.filter(s => s.toLowerCase().includes(surfaceSearch.toLowerCase()));
                                                        const trimmed = surfaceSearch.trim();
                                                        const isCustom = trimmed && !options.some(s => s.toLowerCase() === trimmed.toLowerCase());
                                                        return (
                                                            <>
                                                                {filtered.map((s, idx) => (
                                                                    <button type="button" key={idx}
                                                                        onClick={() => { setCourtSurface(s); setSurfaceSearch(''); setIsSurfaceDropdownOpen(false); }}
                                                                        className={`w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors font-bold text-sm flex items-center gap-3 ${courtSurface === s ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}>
                                                                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${courtSurface === s ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                                                                            {courtSurface === s && <Check size={12} className="text-blue-600" />}
                                                                        </span>
                                                                        {s}
                                                                    </button>
                                                                ))}
                                                                {isCustom && (
                                                                    <button type="button"
                                                                        onClick={() => { setCourtSurface(trimmed); setSurfaceSearch(''); setIsSurfaceDropdownOpen(false); }}
                                                                        className="w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 border-t border-slate-100">
                                                                        <Plus size={14} className="text-blue-600 shrink-0" />
                                                                        <span className="font-bold text-sm text-blue-600">Use "{trimmed}"</span>
                                                                    </button>
                                                                )}
                                                                {filtered.length === 0 && !isCustom && (
                                                                    <div className="px-5 py-4 text-center">
                                                                        <p className="text-[10px] text-slate-400 font-bold">Type to add a custom surface.</p>
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Price info */}
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">💰 Pricing</p>
                                    <p className="text-xs font-medium text-blue-700">Set time-based pricing in <span className="font-black">Court Pricing</span> after adding the court.</p>
                                </div>

                                {/* Court Photo Upload */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-1.5">
                                        <Camera size={12} /> Court Photo <span className="text-slate-400 font-medium normal-case tracking-normal">optional</span>
                                    </label>
                                    <input
                                        ref={courtImageInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setCourtImageFile(file);
                                            const reader = new FileReader();
                                            reader.onload = ev => setCourtImagePreview(ev.target?.result as string);
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                    {courtImagePreview ? (
                                        <div className="relative rounded-2xl overflow-hidden border border-slate-100 h-36 group">
                                            <img src={courtImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <button type="button"
                                                    onClick={() => courtImageInputRef.current?.click()}
                                                    className="px-4 py-2 bg-white text-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-1.5">
                                                    <Camera size={12} /> Change
                                                </button>
                                                <button type="button"
                                                    onClick={() => { setCourtImageFile(null); setCourtImagePreview(null); }}
                                                    className="px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-1.5">
                                                    <X size={12} /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button type="button"
                                            onClick={() => courtImageInputRef.current?.click()}
                                            className="w-full h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                                            <div className="p-2.5 bg-slate-100 rounded-xl group-hover:bg-blue-100 transition-colors">
                                                <Image size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">Upload Photo</span>
                                            <span className="text-[9px] text-slate-300 font-medium">JPG, PNG, or WEBP</span>
                                        </button>
                                    )}
                                    {reusableImages.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <button
                                                type="button"
                                                onClick={() => { setImageGalleryTarget('court'); setIsImageGalleryOpen(true); }}
                                                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-all"
                                            >
                                                Use from Gallery
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button type="submit" disabled={isCourtSubmitting}
                                    className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 disabled:bg-slate-200 active:scale-95 mt-4">
                                    {isCourtSubmitting ? 'Adding...' : 'Add Court'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Court Modal */}
            {isEditCourtModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-hidden">
                        <div className="overflow-y-auto max-h-[90vh] p-10">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Edit Court</h2>
                                <button onClick={() => { setIsEditCourtModalOpen(false); setEditingCourt(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleUpdateCourt} className="space-y-6">
                                {/* Location Dropdown */}
                                <div className="space-y-2" ref={locationDropdownRef}>
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-1.5">Location <span className="text-rose-500">*</span></label>
                                    <div className="relative">
                                        <div onClick={() => setIsLocationDropdownOpen(!isLocationDropdownOpen)}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 cursor-pointer flex items-center justify-between hover:border-blue-200 transition-colors">
                                            <input type="text"
                                                value={isLocationDropdownOpen ? locationDropdownSearch : (locations.find(l => l.id === courtLocationId)?.name || '')}
                                                onChange={e => { setLocationDropdownSearch(e.target.value); setIsLocationDropdownOpen(true); }}
                                                onFocus={() => { setIsLocationDropdownOpen(true); setLocationDropdownSearch(''); }}
                                                placeholder="Select a location..."
                                                className="bg-transparent outline-none font-bold text-sm flex-1 w-full min-w-0" />
                                            <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ml-2 ${isLocationDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                        {isLocationDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                                {locations.filter(l => l.name.toLowerCase().includes(locationDropdownSearch.toLowerCase())).length > 0 ? (
                                                    locations.filter(l => l.name.toLowerCase().includes(locationDropdownSearch.toLowerCase())).map(loc => (
                                                        <button type="button" key={loc.id}
                                                            onClick={() => { setCourtLocationId(loc.id); setLocationDropdownSearch(''); setIsLocationDropdownOpen(false); }}
                                                            className={`w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors font-bold text-sm flex items-center gap-3 ${courtLocationId === loc.id ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}>
                                                            <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${courtLocationId === loc.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                                                                {courtLocationId === loc.id && <Check size={12} className="text-blue-600" />}
                                                            </span>
                                                            <div>
                                                                <p className="font-black text-sm">{loc.name}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">{loc.address}, {loc.city}</p>
                                                            </div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-5 py-4 text-center">
                                                        <p className="text-[10px] text-slate-400 font-bold">No locations found.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Court Name */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-1.5">Court Name <span className="text-rose-500">*</span></label>
                                    <input required type="text" value={courtName} onChange={e => setCourtName(e.target.value)}
                                        placeholder="e.g. Center Court, Court A"
                                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm" />
                                </div>

                                {/* Court Type */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4">Court Type</label>
                                    <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 gap-1 shadow-inner h-[54px]">
                                        {['Indoor', 'Outdoor'].map((type) => (
                                            <button key={type} type="button"
                                                onClick={() => { setCourtType(type as 'Indoor' | 'Outdoor'); setCourtSurface(''); setSurfaceSearch(''); setIsSurfaceDropdownOpen(false); }}
                                                className={`flex-1 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 ${courtType === type
                                                    ? 'bg-white text-blue-600 shadow-lg shadow-blue-100/50'
                                                    : 'text-slate-400 hover:text-slate-600'
                                                    }`}>
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Court Status */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4">Court Status</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {([
                                            { value: 'Setup Required' as CourtStatus, label: 'Setup Required', color: 'amber', icon: '🛠' },
                                            { value: 'Available' as CourtStatus, label: 'Available', color: 'emerald', icon: '✓' },
                                            { value: 'Fully Booked' as CourtStatus, label: 'Fully Booked', color: 'blue', icon: '⏳' },
                                            { value: 'Coming Soon' as CourtStatus, label: 'Coming Soon', color: 'violet', icon: '🔜' },
                                            { value: 'Maintenance' as CourtStatus, label: 'Maintenance', color: 'amber', icon: '🔧' },
                                        ]).map((opt) => {
                                            const isSelected = courtStatus === opt.value;
                                            const colorMap: Record<string, { bg: string; border: string; text: string; ring: string }> = {
                                                emerald: { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', ring: 'ring-emerald-500/20' },
                                                blue: { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', ring: 'ring-blue-500/20' },
                                                violet: { bg: 'bg-violet-50', border: 'border-violet-400', text: 'text-violet-700', ring: 'ring-violet-500/20' },
                                                amber: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-700', ring: 'ring-amber-500/20' },
                                            };
                                            const c = colorMap[opt.color];
                                            return (
                                                <button key={opt.value} type="button" onClick={() => setCourtStatus(opt.value)}
                                                    className={`py-3 px-3 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-all border-2 flex items-center justify-center gap-1.5 ${isSelected
                                                        ? `${c.bg} ${c.border} ${c.text} ring-4 ${c.ring} shadow-sm`
                                                        : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                                                        }`}>
                                                    <span>{opt.icon}</span> {opt.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Surface Type & Price */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2" ref={surfaceDropdownRef}>
                                        <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4">Surface Type</label>
                                        <div className="relative">
                                            <div onClick={() => setIsSurfaceDropdownOpen(!isSurfaceDropdownOpen)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 cursor-pointer flex items-center justify-between hover:border-blue-200 transition-colors">
                                                <input type="text"
                                                    value={isSurfaceDropdownOpen ? surfaceSearch : courtSurface}
                                                    onChange={e => { setSurfaceSearch(e.target.value); setIsSurfaceDropdownOpen(true); }}
                                                    onFocus={() => { setIsSurfaceDropdownOpen(true); setSurfaceSearch(''); }}
                                                    placeholder="Select surface..."
                                                    className="bg-transparent outline-none font-bold text-sm flex-1 w-full min-w-0" />
                                                <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ml-2 ${isSurfaceDropdownOpen ? 'rotate-180' : ''}`} />
                                            </div>
                                            {isSurfaceDropdownOpen && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                                    {(() => {
                                                        const options = courtType === 'Indoor' ? INDOOR_SURFACES : OUTDOOR_SURFACES;
                                                        const filtered = options.filter(s => s.toLowerCase().includes(surfaceSearch.toLowerCase()));
                                                        const trimmed = surfaceSearch.trim();
                                                        const isCustom = trimmed && !options.some(s => s.toLowerCase() === trimmed.toLowerCase());
                                                        return (
                                                            <>
                                                                {filtered.map((s, idx) => (
                                                                    <button type="button" key={idx}
                                                                        onClick={() => { setCourtSurface(s); setSurfaceSearch(''); setIsSurfaceDropdownOpen(false); }}
                                                                        className={`w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors font-bold text-sm flex items-center gap-3 ${courtSurface === s ? 'text-blue-600 bg-blue-50/50' : 'text-slate-700'}`}>
                                                                        <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${courtSurface === s ? 'border-blue-400 bg-blue-50' : 'border-slate-200'}`}>
                                                                            {courtSurface === s && <Check size={12} className="text-blue-600" />}
                                                                        </span>
                                                                        {s}
                                                                    </button>
                                                                ))}
                                                                {isCustom && (
                                                                    <button type="button"
                                                                        onClick={() => { setCourtSurface(trimmed); setSurfaceSearch(''); setIsSurfaceDropdownOpen(false); }}
                                                                        className="w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 border-t border-slate-100">
                                                                        <Plus size={14} className="text-blue-600 shrink-0" />
                                                                        <span className="font-bold text-sm text-blue-600">Use "{trimmed}"</span>
                                                                    </button>
                                                                )}
                                                                {filtered.length === 0 && !isCustom && (
                                                                    <div className="px-5 py-4 text-center">
                                                                        <p className="text-[10px] text-slate-400 font-bold">Type to add a custom surface.</p>
                                                                    </div>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Price info */}
                                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">💰 Pricing</p>
                                    <p className="text-xs font-medium text-blue-700">Manage time-based pricing in <span className="font-black">Court Pricing</span>.</p>
                                </div>

                                {/* Court Photo Upload (Edit) */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest ml-4 flex items-center gap-1.5">
                                        <Camera size={12} /> Court Photo <span className="text-slate-400 font-medium normal-case tracking-normal">optional</span>
                                    </label>
                                    <input
                                        ref={courtImageInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={e => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            setCourtImageFile(file);
                                            const reader = new FileReader();
                                            reader.onload = ev => setCourtImagePreview(ev.target?.result as string);
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                    {courtImagePreview ? (
                                        <div className="relative rounded-2xl overflow-hidden border border-slate-100 h-36 group">
                                            <img src={courtImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                <button type="button"
                                                    onClick={() => courtImageInputRef.current?.click()}
                                                    className="px-4 py-2 bg-white text-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center gap-1.5">
                                                    <Camera size={12} /> Change
                                                </button>
                                                <button type="button"
                                                    onClick={() => { setCourtImageFile(null); setCourtImagePreview(null); }}
                                                    className="px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-1.5">
                                                    <X size={12} /> Remove
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button type="button"
                                            onClick={() => courtImageInputRef.current?.click()}
                                            className="w-full h-28 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-blue-300 hover:bg-blue-50/30 transition-all group">
                                            <div className="p-2.5 bg-slate-100 rounded-xl group-hover:bg-blue-100 transition-colors">
                                                <Image size={20} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-blue-500 transition-colors">Upload Photo</span>
                                            <span className="text-[9px] text-slate-300 font-medium">JPG, PNG, or WEBP</span>
                                        </button>
                                    )}
                                    {reusableImages.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            <button
                                                type="button"
                                                onClick={() => { setImageGalleryTarget('court'); setIsImageGalleryOpen(true); }}
                                                className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-all"
                                            >
                                                Use from Gallery
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 mt-4">
                                    <button type="button" onClick={() => editingCourt && handleDeleteCourt(editingCourt.id)}
                                        className="flex-1 h-16 border border-rose-100 text-rose-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2">
                                        <Trash2 size={18} /> Remove
                                    </button>
                                    <button type="submit" disabled={isCourtSubmitting}
                                        className="flex-[2] h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 disabled:bg-slate-200 active:scale-95">
                                        {isCourtSubmitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Reusable Image Gallery Modal */}
            {isImageGalleryOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Image Library</p>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Reuse existing uploads</h3>
                            </div>
                            <button onClick={() => { setIsImageGalleryOpen(false); setImageGalleryTarget(null); }} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {reusableImages.length === 0 ? (
                            <div className="py-10 text-center text-slate-500 font-semibold">No reusable images yet.</div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {reusableImages.map((url, idx) => (
                                    <button
                                        key={`${url}-${idx}`}
                                        type="button"
                                        onClick={() => handleSelectGalleryImage(url)}
                                        className="relative group rounded-2xl overflow-hidden border border-slate-200 hover:border-blue-300 transition-all"
                                    >
                                        <img src={url} alt="Reusable upload" className="w-full h-32 object-cover" />
                                        <div className="absolute inset-0 bg-slate-900/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <span className="absolute bottom-2 right-2 text-[10px] font-black px-2 py-1 rounded-full bg-white/90 text-slate-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">Use</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Add Location Modal */}
            {isAddModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Add New Location</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                        </div>
                        {renderForm(handleAddLocation, false)}
                    </div>
                </div>,
                document.body
            )}

            {/* Edit Location Modal */}
            {isEditModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Edit Location</h2>
                            <button onClick={() => { setIsEditModalOpen(false); setEditingLocation(null); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                        </div>
                        {renderForm(handleUpdateLocation, true)}
                    </div>
                </div>,
                document.body
            )}

            {/* Location List Management Modal */}
            {isLocationListModalOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-4xl rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Locations</h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your venues and locations</p>
                            </div>
                            <button onClick={() => setIsLocationListModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                        </div>

                        {/* Search + Add Location */}
                        <div className="flex gap-3 mb-8 mt-6">
                            <div className="relative flex-1">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input type="text" value={locationModalSearch} onChange={e => setLocationModalSearch(e.target.value)}
                                    placeholder="Search locations..."
                                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-14 pr-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                            </div>
                            <button onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                                className="px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200 whitespace-nowrap">
                                <Plus size={16} /> Add Location
                            </button>
                        </div>

                        {/* Location List */}
                        {filteredModalLocations.length > 0 ? (
                            <div className="space-y-3">
                                {filteredModalLocations.map(loc => {
                                    const locStatus = loc.status || (loc.is_active ? 'Active' : 'Closed');
                                    return (
                                        <div key={loc.id} className="flex items-center gap-4 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 group hover:border-blue-200 transition-colors">
                                            {/* Image thumbnail */}
                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                                                {loc.image_url ? (
                                                    <img src={loc.image_url} alt={loc.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                                        <Building2 size={20} className="text-slate-300" />
                                                    </div>
                                                )}
                                            </div>
                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-sm font-black text-slate-900 tracking-tight uppercase truncate">{loc.name}</h3>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mt-0.5">
                                                    <MapPin size={10} className="shrink-0" />
                                                    <span className="truncate">{loc.address}, {loc.city}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{loc.court_count || 0} {(loc.court_count || 0) === 1 ? 'Court' : 'Courts'}</span>
                                                    {loc.court_type && <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">{loc.court_type}</span>}
                                                </div>
                                            </div>
                                            {/* Status Badge */}
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shrink-0 ${locStatus === 'Active' ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                                : locStatus === 'Closed' ? 'bg-rose-50 border-rose-100 text-rose-600'
                                                    : locStatus === 'Maintenance' ? 'bg-amber-50 border-amber-100 text-amber-600'
                                                        : locStatus === 'Coming Soon' ? 'bg-blue-50 border-blue-100 text-blue-600'
                                                            : 'bg-slate-50 border-slate-200 text-slate-400'
                                                }`}>
                                                {locStatus}
                                            </span>
                                            {/* Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button onClick={() => { setIsLocationListModalOpen(false); navigate(`/locations/${loc.id}`); }}
                                                    className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-xl transition-all"
                                                    title="View & Manage">
                                                    View
                                                </button>
                                                <button onClick={() => { openEditModal(loc); }}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                                    title="Edit Location">
                                                    <Pencil size={16} />
                                                </button>
                                                <button onClick={() => handleDeleteLocation(loc.id)}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    title="Delete Location">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-16 text-center">
                                <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm font-black text-slate-400 uppercase tracking-tighter">
                                    {locationModalSearch ? 'No locations match your search' : 'No locations yet'}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">
                                    {locationModalSearch ? 'Try a different search term' : 'Add your first location to start managing courts.'}
                                </p>
                                {!locationModalSearch && (
                                    <button onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                                        className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all inline-flex items-center gap-2 shadow-lg shadow-blue-200">
                                        <Plus size={16} /> Add Your First Location
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Footer count */}
                        {filteredModalLocations.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {filteredModalLocations.length} {filteredModalLocations.length === 1 ? 'location' : 'locations'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    {totalCourts} total {totalCourts === 1 ? 'court' : 'courts'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Master Amenities Management Modal */}
            {isMasterAmenitiesOpen && ReactDOM.createPortal(
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-40 flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-lg rounded-[40px] p-10 shadow-2xl animate-in zoom-in-95 duration-300 z-[100] max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Amenities</h2>
                            <button onClick={() => setIsMasterAmenitiesOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24} /></button>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">
                            Manage your reusable amenities list
                        </p>

                        {/* Add New Amenity */}
                        <div className="flex gap-3 mb-8">
                            <input
                                type="text"
                                value={newMasterAmenity}
                                onChange={e => setNewMasterAmenity(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddMasterAmenity(); } }}
                                placeholder="e.g. WiFi, Parking, Locker..."
                                className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl py-3.5 px-6 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm"
                            />
                            <button
                                type="button"
                                onClick={handleAddMasterAmenity}
                                disabled={!newMasterAmenity.trim() || isSavingMaster}
                                className="px-6 py-3.5 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:bg-slate-200 disabled:text-slate-400 flex items-center gap-2 shadow-lg shadow-blue-200"
                            >
                                <Plus size={16} /> Add
                            </button>
                        </div>

                        {/* Amenities List */}
                        {masterAmenities.length > 0 ? (
                            <div className="space-y-3">
                                {masterAmenities.map((amenity) => (
                                    <div key={amenity.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 group hover:border-blue-200 transition-colors">
                                        {editingMasterIdx === amenity.id ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editingMasterValue}
                                                    onChange={e => setEditingMasterValue(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSaveEditMasterAmenity(); } if (e.key === 'Escape') setEditingMasterIdx(null); }}
                                                    className="flex-1 bg-white border border-blue-200 rounded-xl py-2 px-4 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-sm"
                                                    autoFocus
                                                />
                                                <button onClick={handleSaveEditMasterAmenity} disabled={isSavingMaster}
                                                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:bg-slate-200">
                                                    <Check size={16} />
                                                </button>
                                                <button onClick={() => setEditingMasterIdx(null)}
                                                    className="p-2 bg-slate-200 text-slate-500 rounded-xl hover:bg-slate-300 transition-colors">
                                                    <X size={16} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={14} className="text-blue-400 shrink-0" />
                                                <span className="flex-1 font-bold text-sm text-slate-700">{amenity.name}</span>
                                                <button onClick={() => { setEditingMasterIdx(amenity.id); setEditingMasterValue(amenity.name); }}
                                                    className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                    <Pencil size={15} />
                                                </button>
                                                <button onClick={() => handleDeleteMasterAmenity(amenity.id)} disabled={isSavingMaster}
                                                    className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50">
                                                    <Trash2 size={15} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <Sparkles className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                                <p className="text-sm font-black text-slate-400 uppercase tracking-tighter">No amenities yet</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-1">Add amenities like WiFi, Parking, Water Station, etc.</p>
                            </div>
                        )}

                        {/* Total count footer */}
                        {masterAmenities.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {masterAmenities.length} {masterAmenities.length === 1 ? 'amenity' : 'amenities'}
                                </span>
                                {isSavingMaster && (
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.title}
                message={confirmDialog.message}
                onConfirm={handleConfirm}
                onCancel={closeConfirm}
                variant={confirmDialog.variant}
            />
        </div>
    );
};

// ---------- Sub-components ----------

const MetricCard: React.FC<{ label: string; count: string; subtext: string; color?: string }> = ({ label, count, subtext, color = 'text-slate-900' }) => (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100/50 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-slate-50 rounded-full group-hover:scale-125 transition-transform duration-700"></div>
        <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</p>
            <p className={`text-4xl font-black tracking-tighter mb-1 ${color}`}>{count}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtext}</p>
        </div>
    </div>
);

const CourtManagerModal: React.FC<{
    court: CourtItem;
    onClose: () => void;
    onSubmit: (payload: { fullName: string; email: string; contactNumber: string }) => Promise<void>;
    onApprove: (assignmentId: string) => Promise<void>;
    onResendInvite: (court: CourtItem) => Promise<void>;
    onCopyInviteLink: (assignment: CourtManagerAssignment) => Promise<void>;
    onRemove: (assignment: CourtManagerAssignment) => void;
    copiedInviteAssignmentId: string | null;
    managerActionKey: string | null;
}> = ({ court, onClose, onSubmit, onApprove, onResendInvite, onCopyInviteLink, onRemove, copiedInviteAssignmentId, managerActionKey }) => {
    const assignment = court.managerAssignment;
    const [fullName, setFullName] = useState(assignment?.manager_name || '');
    const [email, setEmail] = useState(assignment?.manager_email || '');
    const [contactNumber, setContactNumber] = useState(assignment?.manager_contact_number || '');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSaving(true);
        setError('');

        try {
            await onSubmit({ fullName, email, contactNumber });
        } catch (err: any) {
            setError(err.message || 'Failed to send manager invite.');
        } finally {
            setIsSaving(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[36px] border border-slate-100 bg-white p-8 shadow-2xl">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-600">Court Manager</p>
                        <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{court.name}</h2>
                        <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-400">{court.location_name}</p>
                    </div>
                    <button onClick={onClose} className="rounded-full bg-slate-100 p-2 text-slate-400 hover:text-slate-900">
                        <X size={20} />
                    </button>
                </div>

                {assignment && (
                    <div className="mb-6 rounded-[28px] border border-slate-100 bg-slate-50 p-5">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-black uppercase tracking-tight text-slate-900">{assignment.manager_name}</p>
                                <p className="text-xs font-bold text-slate-500">{assignment.manager_email}</p>
                                <p className="text-xs font-bold text-slate-400">{assignment.manager_contact_number}</p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getCourtManagerStatusClasses(assignment.status)}`}>
                                {getCourtManagerStatusLabel(assignment.status)}
                            </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {assignment.status === 'pending_invite' && (
                                <>
                                    <button type="button" onClick={() => void onResendInvite(court)} disabled={managerActionKey === `resend:${assignment.id}`} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-blue-600 disabled:opacity-60">
                                        {managerActionKey === `resend:${assignment.id}` ? 'Sending...' : 'Resend Invite'}
                                    </button>
                                    <button type="button" onClick={() => void onCopyInviteLink(assignment)} disabled={managerActionKey === `copy:${assignment.id}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 disabled:opacity-60">
                                        {copiedInviteAssignmentId === assignment.id ? 'Copied' : 'Copy Invite Link'}
                                    </button>
                                </>
                            )}
                            {assignment.status === 'pending_approval' && (
                                <button type="button" onClick={() => onApprove(assignment.id)} disabled={managerActionKey === `approve:${assignment.id}`} className="rounded-2xl bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60">
                                    {managerActionKey === `approve:${assignment.id}` ? 'Approving...' : 'Approve Manager'}
                                </button>
                            )}
                            {assignment.status !== 'removed' && (
                                <button type="button" onClick={() => onRemove(assignment)} className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600">
                                    {assignment.status === 'pending_invite' ? 'Remove Invite' : assignment.status === 'pending_approval' ? 'Reject' : 'Remove Manager'}
                                </button>
                            )}
                        </div>
                        {assignment.status === 'pending_approval' && (
                            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
                                This manager already accepted the invite or signed in with the invited email. Owner approval is still required before Court Manager mode becomes available.
                            </p>
                        )}
                        {assignment.status === 'active' && (
                            <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">
                                This manager is active for this assigned court only. Their other PicklePlay roles stay separate.
                            </p>
                        )}
                    </div>
                )}

                {(!assignment || assignment.status === 'pending_invite' || assignment.status === 'removed') && (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {assignment?.status === 'pending_invite' && (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                                Invite sent. Updating these details will issue a fresh secure invite link and expire the previous one.
                            </div>
                        )}
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Full Name</label>
                            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Email Address</label>
                            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Contact Number</label>
                            <input required value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold outline-none focus:border-blue-500" />
                        </div>
                        {error && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">{error}</p>}
                        <button type="submit" disabled={isSaving} className="w-full rounded-2xl bg-blue-600 px-5 py-4 text-[10px] font-black uppercase tracking-[0.22em] text-white disabled:opacity-60">
                            {isSaving ? 'Sending Invite...' : assignment ? 'Resend Invite' : 'Send Invite'}
                        </button>
                    </form>
                )}
            </div>
        </div>,
        document.body
    );
};

const LocationCard: React.FC<{
    location: Location;
    viewMode: 'grid' | 'list';
    onView: () => void;
    onEdit: () => void;
}> = ({ location, viewMode, onView, onEdit }) => {
    const courtCount = location.court_count || 0;

    if (viewMode === 'list') {
        return (
            <div onClick={onView}
                className="bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 p-6 flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
                        <MapPin size={24} className="text-blue-500" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-black text-slate-900 tracking-tight uppercase truncate group-hover:text-blue-500 transition-colors">{location.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{location.address}, {location.city}</p>
                    </div>
                </div>
                <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center">
                        <p className="text-2xl font-black text-slate-900">{courtCount}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{courtCount === 1 ? 'Court' : 'Courts'}</p>
                    </div>
                    {location.base_cleaning_time > 0 && (
                        <div className="flex items-center gap-1 text-blue-500">
                            <Clock size={14} />
                            <span className="text-[10px] font-bold">{location.base_cleaning_time}m</span>
                        </div>
                    )}
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${(location.status || (location.is_active ? 'Active' : 'Closed')) === 'Active'
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        : (location.status) === 'Closed'
                            ? 'bg-rose-50 border-rose-100 text-rose-600'
                            : (location.status) === 'Maintenance'
                                ? 'bg-blue-50 border-blue-100 text-blue-600'
                                : (location.status) === 'Coming Soon'
                                    ? 'bg-blue-50 border-blue-100 text-blue-600'
                                    : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                        {location.status || (location.is_active ? 'Active' : 'Closed')}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 border border-slate-200 hover:border-blue-200 rounded-xl transition-all">
                        Edit
                    </button>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
            </div>
        );
    }

    return (
        <div onClick={onView}
            className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden cursor-pointer">
            {/* Image/Map Preview Header */}
            <div className="h-44 bg-slate-100 relative overflow-hidden">
                {/* Display location image if available, otherwise show map */}
                {location.image_url ? (
                    <img
                        src={location.image_url}
                        alt={location.name}
                        className="w-full h-full object-cover"
                    />
                ) : location.latitude && location.longitude ? (
                    <MiniMapPreview lat={location.latitude} lng={location.longitude} />
                ) : (
                    <img
                        src="/images/home-images/pb2.jpg"
                        alt={location.name}
                        className="w-full h-full object-cover"
                    />
                )}
                <div className="absolute top-4 right-4 flex gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-sm ${(location.status || (location.is_active ? 'Active' : 'Closed')) === 'Active'
                        ? 'bg-emerald-50/90 border-emerald-100 text-emerald-600'
                        : (location.status) === 'Closed'
                            ? 'bg-rose-50/90 border-rose-100 text-rose-600'
                            : (location.status) === 'Maintenance'
                                ? 'bg-blue-50/90 border-blue-100 text-blue-600'
                                : (location.status) === 'Coming Soon'
                                    ? 'bg-blue-50/90 border-blue-100 text-blue-600'
                                    : 'bg-slate-50/90 border-slate-200 text-slate-400'
                        }`}>
                        {location.status || (location.is_active ? 'Active' : 'Closed')}
                    </span>
                </div>
                <div className="absolute bottom-4 left-4 flex items-end gap-3">
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border border-white/50">
                        <p className="text-lg font-black text-slate-900 tracking-tighter">{courtCount}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{courtCount === 1 ? 'Court' : 'Courts'}</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-7">
                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase mb-1 group-hover:text-blue-500 transition-colors truncate">{location.name}</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold mb-4">
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{location.address}, {location.city}</span>
                </div>

                {/* Info Tags */}
                <div className="flex flex-wrap gap-2 mb-5">
                    {location.base_cleaning_time > 0 && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                            <Clock size={10} />
                            {location.base_cleaning_time >= 60 ? `${Math.floor(location.base_cleaning_time / 60)}h` : `${location.base_cleaning_time}m`} buffer
                        </span>
                    )}
                    {location.phone && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
                            <Phone size={10} />
                            {location.phone}
                        </span>
                    )}
                </div>

                {/* Amenities */}
                {location.amenities && location.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-5">
                        {location.amenities.slice(0, 4).map((amenity, idx) => (
                            <span key={idx} className="text-[8px] font-bold px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100 uppercase tracking-wider">
                                {amenity}
                            </span>
                        ))}
                        {location.amenities.length > 4 && (
                            <span className="text-[8px] font-bold px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md border border-slate-100">
                                +{location.amenities.length - 4} more
                            </span>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    <button onClick={(e) => { e.stopPropagation(); onView(); }}
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-2">
                        Manage <ChevronRight size={14} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-colors">
                        <FileText size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

const MiniMapPreview: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
    const mapRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mapRef.current && window.google) {
            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat, lng },
                zoom: 15,
                disableDefaultUI: true,
                gestureHandling: 'none',
                zoomControl: false,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                clickableIcons: false,
                styles: [
                    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                ]
            });

            new window.google.maps.Marker({
                position: { lat, lng },
                map,
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: '#3b82f6',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 3,
                }
            });
        }
    }, [lat, lng]);

    return <div ref={mapRef} className="w-full h-full" />;
};

const MapPreview: React.FC<{
    coords: { lat: number; lng: number } | null;
    onCoordsChange?: (coords: { lat: number; lng: number }) => void;
    onAddressChange?: (address: string, city: string, region?: string, barangay?: string) => void;
}> = ({ coords, onCoordsChange, onAddressChange }) => {
    const [isLocating, setIsLocating] = React.useState(false);
    const mapRef = React.useRef<HTMLDivElement>(null);
    const googleMapRef = React.useRef<any>(null);
    const markerRef = React.useRef<any>(null);

    const reverseGeocode = (lat: number, lng: number) => {
        if (!window.google) return;
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
            if (status === 'OK' && results && results.length > 0) {
                // Collect data from ALL results for best coverage
                let streetNum = '';
                let route = '';
                let city = '';
                let region = '';
                let barangay = '';

                for (const result of results) {
                    for (const comp of result.address_components) {
                        const types: string[] = comp.types;
                        if (!streetNum && types.includes('street_number')) streetNum = comp.long_name;
                        if (!route && types.includes('route')) route = comp.long_name;
                        if (!city && (types.includes('locality') || types.includes('administrative_area_level_2'))) city = comp.long_name;
                        if (!region && types.includes('administrative_area_level_1')) region = comp.long_name;
                        // Barangay: Google Maps PH uses various type combos
                        if (!barangay) {
                            if (types.includes('sublocality_level_1')
                                || types.includes('sublocality_level_2')
                                || types.includes('neighborhood')
                                || (types.includes('sublocality') && types.includes('political'))
                                || (types.includes('administrative_area_level_5'))
                                || (types.includes('administrative_area_level_4'))
                            ) {
                                barangay = comp.long_name;
                            }
                        }
                    }
                    // Stop early if we have everything
                    if (streetNum && route && city && region && barangay) break;
                }

                // Also try: look for a result whose types include 'sublocality_level_1' directly
                if (!barangay) {
                    const brgyResult = results.find((r: any) =>
                        r.types.includes('sublocality_level_1')
                        || r.types.includes('neighborhood')
                        || r.types.includes('administrative_area_level_5')
                    );
                    if (brgyResult) {
                        barangay = brgyResult.address_components[0]?.long_name || '';
                    }
                }

                const streetAddress = `${streetNum} ${route}`.trim();
                if (onAddressChange) onAddressChange(
                    streetAddress || results[0].formatted_address.split(',')[0],
                    city,
                    region,
                    barangay
                );
            }
        });
    };

    const handlePinToGPS = () => {
        if (!navigator.geolocation) { alert('Geolocation is not supported'); return; }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const newCoords = { lat: position.coords.latitude, lng: position.coords.longitude };
                if (onCoordsChange) onCoordsChange(newCoords);
                reverseGeocode(newCoords.lat, newCoords.lng);
                setIsLocating(false);
            },
            () => { alert('Could not get your location.'); setIsLocating(false); },
            { enableHighAccuracy: true }
        );
    };

    useEffect(() => {
        if (mapRef.current && window.google) {
            if (!googleMapRef.current) {
                googleMapRef.current = new window.google.maps.Map(mapRef.current, {
                    center: coords || { lat: 14.5995, lng: 120.9842 },
                    zoom: 15,
                    disableDefaultUI: true,
                    zoomControl: true,
                    gestureHandling: 'greedy',
                    styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }]
                });
                googleMapRef.current.addListener('click', (e: any) => {
                    const lat = e.latLng.lat();
                    const lng = e.latLng.lng();
                    if (onCoordsChange) onCoordsChange({ lat, lng });
                    reverseGeocode(lat, lng);
                });
                markerRef.current = new window.google.maps.Marker({
                    position: coords,
                    map: googleMapRef.current,
                    draggable: true,
                    icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: '#3b82f6', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }
                });
                markerRef.current.addListener('dragend', () => {
                    const p = markerRef.current.getPosition();
                    if (onCoordsChange) onCoordsChange({ lat: p.lat(), lng: p.lng() });
                    reverseGeocode(p.lat(), p.lng());
                });
            } else if (coords) {
                const mp = markerRef.current.getPosition();
                const dist = mp ? (Math.abs(mp.lat() - coords.lat) + Math.abs(mp.lng() - coords.lng)) : 1;
                if (dist > 0.0001) {
                    googleMapRef.current.panTo(coords);
                    markerRef.current.setPosition(coords);
                    markerRef.current.setVisible(true);
                }
            }
        }
    }, [coords]);

    return (
        <div className="w-full h-full relative">
            <div ref={mapRef} className="w-full h-full" />
            <button type="button" onClick={handlePinToGPS} disabled={isLocating}
                className="absolute right-4 top-4 bg-white p-3 rounded-2xl shadow-xl border border-slate-100 text-slate-900 hover:bg-slate-900 hover:text-white transition-all active:scale-95 group z-10"
                title="Use current GPS location">
                {isLocating ? <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div> : <Target size={20} />}
            </button>
        </div>
    );
};

export default LocationsList;
