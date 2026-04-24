import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../src/lib/supabase';
import { uploadToCloudinary } from '../src/lib/api';
import { reverseGeocode } from '../src/lib/location';
import { ALL_SERVICES, EXPERIENCE_OPTIONS, DAYS_OF_WEEK, WINDOW_TINT_TYPES } from '../types';
import { BusinessHoursEditor } from '../src/components/BusinessHoursEditor';
import { useServiceManager } from '../src/hooks/useServiceManager';

// Photo slot type
interface PhotoSlot {
  url: string;
  file?: File;
}

// TikTok-only video link interface
interface VideoLink {
  id: string;
  platform: 'tiktok';
  url: string;
  videoId: string;
  alt_text: string;
}

// Wizard step types
type WizardStep = 'profile' | 'location' | 'business_hours' | 'services' | 'photos' | 'videos' | 'pricing' | 'complete';

interface StepConfig {
  id: WizardStep;
  title: string;
  description: string;
}

const STEPS: StepConfig[] = [
  { id: 'profile', title: 'Profile', description: 'Personal & Business Info' },
  { id: 'location', title: 'Location', description: 'Where you operate' },
  { id: 'business_hours', title: 'Hours', description: 'Operating hours' },
  { id: 'services', title: 'Services', description: 'What you offer' },
  { id: 'photos', title: 'Photos', description: 'Portfolio images' },
  { id: 'videos', title: 'Videos', description: 'TikTok showcases' },
  { id: 'pricing', title: 'Pricing', description: 'Additional notes' },
];

// Helper to extract TikTok video ID from URL
const extractVideoId = (url: string): string | null => {
  if (!url) return null;
  try {
    const patterns = [
      /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
      /tiktok\.com\/v\/(\d+)/,
      /vm\.tiktok\.com\/([a-zA-Z0-9_-]+)/,
      /vt\.tiktok\.com\/([a-zA-Z0-9_-]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
  } catch (e) {
    console.error('Error extracting video ID:', e);
  }
  return null;
};

// Helper to validate TikTok URL
const isValidTikTokUrl = (url: string): boolean => {
  return extractVideoId(url) !== null;
};

// Helper to get embed URL
const getEmbedUrl = (videoId: string): string => {
  return `https://www.tiktok.com/embed/v2/${videoId}`;
};

// LocalStorage keys for wizard persistence
const WIZARD_STORAGE_KEY = 'mekh_wizard_state';

interface ProfileFormData {
  first_name: string;
  last_name: string;
  business_name: string;
  bio: string;
  phone: string;
  area: string;
  experience_years: string;
  google_maps_link: string;
  pricing_notes: string;
  mobile_service: 'yes' | 'no' | 'both';
}

interface WizardState {
  currentStep: WizardStep;
  completedSteps: WizardStep[];
  technicianId: string | null;
  profileForm: ProfileFormData;
  selectedServices: string[];
  servicePrices: Record<string, { price: string; negotiable: boolean }>;
  serviceVariants: Record<string, Array<{ variant_name: string; price: string; negotiable: boolean }>>;
  windowTintPrices: Record<string, { price: string; negotiable: boolean }>;
  otherServices: string[];
  photoSlots: (PhotoSlot | null)[];
  videoLinks: VideoLink[];
  businessHours: { day_of_week: number; is_open: boolean; open_time: string | null; close_time: string | null; available_on_request: boolean }[];
}

const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('profile');
  const [completedSteps, setCompletedSteps] = useState<Set<WizardStep>>(new Set());
  const [technicianId, setTechnicianId] = useState<string | null>(null);

  // Save wizard state to localStorage
  const saveWizardState = () => {
    const state: WizardState = {
      currentStep,
      completedSteps: Array.from(completedSteps),
      technicianId,
      profileForm,
      selectedServices,
      servicePrices,
      serviceVariants,
      windowTintPrices,
      otherServices,
      photoSlots,
      videoLinks,
      businessHours,
    };
    try {
      localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Silent fail
    }
  };

  // Load wizard state from localStorage
  const loadWizardState = (): WizardState | null => {
    try {
      const saved = localStorage.getItem(WIZARD_STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as WizardState;
        return state;
      }
    } catch (e) {
      console.error('[WIZARD] Failed to load state:', e);
    }
    return null;
  };

  // Clear wizard state from localStorage
  const clearWizardState = () => {
    try {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
    } catch (e) {
      // Silent fail
    }
  };
  
  // User state - will be fetched from auth
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Profile form state
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    bio: '',
    phone: '',
    area: '',
    experience_years: '',
    google_maps_link: '',
    pricing_notes: '',
    mobile_service: 'no' as 'yes' | 'no' | 'both',
  });

  // Photo slots state - 6 fixed slots
  const [photoSlots, setPhotoSlots] = useState<(PhotoSlot | null)[]>(Array(6).fill(null));
  const [uploading, setUploading] = useState(false);

  // TikTok video links state - TikTok only, max 3
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>([]);
  // Track individual input values for each video slot for field-level isolation
  const [slotInputs, setSlotInputs] = useState<Record<number, string>>({});
  
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [resolvedLocationName, setResolvedLocationName] = useState<string>('');
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [manualAreaEntered, setManualAreaEntered] = useState(false);
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Services state
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [servicePrices, setServicePrices] = useState<Record<string, { price: string; negotiable: boolean }>>({});

  // Service variants state
  const [serviceVariants, setServiceVariants] = useState<Record<string, Array<{ variant_name: string; price: string; negotiable: boolean }>>>({});

  // Window Tinting sub-services state
  const [windowTintPrices, setWindowTintPrices] = useState<Record<string, { price: string; negotiable: boolean }>>({});
  
  // Other services state
  const [newOtherService, setNewOtherService] = useState('');
  const [otherServices, setOtherServices] = useState<string[]>([]);

  // Business hours state - initialized with all days closed
  const [businessHours, setBusinessHours] = useState<{ day_of_week: number; is_open: boolean; open_time: string | null; close_time: string | null; available_on_request: boolean }[]>(
    DAYS_OF_WEEK.map(day => ({
      day_of_week: day.value,
      is_open: false,
      open_time: null,
      close_time: null,
      available_on_request: false,
    }))
  );

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // Not authenticated - redirect to auth page
          navigate('/auth?redirect=join');
          return;
        }
        
        setUser(session.user);

        // Check if user already has a technician profile
        const { data: existingTech } = await supabase
          .from('technicians')
          .select('id, status')
          .eq('user_id', session.user.id)
          .single();

        if (existingTech) {
          console.log('[WIZARD] Existing technician found:', existingTech.id, existingTech.status);

          if (existingTech.status === 'live') {
            // Already live — redirect to their dashboard/profile
            clearWizardState();
            navigate(`/dashboard`); // or wherever your technician dashboard is
            return;
          }

          if (existingTech.status === 'pending') {
            // Already submitted — show waiting message instead of wizard
            clearWizardState();
            navigate('/join/pending'); // or setCurrentStep('complete')
            return;
          }

          // In-progress technician — restore with the CORRECT ID from DB
          // This overwrites any stale localStorage technicianId
          setTechnicianId(existingTech.id);

          const savedState = loadWizardState();
          if (savedState) {
            savedState.technicianId = existingTech.id; // force correct ID
            // ... restore rest of state
          }
        }

        // Try to restore wizard state from localStorage
        const savedState = loadWizardState();
        if (savedState) {
          console.log('[WIZARD] Restoring saved state:', savedState.currentStep);
          setCurrentStep(savedState.currentStep);
          setCompletedSteps(new Set(savedState.completedSteps));

          // Always use the DB-verified ID, never the one from localStorage
          // technicianId already set above from existingTech.id if exists

          setProfileForm(prev => ({ ...prev, ...savedState.profileForm }));
          setSelectedServices(savedState.selectedServices);
          setServicePrices(savedState.servicePrices);
          setServiceVariants(savedState.serviceVariants || {});
          setWindowTintPrices(savedState.windowTintPrices || {});
          setOtherServices(savedState.otherServices || []);
          setPhotoSlots(savedState.photoSlots);
          setVideoLinks(savedState.videoLinks);
          if (savedState.businessHours?.length > 0) {
            setBusinessHours(savedState.businessHours);
          }
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        navigate('/auth?redirect=join');
      } finally {
        setCheckingAuth(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

  // Auto-save wizard state when it changes
  useEffect(() => {
    if (!checkingAuth && user) {
      saveWizardState();
    }
  }, [currentStep, completedSteps, technicianId, checkingAuth, user]);

  // Auto-save form data when it changes
  useEffect(() => {
    if (!checkingAuth && user) {
      saveWizardState();
    }
  }, [profileForm, selectedServices, servicePrices, serviceVariants, windowTintPrices, otherServices, photoSlots, videoLinks, businessHours, checkingAuth, user]);

  // Extract coordinates from Google Maps link
  const extractCoordinates = () => {
    let lat: number | null = null;
    let lng: number | null = null;
    if (profileForm.google_maps_link) {
      // Try format: @lat,lng (e.g., https://maps.google.com/?@1.234567,-1.234567 or https://maps.google.com/maps?q=1.234567,-1.234567)
      let match = profileForm.google_maps_link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) {
        lat = parseFloat(match[1]);
        lng = parseFloat(match[2]);
      } else {
        // Try format: ?q=lat,lng (e.g., https://maps.google.com/?q=1.234567,-1.234567)
        match = profileForm.google_maps_link.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
          lat = parseFloat(match[1]);
          lng = parseFloat(match[2]);
        }
      }
    }
    return { lat, lng };
  };

  // Handle reverse geocoding for coordinates
  const handleReverseGeocode = async (lat: number, lng: number): Promise<string> => {
    setGeocodingLoading(true);
    try {
      console.log('[GEOCODE] Starting reverse geocoding for:', lat, lng);
      const locationName = await reverseGeocode(lat, lng);
      console.log('[GEOCODE] Received location name:', locationName);
      
      if (locationName && locationName !== 'Kenya') {
        setResolvedLocationName(locationName);
        // Auto-fill the area field with the resolved location name
        // Only if the user hasn't manually entered an area (checked via state flag)
        if (!manualAreaEntered && (!profileForm.area || profileForm.area.trim() === '')) {
          setProfileForm(prev => ({ ...prev, area: locationName }));
        } else if (manualAreaEntered) {
          console.log('[GEOCODE] Keeping manual area entry:', profileForm.area);
        }
        return locationName;
      } else {
        // Even if we got 'Kenya' as fallback, don't overwrite manual entry
        console.log('[GEOCODE] Using fallback location, not overwriting manual entry');
        return '';
      }
    } catch (err) {
      console.error('[GEOCODE] Reverse geocoding error:', err);
      // Don't show error to user - just log it
      return '';
    } finally {
      setGeocodingLoading(false);
    }
  };

  // Handle reverse geocoding when Google Maps link changes (with debounce)
  useEffect(() => {
    // Clear any existing timeout
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }
    
    // Debounce the geocoding to avoid too many API calls
    geocodeTimeoutRef.current = setTimeout(() => {
      const { lat, lng } = extractCoordinates();
      
      // Only geocode if we have valid coordinates and haven't already geocoded this location
      if (lat !== null && lng !== null && !geocodingLoading) {
        console.log('[GEOCODE] Google Maps link changed, triggering reverse geocode:', lat, lng);
        handleReverseGeocode(lat, lng);
      }
    }, 1500); // 1.5 second debounce
    
    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, [profileForm.google_maps_link]);

  // Clear saved state on successful completion
  useEffect(() => {
    if (currentStep === 'complete') {
      clearWizardState();
    }
  }, [currentStep]);

  // Show loading while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 py-8 px-4 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // No user - don't render anything (redirect will happen)
  if (!user) {
    return null;
  }

  // Get current step index
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);

  // Service toggle handler
  const handleServiceToggle = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
      const newPrices = { ...servicePrices };
      delete newPrices[service];
      setServicePrices(newPrices);
    } else {
      if (selectedServices.length >= 4) {
        setError('Maximum of 4 services allowed');
        setTimeout(() => setError(''), 3000);
        return;
      }
      setSelectedServices([...selectedServices, service]);
      setServicePrices({ ...servicePrices, [service]: { price: '', negotiable: true } });
    }
  };

  // Other services handlers
  const handleAddOtherService = () => {
    const service = newOtherService.trim();
    if (!service) return;
    
    if (selectedServices.includes(service)) {
      setError('This service is already selected');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    if (selectedServices.length >= 4) {
      setError('Maximum of 4 services allowed');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    setSelectedServices([...selectedServices, service]);
    setServicePrices({ ...servicePrices, [service]: { price: '', negotiable: true } });
    setOtherServices([...otherServices, service]);
    setNewOtherService('');
  };

  const handleRemoveOtherService = (service: string) => {
    setSelectedServices(selectedServices.filter(s => s !== service));
    setOtherServices(otherServices.filter(s => s !== service));
    const newPrices = { ...servicePrices };
    delete newPrices[service];
    setServicePrices(newPrices);
    // Also remove variants
    const newVariants = { ...serviceVariants };
    delete newVariants[service];
    setServiceVariants(newVariants);
  };

  const handleAddVariant = (serviceName: string) => {
    const currentVariants = serviceVariants[serviceName] || [];
    setServiceVariants({
      ...serviceVariants,
      [serviceName]: [...currentVariants, { variant_name: '', price: '', negotiable: false }]
    });
  };

  const handleUpdateVariant = (serviceName: string, variantIndex: number, field: string, value: string | boolean) => {
    const currentVariants = serviceVariants[serviceName] || [];
    const updatedVariants = [...currentVariants];
    (updatedVariants[variantIndex] as any)[field] = value;
    setServiceVariants({
      ...serviceVariants,
      [serviceName]: updatedVariants
    });
  };

  const handleRemoveVariant = (serviceName: string, variantIndex: number) => {
    const currentVariants = serviceVariants[serviceName] || [];
    const updatedVariants = currentVariants.filter((_, i) => i !== variantIndex);
    setServiceVariants({
      ...serviceVariants,
      [serviceName]: updatedVariants
    });
  };

  // Photo upload handlers
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const url = await uploadToCloudinary(file, 'technicians/portfolio');
      const newSlots = [...photoSlots];
      newSlots[index] = { url, file };
      setPhotoSlots(newSlots);
    } catch (err: any) {
      setError(err.message || 'Failed to upload photo');
      setTimeout(() => setError(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const newSlots = [...photoSlots];
    newSlots[index] = null;
    setPhotoSlots(newSlots);
  };

  const getFilledSlotsCount = () => {
    return photoSlots.filter(slot => slot !== null).length;
  };

  // TikTok video link handlers
  const getVideoCount = () => {
    return videoLinks.length;
  };

  const addVideoLink = (urlParam?: string) => {
    const url = (urlParam || '').trim();
    if (!url) return;
    
    const currentCount = videoLinks.length;
    if (currentCount >= 3) {
      setError('Maximum of 3 video links allowed');
      return;
    }
    
    const videoId = extractVideoId(url);
    if (!videoId) {
      setError('Invalid TikTok URL. Please enter a valid TikTok video link.');
      return;
    }
    
    const newVideo: VideoLink = {
      id: Date.now().toString(),
      platform: 'tiktok',
      url,
      videoId,
      alt_text: ''
    };

    setVideoLinks([...videoLinks, newVideo]);
    setError('');
  };

  const removeVideoLink = (id: string) => {
    setVideoLinks(videoLinks.filter(v => v.id !== id));
  };

  // Handle geolocation to get current position and fill coordinates
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setTimeout(() => setLocationError(''), 3000);
      return;
    }

    setLocationLoading(true);
    setLocationError('');
    setResolvedLocationName('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Fill the coordinates directly into the location field
        // Only update google_maps_link - preserve the area name if already entered
        setProfileForm({ 
          ...profileForm, 
          google_maps_link: `https://maps.google.com/?q=${latitude},${longitude}`
          // Do NOT overwrite area - keep user's manual entry or leave empty for them to fill
        });
        setLocationLoading(false);
        
        // Now reverse geocode the coordinates to get the place name
        await handleReverseGeocode(latitude, longitude);
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access or enter manually.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information is unavailable. Please enter manually.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again or enter manually.');
            break;
          default:
            setLocationError('An unknown error occurred. Please enter location manually.');
        }
        setTimeout(() => setLocationError(''), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Generate unique slug
  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36);
  };

  // Step 1: Save Profile Details
  const saveProfileStep = async (): Promise<boolean> => {
    const missingFields: string[] = [];
    if (!profileForm.first_name) missingFields.push('first_name');
    if (!profileForm.last_name) missingFields.push('last_name');
    if (!profileForm.business_name) missingFields.push('business_name');
    if (!profileForm.phone) missingFields.push('phone');
    if (!profileForm.experience_years) missingFields.push('experience_years');
    if (!profileForm.area) missingFields.push('area');
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      setTimeout(() => setError(''), 5000);
      return false;
    }

    setSaving(true);
    setError('');

    try {
      const baseSlug = generateSlug(profileForm.business_name);
      let uniqueSlug = baseSlug;
      let counter = 1;
      while (true) {
        const { data, error } = await supabase
          .from('technicians')
          .select('id')
          .eq('slug', uniqueSlug)
          .single();
        if (error && error.code === 'PGRST116') { // No rows found
          break;
        }
        if (data) {
          uniqueSlug = `${baseSlug}-${counter}`;
          counter++;
        } else {
          break;
        }
      }
      console.log('[WIZARD] Generated unique slug:', uniqueSlug);
      const slug = uniqueSlug;
      const userEmail = user.email;
      
      if (!userEmail) {
        throw new Error('Unable to get your email from authentication. Please sign out and sign in again.');
      }

      console.log('[WIZARD] Starting profile insert with data:', {
        user_id: user.id,
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        business_name: profileForm.business_name,
        phone: profileForm.phone,
        email: userEmail,
        experience_years: profileForm.experience_years,
        area: profileForm.area,
        slug,
      });

      // Ensure we have default values for required fields
      const insertData = {
        user_id: user.id,
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        business_name: profileForm.business_name,
        bio: profileForm.bio || '',
        phone: profileForm.phone,
        email: userEmail,
        experience_years: profileForm.experience_years || '1-2 years',
        area: profileForm.area?.trim() ? profileForm.area : 'Nairobi',
        slug,
        status: 'live',
      };

      console.log('[WIZARD] User ID from auth:', user.id);
      console.log('[WIZARD] Insert data being sent:', insertData);

      // Wrap insert with a timeout so the UI never hangs if Supabase stalls
      type ProfileInsertResult = { data: any | null; error: any };
      const insertQuery = supabase
        .from('technicians')
        .insert(insertData)
        .select()
        .single()
        .then((result): Promise<ProfileInsertResult> => Promise.resolve({ data: result.data, error: result.error }));
      
      const insertTimeout = new Promise<ProfileInsertResult>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Profile save timed out. Please check your connection and try again.') }), 30000)
      );

      const { data: technician, error: techError } = await Promise.race([insertQuery, insertTimeout]);

      console.log('[WIZARD] Profile insert result:', { technician, techError });

      if (techError) {
        console.error('Profile insert error:', techError);
        throw new Error(techError.message || 'Failed to insert profile');
      }

      if (!technician) {
        throw new Error('No data returned from insert');
      }

      setTechnicianId(technician.id);

      // Update profile role to 'technician'
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'technician' })
        .eq('id', user.id);

      if (roleError) {
        console.warn('[WIZARD] Could not update profile role:', roleError);
        // Non-fatal — don't block the wizard
      }

      return true;
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to save profile. Check console for details.');
      setTimeout(() => setError(''), 5000);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Step 2: Save Location & Experience
  const saveLocationStep = async (): Promise<boolean> => {
    if (!technicianId) {
      setError('Please complete the profile section first');
      return false;
    }

    if (!profileForm.area) {
      setError('Please fill in your area/location');
      setTimeout(() => setError(''), 5000);
      return false;
    }

    setSaving(true);
    setError('');

    try {
      const { lat, lng } = extractCoordinates();

      // Update location fields in the database
      const { error: updateError } = await supabase
        .from('technicians')
        .update({
          area: profileForm.area,
          mobile_service: profileForm.mobile_service,
          google_maps_link: profileForm.google_maps_link || null,
          latitude: lat,
          longitude: lng,
        })
        .eq('id', technicianId);

      if (updateError) {
        console.error('Location update error:', updateError);
        throw updateError;
      }

      return true;
    } catch (err: any) {
      console.error('Error saving location:', err);
      setError(err.message || 'Failed to save location');
      setTimeout(() => setError(''), 5000);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Step 3: Save Services
  const saveServicesStep = async (): Promise<boolean> => {
    console.log('Starting saveServicesStep, technicianId:', technicianId);
    if (!technicianId) {
      setError('Please complete previous sections first');
      return false;
    }

    if (selectedServices.length === 0) {
      setError('Please select at least one service');
      setTimeout(() => setError(''), 3000);
      return false;
    }

    setSaving(true);
    setError('');

    try {
      console.log('Deleting existing services for technicianId:', technicianId);
      // Delete existing services and insert new ones
      const { error: deleteError } = await supabase
        .from('technician_services')
        .delete()
        .eq('technician_id', technicianId);

      if (deleteError) {
        console.error('Delete services error:', deleteError);
        throw new Error(`Failed to clear existing services: ${deleteError.message}`);
      }
      console.log('Delete completed successfully');

      // Prepare services for upsert (since all new, will insert)
      const servicesToUpsert = [];
      for (const serviceName of selectedServices) {
        let priceData = servicePrices[serviceName];

        // Check if service has variants (Window Tinting always has tint types, or custom variants)
        const hasVariants = serviceName === 'Window Tinting' || (serviceVariants[serviceName] || []).length > 0;

        let price = null;
        if (!hasVariants && priceData?.price) {
          const parsed = parseInt(priceData.price);
          price = !isNaN(parsed) ? parsed : null;
        }

        servicesToUpsert.push({
          technician_id: technicianId,
          service_name: serviceName,
          price: price,
          negotiable: hasVariants ? false : (priceData?.negotiable || false),
        });
      }

      console.log('servicesToUpsert:', servicesToUpsert);

      // Insert all services at once
      const { data: savedServices, error: upsertError } = await supabase
        .from('technician_services')
        .insert(servicesToUpsert)
        .select();

      console.log('Insert result:', { data: savedServices, error: upsertError });

      if (upsertError) {
        console.error('Upsert services error:', upsertError);
        throw upsertError;
      }

      if (!savedServices) throw new Error('Failed to insert services');

      console.log('Services inserted, savedServices length:', savedServices.length);

      // Map service names to IDs
      const serviceIdMap: Record<string, string> = {};
      savedServices.forEach(s => {
        serviceIdMap[s.service_name] = s.id;
      });

      console.log('Service ID map:', serviceIdMap);

      // Collect ALL variants from ALL services, not just Window Tinting
      const allVariants: { service_id: string; variant_name: string; price: number | null; is_negotiable: boolean }[] = [];

      savedServices.forEach(savedService => {
        const serviceId = savedService.id;
        const serviceName = savedService.service_name;

        // Handle Window Tinting variants from windowTintPrices
        if (serviceName === 'Window Tinting') {
          WINDOW_TINT_TYPES.forEach(tintType => {
            const tintPriceData = windowTintPrices[tintType.name];
            const price = tintPriceData?.price ? parseInt(tintPriceData.price) : null;
            if (price && !isNaN(price)) {
              allVariants.push({
                service_id: serviceId,
                variant_name: tintType.name,
                price: price,
                is_negotiable: tintPriceData.negotiable || false
              });
            }
          });
        }

        // Handle custom variants from serviceVariants for all services
        const variants = serviceVariants[serviceName] || [];
        variants.forEach(variant => {
          if (variant.variant_name.trim()) {
            const price = variant.price ? parseInt(variant.price) : null;
            allVariants.push({
              service_id: serviceId,
              variant_name: variant.variant_name.trim(),
              price: price && !isNaN(price) ? price : null,
              is_negotiable: variant.negotiable
            });
          }
        });
      });

      console.log('allVariants:', allVariants);

      // Batch insert ALL variants at once
      if (allVariants.length > 0) {
        const { error: variantError } = await supabase
          .from('service_variants')
          .insert(allVariants);

        if (variantError) {
          console.error('[SERVICES SAVE] Variants insert error:', variantError);
          throw variantError;
        }
        console.log('Variants inserted successfully');
      } else {
        console.log('No variants to insert');
      }

      console.log('saveServicesStep completed successfully');
      return true;
    } catch (err: any) {
      console.error('Error saving services:', err);
      console.error('Error details:', err.details, err.hint, err.code);
      setError(err.message || 'Failed to save services');
      setTimeout(() => setError(''), 5000);
      return false;
    } finally {
      console.log('Finally block: setting saving to false');
      setSaving(false);
    }
  };

  // Step 4: Save Photos
  const savePhotosStep = async (): Promise<boolean> => {
    if (!technicianId) {
      setError('Please complete previous sections first');
      return false;
    }

    const filledSlots = getFilledSlotsCount();
    if (filledSlots < 2) {
      setError('Please upload at least 2 portfolio photos');
      setTimeout(() => setError(''), 3000);
      return false;
    }

    setSaving(true);
    setError('');

    try {
      // Delete existing photos and insert new ones
      await supabase.from('technician_photos').delete().eq('technician_id', technicianId);

      const photosToInsert = photoSlots
        .map((slot, idx) => slot ? ({
          technician_id: technicianId,
          photo_url: slot.url,
          sort_order: idx + 1,
        }) : null)
        .filter((p): p is NonNullable<typeof p> => p !== null);

      if (photosToInsert.length > 0) {
        await supabase.from('technician_photos').insert(photosToInsert);
      }

      return true;
    } catch (err: any) {
      console.error('Error saving photos:', err);
      setError(err.message || 'Failed to save photos');
      setTimeout(() => setError(''), 5000);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Step 5: Save Videos (optional)
  const saveVideosStep = async (): Promise<boolean> => {
    console.log('[WIZARD] saveVideosStep called, videoLinks:', videoLinks);
    
    if (!technicianId) {
      setError('Please complete previous sections first');
      return false;
    }

    // Videos are optional - if no videos, just return true
    if (videoLinks.length === 0) {
      console.log('[WIZARD] No video links added, skipping video step (optional)');
      return true;
    }

    setSaving(true);
    setError('');

    try {
      console.log('[WIZARD] Deleting existing videos for technician:', technicianId);
      
      // Delete existing videos - use a timeout to prevent hanging
      const deletePromise = supabase.from('technician_videos').delete().eq('technician_id', technicianId);
      const deleteTimeout = new Promise<{error?: any}>((resolve) => 
        setTimeout(() => resolve({error: new Error('Delete timeout')}), 10000)
      );
      
      const deleteResult = await Promise.race([deletePromise, deleteTimeout]);
      
      if (deleteResult && 'error' in deleteResult && deleteResult.error) {
        console.error('[WIZARD] Delete videos error:', deleteResult.error);
        // Continue even if delete fails - might not have existing videos
      }

      const videosToInsert = videoLinks.map(v => ({
        technician_id: technicianId,
        platform: v.platform,
        video_url: v.url,
        video_id: v.videoId,
        service: 'TikTok', // Required field for technician_videos
      }));

      console.log('[WIZARD] Inserting videos:', videosToInsert);
      console.log('[WIZARD] technicianId for videos:', technicianId);
      
      // Wrap insert with timeout to prevent UI hang
      type VideoInsertResult = { data: any[] | null; error: any };
      const insertQuery = supabase
        .from('technician_videos')
        .insert(videosToInsert)
        .select()
        .then((result): Promise<VideoInsertResult> => 
          Promise.resolve({ data: result.data, error: result.error })
        );
      
      const insertTimeout = new Promise<VideoInsertResult>((resolve) =>
        setTimeout(() => resolve({ 
          data: null, 
          error: new Error('Video save timed out. Please check your connection and try again.') 
        }), 15000)
      );

      const { data: insertedVideos, error: insertError } = await Promise.race([insertQuery, insertTimeout]);

      console.log('[WIZARD] Videos insert result:', { insertedVideos, insertError });

      if (insertError) {
        console.error('[WIZARD] Insert videos error:', insertError);
        throw insertError;
      }

      // Also update the tiktok_link field on the technicians table with the first TikTok URL
      const firstTikTokLink = videoLinks.find(v => v.platform === 'tiktok')?.url || '';
      if (firstTikTokLink) {
        const { error: updateTikTokError } = await supabase
          .from('technicians')
          .update({ tiktok_link: firstTikTokLink })
          .eq('id', technicianId);
        
        if (updateTikTokError) {
          console.error('[WIZARD] Update tiktok_link error:', updateTikTokError);
          // Don't fail the whole step for this - just log the error
        }
      }

      return true;
    } catch (err: any) {
      console.error('Error saving videos:', err);
      setError(err.message || 'Failed to save videos');
      setTimeout(() => setError(''), 5000);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Step 6: Save Pricing Notes and complete
  const savePricingStep = async (): Promise<boolean> => {
    if (!technicianId) {
      setError('Please complete previous sections first');
      return false;
    }

    setSaving(true);
    setError('');

    try {
      const { lat, lng } = extractCoordinates();

      // Update with coordinates and pricing notes
      const { error: updateError } = await supabase
        .from('technicians')
        .update({
          pricing_notes: profileForm.pricing_notes || '',
          latitude: lat,
          longitude: lng,
          status: 'live', // Auto-approved for immediate visibility
        })
        .eq('id', technicianId);

      if (updateError) {
        console.error('Pricing update error:', updateError);
        throw updateError;
      }

      // Save business hours to database
      const hoursToInsert = businessHours.map(h => ({
        technician_id: technicianId,
        day_of_week: h.day_of_week,
        is_open: h.is_open,
        open_time: h.is_open ? h.open_time : null,
        close_time: h.is_open ? h.close_time : null,
        available_on_request: h.available_on_request || false,
      }));

      // First delete existing business hours
      await supabase.from('business_hours').delete().eq('technician_id', technicianId);

      // Then insert new business hours
      if (hoursToInsert.length > 0) {
        const { error: hoursError } = await supabase
          .from('business_hours')
          .insert(hoursToInsert);

        if (hoursError) {
          console.error('Business hours save error:', hoursError);
          throw hoursError;
        }
      }

      return true;
    } catch (err: any) {
      console.error('Error saving pricing:', err);
      setError(err.message || 'Failed to save pricing notes');
      setTimeout(() => setError(''), 5000);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Handle Continue button click
  const handleContinue = async () => {
    let success = false;

    switch (currentStep) {
      case 'profile':
        success = await saveProfileStep();
        break;
      case 'location':
        success = await saveLocationStep();
        break;
      case 'business_hours':
        success = true; // Business hours are saved with pricing step when technician is created
        break;
      case 'services':
        success = await saveServicesStep();
        break;
      case 'photos':
        success = await savePhotosStep();
        break;
      case 'videos':
        success = await saveVideosStep();
        break;
      case 'pricing':
        success = await savePricingStep();
        break;
    }

    if (success) {
      // Mark current step as completed
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      
      // Move to next step
      const nextIndex = currentStepIndex + 1;
      if (nextIndex < STEPS.length) {
        setCurrentStep(STEPS[nextIndex].id);
      } else {
        // All steps complete
        setCurrentStep('complete');
        setSuccess('Profile created successfully!');
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    }
  };

  // Handle Back button click
  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex].id);
      setError('');
    }
  };

  // Check if current step is valid (for enabling continue button)
  const isStepValid = (): boolean => {
    switch (currentStep) {
      case 'profile':
        return !!(profileForm.first_name && profileForm.last_name && profileForm.business_name && profileForm.phone && profileForm.experience_years && profileForm.area);
      case 'location':
        return true;
      case 'business_hours':
        return true; // Business hours are optional
      case 'services':
        return selectedServices.length > 0;
      case 'photos':
        return getFilledSlotsCount() >= 2;
      case 'videos':
        return true; // Videos are optional
      case 'pricing':
        return true;
      default:
        return false;
    }
  };

  // Render progress indicator
  const renderProgress = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.has(step.id);
          const isCurrent = currentStep === step.id;
          
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div 
                className={`flex flex-col items-center cursor-pointer ${isCurrent ? 'flex-1' : ''}`}
                onClick={() => {
                  // Allow going back to completed steps
                  if (completedSteps.has(step.id)) {
                    setCurrentStep(step.id);
                  }
                }}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-colors
                  ${isCompleted ? 'bg-green-600 text-white' : ''}
                  ${isCurrent ? 'bg-blue-600 text-white ring-2 ring-blue-400' : ''}
                  {!isCompleted && !isCurrent ? 'bg-slate-700 text-slate-400' : ''}
                `}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span className={`text-xs mt-1 hidden sm:block ${isCurrent ? 'text-white font-medium' : 'text-slate-400'}`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-2 ${completedSteps.has(step.id) ? 'bg-green-600' : 'bg-slate-700'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'profile':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Personal & Business Information</h2>
            <p className="text-slate-400 text-sm mb-6">Tell us about yourself and your business</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm text-slate-300 mb-1">First Name *</label>
                <input
                  id="first_name"
                  type="text"
                  placeholder="Enter your first name"
                  value={profileForm.first_name}
                  onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm text-slate-300 mb-1">Last Name *</label>
                <input
                  id="last_name"
                  type="text"
                  placeholder="Enter your last name"
                  value={profileForm.last_name}
                  onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Business Name *</label>
              <input
                type="text"
                value={profileForm.business_name}
                onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                required
                placeholder="e.g., John's Auto Detailing"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Phone Number *</label>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="e.g., 0712345678"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="experience_years" className="block text-sm text-slate-300 mb-1">Years of Experience *</label>
              <select
                id="experience_years"
                title="Years of Experience"
                value={profileForm.experience_years}
                onChange={(e) => setProfileForm({ ...profileForm, experience_years: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Experience</option>
                {EXPERIENCE_OPTIONS.map(exp => (
                  <option key={exp} value={exp}>{exp}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Area/Location *</label>
              <input
                type="text"
                value={profileForm.area}
                onChange={(e) => {
                  setProfileForm({ ...profileForm, area: e.target.value });
                  setManualAreaEntered(true);
                }}
                required
                placeholder="e.g., Westlands, Nairobi"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>

             <div>
               <label className="block text-sm text-slate-300 mb-1">Bio/Description</label>
               <textarea
                 value={profileForm.bio}
                 onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                 rows={3}
                 placeholder="Example: Hi, I'm Brian Mutua, a window tinting specialist based in Westlands. I've been doing this for 6 years working mostly on Japanese imports. I use quality films and don't rush the job. Book me for a clean finish and honest pricing."
                 className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
               />
               <p className="text-xs text-slate-500 mt-1">Tell clients your name, what you do, how long you've been doing it, and why they should pick you. Be specific and write like you're talking to someone.</p>
             </div>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Location & Experience</h2>
            <p className="text-slate-400 text-sm mb-6">Where do you operate and how experienced are you?</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full overflow-hidden">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Area/Location *</label>
                <input
                  type="text"
                  value={profileForm.area}
                  onChange={(e) => setProfileForm({ ...profileForm, area: e.target.value })}
                  required
                  placeholder="e.g., Westlands, Kilimani"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                />
                {resolvedLocationName && (
                  <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Location resolved: {resolvedLocationName}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Google Maps Link</label>
                <div className="flex gap-2 w-full">
                  <input
                    type="url"
                    value={profileForm.google_maps_link}
                    onChange={(e) => setProfileForm({ ...profileForm, google_maps_link: e.target.value })}
                    placeholder="https://maps.google.com/..."
                    className="flex-1 min-w-0 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    disabled={locationLoading || geocodingLoading}
                    className="flex-shrink-0 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
                    title="Use current location"
                  >
                    {locationLoading || geocodingLoading ? (
                      <span className="animate-spin">↻</span>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {(geocodingLoading || locationLoading) && (
                  <p className="text-blue-400 text-xs mt-1">Looking up location name...</p>
                )}
                {locationError && (
                  <p className="text-red-400 text-xs mt-1">{locationError}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="experience_years" className="block text-sm text-slate-300 mb-1">Years of Experience *</label>
                <select
                  id="experience_years"
                  title="Years of Experience"
                  value={profileForm.experience_years}
                  onChange={(e) => setProfileForm({ ...profileForm, experience_years: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select Experience</option>
                  {EXPERIENCE_OPTIONS.map(exp => (
                    <option key={exp} value={exp}>{exp}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="mobile_service" className="block text-sm text-slate-300 mb-1">Mobile Service</label>
                <select
                  id="mobile_service"
                  title="Mobile Service"
                  value={profileForm.mobile_service}
                  onChange={(e) => setProfileForm({ ...profileForm, mobile_service: e.target.value as 'yes' | 'no' | 'both' })}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="no">No - I work at my location</option>
                  <option value="yes">Yes - I travel to clients</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'business_hours':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Business Hours</h2>
            <p className="text-slate-400 text-sm mb-6">Set your operating hours for each day of the week</p>
            
            <BusinessHoursEditor
              hours={businessHours}
              onChange={setBusinessHours}
            />
          </div>
        );

      case 'services':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Services Offered</h2>
            <p className="text-slate-400 text-sm mb-4">Select 1–4 services you offer. Technicians who specialize in 2–3 services attract more relevant bookings.</p>
            
            {selectedServices.length > 0 && selectedServices.length < 2 && (
              <div className="mb-4 p-3 bg-blue-900/30 border border-blue-800 rounded-lg">
                <p className="text-blue-300 text-sm">💡 Technicians with 2+ services get more bookings</p>
              </div>
           )}
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ALL_SERVICES.map(service => (
                <button
                  key={service}
                  type="button"
                  onClick={() => handleServiceToggle(service)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedServices.includes(service)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {service}
                </button>
              ))}
            </div>

            {selectedServices.length > 0 && (
              <div className="mt-6 pt-4 border-t border-slate-700">
                <h3 className="text-white font-medium mb-3">Set prices for your services (optional)</h3>
                {selectedServices.map(serviceName => (
                  <div key={serviceName}>
                    {/* Window Tinting - Show tint type options instead of main service price */}
                    {serviceName === 'Window Tinting' ? (
                      <div className="mb-4 p-4 bg-slate-800 rounded-lg border border-slate-700">
                        <h4 className="text-white font-medium mb-3 text-sm">Window Tint Types & Pricing</h4>
                        <div className="space-y-2">
                          
                       {WINDOW_TINT_TYPES.map(tintType => (
                         <div key={tintType.name} className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="w-full sm:w-24 text-slate-300 text-sm font-medium">{tintType.name}</span>
                            <input
                               type="number"
                               value={windowTintPrices[tintType.name]?.price || ''}
                               onChange={(e) => setWindowTintPrices({
                              ...windowTintPrices,
                              [tintType.name]: { ...windowTintPrices[tintType.name], price: e.target.value }
                           })}
                            placeholder={`Price (KSh, e.g. ${tintType.minPrice})`}
                            className="w-full sm:flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                          />
                       <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer sm:whitespace-nowrap">
                          <input
                             type="checkbox"
                             checked={windowTintPrices[tintType.name]?.negotiable || false}
                             onChange={(e) => setWindowTintPrices({
                            ...windowTintPrices,
                            [tintType.name]: { ...windowTintPrices[tintType.name], negotiable: e.target.checked }
                            })}
                            className="w-4 h-4 rounded"
                         />
                        Negotiable
                      </label>
                       </div>
                        ))}
                        </div>
                      </div>
                     ) : (
                       /* Regular services - Always show service name, show price only if no variants */
                       <div className="mb-3">
                         <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                           <div className="flex items-center gap-2 sm:w-32">
                             <span className="text-slate-300 text-sm">{serviceName}</span>
                             <button
                               type="button"
                               onClick={() => handleServiceToggle(serviceName)}
                               className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-slate-600 hover:bg-red-500 text-white text-xs transition-colors"
                               title="Remove service"
                             >
                               ×
                             </button>
                           </div>
                           {(serviceVariants[serviceName] || []).length === 0 ? (
                             <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                               <input
                                 type="number"
                                 value={servicePrices[serviceName]?.price || ''}
                                 onChange={(e) => setServicePrices({
                                   ...servicePrices,
                                   [serviceName]: { ...servicePrices[serviceName], price: e.target.value }
                                 })}
                                 placeholder="Price (KSh)"
                                 className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
                               />
                               <label className="flex items-center gap-1 text-xs text-slate-400">
                                 <input
                                   type="checkbox"
                                   checked={servicePrices[serviceName]?.negotiable || false}
                                   onChange={(e) => setServicePrices({
                                     ...servicePrices,
                                     [serviceName]: { ...servicePrices[serviceName], negotiable: e.target.checked }
                                   })}
                                   className="w-4 h-4"
                                 />
                                 Negotiable
                               </label>
                             </div>
                           ) : null}
                         </div>
                       </div>
                     )}

                    {/* Variants for regular services (optional) */}
                  {/* Variants for regular services (optional) */}
                    {serviceName !== 'Window Tinting' && (
                      <div className="mb-3 mt-1">
                        {(serviceVariants[serviceName] || []).map((variant, variantIndex) => (
                          <div key={variantIndex} className="flex flex-col gap-2 p-3 bg-slate-700 rounded-lg mb-2 border border-slate-600">
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={variant.variant_name}
                                onChange={(e) => handleUpdateVariant(serviceName, variantIndex, 'variant_name', e.target.value)}
                                placeholder="Variant name (e.g. Basic, Premium)"
                                className="flex-1 min-w-0 px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveVariant(serviceName, variantIndex)}
                                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-slate-600 hover:bg-red-500 text-white text-lg transition-colors"
                              >
                                ×
                              </button>
                            </div>
                            <input
                              type="number"
                              value={variant.price}
                              onChange={(e) => handleUpdateVariant(serviceName, variantIndex, 'price', e.target.value)}
                              placeholder="Price (KSh)"
                              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                            />
                            <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={variant.negotiable}
                                onChange={(e) => handleUpdateVariant(serviceName, variantIndex, 'negotiable', e.target.checked)}
                                className="w-4 h-4 rounded"
                              />
                              Negotiable
                            </label>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddVariant(serviceName)}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          + Add Variant
                        </button>
                      </div>
                    )}
                  </div>
                
                ))}
              </div>
            )}

            {/* Other Services */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <label className="block text-sm text-slate-300 mb-2">Other Services</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newOtherService}
                  onChange={(e) => setNewOtherService(e.target.value)}
                  placeholder="Add custom service"
                  className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddOtherService()}
                />
                <button
                  type="button"
                  onClick={handleAddOtherService}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                  Add
                </button>
              </div>
              {otherServices.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {otherServices.map((service) => (
                    <span key={service} className="inline-flex items-center gap-1 px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">
                      {service}
                      <button type="button" onClick={() => handleRemoveOtherService(service)} className="text-red-400 hover:text-red-300">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );

      case 'photos':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Portfolio Photos</h2>
            <p className="text-slate-400 text-sm mb-6">Upload at least 2 photos showcasing your work</p>
            
            <div className="grid grid-cols-3 gap-3">
              {photoSlots.map((slot, index) => (
                <div key={index} className="relative aspect-square">
                  {slot ? (
                    <div className="w-full h-full rounded-lg overflow-hidden relative group">
                      <img 
                        src={slot.url} 
                        alt={`Portfolio photo ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <button 
                        type="button" 
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold opacity-100 transition-opacity"
                        title="Remove photo"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-full border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-800/50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-slate-500 hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span className="text-xs text-slate-500 mt-1">Slot {index + 1}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, index)}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-slate-400">
              {getFilledSlotsCount()} of 6 slots filled {getFilledSlotsCount() >= 2 ? '(minimum requirement met)' : '(need at least 2)'}
            </p>
            {uploading && <p className="text-blue-400 text-sm">Uploading...</p>}
          </div>
        );

      case 'videos':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">TikTok Videos</h2>
            <p className="text-slate-400 text-sm mb-6">Add TikTok videos showcasing your work (optional)</p>
            
            {Array.from({ length: 3 }).map((_, index) => {
              const video = videoLinks[index];
              const urlValue = video ? video.url : (slotInputs[index] || '');
              const isValid = urlValue ? isValidTikTokUrl(urlValue) : null;
              const hasInvalidUrl = urlValue && !isValidTikTokUrl(urlValue);
              
              const existingUrls = videoLinks.filter((v, i) => i !== index).map(v => v.url);
              const isDuplicate = urlValue && existingUrls.includes(urlValue);
              
              return (
                <div key={index} className="mb-3">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0 w-8 h-8 bg-black rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                      </svg>
                    </div>
                    
                    <input
                      type="url"
                      value={urlValue}
                      onChange={(e) => {
                        if (video) {
                          const updatedLinks = [...videoLinks];
                          const videoId = extractVideoId(e.target.value);
                          updatedLinks[index] = { ...video, url: e.target.value, videoId: videoId || '' };
                          setVideoLinks(updatedLinks);
                        } else {
                          setSlotInputs({ ...slotInputs, [index]: e.target.value });
                        }
                      }}
                      placeholder="Paste TikTok video URL here"
                      className={`flex-1 px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 ${isDuplicate ? 'border-red-500' : 'border-slate-600'}`}
                    />
                    
                    {urlValue && (
                      <button
                        type="button"
                        onClick={() => {
                          if (video) {
                            setVideoLinks(videoLinks.filter(v => v.id !== video.id));
                          } else {
                            const newSlotInputs = { ...slotInputs };
                            delete newSlotInputs[index];
                            setSlotInputs(newSlotInputs);
                          }
                        }}
                        className={"shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-600 hover:bg-red-500 text-white transition-colors " + (isValid && !isDuplicate ? "hidden sm:flex" : "flex")}
                        title="Clear"
                      >
                        ×
                      </button>
                    )}
                    
                    {!video && urlValue && isValid && !isDuplicate && (
                      <button
                        type="button"
                        onClick={() => {
                          addVideoLink(urlValue);
                          const newSlotInputs = { ...slotInputs };
                          delete newSlotInputs[index];
                          setSlotInputs(newSlotInputs);
                        }}
                        disabled={videoLinks.length >= 3}
                        className="hidden sm:block px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50 shrink-0"
                      >
                        Add
                      </button>
                    )}
                  </div>
                  
                  {urlValue && (
                   <div className="ml-10 mt-1">
                    {isValid === true && !isDuplicate && (
                   <>
                   {/* Desktop: text only */}
                       <p className="hidden sm:block text-green-400 text-xs">✓ Valid TikTok URL</p>
                        {/* Mobile: text + buttons in same row */}
                          <div className="sm:hidden flex items-center justify-between">
                            <p className="text-green-400 text-xs">✓ Valid TikTok URL</p>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => { if (video) { setVideoLinks(videoLinks.filter(v => v.id !== video.id)); } else { const s = { ...slotInputs }; delete s[index]; setSlotInputs(s); } }}
                                  className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-600 hover:bg-red-500 text-white transition-colors">×</button>
                              {!video && (
                            <button type="button" onClick={() => { addVideoLink(urlValue); const s = { ...slotInputs }; delete s[index]; setSlotInputs(s); }}
                            disabled={videoLinks.length >= 3}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold disabled:opacity-50">
                        Add
                       </button>
                        )}
                     </div>
                    </div>
                     </>
                    )}
                      {hasInvalidUrl && <p className="text-red-400 text-xs">✗ Invalid TikTok URL - Please enter a valid TikTok link</p>}
                     {isDuplicate && <p className="text-red-400 text-xs">✗ This link is already used - Please use a different URL</p>}
                   </div>
                  )}
                  
                  {video && video.videoId && (
                    <div className="ml-10 mt-2">
                      <div className="tiktok-video-preview relative overflow-hidden rounded-lg">
                        <iframe
                          src={getEmbedUrl(video.videoId)}
                          className="w-full aspect-video rounded border-0"
                          title={`TikTok video ${index + 1}`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );

      case 'pricing':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Pricing Notes</h2>
            <p className="text-slate-400 text-sm mb-6">Add any additional pricing information (optional)</p>
            
            <textarea
              value={profileForm.pricing_notes}
              onChange={(e) => setProfileForm({ ...profileForm, pricing_notes: e.target.value })}
              rows={4}
              placeholder="Any additional pricing information, discounts, or special offers..."
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Profile Submitted!</h2>
            <p className="text-slate-400 mb-2">Your profile has been created successfully.</p>
            <p className="text-slate-400">It will be reviewed by an admin before going live.</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 py-8 px-4">
      <Helmet>
        <title>Complete Your Technician Profile | Mekh</title>
      </Helmet>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
            Become a Technician
          </h1>
          <p className="text-slate-400">
            Complete your profile step by step to start receiving bookings
          </p>
        </div>

        {success && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Progress Indicator */}
        {currentStep !== 'complete' && renderProgress()}

        {/* Step Content */}
        <div className="bg-slate-900 border border-slate-700 p-6 rounded-xl mb-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        {currentStep !== 'complete' && (
          <div className="flex justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStepIndex === 0 || saving}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            
            <button
              type="button"
              onClick={handleContinue}
              disabled={saving || !isStepValid()}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin">↻</span>
                  Saving...
                </>
              ) : (
                <>
                  {currentStep === 'pricing' ? 'Complete Profile' : 'Continue'}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>
          </div>
        )}

        {currentStep !== 'complete' && (
          <p className="mt-4 text-center text-sm text-slate-400">
            Your progress is saved as you go. You can come back to previous steps.
          </p>
        )}
      </div>
    </div>
  );
};

export default JoinPage;