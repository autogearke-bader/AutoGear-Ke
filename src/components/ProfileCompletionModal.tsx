import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeClientProfile, getCurrentUser, signInWithGoogle } from '../lib/auth';
import { generateUniqueSlug, uploadToCloudinary } from '../lib/api';
import { supabase } from '../lib/supabase';
import { 
  ALL_SERVICES,  
  EXPERIENCE_OPTIONS, 
  PAYMENT_METHODS
} from '../../types';
import { BusinessHoursEditor } from './BusinessHoursEditor';

// Video link type
interface VideoLink {
  id: string;
  platform: 'tiktok';
  url: string;
  videoId: string;
  alt_text: string;
  description?: string;
}

// Helper to extract video ID from URL
const extractVideoId = (url: string): string | null => {
  if (!url) return null;
  
  try {
    // TikTok URL patterns
    const patterns = [
      /tiktok\.com\/@[\w.]+\/video\/(\d+)/,
      /tiktok\.com\/v\/(\d+)/,
      /vm\.tiktok\.com\/([a-zA-Z0-9_-]+)/
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

// Helper to extract coordinates from Google Maps link
const extractCoordinatesFromGoogleMaps = (link: string): { lat: number; lng: number } | null => {
  if (!link) return null;
  
  try {
    // Pattern 1: @-1.2921,36.8219,15z (Google Maps share format)
    const pattern1 = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match1 = link.match(pattern1);
    if (match1) {
      return { lat: parseFloat(match1[1]), lng: parseFloat(match1[2]) };
    }
    
    // Pattern 2: /maps/place/-1.2921,36.8219 (Google Maps place format)
    const pattern2 = /\/maps\/place\/(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match2 = link.match(pattern2);
    if (match2) {
      return { lat: parseFloat(match2[1]), lng: parseFloat(match2[2]) };
    }
    
    // Pattern 3: ?q=-1.2921,36.8219 (query format)
    const pattern3 = /\?q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const match3 = link.match(pattern3);
    if (match3) {
      return { lat: parseFloat(match3[1]), lng: parseFloat(match3[2]) };
    }
    
    // Pattern 4: !3d-1.2921!4d36.8219 (embedded maps format)
    const pattern4 = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
    const match4 = link.match(pattern4);
    if (match4) {
      return { lat: parseFloat(match4[1]), lng: parseFloat(match4[2]) };
    }
    
    return null;
  } catch (e) {
    console.error('Error extracting coordinates:', e);
    return null;
  }
};

interface ProfileCompletionModalProps {
  isOpen: boolean;
  userType: 'client' | 'technician';
  onClose?: () => void;
}

export const ProfileCompletionModal = ({ isOpen, userType, onClose }: ProfileCompletionModalProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  
  // Get user email from auth
  const [userEmail, setUserEmail] = useState('');
  
  // Client fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Technician fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [otherServices, setOtherServices] = useState<string[]>([]);
  const [newOtherService, setNewOtherService] = useState('');
  const [area, setArea] = useState('');
  const [googleMapsLink, setGoogleMapsLink] = useState('');
  const [extractedCoords, setExtractedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mobileService, setMobileService] = useState<'yes' | 'no' | 'both'>('no');
  
  // Photo slots - fixed array of 6 elements
  type PhotoSlot = { id: string; file: File; url: string } | null;
  const [photoSlots, setPhotoSlots] = useState<PhotoSlot[]>(Array(6).fill(null));
  const [uploading, setUploading] = useState(false);
  const [videoAltText, setVideoAltText] = useState('');
  const [videoLinks, setVideoLinks] = useState<VideoLink[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  // Track individual input values for each video slot for field-level isolation
  const [slotInputs, setSlotInputs] = useState<Record<number, string>>({});
  const [videoDescriptions, setVideoDescriptions] = useState<Record<string, string>>({});
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [servicePrices, setServicePrices] = useState<Record<string, { price: string; negotiable: boolean }>>({});
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [pricingNotes, setPricingNotes] = useState('');
  
  // Business hours state
  const [businessHours, setBusinessHours] = useState<{
    day_of_week: number;
    is_open: boolean;
    open_time: string | null;
    close_time: string | null;
  }[]>([]);

  // Ref to store timeout ID for submission - persists across re-renders
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Get current user email
    const getUserEmail = async () => {
      const user = await getCurrentUser();
      if (user?.email) {
        setUserEmail(user.email);
        // Pre-fill name from email for clients
        if (userType === 'client' && !name) {
          const nameFromEmail = user.email.split('@')[0].replace(/[._]/g, ' ');
          setName(nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1));
        }
      }
    };
    
    if (isOpen) {
      getUserEmail();
      setStep(1);
      setError('');
    }
  }, [isOpen, userType]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  // Handle service toggle
  const handleServiceToggle = (service: string) => {
    if (selectedServices.includes(service)) {
      setSelectedServices(selectedServices.filter(s => s !== service));
      const newPrices = { ...servicePrices };
      delete newPrices[service];
      setServicePrices(newPrices);
    } else {
      // Limit to 4 services maximum
      if (selectedServices.length >= 4) {
        setError('Maximum of 4 services allowed');
        return;
      }
      setSelectedServices([...selectedServices, service]);
      setServicePrices({ ...servicePrices, [service]: { price: '', negotiable: true } });
    }
  };

  const handleAddOtherService = () => {
    if (newOtherService.trim() && !otherServices.includes(newOtherService.trim())) {
      // Limit to 4 services total
      if (selectedServices.length + otherServices.length >= 4) {
        setError('Maximum of 4 services allowed');
        return;
      }
      setOtherServices([...otherServices, newOtherService.trim()]);
      setServicePrices({ ...servicePrices, [newOtherService.trim()]: { price: '', negotiable: true } });
      setNewOtherService('');
    }
  };

  const handleRemoveOtherService = (service: string) => {
    setOtherServices(otherServices.filter(s => s !== service));
    const newPrices = { ...servicePrices };
    delete newPrices[service];
    setServicePrices(newPrices);
  };

  // Handle Google Maps link change and extract coordinates
  const handleGoogleMapsLinkChange = (link: string) => {
    setGoogleMapsLink(link);
    const coords = extractCoordinatesFromGoogleMaps(link);
    setExtractedCoords(coords);
  };

  // Handle geolocation to get current position
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setTimeout(() => setLocationError(''), 3000);
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setExtractedCoords({ lat: latitude, lng: longitude });
        setGoogleMapsLink(`https://maps.google.com/?q=${latitude},${longitude}`);
        setLocationLoading(false);
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

  // Handle photo upload to a specific slot
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    if (!e.target.files?.length) return;
    if (slotIndex < 0 || slotIndex > 5) return;
    if (photoSlots[slotIndex] !== null) return; // Slot already filled
    
    setUploading(true);
    const file = e.target.files[0];
    
    try {
      const url = await uploadToCloudinary(file, 'technicians/portfolio');
      const newSlots = [...photoSlots];
      newSlots[slotIndex] = { 
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        file, 
        url
      };
      setPhotoSlots(newSlots);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    
    setUploading(false);
    // Reset input
    e.target.value = '';
  };

  // Remove photo from a specific slot
  const removePhoto = (slotIndex: number) => {
    if (slotIndex < 0 || slotIndex > 5) return;
    const newSlots = [...photoSlots];
    newSlots[slotIndex] = null;
    setPhotoSlots(newSlots);
  };

  // Get count of filled slots
  const getFilledSlotsCount = () => {
    return photoSlots.filter(slot => slot !== null).length;
  };

  // Video link handlers
  const getVideoCount = () => {
    return videoLinks.length;
  };

  const addVideoLink = (urlParam?: string) => {
    const url = (urlParam || newVideoUrl).trim();
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
    // Only clear newVideoUrl if no urlParam was provided
    if (!urlParam) {
      setNewVideoUrl('');
    }
    setError('');
  };

  const removeVideoLink = (id: string) => {
    setVideoLinks(videoLinks.filter(v => v.id !== id));
  };

  const updateVideoAltText = (id: string, alt_text: string) => {
    setVideoLinks(videoLinks.map(v => v.id === id ? { ...v, alt_text } : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('ProfileCompletionModal: handleSubmit called, userType:', userType);
    setLoading(true);
    setError('');
    
    // Clear any existing timeout first to prevent multiple timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a timeout to prevent "Saving..." from getting stuck indefinitely
    // Increased to 180 seconds (3 minutes) for slower connections or databases
    timeoutRef.current = setTimeout(() => {
      console.error('ProfileCompletionModal: Submit operation timed out after 180 seconds');
      setLoading(false);
      setError('Submission is taking much longer than expected. Please wait a moment and try again. If the problem persists, check your browser console (F12) for error details.');
    }, 180000); // 180 second timeout

    try {
      if (userType === 'client') {
        // Validate client fields
        if (!name.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        if (!phone || phone.length < 9) {
          setError('Please enter a valid WhatsApp number (9 digits)');
          setLoading(false);
          return;
        }

        await completeClientProfile(name, phone);
        clearTimeout(timeoutRef.current);
        navigate('/');
        window.location.reload();
        
      } else if (userType === 'technician') {
        // Validate technician fields
        if (!firstName || !lastName || !businessName || !experience) {
          setError('Please fill in all required personal details');
          setLoading(false);
          return;
        }
        if (selectedServices.length === 0) {
          setError('Please select at least one service');
          setLoading(false);
          return;
        }
        if (!area) {
          setError('Please enter your area');
          setLoading(false);
          return;
        }
        const filledSlots = getFilledSlotsCount();
        if (filledSlots < 2) {
          setError('Please upload at least 2 portfolio photos');
          setLoading(false);
          return;
        }
        if (filledSlots > 6) {
          setError('Maximum of 6 portfolio photos allowed');
          setLoading(false);
          return;
        }
        if (selectedPayments.length === 0) {
          setError('Please select at least one payment method');
          setLoading(false);
          return;
        }
        
        // Validate video links - must have at least 1 video and max 3 total
        if (videoLinks.length === 0) {
          setError('Please add at least one video link to showcase your work');
          setLoading(false);
          return;
        }
        
        if (videoLinks.length > 3) {
          setError('Maximum of 3 video links allowed');
          setLoading(false);
          return;
        }
        
        // Check for duplicate video links
        const urls = videoLinks.map(v => v.url);
        const uniqueUrls = new Set(urls);
        if (urls.length !== uniqueUrls.size) {
          setError('Please use unique video links - each video link must be different');
          setLoading(false);
          return;
        }

        // Get current user
        console.time('GET_CURRENT_USER');
        console.log('ProfileCompletionModal: Getting current user...');
        let user;
        try {
          user = await getCurrentUser();
          console.timeEnd('GET_CURRENT_USER');
          console.log('ProfileCompletionModal: Current user retrieved:', user?.id);
          if (!user) {
            setError('Failed to get your user information. Please log out and log back in.');
            setLoading(false);
            return;
          }
        } catch (err) {
          console.timeEnd('GET_CURRENT_USER');
          console.error('ProfileCompletionModal: Failed to get current user:', err);
          setError('Failed to retrieve your user information. Please try again.');
          setLoading(false);
          return;
        }

        // Generate unique slug
        console.time('GENERATE_SLUG');
        console.log('ProfileCompletionModal: Generating unique slug for:', businessName);
        let slug;
        try {
          slug = await generateUniqueSlug(businessName);
          console.timeEnd('GENERATE_SLUG');
          console.log('ProfileCompletionModal: Generated slug:', slug);
        } catch (err) {
          console.timeEnd('GENERATE_SLUG');
          console.error('ProfileCompletionModal: Failed to generate slug:', err);
          setError('Failed to generate profile slug. Please try again.');
          setLoading(false);
          return;
        }

        // Insert technician
        console.time('INSERT_TECHNICIAN');
        console.log('ProfileCompletionModal: Inserting technician record with slug:', slug);
        let technician;
        try {
          const { data, error: techError } = await supabase
            .from('technicians')
            .insert([{
              user_id: user.id,
              first_name: firstName,
              last_name: lastName,
              business_name: businessName,
              slug,
              phone: phone || '',
              email: userEmail,
              bio,
              experience_years: experience,
              area,
              mobile_service: mobileService,
              tiktok_link: videoLinks.map(v => v.url).join(','),
              pricing_notes: pricingNotes,
              status: 'pending',
              latitude: extractedCoords?.lat || null,
              longitude: extractedCoords?.lng || null,
            }])
            .select()
            .maybeSingle();
          console.timeEnd('INSERT_TECHNICIAN');
          
          if (techError) {
            console.error('ProfileCompletionModal: Technician insert error:', techError);
            console.error('ProfileCompletionModal: Error code:', techError.code);
            console.error('ProfileCompletionModal: Error message:', techError.message);
            console.error('ProfileCompletionModal: Error details:', JSON.stringify(techError));
            throw techError;
          }
          if (!data) {
            console.error('ProfileCompletionModal: Technician insert returned no data');
            console.error('ProfileCompletionModal: This typically indicates an RLS policy issue');
            throw new Error('Failed to create technician profile - RLS policy error');
          }
          technician = data;
          console.log('Technician created successfully with ID:', technician.id);
        } catch (err: any) {
          console.timeEnd('INSERT_TECHNICIAN');
          console.error('ProfileCompletionModal: Technician insert failed:', err);
          
          if (err?.code === '42501' || err?.message?.includes('row-level security')) {
            setError('Permission denied. Please log out and log back in, then try again.');
          } else if (err?.code === '23505' || err?.message?.includes('duplicate')) {
            setError('A profile with this name already exists. Please use a different business name.');
          } else {
            setError(`Failed to create profile: ${err?.message || 'Unknown error'}. Please try again.`);
          }
          setLoading(false);
          return;
        }
        

        // Insert services
        const servicesToInsert: { technician_id: string; service_name: string; price: number | null; negotiable: boolean }[] = [];
        
        // All selected services
        selectedServices.forEach(serviceName => {
          servicesToInsert.push({
            technician_id: technician.id,
            service_name: serviceName,
            price: servicePrices[serviceName]?.price ? parseInt(servicePrices[serviceName].price) : null,
            negotiable: servicePrices[serviceName]?.negotiable || false,
          });
        });
        
        // Other custom services
        otherServices.forEach(serviceName => {
          servicesToInsert.push({
            technician_id: technician.id,
            service_name: serviceName,
            price: servicePrices[serviceName]?.price ? parseInt(servicePrices[serviceName].price) : null,
            negotiable: servicePrices[serviceName]?.negotiable || false,
          });
        });
        
        if (servicesToInsert.length > 0) {
          console.time('INSERT_SERVICES');
          console.log('ProfileCompletionModal: Inserting', servicesToInsert.length, 'services...');
          try {
            const { error: servicesError } = await supabase.from('technician_services').insert(servicesToInsert);
            console.timeEnd('INSERT_SERVICES');
            if (servicesError) {
              console.error('ProfileCompletionModal: Services insert error:', servicesError);
              setError('Failed to save services: ' + (servicesError.message || 'Unknown error'));
              setLoading(false);
              return;
            }
            console.log('ProfileCompletionModal: Services inserted successfully');
          } catch (err: any) {
            console.timeEnd('INSERT_SERVICES');
            console.error('ProfileCompletionModal: Services insert caught error:', err);
            setError('Failed to save services: ' + (err?.message || 'Unknown error'));
            setLoading(false);
            return;
          }
        }

        // Insert photos - filter out null slots and use sort_order
        const photosToInsert = photoSlots
          .map((slot, idx) => slot ? ({
            technician_id: technician.id,
            photo_url: slot.url,
          }) : null)
          .filter((p): p is NonNullable<typeof p> => p !== null);
        
        if (photosToInsert.length > 0) {
          console.time('INSERT_PHOTOS');
          console.log('ProfileCompletionModal: Inserting', photosToInsert.length, 'photos...');
          try {
            const { error: photosError } = await supabase.from('technician_photos').insert(photosToInsert);
            console.timeEnd('INSERT_PHOTOS');
            if (photosError) {
              console.error('ProfileCompletionModal: Photos insert error:', photosError);
              setError('Failed to save photos: ' + (photosError.message || 'Unknown error'));
              setLoading(false);
              return;
            }
            console.log('ProfileCompletionModal: Photos inserted successfully');
          } catch (err: any) {
            console.timeEnd('INSERT_PHOTOS');
            console.error('ProfileCompletionModal: Photos insert caught error:', err);
            setError('Failed to save photos: ' + (err?.message || 'Unknown error'));
            setLoading(false);
            return;
          }
        }

        // Insert video links
        const videosToInsert = videoLinks.map(v => ({
          technician_id: technician.id,
          platform: v.platform,
          video_url: v.url,
          video_id: v.videoId,
        }));
        
        if (videoLinks.length > 0) {
          console.time('INSERT_VIDEOS');
          try {
            // First, update tiktok_link field on technicians table for backward compatibility
            console.log('ProfileCompletionModal: Updating tiktok_link field...');
            const { error: videoUpdateError } = await supabase
              .from('technicians')
              .update({ tiktok_link: videoLinks[0]?.url || null })
              .eq('id', technician.id);
            
            if (videoUpdateError) {
              console.error('ProfileCompletionModal: Video link update error:', videoUpdateError);
              setError('Failed to save video links: ' + (videoUpdateError.message || 'Unknown error'));
              setLoading(false);
              return;
            }
            
            // Then insert into technician_videos table
            console.log('ProfileCompletionModal: Inserting', videoLinks.length, 'videos into technician_videos table...');
            const { error: videosInsertError } = await supabase
              .from('technician_videos')
              .insert(videosToInsert);
            
            if (videosInsertError) {
              console.error('ProfileCompletionModal: Videos insert error:', videosInsertError);
              console.error('ProfileCompletionModal: Error details:', videosInsertError.message, videosInsertError.code);
              setError('Failed to save video links: ' + (videosInsertError.message || 'Unknown error'));
              setLoading(false);
              return;
            }
            console.timeEnd('INSERT_VIDEOS');
            console.log('ProfileCompletionModal: Videos inserted successfully');
          } catch (err: any) {
            console.timeEnd('INSERT_VIDEOS');
            console.error('ProfileCompletionModal: Videos insert caught error:', err);
            setError('Failed to save video links: ' + (err?.message || 'Unknown error'));
            setLoading(false);
            return;
          }
        }

        // Insert payments
        const paymentsToInsert = selectedPayments.map(method => ({
          technician_id: technician.id,
          method,
        }));
        
        if (paymentsToInsert.length > 0) {
          console.time('INSERT_PAYMENTS');
          console.log('ProfileCompletionModal: Inserting', paymentsToInsert.length, 'payment methods...');
          try {
            const { error: paymentsError } = await supabase.from('technician_payments').insert(paymentsToInsert);
            console.timeEnd('INSERT_PAYMENTS');
            if (paymentsError) {
              console.error('ProfileCompletionModal: Payments insert error:', paymentsError);
              setError('Failed to save payment details: ' + (paymentsError.message || 'Unknown error'));
              setLoading(false);
              return;
            }
            console.log('ProfileCompletionModal: Payments inserted successfully');
          } catch (err: any) {
            console.timeEnd('INSERT_PAYMENTS');
            console.error('ProfileCompletionModal: Payments insert caught error:', err);
            setError('Failed to save payment details: ' + (err?.message || 'Unknown error'));
            setLoading(false);
            return;
          }
        }

        // Update user role
        console.time('UPDATE_USER_ROLE');
        console.log('ProfileCompletionModal: Updating user role and profile completion status...');
        try {
          const { error: roleUpdateError } = await supabase.auth.updateUser({ data: { role: 'technician', profile_complete: true } });
          console.timeEnd('UPDATE_USER_ROLE');
          if (roleUpdateError) {
            console.error('ProfileCompletionModal: Role update error:', roleUpdateError);
            setError('Failed to update user role: ' + (roleUpdateError.message || 'Unknown error'));
            setLoading(false);
            return;
          }
          console.log('ProfileCompletionModal: All database operations completed successfully');
        } catch (err: any) {
          console.timeEnd('UPDATE_USER_ROLE');
          console.error('ProfileCompletionModal: Role update caught error:', err);
          setError('Failed to update user role: ' + (err?.message || 'Unknown error'));
          setLoading(false);
          return;
        }

        navigate(`/technician/${slug}`);
        clearTimeout(timeoutRef.current);
        window.location.reload();
      }
    } catch (err: any) {
      console.error('ProfileCompletionModal: Save error:', err);
      // Check for specific error types and provide helpful messages
      if (err?.code === '406') {
        setError('Server error: Please try again. If the problem persists, contact support.');
      } else if (err?.message?.includes('row-level security')) {
        setError('Permission denied: Please log out and log back in, then try again.');
      } else if (err?.message?.includes('duplicate')) {
        setError('This profile already exists. Please contact support.');
      } else {
        setError(err.message || 'Failed to complete profile. Please try again.');
      }
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-lg max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 shrink-0">
          {/* Close button for technicians */}
          {userType === 'technician' && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide">
            {userType === 'client' ? 'Complete Your Profile' : (step === 1 ? 'Join as Technician' : 'Complete Your Profile')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            {userType === 'client' 
              ? 'Please provide your details to continue using AutoGear.'
              : `Step ${step} of 4 - ${step === 1 ? 'Personal Details' : step === 2 ? 'Services' : step === 3 ? 'Portfolio' : 'Pricing'}`
            }
          </p>
          
          {/* Progress bar for technicians */}
          {userType === 'technician' && (
            <div className="flex gap-1 mt-3">
              {[1, 2, 3, 4].map(s => (
                <div key={s} className={`h-1 flex-1 rounded ${step >= s ? 'bg-blue-600' : 'bg-slate-700'}`} />
              ))}
            </div>
          )}
        </div>

        {/* Form - scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* CLIENT FORM */}
            {userType === 'client' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-0.5">Email</label>
                  <input
                    type="email"
                    value={userEmail}
                    disabled
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-0.5">Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-0.5">WhatsApp Number *</label>
                  <div className="flex">
                    <span className="px-4 py-3 bg-slate-800 border border-r-0 border-slate-700 rounded-l-lg text-slate-400">
                      +254
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      required
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-r-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="712345678"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TECHNICIAN FORM - Step 1: Personal Details */}
            {userType === 'technician' && step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">First Name *</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Last Name *</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Business Name *</label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Auto Shine Details"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">WhatsApp Business Number</label>
                  <div className="flex">
                    <span className="px-4 py-3 bg-slate-800 border border-r-0 border-slate-700 rounded-l-lg text-slate-400">
                      +254
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-r-lg text-white focus:outline-none focus:border-blue-500"
                      placeholder="712345678"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Experience *</label>
                  <select
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    required
                    title="Select your years of experience"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select experience</option>
                    {EXPERIENCE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value.slice(0, 300))}
                    maxLength={300}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Tell clients about your experience..."
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={!firstName || !lastName || !businessName || !experience}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
                  >
                    Continue 
                  </button>
                </div>
              </div>
            )}

            {/* TECHNICIAN FORM - Step 2: Services */}
            {userType === 'technician' && step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Services * <span className="text-slate-500 text-xs">(max 4)</span></label>
                  <p className="text-xs text-blue-400 mb-2">Selected: {selectedServices.length + otherServices.length}/4</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_SERVICES.map((service) => (
                      <label
                        key={service}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedServices.includes(service)
                            ? 'bg-blue-600/20 border-blue-500'
                            : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(service)}
                          onChange={() => handleServiceToggle(service)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-xs text-slate-200">{service}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Other Services */}
                <div className="bg-slate-800 p-3 rounded-lg">
                  <label className="block text-sm text-slate-300 mb-2">Other Services</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newOtherService}
                      onChange={(e) => setNewOtherService(e.target.value)}
                      placeholder="Add custom service"
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
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
                          <button type="button" onClick={() => handleRemoveOtherService(service)} className="text-red-400">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Specific Area *</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Kilimani, Ngong Road"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Google Maps Pin Link */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Google Maps Pin Link
                    <span className="text-slate-500 font-normal ml-1">(optional)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={googleMapsLink}
                      onChange={(e) => handleGoogleMapsLinkChange(e.target.value)}
                      placeholder="Paste your Google Maps pin link here"
                      className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleGetCurrentLocation}
                      disabled={locationLoading}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
                      title="Use current location"
                    >
                      {locationLoading ? (
                        <span className="animate-spin">↻</span>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {extractedCoords && (
                    <p className="text-green-400 text-xs mt-1">
                      ✓ Location detected: {extractedCoords.lat.toFixed(4)}, {extractedCoords.lng.toFixed(4)}
                    </p>
                  )}
                  {locationError && (
                    <p className="text-red-400 text-xs mt-1">
                      {locationError}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-1">
                    Click the pin icon to use your current location, or paste a Google Maps link
                  </p>
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg">
                    Back
                  </button>
                  <button type="button" onClick={() => setStep(3)} disabled={selectedServices.length === 0 || !area} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50">
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* TECHNICIAN FORM - Step 3: Portfolio */}
            {userType === 'technician' && step === 3 && (
              <div className="space-y-4">
                {/* Photo Upload - Fixed Grid of 6 Slots */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Upload Photos * (2-6 required)</label>
                  <p className="text-xs text-slate-400 mb-3">Tap each slot to upload a photo. You need at least 2 photos.</p>
                  
                  {/* Fixed grid of 6 slots */}
                  <div className="grid grid-cols-3 gap-3">
                    {photoSlots.map((slot, index) => (
                      <div key={index} className="relative aspect-square">
                        {slot ? (
                          // Filled slot - show photo preview with remove button
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
                          // Empty slot - show plus icon as tap target
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
                  
                  <p className="text-xs text-slate-400 mt-2">
                    {getFilledSlotsCount()} of 6 slots filled {getFilledSlotsCount() >= 2 ? '(minimum requirement met)' : '(need at least 2)'}
                  </p>
                  {uploading && <p className="text-blue-400 text-sm mt-2">Uploading...</p>}
                </div>

                {/* Video Links Section */}
                <div className="bg-slate-800 p-3 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-300">Video Links * (Required)</label>
                    {videoLinks.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setVideoLinks([])}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Clear All
                      </button>
                    )}
                  </div>
                  
                  <p className="text-xs text-slate-400 mb-3">
                    Add up to 3 TikTok videos to showcase your work. Paste a video showing your work - tinting, wrapping, ppf etc.
                  </p>
                  <p className="text-xs text-blue-400 mb-3">
                    Total videos: {videoLinks.length}/3
                  </p>
                  
                  {/* TikTok Videos */}
                  <div className="mb-3">
                    {/* Video Input - Show up to 3 empty slots */}
                    {Array.from({ length: 3 }).map((_, index) => {
                      const video = videoLinks[index];
                      const urlValue = video ? video.url : (slotInputs[index] || '');
                      const isValid = urlValue ? isValidTikTokUrl(urlValue) : null;
                      const hasInvalidUrl = urlValue && !isValidTikTokUrl(urlValue);
                      
                      // Check for duplicate URL (excluding current field if editing)
                      const existingUrls = videoLinks.filter((v, i) => i !== index).map(v => v.url);
                      const isDuplicate = urlValue && existingUrls.includes(urlValue);
                      
                      return (
                        <div key={index} className="mb-3">
                          <div className="flex items-center gap-2">
                            {/* TikTok Icon */}
                            <div className="shrink-0 w-8 h-8 bg-black rounded-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                              </svg>
                            </div>
                            
                            {/* URL Input */}
                            <input
                              type="url"
                              value={urlValue}
                              onChange={(e) => {
                                  if (video) {
                                    // Update existing video
                                    const updatedLinks = [...videoLinks];
                                    const videoId = extractVideoId(e.target.value);
                                    updatedLinks[index] = { ...video, url: e.target.value, videoId: videoId || '' };
                                    setVideoLinks(updatedLinks);
                                  } else {
                                    // Update isolated slot input - no cross-population to other fields
                                    setSlotInputs({ ...slotInputs, [index]: e.target.value });
                                  }
                                }}
                              placeholder="Paste TikTok video URL here"
                              className={`flex-1 px-3 py-2 bg-slate-700 border rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 ${isDuplicate ? 'border-red-500' : 'border-slate-600'}`}
                            />
                            
                            {/* Clear button - only shows when text is typed */}
                            {urlValue && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (video) {
                                    setVideoLinks(videoLinks.filter(v => v.id !== video.id));
                                  } else {
                                    // Clear only this slot's input - field-level isolation
                                    const newSlotInputs = { ...slotInputs };
                                    delete newSlotInputs[index];
                                    setSlotInputs(newSlotInputs);
                                  }
                                }}
                                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-600 hover:bg-red-500 text-white transition-colors"
                                title="Clear"
                              >
                                ×
                              </button>
                            )}
                            
                            {/* Add button - only shows for empty slots */}
                            {!video && urlValue && isValid && !isDuplicate && (
                              <button
                                type="button"
                                onClick={() => {
                                  addVideoLink(urlValue);
                                  // Clear this slot's input after adding - field-level isolation
                                  const newSlotInputs = { ...slotInputs };
                                  delete newSlotInputs[index];
                                  setSlotInputs(newSlotInputs);
                                }}
                                disabled={videoLinks.length >= 3}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50 shrink-0"
                              >
                                Add
                              </button>
                            )}
                          </div>
                          
                          {/* Validation line */}
                          {urlValue && (
                            <div className="ml-10 mt-1">
                              {isValid === true && !isDuplicate && (
                                <p className="text-green-400 text-xs">✓ Valid TikTok URL</p>
                              )}
                              {hasInvalidUrl && (
                                <p className="text-red-400 text-xs">✗ Invalid TikTok URL - Please enter a valid TikTok link</p>
                              )}
                              {isDuplicate && (
                                <p className="text-red-400 text-xs">✗ This link is already used - Please use a different URL</p>
                              )}
                            </div>
                          )}
                          
                          {/* Video preview and remove - Clean view without TikTok metadata */}
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
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(2)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg">
                    Back
                  </button>
                  <button type="button" onClick={() => setStep(4)} disabled={getFilledSlotsCount() < 2} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50">
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* TECHNICIAN FORM - Step 4: Pricing */}
            {userType === 'technician' && step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">Set prices for your services (leave empty if not applicable):</p>
                
                {/* Main services pricing - dynamically show all selected services */}
                {selectedServices.length === 0 && otherServices.length === 0 ? (
                  <div className="bg-yellow-500/20 border border-yellow-500/30 p-4 rounded-lg">
                    <p className="text-yellow-400 text-sm">No services selected. Please go back to Step 2 and select at least one service.</p>
                  </div>
                ) : (
                  <>
                    {/* Main services pricing */}
                    {selectedServices.map((service) => (
                      <div key={service} className="bg-slate-800 p-3 rounded-lg">
                        <p className="text-white font-medium text-sm mb-2">{service}</p>
                        <div className="mb-2">
                          <input
                            type="number"
                            value={servicePrices[service]?.price || ''}
                            onChange={(e) => setServicePrices({ ...servicePrices, [service]: { ...servicePrices[service], price: e.target.value } })}
                            placeholder="Price (KSh)"
                            className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm w-full"
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-400">
                          <input
                            type="checkbox"
                            checked={true}
                            disabled
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          Price is negotiable (always)
                        </label>
                      </div>
                    ))}
                  </>
                )}

                {/* Other services pricing */}
                {otherServices.map((service) => (
                  <div key={service} className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-white font-medium text-sm mb-2">{service}</p>
                    <div className="mb-2">
                      <input
                        type="number"
                        value={servicePrices[service]?.price || ''}
                        onChange={(e) => setServicePrices({ ...servicePrices, [service]: { ...servicePrices[service], price: e.target.value } })}
                        placeholder="Price (KSh)"
                        className="px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm w-full"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-400">
                      <input
                        type="checkbox"
                        checked={true}
                        disabled
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      Price is negotiable (always)
                    </label>
                  </div>
                ))}

                {/* Payment Methods */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Payment Methods *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedPayments.includes(method)
                            ? 'bg-blue-600/20 border-blue-500'
                            : 'bg-slate-800 border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedPayments.includes(method)}
                          onChange={() => {
                            if (selectedPayments.includes(method)) {
                              setSelectedPayments(selectedPayments.filter(p => p !== method));
                            } else {
                              setSelectedPayments([...selectedPayments, method]);
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-slate-200">{method}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Pricing Notes</label>
                  <textarea
                    value={pricingNotes}
                    onChange={(e) => setPricingNotes(e.target.value)}
                    rows={2}
                    placeholder="Any additional pricing info..."
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setStep(3)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg">
                    Back
                  </button>
                  <button type="submit" disabled={loading || selectedPayments.length === 0} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50">
                    {loading ? 'Saving...' : 'Complete Profile'}
                  </button>
                </div>
              </div>
            )}

            {/* Submit button for clients */}
            {userType === 'client' && (
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
