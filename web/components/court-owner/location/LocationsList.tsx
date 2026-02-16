import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin, Plus, LayoutGrid, List, X, Search, ChevronRight, Clock, Trash2, Target, Phone, FileText, Camera, Image, Check, ChevronDown, Sparkles, Pencil, Loader2, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { uploadCourtImage } from '../../../services/locations';
import { Location, LocationClosure, LocationClosureReason } from '../../../types';

declare global {
    interface Window {
        google: any;
    }
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
    const navigate = useNavigate();

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
    const [formStatus, setFormStatus] = useState<'Active' | 'Closed' | 'Maintenance' | 'Coming Soon'>('Active');

    // Amenities dropdown state (for Add/Edit Location form)
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [allKnownAmenities, setAllKnownAmenities] = useState<string[]>([]);
    const [amenitySearch, setAmenitySearch] = useState('');
    const [isAmenityDropdownOpen, setIsAmenityDropdownOpen] = useState(false);
    const amenityDropdownRef = React.useRef<HTMLDivElement>(null);

    // Master amenities modal state
    const [isMasterAmenitiesOpen, setIsMasterAmenitiesOpen] = useState(false);
    const [masterAmenities, setMasterAmenities] = useState<{ id: string; name: string }[]>([]);
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

    // Operation hours state
    const [formOpeningTime, setFormOpeningTime] = useState('08:00');
    const [formClosingTime, setFormClosingTime] = useState('18:00');

    // Location closures calendar state (Edit only)
    const [closures, setClosures] = useState<LocationClosure[]>([]);
    const [closureCalendarMonth, setClosureCalendarMonth] = useState(new Date());
    const [selectedClosureDate, setSelectedClosureDate] = useState<string | null>(null);
    const [closureReason, setClosureReason] = useState<LocationClosureReason>('Holiday');
    const [closureDescription, setClosureDescription] = useState('');
    const [isSavingClosure, setIsSavingClosure] = useState(false);

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
        fetchLocations();
        fetchMasterAmenities();
    }, []);

    const fetchLocations = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) return;

            // Fetch locations with court count
            const { data, error } = await supabase
                .from('locations')
                .select('*, courts(id)')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false });

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
        setFormStatus('Active');
        setFormOpeningTime('08:00');
        setFormClosingTime('18:00');
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
        setIsSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // 1. Handle image upload if exists
            let imageUrl = null;
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
                    is_active: true,
                    image_url: imageUrl,
                    court_type: formCourtType,
                    opening_time: formOpeningTime,
                    closing_time: formClosingTime
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
        if (!editingLocation) return;
        setIsSubmitting(true);
        try {
            // 1. Handle image upload if exists
            let imageUrl = editingLocation.image_url;
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
                    is_active: formStatus === 'Active',
                    opening_time: formOpeningTime,
                    closing_time: formClosingTime
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
        if (!confirm('Are you sure? This will delete this location and ALL courts within it. This cannot be undone.')) return;
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
        if (!editingLocation) return;
        try {
            await supabase.from('location_closures').delete().eq('id', closureId);
            await fetchClosures(editingLocation.id);
        } catch (err) { console.error('Error removing closure:', err); }
    };

    const openEditModal = (loc: Location) => {
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
        setFormOpeningTime(loc.opening_time || '08:00');
        setFormClosingTime(loc.closing_time || '18:00');
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

    const filteredLocations = locations.filter(loc =>
        loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.city.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalCourts = locations.reduce((sum, loc) => sum + (loc.court_count || 0), 0);

    // Shared form JSX
    const renderForm = (onSubmit: (e: React.FormEvent) => void, isEdit: boolean) => (
        <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Left Column: Image & Form Fields */}
            <div className="space-y-6">

                {/* Image Upload */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 px-1">Location Image</label>
                    <div className="relative group">
                        <div className={`w-full h-40 rounded-[32px] border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center overflow-hidden bg-slate-50 ${formImagePreview ? 'border-amber-200 shadow-xl' : 'border-slate-100 hover:border-amber-300 hover:bg-amber-50/30'}`}>
                            {formImagePreview ? (
                                <>
                                    <img src={formImagePreview} alt="Preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                        <div className="bg-white/90 p-4 rounded-2xl shadow-xl flex items-center gap-2 scale-90 group-hover:scale-100 transition-transform">
                                            <Camera size={20} className="text-amber-500" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Change Photo</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    <div className="w-12 h-12 bg-white rounded-2xl shadow-lg border border-slate-50 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                                        <Image size={24} className="text-slate-200 group-hover:text-amber-400 transition-colors" />
                                    </div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">Click to upload <span className="text-amber-500 text-[10px]">location image</span></p>
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
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Venue Name</label>
                    <input required type="text" value={formName} onChange={e => setFormName(e.target.value)}
                        placeholder="e.g. Manila Sports Complex"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Region Dropdown */}
                    <div className="space-y-2 col-span-2" ref={regionDropdownRef}>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Region</label>
                        <div className="relative">
                            <div
                                onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 cursor-pointer flex items-center justify-between hover:border-amber-200 transition-colors"
                            >
                                <input
                                    type="text"
                                    value={isRegionDropdownOpen ? regionSearch : formRegion}
                                    onChange={e => { setRegionSearch(e.target.value); setIsRegionDropdownOpen(true); }}
                                    onFocus={() => setIsRegionDropdownOpen(true)}
                                    placeholder="Select region..."
                                    className="bg-transparent outline-none font-bold text-sm flex-1 w-full"
                                    readOnly={false}
                                />
                                {isLoadingRegions ? (
                                    <Loader2 size={16} className="text-amber-500 animate-spin shrink-0" />
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
                                                className={`w-full text-left px-5 py-3 hover:bg-amber-50 transition-colors font-bold text-sm flex items-center gap-3 ${formRegion === r.name ? 'text-amber-600 bg-amber-50/50' : 'text-slate-700'}`}
                                            >
                                                {formRegion === r.name && <Check size={14} className="text-amber-500 shrink-0" />}
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">City / Municipality</label>
                        <div className="relative">
                            <div
                                onClick={() => { if (selectedRegionCode) setIsCityDropdownOpen(!isCityDropdownOpen); }}
                                className={`w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 flex items-center justify-between transition-colors ${selectedRegionCode ? 'cursor-pointer hover:border-amber-200' : 'opacity-50 cursor-not-allowed'}`}
                            >
                                <input
                                    type="text"
                                    value={isCityDropdownOpen ? citySearch : formCity}
                                    onChange={e => { setCitySearch(e.target.value); setIsCityDropdownOpen(true); }}
                                    onFocus={() => { if (selectedRegionCode) setIsCityDropdownOpen(true); }}
                                    placeholder={selectedRegionCode ? 'Select city...' : 'Select region first'}
                                    className="bg-transparent outline-none font-bold text-sm flex-1 w-full"
                                    disabled={!selectedRegionCode}
                                />
                                {isLoadingCities ? (
                                    <Loader2 size={16} className="text-amber-500 animate-spin shrink-0" />
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
                                                className={`w-full text-left px-5 py-3 hover:bg-amber-50 transition-colors font-bold text-sm flex items-center gap-3 ${formCity === c.name ? 'text-amber-600 bg-amber-50/50' : 'text-slate-700'}`}
                                            >
                                                {formCity === c.name && <Check size={14} className="text-amber-500 shrink-0" />}
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Phone</label>
                        <input type="tel" value={formPhone} onChange={e => setFormPhone(e.target.value)}
                            placeholder="09XX XXX XXXX"
                            className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
                    </div>
                </div>

                {/* Barangay Dropdown */}
                <div className="space-y-2" ref={barangayDropdownRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Barangay</label>
                    <div className="relative">
                        <div
                            onClick={() => { if (selectedCityCode) setIsBarangayDropdownOpen(!isBarangayDropdownOpen); }}
                            className={`w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 flex items-center justify-between transition-colors ${selectedCityCode ? 'cursor-pointer hover:border-amber-200' : 'opacity-50 cursor-not-allowed'}`}
                        >
                            <input
                                type="text"
                                value={isBarangayDropdownOpen ? barangaySearch : formBarangay}
                                onChange={e => { setBarangaySearch(e.target.value); setIsBarangayDropdownOpen(true); }}
                                onFocus={() => { if (selectedCityCode) setIsBarangayDropdownOpen(true); }}
                                placeholder={selectedCityCode ? 'Select barangay...' : 'Select city first'}
                                className="bg-transparent outline-none font-bold text-sm flex-1 w-full"
                                disabled={!selectedCityCode}
                            />
                            {isLoadingBarangays ? (
                                <Loader2 size={16} className="text-amber-500 animate-spin shrink-0" />
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
                                            className={`w-full text-left px-5 py-3 hover:bg-amber-50 transition-colors font-bold text-sm flex items-center gap-3 ${formBarangay === b.name ? 'text-amber-600 bg-amber-50/50' : 'text-slate-700'}`}
                                        >
                                            {formBarangay === b.name && <Check size={14} className="text-amber-500 shrink-0" />}
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

                {/* Court Type Selector */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Court Type</label>
                    <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 gap-1 shadow-inner h-[54px]">
                        {['Indoor', 'Outdoor', 'Both'].map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormCourtType(type as any)}
                                className={`flex-1 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all duration-300 ${formCourtType === type
                                    ? 'bg-white text-amber-500 shadow-lg shadow-amber-100/50'
                                    : 'text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {type}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Location Status Selector */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Location Status</label>
                    <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100 gap-1 shadow-inner h-[54px]">
                        {(['Active', 'Closed', 'Maintenance', 'Coming Soon'] as const).map((s) => (
                            <button
                                key={s}
                                type="button"
                                onClick={() => setFormStatus(s)}
                                className={`flex-1 rounded-xl font-black text-[8px] uppercase tracking-widest transition-all duration-300 ${
                                    formStatus === s
                                        ? s === 'Active' ? 'bg-white text-emerald-500 shadow-lg shadow-emerald-100/50'
                                        : s === 'Closed' ? 'bg-white text-rose-500 shadow-lg shadow-rose-100/50'
                                        : s === 'Maintenance' ? 'bg-white text-amber-500 shadow-lg shadow-amber-100/50'
                                        : 'bg-white text-blue-500 shadow-lg shadow-blue-100/50'
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Operation Hours */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Operation Hours</label>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-emerald-500 uppercase tracking-widest">Open</div>
                            <select
                                value={formOpeningTime}
                                onChange={e => setFormOpeningTime(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-16 pr-4 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm appearance-none cursor-pointer"
                            >
                                {Array.from({ length: 24 }, (_, i) => {
                                    const h = i.toString().padStart(2, '0');
                                    const label = i === 0 ? '12:00 AM' : i < 12 ? `${i.toString().padStart(2, '0')}:00 AM` : i === 12 ? '12:00 PM' : `${(i - 12).toString().padStart(2, '0')}:00 PM`;
                                    return <option key={h} value={`${h}:00`}>{label}</option>;
                                })}
                            </select>
                        </div>
                        <span className="text-slate-300 font-black text-xs">to</span>
                        <div className="flex-1 relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-rose-400 uppercase tracking-widest">Close</div>
                            <select
                                value={formClosingTime}
                                onChange={e => setFormClosingTime(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-16 pr-4 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm appearance-none cursor-pointer"
                            >
                                {Array.from({ length: 24 }, (_, i) => {
                                    const h = i.toString().padStart(2, '0');
                                    const label = i === 0 ? '12:00 AM' : i < 12 ? `${i.toString().padStart(2, '0')}:00 AM` : i === 12 ? '12:00 PM' : `${(i - 12).toString().padStart(2, '0')}:00 PM`;
                                    return <option key={h} value={`${h}:00`}>{label}</option>;
                                })}
                            </select>
                        </div>
                    </div>
                    <p className="text-[9px] text-slate-400 ml-4">
                        <Clock size={10} className="inline mr-1 -mt-0.5" />
                        Only time slots within these hours will be available for booking.
                    </p>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Street Address</label>
                    <input required type="text" value={formAddress} onChange={e => setFormAddress(e.target.value)}
                        placeholder="e.g. 123 Rizal Street"
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm" />
                    {(formAddress || formBarangay || formCity || formRegion) && (
                        <p className="text-[9px] text-slate-400 ml-4 mt-1">
                            <span className="font-black text-amber-500">Full Address: </span>
                            {[formAddress, formBarangay, formCity, formRegion].filter(Boolean).join(', ')}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Description</label>
                    <textarea value={formDescription} onChange={e => setFormDescription(e.target.value)}
                        placeholder="Brief description of your venue..."
                        rows={3}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 outline-none focus:ring-4 focus:ring-amber-500/10 font-bold text-sm resize-none" />
                </div>


                <div className="space-y-2" ref={amenityDropdownRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Amenities</label>

                    {/* Selected amenities tags */}
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

                    {/* Dropdown trigger / search */}
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
                                className="bg-transparent outline-none font-bold text-sm flex-1 w-full"
                            />
                            <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${isAmenityDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {/* Dropdown list */}
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

            {/* Right Column: Map & Submit */}
            <div className="flex flex-col h-full">
                <div className="flex-1 space-y-4">
                    <div className="flex justify-between items-center ml-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location Verification</label>
                        {isGeocoding && <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>}
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
                </div>

                {/* ──── Location Closures Calendar (Edit Only) ──── */}
                {isEdit && (
                    <div className="mt-6 space-y-4">
                        <div className="flex items-center gap-2 ml-4">
                            <Calendar size={14} className="text-amber-500" />
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Schedule Closures</label>
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
                                                className={`aspect-square rounded-lg text-[11px] font-bold transition-all relative ${
                                                    isPast
                                                        ? 'text-slate-200 cursor-not-allowed'
                                                    : closure
                                                        ? closure.reason === 'Tournament'
                                                            ? 'bg-blue-500 text-white shadow-md shadow-blue-200/50'
                                                            : closure.reason === 'Holiday'
                                                                ? 'bg-rose-500 text-white shadow-md shadow-rose-200/50'
                                                                : closure.reason === 'Maintenance'
                                                                    ? 'bg-amber-500 text-white shadow-md shadow-amber-200/50'
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
                                    { color: 'bg-amber-500', label: 'Maintenance' },
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
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                                                        closureReason === r
                                                            ? r === 'Holiday' ? 'bg-rose-500 text-white shadow-md'
                                                            : r === 'Tournament' ? 'bg-blue-500 text-white shadow-md'
                                                            : r === 'Maintenance' ? 'bg-amber-500 text-white shadow-md'
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
                                            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 px-4 outline-none font-bold text-xs focus:ring-2 focus:ring-amber-500/20"
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
                                            className="flex-[2] py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all disabled:bg-slate-200"
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
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                                                        c.reason === 'Holiday' ? 'bg-rose-500'
                                                        : c.reason === 'Tournament' ? 'bg-blue-500'
                                                        : c.reason === 'Maintenance' ? 'bg-amber-500'
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
                        className={`${isEdit ? 'flex-[2]' : 'w-full'} h-16 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-amber-500 transition-all shadow-xl shadow-slate-200 disabled:bg-slate-200 active:scale-95`}>
                        {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Location'}
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
                    <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-2">COURT OWNER / 2025</p>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">My Locations</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Manage your venues and courts in one place.</p>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => setViewMode('grid')}
                        className={`px-5 py-3 border rounded-xl transition-all ${viewMode === 'grid' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}>
                        <LayoutGrid size={20} />
                    </button>
                    <button onClick={() => setViewMode('list')}
                        className={`px-5 py-3 border rounded-xl transition-all ${viewMode === 'list' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'}`}>
                        <List size={20} />
                    </button>
                    <button onClick={() => { setIsMasterAmenitiesOpen(true); setNewMasterAmenity(''); setEditingMasterIdx(null); }}
                        className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 ml-2 flex items-center gap-2">
                        <Sparkles size={16} /> Amenities
                    </button>
                    <button onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                        className="px-8 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 flex items-center gap-2">
                        <Plus size={16} /> Add Location
                    </button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard label="Total Locations" count={locations.length.toString()} subtext="Active venues" />
                <MetricCard label="Total Courts" count={totalCourts.toString()} subtext="Across all locations" color="text-blue-600" />
                <MetricCard label="Active" count={locations.filter(l => l.is_active).length.toString()} subtext="Ready for bookings" color="text-emerald-500" />
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search locations..."
                    className="w-full bg-white border border-slate-200 rounded-2xl py-3.5 pl-14 pr-6 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
            </div>

            {/* Location Cards */}
            {isLoading ? (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {Array(3).fill(0).map((_, i) => (
                        <div key={i} className="bg-white rounded-[40px] border border-slate-100 animate-pulse h-72"></div>
                    ))}
                </div>
            ) : filteredLocations.length > 0 ? (
                <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {filteredLocations.map(loc => (
                        <LocationCard
                            key={loc.id}
                            location={loc}
                            viewMode={viewMode}
                            onView={() => navigate(`/locations/${loc.id}`)}
                            onEdit={() => openEditModal(loc)}
                        />
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-white rounded-[48px] border border-dashed border-slate-200">
                    <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                    <h3 className="text-xl font-black text-slate-400 uppercase tracking-tighter">No locations found</h3>
                    <p className="text-slate-400 text-sm font-medium mb-6">Add your first location to start managing courts.</p>
                    <button onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                        className="px-8 py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 inline-flex items-center gap-2">
                        <Plus size={16} /> Add Your First Location
                    </button>
                </div>
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
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center shrink-0">
                        <MapPin size={24} className="text-amber-500" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-black text-slate-900 tracking-tight uppercase truncate group-hover:text-amber-500 transition-colors">{location.name}</h3>
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
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                        (location.status || (location.is_active ? 'Active' : 'Closed')) === 'Active'
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                        : (location.status) === 'Closed'
                            ? 'bg-rose-50 border-rose-100 text-rose-600'
                        : (location.status) === 'Maintenance'
                            ? 'bg-amber-50 border-amber-100 text-amber-600'
                        : (location.status) === 'Coming Soon'
                            ? 'bg-blue-50 border-blue-100 text-blue-600'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}>
                        {location.status || (location.is_active ? 'Active' : 'Closed')}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-500 border border-slate-200 hover:border-amber-200 rounded-xl transition-all">
                        Edit
                    </button>
                    <ChevronRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
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
                ) : null}
                <div className="absolute top-4 right-4 flex gap-2">
                    <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border backdrop-blur-sm ${
                        (location.status || (location.is_active ? 'Active' : 'Closed')) === 'Active'
                            ? 'bg-emerald-50/90 border-emerald-100 text-emerald-600'
                        : (location.status) === 'Closed'
                            ? 'bg-rose-50/90 border-rose-100 text-rose-600'
                        : (location.status) === 'Maintenance'
                            ? 'bg-amber-50/90 border-amber-100 text-amber-600'
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
                <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase mb-1 group-hover:text-amber-500 transition-colors truncate">{location.name}</h3>
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
                        className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95 shadow-lg shadow-slate-200 flex items-center justify-center gap-2">
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
                    fillColor: '#f59e0b',
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
                    icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 14, fillColor: '#f59e0b', fillOpacity: 1, strokeColor: '#ffffff', strokeWeight: 3 }
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
