import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { v4 as uuidv4 } from 'uuid';
import {
  Technician,
  Lead,
  Notification,
  TechnicianService,
  ServiceVariant,
  TechnicianPhoto,
  TechnicianVideo,
  ALL_SERVICES,
  EXPERIENCE_OPTIONS,
  PAYMENT_METHODS,
  DAYS_OF_WEEK,
  WINDOW_TINT_TYPES
} from '../types';
import { 
  getMyTechnicianProfile, 
  getCurrentUser, 
  signOut 
} from '../src/lib/auth';
import {
  getMyLeads,
  updateLeadStatus,
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  updateMyProfile,
  updateMyServices,
  updateMyPhotos,
  updateMyPayments,
  uploadToCloudinary,
  generateUniqueSlug,
  getTechnicians,
  getTikTokThumbnail,
  getAllServices,
  addService,
  serviceExists
} from '../src/lib/api';
import { supabase } from '../src/lib/supabase';
import { BusinessHoursEditor } from '../src/components/BusinessHoursEditor';
import { Avatar } from '../src/components/Avatar';
import { profileFull, portfolioThumb } from '../src/lib/cloudinary';
import { TechnicianMap } from '../src/components/TechnicianMap';

type TabType = 'profile' | 'services' | 'bookings' | 'notifications' | 'settings' | 'technicians';

const TechnicianDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>((searchParams.get('tab') as TabType) || 'profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // User data
  const [user, setUser] = useState<any>(null);
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    bio: '',
    experience_years: '',
    county: '',
    area: '',
    mobile_service: 'no' as 'yes' | 'no' | 'both',
    instagram: '',
    tiktok_link: '',
    youtube_link: '',
    pricing_notes: '',
    profile_image: '',
    cover_photo: '',
    thumbnail_image: '',
  });
  
  const [services, setServices] = useState<TechnicianService[]>([]);
  const [serviceVariants, setServiceVariants] = useState<ServiceVariant[]>([]);
  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [editingServices, setEditingServices] = useState(false);
  const [servicesForm, setServicesForm] = useState<{ id?: string; service_name: string; price: string; negotiable: boolean; variants: { id?: string; service_id?: string; variant_name: string; price: string; is_negotiable: boolean }[] }[]>([]);
  const [dirtyServiceIndices, setDirtyServiceIndices] = useState<Set<number>>(new Set());
  const [photos, setPhotos] = useState<TechnicianPhoto[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<Technician[]>([]);
  
  // Video state
  const [videos, setVideos] = useState<TechnicianVideo[]>([]);
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});
  const [editingVideo, setEditingVideo] = useState<TechnicianVideo | null>(null);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [videoUrlError, setVideoUrlError] = useState('');
  const [videoSaving, setVideoSaving] = useState(false);

  // Leads view state
  const [leadsView, setLeadsView] = useState<'active' | 'archived'>('active');
  
  // Business hours state
  const [businessHours, setBusinessHours] = useState<{
    day_of_week: number;
    is_open: boolean;
    open_time: string | null;
    close_time: string | null;
    available_on_request: boolean;
  }[]>([]);

  // Track which services have "Other" selected for custom input
  const [customServiceInputs, setCustomServiceInputs] = useState<Record<number, string>>({});
  
  // Track window tinting sub-services during editing
  const [editingWindowTintPrices, setEditingWindowTintPrices] = useState<Record<string, { price: string; negotiable: boolean }>>({});

  // Handle tab change and update URL
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Sync activeTab with URL search params
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam && ['profile', 'services', 'bookings', 'notifications', 'settings', 'technicians'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        navigate('/');
        return;
      }
      setUser(currentUser);

      // Load technician profile
      const techProfile = await getMyTechnicianProfile();
      if (!techProfile) {
        navigate('/');
        return;
      }
      setTechnician(techProfile);
      
      // Initialize forms with existing data
      setProfileForm({
        first_name: techProfile.first_name || '',
        last_name: techProfile.last_name || '',
        business_name: techProfile.business_name || '',
        bio: techProfile.bio || '',
        experience_years: techProfile.experience_years || '',
        county: techProfile.county || '',
        area: techProfile.area || '',
        mobile_service: techProfile.mobile_service || 'no',
        instagram: techProfile.instagram || '',
        tiktok_link: techProfile.tiktok_link || '',
        youtube_link: techProfile.youtube_link || '',
        pricing_notes: techProfile.pricing_notes || '',
        profile_image: techProfile.profile_image || '',
        cover_photo: techProfile.cover_photo || '',
        thumbnail_image: techProfile.thumbnail_image || '',
      });
      
      setServices(techProfile.technician_services || []);

      // Load service variants
      const { data: variantsData } = await supabase
        .from('service_variants')
        .select('*')
        .in('service_id', techProfile.technician_services?.map((s: TechnicianService) => s.id) || []);

      setServiceVariants(variantsData || []);

      setPhotos(techProfile.technician_photos || []);
      setSelectedPayments((techProfile.technician_payments as { method: string }[] | undefined)?.map(p => p.method) || []);

      // Load available services
      try {
        const allServices = await getAllServices();
        setAvailableServices(allServices.map(s => s.name));
      } catch (err) {
        console.warn('Failed to load services from database, using fallback:', err);
        // Fallback to ALL_SERVICES if database query fails
        setAvailableServices(ALL_SERVICES);
      }
      
      // Load videos from technician_videos table (including cached thumbnails)
      const { data: videosData } = await supabase
        .from('technician_videos')
        .select('*')
        .eq('technician_id', techProfile.id)
        .order('sort_order', { ascending: true });

      if (videosData && videosData.length > 0) {
        setVideos(videosData);

        // Use cached thumbnail_url from DB; fall back to edge function only if missing
        const thumbs: Record<string, string> = {};
        for (const video of videosData) {
          if (video.platform === 'tiktok') {
            if (video.thumbnail_url) {
              // Use the cached value — no network call needed
              thumbs[video.id] = video.thumbnail_url;
            } else {
              // Fallback: fetch live (for videos added before this update)
              const thumb = await getTikTokThumbnail(video.video_url);
              if (thumb) thumbs[video.id] = thumb;
            }
          }
        }
        setVideoThumbnails(thumbs);
      }
      
      // Load business hours
      const { data: hoursData } = await supabase
        .from('business_hours')
        .select('*')
        .eq('technician_id', techProfile.id)
        .order('day_of_week', { ascending: true });
      
      if (hoursData && hoursData.length > 0) {
        // Map existing data and ensure all days are represented
        const mappedHours = DAYS_OF_WEEK.map(day => {
          const existing = hoursData.find(h => h.day_of_week === day.value);
          const isSunday = existing.day_of_week === 0;
          const hasNoTimes = !existing.open_time && !existing.close_time;
          const shouldBeAvailableOnRequest = isSunday && existing.is_open && hasNoTimes;

          return existing ? {
            day_of_week: existing.day_of_week,
            is_open: existing.is_open,
            open_time: existing.open_time,
            close_time: existing.close_time,
            available_on_request: existing.available_on_request ?? (shouldBeAvailableOnRequest ? true : false),
          } : {
            day_of_week: day.value,
            is_open: false,
            open_time: null,
            close_time: null,
            available_on_request: false,
          };
        });
        setBusinessHours(mappedHours);
      } else {
        // Initialize with all days closed
        setBusinessHours(DAYS_OF_WEEK.map(day => ({
          day_of_week: day.value,
          is_open: false,
          open_time: null,
          close_time: null,
          available_on_request: false,
        })));
      }
      
      // Load leads, notifications, and all technicians in parallel
      // (they don't depend on each other's results)
      if (currentUser) {
        const [myLeads, myNotifications, allTechs] = await Promise.all([
          getMyLeads(),
          getMyNotifications(),
          getTechnicians()
        ]);
        setLeads(myLeads);
        setNotifications(myNotifications);
        setAllTechnicians(allTechs);
      } else {
        // Even if no user, still load notifications and all technicians
        const [myNotifications, allTechs] = await Promise.all([
          getMyNotifications(),
          getTechnicians()
        ]);
        setNotifications(myNotifications);
        setAllTechnicians(allTechs);
      }
      
    } catch (err) {
      console.error('🔧 TECHNICIAN DASHBOARD DEBUG: Error loading data after',  'ms:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');
      
      // Generate new slug if business name changed
      let slug = technician?.slug;
      if (profileForm.business_name !== technician?.business_name) {
        slug = await generateUniqueSlug(profileForm.business_name);
      }
      
      await updateMyProfile({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        business_name: profileForm.business_name,
        bio: profileForm.bio,
        experience_years: profileForm.experience_years,
        county: profileForm.county,
        area: profileForm.area,
        mobile_service: profileForm.mobile_service,
        instagram: profileForm.instagram,
        tiktok_link: profileForm.tiktok_link,
        youtube_link: profileForm.youtube_link,
        pricing_notes: profileForm.pricing_notes,
        profile_image: profileForm.profile_image,
        cover_photo: profileForm.cover_photo,
        thumbnail_image: profileForm.thumbnail_image,
      });
      
      // Save business hours
      if (technician) {
        const hoursToSave = businessHours.map(h => ({
          technician_id: technician.id,
          day_of_week: h.day_of_week,
          is_open: h.is_open,
          open_time: h.is_open ? h.open_time : null,
          close_time: h.is_open ? h.close_time : null,
          available_on_request: h.available_on_request || false,
        }));

        // Delete existing and insert new
        await supabase.from('business_hours').delete().eq('technician_id', technician.id);
        if (hoursToSave.length > 0) {
          await supabase.from('business_hours').insert(hoursToSave);
        }
      }
      
      setSuccess('Profile updated successfully!');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };
  
  // Extract video ID from URL for different platforms
  const getVideoId = (url: string): { platform: string; videoId: string } | null => {
    // TikTok patterns (including mobile app shared links)
    const tiktokMatch = url.match(/(?:tiktok\.com\/@[\w.]+\/video\/|tiktok\.com\/v\/|vm\.tiktok\.com\/|vt\.tiktok\.com\/)([\da-zA-Z_-]+)/);
    if (tiktokMatch) return { platform: 'tiktok', videoId: tiktokMatch[1] };
    
    // YouTube patterns
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    if (youtubeMatch) return { platform: 'youtube', videoId: youtubeMatch[1] };
    
    // Instagram patterns
    const instagramMatch = url.match(/instagram\.com\/reel\/([\w-]+)/);
    if (instagramMatch) return { platform: 'instagram', videoId: instagramMatch[1] };
    
    return null;
  };
  
  const handleAddVideo = async () => {
    if (!technician || !newVideoUrl.trim()) return;

    try {
      setVideoSaving(true);
      setVideoUrlError('');

      const videoInfo = getVideoId(newVideoUrl);
      if (!videoInfo) {
        setVideoUrlError('Invalid video URL. Please enter a valid TikTok, YouTube, or Instagram video URL.');
        return;
      }

      // Check for duplicates
      if (videos.some(v => v.video_url === newVideoUrl)) {
        setVideoUrlError('This video link already exists');
        return;
      }

      // Fetch thumbnail at save time so it's cached in DB permanently
      const thumbnailUrl = videoInfo.platform === 'tiktok' ? await getTikTokThumbnail(newVideoUrl) : null;

      const { error: insertError } = await supabase
        .from('technician_videos')
        .insert({
          technician_id: technician.id,
          platform: videoInfo.platform,
          video_url: newVideoUrl,
          video_id: videoInfo.videoId,
          service: '',
          alt_text: '',
          sort_order: videos.length,
          thumbnail_url: thumbnailUrl,
        });

      if (insertError) throw insertError;

      setNewVideoUrl('');
      loadData(); // Reload to get updated videos
    } catch (err: any) {
      setVideoUrlError(err.message || 'Failed to add video');
    } finally {
      setVideoSaving(false);
    }
  };
  
  const handleDeleteVideo = async (videoId: string) => {
    // Show confirmation dialog
    if (!confirm('Are you sure you want to delete this video link? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Optimistic update: remove video from UI immediately
      const videoToDelete = videos.find(v => v.id === videoId);
      if (videoToDelete) {
        setVideos(videos.filter(v => v.id !== videoId));
        // Also remove thumbnail
        const newThumbs = { ...videoThumbnails };
        delete newThumbs[videoId];
        setVideoThumbnails(newThumbs);
      }
      
      // Delete from database
      const { error: deleteError } = await supabase
        .from('technician_videos')
        .delete()
        .eq('id', videoId);
      
      if (deleteError) {
        // Revert optimistic update on error
        if (videoToDelete) {
          setVideos([...videos, videoToDelete]);
        }
        throw deleteError;
      }
      
      setSuccess('Video deleted successfully!');
      // Reload to ensure data consistency
      loadData();
    } catch (err) {
      console.error('Delete video error:', err);
      setError('Failed to delete video');
    }
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    try {
      setSaving(true);
      const url = await uploadToCloudinary(e.target.files[0], 'technicians/profiles');
      setProfileForm({ ...profileForm, profile_image: url });
    } catch (err) {
      setError('Failed to upload image');
    } finally {
      setSaving(false);
    }
  };

  const handleCoverPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    try {
      setSaving(true);
      const url = await uploadToCloudinary(e.target.files[0], 'technicians/covers');
      setProfileForm({ ...profileForm, cover_photo: url });
    } catch (err) {
      setError('Failed to upload cover photo');
    } finally {
      setSaving(false);
    }
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    try {
      setSaving(true);
      const url = await uploadToCloudinary(e.target.files[0], 'technicians/thumbnails');
      setProfileForm({ ...profileForm, thumbnail_image: url });
    } catch (err) {
      setError('Failed to upload thumbnail');
    } finally {
      setSaving(false);
    }
  };

  const markDirty = (index: number) => {
    setDirtyServiceIndices(prev => new Set(prev).add(index));
  };

  const handleServicesSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      // Validate minimum services
      if (servicesForm.length < 1) {
        setError('At least 1 service is required');
        return;
      }

      // Helper function for safe price parsing
      const safeParseInt = (str: string) => {
        if (!str || !str.trim()) return null;
        const num = parseInt(str.trim());
        return isNaN(num) ? null : num;
      };

      // Add any new custom services to the global services table
      const customServices = Object.values(customServiceInputs).filter(name => name.trim());
      for (const serviceName of customServices) {
        try {
          const exists = await serviceExists(serviceName.trim());
          if (!exists) {
            await addService(serviceName.trim());
            setAvailableServices(prev => [...prev, serviceName.trim()]);
          }
        } catch (dbError) {
          console.warn('Failed to add custom service to global table:', dbError);
          // Continue anyway
        }
      }

      // Prepare services for upsert
      const servicesToUpsert: { id?: string; technician_id: string; service_name: string; price?: number | null; negotiable: boolean }[] = [];
      servicesForm.forEach((s) => {
        if (s.variants.length > 0) {
          // Service with variants - no overall price
          servicesToUpsert.push({
            id: s.id || uuidv4(),
            technician_id: technician!.id,
            service_name: s.service_name,
            price: null,
            negotiable: false,
          });
        } else {
          // Regular service without variants
          servicesToUpsert.push({
            id: s.id || uuidv4(),
            technician_id: technician!.id,
            service_name: s.service_name,
            price: safeParseInt(s.price),
            negotiable: s.negotiable,
          });
        }
      });

      // Delete removed services
      const currentIds = servicesToUpsert.map(s => s.id).filter(Boolean);
      const originalIds = services.map(s => s.id);
      const idsToDelete = originalIds.filter(id => !currentIds.includes(id));

      if (idsToDelete.length > 0) {
        console.log('[SERVICES SAVE] Deleting removed services:', idsToDelete);

        // Delete variants first to avoid foreign key constraints
        const { error: deleteVariantsError } = await supabase
          .from('service_variants')
          .delete()
          .in('service_id', idsToDelete);

        if (deleteVariantsError) {
          console.error('[SERVICES SAVE] Delete variants error:', deleteVariantsError);
          throw deleteVariantsError;
        }

        // Then delete the services
        const { error: deleteServiceError } = await supabase
          .from('technician_services')
          .delete()
          .in('id', idsToDelete);

        if (deleteServiceError) {
          console.error('[SERVICES SAVE] Delete services error:', deleteServiceError);
          throw deleteServiceError;
        }
      }

      // Step 1: Upsert all services at once
      console.log('[SERVICES SAVE] Upserting services:', servicesToUpsert);
      const { data: savedServices, error: upsertError } = await supabase
        .from('technician_services')
        .upsert(servicesToUpsert)
        .select();

      if (upsertError) {
        console.error('[SERVICES SAVE] Upsert services error:', upsertError);
        throw upsertError;
      }

      if (!savedServices) throw new Error('Failed to upsert services');

      // Map service names to their saved IDs
      const serviceIdMap: Record<string, string> = {};
      savedServices.forEach(saved => {
        serviceIdMap[saved.service_name] = saved.id;
      });

      // Step 2: For dirty services only, process variants
      const dirtyServiceNames = Array.from(dirtyServiceIndices).map(i => servicesForm[i]?.service_name).filter(Boolean);
      const dirtyServiceIds = dirtyServiceNames.map(name => serviceIdMap[name]).filter(Boolean);

      if (dirtyServiceIds.length > 0) {
        console.log('[SERVICES SAVE] Processing variants for dirty services:', dirtyServiceIds);

        // Delete existing variants for dirty services
        const { error: deleteError } = await supabase
          .from('service_variants')
          .delete()
          .in('service_id', dirtyServiceIds);

        if (deleteError) {
          console.error('[SERVICES SAVE] Delete variants error:', deleteError);
          throw deleteError;
        }

        // Collect all variants from dirty services
        const allVariants = servicesForm
          .filter(s => dirtyServiceNames.includes(s.service_name))
          .flatMap(s => s.variants
            .filter(v => v.variant_name.trim())
            .map(v => ({
              service_id: serviceIdMap[s.service_name],
              variant_name: v.variant_name.trim(),
              price: safeParseInt(v.price),
              is_negotiable: v.is_negotiable
            }))
          );

        // Step 3: Batch insert all variants at once
        if (allVariants.length > 0) {
          console.log('[SERVICES SAVE] Batch inserting variants:', allVariants);
          const { error: insertError } = await supabase
            .from('service_variants')
            .insert(allVariants);

          if (insertError) {
            console.error('[SERVICES SAVE] Insert variants error:', insertError);
            throw insertError;
          }
        }
      }

      // Step 4: Clear dirty state after successful save
      setDirtyServiceIndices(new Set());
      setSuccess('Services updated successfully!');
      setEditingServices(false);
      setCustomServiceInputs({});
      setEditingWindowTintPrices({});
      loadData();
    } catch (err: any) {
      console.error('[SERVICES SAVE] Error:', err);
      setError(err.message || 'Failed to update services');
    } finally {
      setSaving(false);
    }
  };


  const handleAddService = () => {
    if (servicesForm.length >= 4) {
      setError('Maximum of 4 services allowed');
      return;
    }
    const newIndex = servicesForm.length;
    const newService = {
      id: uuidv4(),
      service_name: '',
      price: '',
      negotiable: false,
      variants: []
    };
    setServicesForm(prev => [...prev, newService]);
    // Mark new service as dirty immediately so variants are saved
    setDirtyServiceIndices(prev => new Set(prev).add(newIndex));
  };

  const handleRemoveService = (index: number) => {
    if (servicesForm.length <= 1) {
      setError('Minimum of 1 service required');
      return;
    }
    setServicesForm(servicesForm.filter((_, i) => i !== index));
    // Also clean up custom inputs for this index
    const newCustomInputs = { ...customServiceInputs };
    delete newCustomInputs[index];
    // Shift down indices for remaining custom inputs
    const shiftedInputs: Record<number, string> = {};
    Object.entries(newCustomInputs).forEach(([idx, value]) => {
      const numIdx = parseInt(idx);
      if (numIdx > index) {
        shiftedInputs[numIdx - 1] = value;
      } else {
        shiftedInputs[numIdx] = value;
      }
    });
    setCustomServiceInputs(shiftedInputs);
  };

  const handleServiceChange = (index: number, field: string, value: any) => {
    const updated = [...servicesForm];

    // Handle "Other" selection for service name
    if (field === 'service_name' && value === 'Other') {
      // Show custom input
      setCustomServiceInputs({ ...customServiceInputs, [index]: '' });
      // Don't update service_name yet
      return;
    } else if (field === 'service_name' && value !== 'Other') {
      // Clear custom input if a predefined service is selected
      const newCustomInputs = { ...customServiceInputs };
      delete newCustomInputs[index];
      setCustomServiceInputs(newCustomInputs);
      (updated[index] as any)[field] = value;
    } else {
      (updated[index] as any)[field] = value;
    }

    setServicesForm(updated);
    // Mark as dirty on any change
    setDirtyServiceIndices(prev => new Set(prev).add(index));
  };

  const handleVariantChange = (serviceIndex: number, variantIndex: number, field: string, value: any) => {
    const updated = [...servicesForm];
    (updated[serviceIndex].variants[variantIndex] as any)[field] = value;
    setServicesForm(updated);
    markDirty(serviceIndex);
  };

  const handleAddVariant = (serviceIndex: number) => {
    const updated = [...servicesForm];
    updated[serviceIndex].variants.push({
      id: uuidv4(),
      variant_name: '',
      price: '',
      is_negotiable: false,
      service_id: updated[serviceIndex].id,
    });
    setServicesForm(updated);
    markDirty(serviceIndex);
  };

  const handleRemoveVariant = (serviceIndex: number, variantIndex: number) => {
    const updated = [...servicesForm];
    updated[serviceIndex].variants.splice(variantIndex, 1);
    setServicesForm(updated);
    markDirty(serviceIndex);
  };

  const startEditingServices = () => {
    const initialCustomInputs: Record<number, string> = {};

    // Initialize services with variants
    const servicesWithVariants: { id?: string; service_name: string; price: string; negotiable: boolean; variants: { id?: string; service_id?: string; variant_name: string; price: string; is_negotiable: boolean }[] }[] = [];

    services.forEach((s) => {
      const isCustom = !availableServices.includes(s.service_name);

      // Check if this is a window tinting sub-service (legacy support)
      const isTintType = WINDOW_TINT_TYPES.some(t => t.name === s.service_name);

      if (isTintType && s.service_name !== 'Window Tinting') {
        // Skip legacy tint types that are stored as separate services, but allow Window Tinting main service
        return;
      }

      if (isCustom) {
        initialCustomInputs[servicesWithVariants.length] = s.service_name;
      }

      // Get variants for this service
      const variants = serviceVariants
        .filter(v => v.service_id === s.id)
        .map(v => ({
          id: v.id,
          service_id: v.service_id,
          variant_name: v.variant_name,
          price: v.price?.toString() || '',
          is_negotiable: v.is_negotiable,
        }));

      servicesWithVariants.push({
        id: s.id,
        service_name: s.service_name,
        price: s.price?.toString() || '',
        negotiable: s.negotiable,
        variants: variants,
      });
    });

    setServicesForm(servicesWithVariants);
    setCustomServiceInputs(initialCustomInputs);
    setDirtyServiceIndices(new Set());
    setEditingServices(true);
  };

  const handleLeadStatusChange = async (leadId: string, status: Lead['status']) => {
  try {
    await updateLeadStatus(leadId, status);
    setLeads(leads.map(l => l.id === leadId ? { ...l, status } : l));

    if (status === 'job_done') {
      const lead = leads.find(l => l.id === leadId);

      let clientEmail = lead?.client_email;

      if (!clientEmail && lead?.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('email')
          .eq('id', lead.client_id)
          .maybeSingle();
        clientEmail = clientData?.email;
      }

      if (clientEmail) {
        const { error: fnError } = await supabase.functions.invoke('send-review-email-resend', {
          body: {
            client_email: clientEmail,
            client_name: lead?.client_name,
            business_name: technician?.business_name,
            technician_slug: technician?.slug,
          }
        });
        if (fnError) console.error('Edge function error:', fnError);
      }
    }

    setSuccess('Lead status updated!');
  } catch (err: any) {
    setError(err.message || 'Failed to update status');
  }
};
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const { deleteNotification } = await import('../src/lib/api');
      await deleteNotification(notificationId);
      setNotifications(notifications.filter(n => n.id !== notificationId));
    } catch (err) {
      console.error('Failed to delete notification');
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    window.location.reload();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    try {
      setSaving(true);
      for (const file of Array.from(e.target.files)) {
        const url = await uploadToCloudinary(file, 'technicians/portfolio');
        setPhotos([...photos, {
          id: '',
          technician_id: technician?.id || '',
          photo_url: url,
          caption: '',
          service: '',
          alt_text: '',
          sort_order: photos.length,
        }]);
      }
    } catch (err) {
      setError('Failed to upload photos');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhotos = async () => {
    try {
      setSaving(true);
      await updateMyPhotos(photos.map(p => ({
        id: p.id || undefined,
        photo_url: p.photo_url,
        caption: p.caption,
        alt_text: p.alt_text,
      })));
      setSuccess('Photos updated successfully!');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update photos');
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handlePaymentChange = (method: string) => {
    if (selectedPayments.includes(method)) {
      setSelectedPayments(selectedPayments.filter(m => m !== method));
    } else {
      setSelectedPayments([...selectedPayments, method]);
    }
  };

  const handleSavePayments = async () => {
    try {
      setSaving(true);
      await updateMyPayments(selectedPayments);
      setSuccess('Payment methods updated successfully!');
      loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update payment methods');
    } finally {
      setSaving(false);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.is_read).length;
  const unreadBookings = leads.filter(l => l.status === 'pending' && !l.is_archived).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Helmet>
        <title>My Dashboard | Mekh</title>
      </Helmet>


      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-800 text-green-400 rounded-lg">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-800 text-red-400 rounded-lg">
            {error}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Edit Profile</h2>
              
              {/* Profile Image */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Profile Image
                </label>
                <div className="flex items-center gap-4">
                  <Avatar 
                    imageUrl={profileFull(profileForm.profile_image)} 
                    name={profileForm.business_name} 
                    size="xl" 
                  />
                  <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                    Change Photo
                    <input type="file" accept="image/*" onChange={handleProfileImageUpload} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Thumbnail Image - Clear display in cards */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Thumbnail Image (Cover Photo for Cards)
                </label>
                <div className="flex items-center gap-4">
                  {profileForm.thumbnail_image ? (
                    <img 
                      src={profileForm.thumbnail_image} 
                      alt="Thumbnail" 
                      className="w-32 h-20 object-cover rounded-lg" 
                    />
                  ) : (
                    <div className="w-32 h-20 bg-slate-800 rounded-lg flex items-center justify-center">
                      <span className="text-slate-500 text-xs">No thumbnail</span>
                    </div>
                  )}
                  <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                    {profileForm.thumbnail_image ? 'Change Thumbnail' : 'Upload Thumbnail'}
                    <input type="file" accept="image/*" onChange={handleThumbnailUpload} className="hidden" />
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  This image will be displayed clearly (without blur) in your technician card. Recommended: 400x250px or higher.
                </p>
              </div>

              {/* Read-only Fields */}
              <div className="mb-6 p-4 bg-slate-800/50 rounded-lg">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Account Information (Cannot Edit)</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-xs text-slate-500 mb-1">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      aria-label="Email address"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs text-slate-500 mb-1">Phone (WhatsApp)</label>
                    <input
                      id="phone"
                      type="text"
                      value={technician?.phone || ''}
                      disabled
                      aria-label="Phone number (WhatsApp)"
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-slate-400 mb-1">
                    First Name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-slate-400 mb-1">
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="businessName" className="block text-sm font-medium text-slate-400 mb-1">
                    Business Name
                  </label>
                  <input
                    id="businessName"
                    type="text"
                    value={profileForm.business_name}
                    onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-slate-400 mb-1">
                    Experience
                  </label>
                  <select
                    id="experience"
                    value={profileForm.experience_years}
                    onChange={(e) => setProfileForm({ ...profileForm, experience_years: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select experience</option>
                    {EXPERIENCE_OPTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="mobileService" className="block text-sm font-medium text-slate-400 mb-1">
                    Mobile Service
                  </label>
                  <select
                    id="mobileService"
                    value={profileForm.mobile_service}
                    onChange={(e) => setProfileForm({ ...profileForm, mobile_service: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="no">Studio Only</option>
                    <option value="yes">Mobile Only</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="area" className="block text-sm font-medium text-slate-400 mb-1">
                    Area
                  </label>
                  <input
                    id="area"
                    type="text"
                    value={profileForm.area}
                    onChange={(e) => setProfileForm({ ...profileForm, area: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                 <div className="md:col-span-2">
                   <label htmlFor="bio" className="block text-sm font-medium text-slate-400 mb-1">
                     Bio
                   </label>
                   <textarea
                     id="bio"
                     value={profileForm.bio}
                     onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                     rows={4}
                     className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                     placeholder="Example: Hi, I'm Brian Mutua, a window tinting specialist based in Westlands. I've been doing this for 6 years working mostly on Japanese imports. I use quality films and don't rush the job. Book me for a clean finish and honest pricing."
                   />
                   <p className="text-xs text-slate-500 mt-1">Tell clients your name, what you do, how long you've been doing it, and why they should pick you. Be specific and write like you're talking to someone.</p>
                 </div>
              </div>
            </div>

            {/* Video Links */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Video Links</h2>
              <p className="text-slate-400 text-sm mb-4">Add up to 3 video links (TikTok, YouTube, or Instagram). Videos will be displayed as thumbnails on your profile.</p>
              
              {/* Current Videos */}
              {videos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  {videos.map((video) => (
                    <div key={video.id} className="relative group bg-slate-800 rounded-lg overflow-hidden">
                      {/* Video thumbnail with 9:16 portrait aspect ratio */}
                      <div className="relative w-full pb-[177.78%] bg-slate-700">
                        {videoThumbnails[video.id] ? (
                          <img 
                            src={videoThumbnails[video.id]} 
                            alt={video.service || 'Video thumbnail'} 
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-slate-400 text-xs">{video.platform}</span>
                          </div>
                        )}
                        {/* Always visible play button */}
                        <a
                          href={video.video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/60 transition-colors"
                          aria-label={`Play ${video.platform} video`}
                        >
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                            <svg className="w-6 h-6 text-slate-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </a>
                        {/* Always visible delete button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteVideo(video.id)}
                          className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors z-10"
                          aria-label="Delete video"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="p-2">
                        <span className="text-xs text-slate-400 capitalize">{video.platform}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Add Video Form */}
              {videos.length < 3 && (
                <div className="space-y-3">
                  <input
                    type="url"
                    value={newVideoUrl}
                    onChange={(e) => {
                      setNewVideoUrl(e.target.value);
                      setVideoUrlError('');
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                    placeholder="Paste TikTok, YouTube, or Instagram video URL..."
                  />
                  {videoUrlError && (
                    <p className="text-red-400 text-sm">{videoUrlError}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleAddVideo}
                    disabled={videoSaving || !newVideoUrl.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white text-sm rounded-lg transition-colors"
                  >
                    {videoSaving ? 'Adding...' : 'Add Video'}
                  </button>
                </div>
              )}
              
              {videos.length >= 3 && (
                <p className="text-yellow-400 text-sm">Maximum of 3 video links reached. Remove a video to add a new one.</p>
              )}
            </div>

            {/* Business Hours */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Business Hours</h2>
              <p className="text-slate-400 text-sm mb-4">Set your operating hours for each day of the week</p>
              <BusinessHoursEditor
                hours={businessHours}
                onChange={setBusinessHours}
              />
            </div>

            {/* Pricing Notes */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Pricing Notes</h2>
              <label htmlFor="pricingNotes" className="sr-only">Pricing notes</label>
              <textarea
                id="pricingNotes"
                value={profileForm.pricing_notes}
                onChange={(e) => setProfileForm({ ...profileForm, pricing_notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                placeholder="Any additional pricing information..."
              />
            </div>

            <button
              type="button"
              onClick={handleProfileSave}
              disabled={saving}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Technicians Tab - View other technicians */}
        {activeTab === 'technicians' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Other Technicians</h2>
              <p className="text-slate-400 text-sm mb-6">
                Browse other technicians in the Mekh network
              </p>
              
              {allTechnicians.length === 0 ? (
                <p className="text-slate-400">No other technicians found.</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allTechnicians
                    .filter(t => t.id !== technician?.id) // Filter out own profile
                    .map((tech) => (
                      <div 
                        key={tech.id} 
                        className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
                        onClick={() => navigate(`/technician/${tech.slug}`)}
                      >
                        <div className="h-32 bg-slate-700 relative">
                          {tech.profile_image ? (
                            <img 
                              src={profileFull(tech.profile_image)} 
                              alt={tech.business_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">
                              🔧
                            </div>
                          )}
                          {tech.mobile_service === 'yes' && (
                            <span className="absolute top-2 right-2 bg-green-600 text-white text-xs px-2 py-1 rounded">
                              Mobile
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-white truncate">{tech.business_name}</h3>
                          <p className="text-slate-400 text-sm">{tech.area}, {tech.county}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-yellow-400">★</span>
                            <span className="text-white font-medium">{tech.avg_rating || 0}</span>
                            <span className="text-slate-500 text-sm">({tech.review_count || 0})</span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1">
                            {tech.technician_services?.slice(0, 3).map((s, i) => (
                              <span key={i} className="bg-slate-700 text-slate-400 text-xs px-2 py-1 rounded">
                                {s.service_name}
                              </span>
                            ))}
                          </div>
                          <button type="button" className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                            View Profile
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            {/* Services & Pricing */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Services & Pricing</h2>
                {!editingServices && (
                  <button
                    type="button"
                    onClick={startEditingServices}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Edit Services
                  </button>
                )}
              </div>

              {editingServices ? (
                <div className="space-y-4">
                  {servicesForm.map((service, index) => (
                    <div key={index} className="p-4 bg-slate-800 rounded-lg">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 grid md:grid-cols-4 gap-3">
                          <div className="md:col-span-2">
                            <label htmlFor={`serviceName-${index}`} className="block text-xs text-slate-500 mb-1">Service Name</label>
                            <div className="space-y-2">
                              <select
                                id={`serviceName-${index}`}
                                value={customServiceInputs[index] !== undefined ? 'Other' : service.service_name}
                                onChange={(e) => handleServiceChange(index, 'service_name', e.target.value)}
                                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                              >
                                <option value="">Select service</option>
                                {availableServices.map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                                <option value="Other">Other</option>
                              </select>
                              {customServiceInputs[index] !== undefined && (
                                <input
                                  type="text"
                                  value={customServiceInputs[index] || ''}
                                  onChange={(e) => {
                                    const newValue = e.target.value;
                                    setCustomServiceInputs({ ...customServiceInputs, [index]: newValue });
                                    // Update the service name in the form
                                    const updated = [...servicesForm];
                                    (updated[index] as any).service_name = newValue;
                                    setServicesForm(updated);
                                  }}
                                  placeholder="Enter custom service name"
                                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400"
                                />
                              )}
                            </div>
                          </div>
                           {service.variants.length === 0 && (
                             <div>
                               <label htmlFor={`price-${index}`} className="block text-xs text-slate-500 mb-1">Price (KSh)</label>
                               <input
                                 id={`price-${index}`}
                                 type="number"
                                 value={service.price}
                                 onChange={(e) => handleServiceChange(index, 'price', e.target.value)}
                                 className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                                 placeholder="0"
                               />
                             </div>
                           )}
                           {service.variants.length > 0 && (
                             <div className="md:col-span-2">
                               <p className="text-xs text-slate-500">Pricing set per variant</p>
                             </div>
                           )}
                        </div>
                        {servicesForm.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveService(index)}
                            className="p-2 text-red-400 hover:text-red-300"
                            aria-label="Remove service"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                       {service.variants.length === 0 && (
                         <div className="mt-2 flex items-center gap-2">
                           <input
                             type="checkbox"
                             checked={service.negotiable}
                             onChange={(e) => handleServiceChange(index, 'negotiable', e.target.checked)}
                             className="rounded"
                             id={`negotiable-${index}`}
                           />
                           <label htmlFor={`negotiable-${index}`} className="text-sm text-slate-400">
                             Price is negotiable
                           </label>
                         </div>
                       )}
                      
                       {/* Variants Section */}
                       <div className="mt-4 pt-4 border-t border-slate-700">
                         <div className="flex items-center justify-between mb-3">
                           <h4 className="text-white font-medium text-sm">Add Variants (Optional)</h4>
                           <button
                             type="button"
                             onClick={() => handleAddVariant(index)}
                             className="text-blue-400 hover:text-blue-300 text-sm"
                           >
                             + Add Variant
                           </button>
                         </div>
                         {service.variants.length > 0 && (
                           <div className="space-y-2">
                             {service.variants.map((variant, variantIndex) => (
                               <div key={variantIndex} className="flex flex-col gap-2 p-2 bg-slate-700 rounded-lg">
                                 <div className="flex items-center gap-2">
                                   <input
                                     type="text"
                                     value={variant.variant_name}
                                     onChange={(e) => handleVariantChange(index, variantIndex, 'variant_name', e.target.value)}
                                     placeholder="Variant name (e.g. Ceramic, 3M, etc.)"
                                     className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm placeholder-slate-400"
                                   />
                                   <button
                                     type="button"
                                     onClick={() => handleRemoveVariant(index, variantIndex)}
                                     className="p-2 text-red-400 hover:text-red-300 flex-shrink-0"
                                     aria-label="Remove variant"
                                   >
                                     ✕
                                   </button>
                                 </div>
                                 <input
                                   type="number"
                                   value={variant.price}
                                   onChange={(e) => handleVariantChange(index, variantIndex, 'price', e.target.value)}
                                   placeholder="Price (KSh)"
                                   className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm"
                                 />
                                 <label className="flex items-center gap-2 text-sm text-slate-400">
                                   <input
                                     type="checkbox"
                                     checked={variant.is_negotiable}
                                     onChange={(e) => handleVariantChange(index, variantIndex, 'is_negotiable', e.target.checked)}
                                     className="w-4 h-4"
                                   />
                                   Negotiable
                                 </label>
                               </div>
                             ))}
                           </div>
                         )}
                         {service.variants.length === 0 && (
                           <p className="text-slate-500 text-sm">No variants added. Click "Add Variant" to create sub services options.</p>
                         )}
                       </div>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={handleAddService}
                    disabled={servicesForm.length >= 4}
                    className="w-full py-3 border-2 border-dashed border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white disabled:border-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    + Add Service {servicesForm.length >= 4 && '(Max 4)'}
                  </button>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditingServices(false)}
                      className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleServicesSave}
                      disabled={saving}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold rounded-lg transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Services'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {services.length === 0 ? (
                    <p className="text-slate-400">No services added yet.</p>
                  ) : (
                    services.map((service) => (
                      <div key={service.id} className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
                        <div>
                          <p className="text-white font-medium">{service.service_name}</p>
                          <p className="text-slate-400 text-sm">
                            {service.price ? `KSh ${service.price?.toLocaleString() || '0'}` : 'Contact for price'}
                            {service.negotiable && ' (Negotiable)'}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Portfolio Photos */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Portfolio Photos</h2>
                <label className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                  Add Photos
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
              
              {photos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {photos.map((photo, index) => (
                    <div key={photo.id || index} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img
                        src={portfolioThumb(photo.photo_url)}
                        alt={photo.alt_text || photo.caption || 'Portfolio'}
                        className="w-full h-full object-cover"
                      />
                       <button
                         type="button"
                         onClick={() => handleRemovePhoto(index)}
                         className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                         aria-label="Remove photo"
                       >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400">No photos added yet.</p>
              )}

              {photos.length > 0 && (
                <button
                  type="button"
                  onClick={handleSavePhotos}
                  disabled={saving}
                  className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold rounded-lg transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Photos'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">
                Bookings / Leads ({leads.length})
              </h2>

              {/* Leads View Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setLeadsView('active')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    leadsView === 'active'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Active ({leads.filter(l => !l.is_archived).length})
                </button>
                <button
                  onClick={() => setLeadsView('archived')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    leadsView === 'archived'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Archived ({leads.filter(l => l.is_archived).length})
                </button>
              </div>

              {leadsView === 'active' && leads.filter(l => !l.is_archived).length === 0 ? (
                <p className="text-slate-400">No active bookings.</p>
              ) : leadsView === 'archived' && leads.filter(l => l.is_archived).length === 0 ? (
                <p className="text-slate-400">No archived bookings.</p>
              ) : (
                <div className="space-y-3">
                  {(leadsView === 'active' ? leads.filter(l => !l.is_archived) : leads.filter(l => l.is_archived)).map((lead) => (
                    <div key={lead.id} className="p-4 bg-slate-800 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-white font-medium">{lead.client_name}</p>
                          <p className="text-slate-400 text-sm">{lead.client_phone}</p>
                        </div>
                        <select
                          id={`lead-status-${lead.id}`}
                          aria-label={`Status for booking from ${lead.client_name}`}
                          value={lead.status}
                          onChange={(e) => handleLeadStatusChange(lead.id, e.target.value as Lead['status'])}
                          disabled={lead.status === 'job_done' || leadsView === 'archived'}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            lead.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' :
                            lead.status === 'job_done' ? 'bg-green-900/50 text-green-400' :
                            'bg-red-900/50 text-red-400'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="job_done">Job Done</option>
                          <option value="not_converted">Not Converted</option>
                        </select>
                      </div>
                      <div className="text-sm">
                        <p className="text-slate-300">
                          <span className="text-slate-500">Service:</span> {lead.service_requested}
                        </p>
                        {lead.vehicle_model && (
                          <p className="text-slate-300">
                            <span className="text-slate-500">Vehicle:</span> {lead.vehicle_model}
                          </p>
                        )}
                        <p className="text-slate-300">
                          <span className="text-slate-500">Location:</span> {lead.client_location}
                        </p>
                        <p className="text-slate-500 text-xs mt-2">
                          {new Date(lead.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
                <p className="text-3xl font-black text-blue-400">{leads.length}</p>
                <p className="text-slate-400 text-sm">Total Bookings</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
                <p className="text-3xl font-black text-green-400">
                  {leads.filter(l => l.status === 'job_done').length}
                </p>
                <p className="text-slate-400 text-sm">Completed Jobs</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
                <p className="text-3xl font-black text-yellow-400">
                  {leads.filter(l => l.status === 'pending').length}
                </p>
                <p className="text-slate-400 text-sm">Pending</p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Notifications</h2>
              {unreadNotifications > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Mark all as read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-center">
                <p className="text-slate-400">No notifications yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => !notification.is_read && handleMarkNotificationRead(notification.id)}
                    className={`p-4 rounded-lg cursor-pointer transition-colors ${
                      notification.is_read 
                        ? 'bg-slate-900 border border-slate-800' 
                        : 'bg-slate-800 border border-blue-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl">
                        {notification.type === 'new_lead' ? '📩' :
                         notification.type === 'new_review' ? '⭐' :
                         notification.type === 'profile_approved' ? '✅' :
                         '🔔'}
                      </span>
                      <div className="flex-1">
                        <p className={`text-sm ${notification.is_read ? 'text-slate-400' : 'text-white'}`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(notification.created_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteNotification(notification.id);
                        }}
                        className="ml-2 p-1 text-slate-500 hover:text-red-400 transition-colors"
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Public Profile Link */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Public Profile</h2>
              <p className="text-slate-400 text-sm mb-4">
                Share this link with customers to view your public profile
              </p>
              <div className="flex gap-2">
                <label htmlFor="publicProfileLink" className="sr-only">Public profile link</label>
                <input
                  id="publicProfileLink"
                  type="text"
                  value={`${window.location.origin}/technician/${technician?.slug}`}
                  readOnly
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-sm"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/technician/${technician?.slug}`);
                    setSuccess('Link copied to clipboard!');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                >
                  Copy
                </button>
                <a
                  href={`/technician/${technician?.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
                >
                  View
                </a>
              </div>
            </div>

            {/* Reviews - Read Only */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Reviews & Ratings</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-3xl font-black text-white">{technician?.avg_rating || 0}</div>
                <div>
                  <div className="flex text-yellow-400">
                    {'★'.repeat(Math.round(technician?.avg_rating || 0))}
                  </div>
                  <p className="text-slate-400 text-sm">{technician?.review_count || 0} reviews</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                Reviews are submitted by customers and cannot be edited.
              </p>
            </div>

            {/* Account Info */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-lg font-bold mb-4">Account Information</h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Email</span>
                  <span className="text-white">{user?.email}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Phone</span>
                  <span className="text-white">{technician?.phone}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-800">
                  <span className="text-slate-400">Member Since</span>
                  <span className="text-white">
                    {technician?.created_at ? new Date(technician.created_at).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-slate-900 border border-red-800 rounded-lg p-6">
              <h2 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h2>
              <p className="text-slate-400 text-sm mb-4">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              <button
                type="button"
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                onClick={() => {
                  if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                    // Handle account deletion
                    alert('Please contact support to delete your account.');
                  }
                }}
              >
                Delete Account
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TechnicianDashboardPage;