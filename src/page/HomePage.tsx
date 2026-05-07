import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Technician, ServiceCategory, SERVICE_CATEGORIES, Article } from '../../types';
import { getPublicTechnicians, getPublicArticles, getMyClientLeads, getMyClientNotifications, deleteNotification } from '../lib/api';
import { getSession, getMyClientProfile } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { TechnicianCard, TechnicianCardSkeleton } from '../components/TechnicianCard';
import { BookingModal } from '../components/BookingModal';
import { reverseGeocode } from '../lib/location';
import { Avatar } from '../components/Avatar';
import { profileFull } from '../lib/cloudinary';

// Service keywords for search (keeping for now, may update later)
const ALL_SERVICE_KEYWORDS = [
  'tinting', 'tint', 'window', 'headlight restoration', 'tail light smoking', 'tail light', 'headlight',
  'wrapping', 'wrap', 'ppf', 'paint protection', 'film', 'ceramic', 'coating', 'buffing', 'buff', 'polish',
  'detailing', 'detail', 'wash', 'clean', 'interior', 'exterior', 'polish',
  'tuning', 'tune', 'ecu', 'performance',
  'riveting', 'rivet', 'identity', 'chrome', 'rim', 'license plate',
  'painting', 'audio', 'security', 'alarms', 'key programming', 'lighting',
  'engine', 'brakes', 'tyres', 'suspension', 'diagnostics', 'greasing',
  'upholstery', 'seats', 'carpet', 'cleaning'
];

interface Section {
  id: string;
  title: string;
  technicians: Technician[];
  showSeeAll: boolean;
  isVisible: boolean;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  
  // Service filter state
  const [activeFilter, setActiveFilter] = useState<ServiceCategory | 'all'>('all');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  
  // New Search state - unified search bar
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInputValue, setSearchInputValue] = useState(''); // For controlled input with location prefilled
  
  // Location state
  const [detectedLocation, setDetectedLocation] = useState('');
  const [detectedLat, setDetectedLat] = useState<number | null>(null);
  const [detectedLng, setDetectedLng] = useState<number | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [locationTooltip, setLocationTooltip] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);

  // Location banner state
  const [showLocationBanner, setShowLocationBanner] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Modal state
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [pendingBookTechnician, setPendingBookTechnician] = useState<Technician | null>(null);

  // Auth + client state
  const [session, setSession] = useState<any>(null);
  const [client, setClient] = useState<any>(null);
  const [clientLeads, setClientLeads] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loadingClient, setLoadingClient] = useState(true);

  const locationTooltipTimeout = useRef<NodeJS.Timeout | null>(null);
  const bannerTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const techniciansRequestInProgress = useRef(false);
  const techniciansDebounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const searchDebounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch technicians
  useEffect(() => {
    getPublicTechnicians().then(setTechnicians).then(() => setLoadingTechnicians(false));
  }, []);

  // Fetch articles
  useEffect(() => {
    getPublicArticles().then(setArticles).then(() => setLoadingArticles(false));
  }, []);

  // Fetch data
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);

  // Derived values from client data
  const isClient = !!(
    session?.user?.user_metadata?.role === 'client' ||
    client !== null  // ← if we loaded a client profile, they ARE a client
  );
  const isTechnician = session?.user?.user_metadata?.role === 'technician';
  const isGuest = !session;

  // Most recent booking for the welcome strip
  const latestLead = clientLeads[0] ?? null;

  // Unread notification count for bell icon
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Leads that are completed and eligible for review
  const reviewableLeads = clientLeads.filter(
    l => l.status === 'job_done'
  );





  // Fetch client data on mount and listen for auth state changes
  useEffect(() => {
    let mounted = true;

    const loadClientData = async (currentSession: any) => {
      if (!currentSession) {
        if (mounted) setLoadingClient(false);
        return;
      }

      const role = currentSession.user?.user_metadata?.role;

      // ✅ FIX #2: Fallback for Google users without explicit role in metadata
      let resolvedRole = role;
      if (!resolvedRole) {
        try {
          const { data: clientRecord } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', currentSession.user.id)
            .maybeSingle();
          if (clientRecord) resolvedRole = 'client';
        } catch { /* silent */ }
      }

      if (resolvedRole !== 'client') {
        if (mounted) setLoadingClient(false);
        return;
      }

      try {
        const [profile, leads, notifs] = await Promise.all([
          getMyClientProfile(),
          getMyClientLeads(),
          getMyClientNotifications(),
        ]);
        if (!mounted) return;
        setClient(profile);
        setClientLeads(leads ?? []);
        setNotifications(notifs ?? []);
      } catch (err) {
        console.error('Failed to load client data:', err);
      } finally {
        if (mounted) setLoadingClient(false);
      }
    };

    // ✅ FIX #1: Listen for auth state — catches session arriving after mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;
        // Ignore token refreshes — don't reload all client data
        if (event === 'TOKEN_REFRESHED') {
          setSession(newSession);
          return;
        }
        setSession(newSession);
        setLoadingClient(true);
        await loadClientData(newSession);
      }
    );

    // Also run immediately for sessions already in storage
    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(s);
      await loadClientData(s);
    };
    init();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);



  // Check location permission status on mount
  useEffect(() => {
    const checkAndRequestLocation = async () => {
      if (navigator.geolocation) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
          setLocationPermission(permissionStatus.state);
          
          // If already granted, get location
          if (permissionStatus.state === 'granted') {
            requestUserLocation();
          }
          
          permissionStatus.addEventListener('change', () => {
            setLocationPermission(permissionStatus.state);
            if (permissionStatus.state === 'granted') {
              requestUserLocation();
            }
          });
        } catch (e) {
          // Fallback for browsers that don't support permissions API
        }
      }
    };
    
    checkAndRequestLocation();
  }, []);



  // Check for location banner - show after 7-8 seconds on first visit
  useEffect(() => {
    const dismissed = localStorage.getItem('location_banner_dismissed');

    // Show banner if not dismissed yet
    if (!dismissed && !bannerDismissed) {
      // Show banner after 7-8 seconds (randomized between 7000-8000ms)
      const delay = Math.random() * 1000 + 7000;
      bannerTimeoutRef.current = setTimeout(() => {
        setShowLocationBanner(true);
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
          setShowLocationBanner(false);
        }, 10000);
      }, delay);
    }

    return () => {
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
      }
    };
  }, [bannerDismissed]);

  // Request location from browser
  const requestUserLocation = () => {
    if (navigator.geolocation) {
      setIsRequestingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDetectedLat(position.coords.latitude);
          setDetectedLng(position.coords.longitude);
          setLocationPermission('granted');
          localStorage.setItem('location_granted', 'true');
          // Reverse geocode to get area name
          reverseGeocode(position.coords.latitude, position.coords.longitude).then((areaName) => {
            setDetectedLocation(areaName);
          });
          setIsRequestingLocation(false);
        },
        (error) => {
          // Handle different error types more gracefully
          // GeolocationPositionError codes:
          // 1 = Permission denied
          // 2 = Position unavailable  
          // 3 = Timeout
          
          const errorCode = error.code || 0;
          const errorMessage = errorCode === 1 
            ? 'Location permission denied' 
            : errorCode === 2 
              ? 'Location position unavailable'
              : errorCode === 3 
                ? 'Location request timed out'
                : 'Location request failed';
          
          console.log('Location error:', errorMessage);
          
          if (errorCode === 3) {
            // Timeout - try again with lower accuracy
            console.log('Location timeout, retrying with lower accuracy...');
            setIsRequestingLocation(false);
            // Retry with lower accuracy and longer timeout
            navigator.geolocation.getCurrentPosition(
              (position) => {
                setDetectedLat(position.coords.latitude);
                setDetectedLng(position.coords.longitude);
                setLocationPermission('granted');
                localStorage.setItem('location_granted', 'true');
                reverseGeocode(position.coords.latitude, position.coords.longitude).then((areaName) => {
                  setDetectedLocation(areaName);
                });
              },
              (retryError) => {
                const retryCode = retryError.code || 0;
                const retryMessage = retryCode === 1 
                  ? 'Location permission denied (retry)'
                  : retryCode === 2
                    ? 'Location position unavailable (retry)'
                    : retryCode === 3
                      ? 'Location request timed out (retry)'
                      : 'Location request failed (retry)';
                setLocationPermission('denied');
                showLocationDeniedTooltip();
              },
              { enableHighAccuracy: false, timeout: 30000 }
            );
            return;
          }
          
          setLocationPermission('denied');
          setIsRequestingLocation(false);
          // Show tooltip when denied
          showLocationDeniedTooltip();
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  // Show tooltip when location is denied
  const showLocationDeniedTooltip = () => {
    setLocationTooltip(true);
    if (locationTooltipTimeout.current) {
      clearTimeout(locationTooltipTimeout.current);
    }
    locationTooltipTimeout.current = setTimeout(() => {
      setLocationTooltip(false);
    }, 3000);
  };

  // Handle location icon click
  const handleLocationIconClick = () => {
    if (locationPermission === 'granted') {
      // Redetect location if already granted
      requestUserLocation();
    } else {
      // Request location for first time
      requestUserLocation();
    }
  };

  // Clear location from search
  const handleClearLocation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDetectedLocation('');
    setDetectedLat(null);
    setDetectedLng(null);
    setSearchInputValue('');
    setSearchQuery('');
  };

  // Handle banner enable button
  const handleBannerEnable = () => {
    requestUserLocation();
    setShowLocationBanner(false);
    localStorage.setItem('location_banner_dismissed', 'true');
  };

  // Handle banner dismiss/skip
  const handleBannerDismiss = () => {
    setShowLocationBanner(false);
    setBannerDismissed(true);
    localStorage.setItem('location_banner_dismissed', 'true');
  };



  // State for county (internal)
  const [county, setCountyState] = useState('');

  // Check for pending booking after returning from auth
  useEffect(() => {
    const checkPendingBooking = async () => {
      const pendingData = sessionStorage.getItem('pendingBookTechnician');
      if (pendingData) {
        try {
          const parsed = JSON.parse(pendingData);
          // Verify it looks like a real technician before using it
          if (parsed && typeof parsed.id === 'string' && typeof parsed.business_name === 'string') {
            const technician = parsed as Technician;
            const session = await getSession();
            if (session) {
              setSelectedTechnician(technician);
              setBookingOpen(true);
              setPendingBookTechnician(technician);
            }
          }
          sessionStorage.removeItem('pendingBookTechnician');
        } catch (e) {
          console.error('Error parsing pending booking:', e);
          sessionStorage.removeItem('pendingBookTechnician');
        }
      }
    };
    checkPendingBooking();
  }, []);

  // Handle location detected
  const handleLocationDetected = (areaName: string, lat: number, lng: number) => {
    setDetectedLocation(areaName);
    setDetectedLat(lat);
    setDetectedLng(lng);
  };

  // Handle use my location - use browser geolocation
  const handleUseMyLocation = () => {
    requestUserLocation();
  };

  // Handle service chip click - collapse all sections and show filtered results
  const handleServiceChipClick = (serviceValue: string) => {
    if (serviceValue === 'all') {
      setSelectedService(null);
      setActiveFilter('all');
    } else {
      setSelectedService(serviceValue);
      setActiveFilter(serviceValue as ServiceCategory);
    }
  };

  // Handle book now
  const handleBookNow = async (technician: Technician) => {
    const session = await getSession();
    if (!session) {
      setPendingBookTechnician(technician);
      sessionStorage.setItem('pendingBookTechnician', JSON.stringify(technician));
      navigate('/auth', { state: { redirectMessage: 'Sign in to book this technician', returnTo: '/' } });
    } else {
      setSelectedTechnician(technician);
      setBookingOpen(true);
    }
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Filter technicians by service category
  const filterByService = useCallback((techs: Technician[], serviceKeywords: string[]) => {
    return techs.filter(t => 
      t.technician_services?.some(s => 
        serviceKeywords.some(kw => 
          s.service_name.toLowerCase().includes(kw.toLowerCase())
        )
      )
    );
  }, []);

  // Parse search query to extract service and location
  const parseSearchQuery = useCallback((query: string) => {
    if (!query || query.length > 100) return { service: '', location: '' }; // Guard against ReDoS
    const lowerQuery = query.toLowerCase().trim();

    if (!lowerQuery) return { service: '', location: '' };
    
    // Check for location keywords
    const locationKeywords = ['in', 'at', 'near', 'around'];
    let service = lowerQuery;
    let location = '';
    
    for (const keyword of locationKeywords) {
      if (lowerQuery.includes(` ${keyword} `)) {
        const parts = lowerQuery.split(` ${keyword} `);
        service = parts[0].trim();
        location = parts[1].trim();
        break;
      } else if (lowerQuery.endsWith(` ${keyword}`)) {
        service = lowerQuery.replace(` ${keyword}`, '').trim();
        location = '';
        break;
      }
    }
    
    
    return { service, location };
  }, []);

  // Search filtering logic
  const searchFilter = useCallback((techs: Technician[], query: string) => {
    if (!query.trim()) return techs;

    const liveTechs = techs.filter(t => t.status === 'live');
    const lowerQuery = query.toLowerCase().trim();

    // First, check if query matches any technician's area (letter by letter)
    const areaMatches = liveTechs.filter(t =>
      t.area?.toLowerCase().includes(lowerQuery)
    );

    let filtered;
    if (areaMatches.length > 0) {
      // If area matches found, show those technicians
      filtered = areaMatches;
    } else {
      // Otherwise, filter by service matches (business name, service names, or service variants)
      filtered = liveTechs.filter(t =>
        t.business_name?.toLowerCase().includes(lowerQuery) ||
        t.technician_services?.some(s =>
          s.service_name.toLowerCase().includes(lowerQuery) ||
          s.service_variants?.some(v =>
            v.variant_name.toLowerCase().includes(lowerQuery)
          )
        )
      );
    }

    // If location is active, sort by proximity
    if (detectedLat && detectedLng) {
      filtered = filtered
        .filter(t => t.latitude && t.longitude)
        .map(t => ({
          ...t,
          distance: calculateDistance(detectedLat, detectedLng, t.latitude!, t.longitude!)
        }))
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));
    }

    return filtered;
  }, [detectedLat, detectedLng, calculateDistance]);

  // Get search results
  const searchResults = useMemo(() => {
    return searchFilter(technicians, searchQuery);
  }, [technicians, searchQuery, searchFilter]);

  // Check if search has results
  const hasSearchResults = searchQuery.trim().length > 0 && searchResults.length > 0;
  const hasNoSearchResults = searchQuery.trim().length > 0 && searchResults.length === 0 && !loadingTechnicians;

  // Build sections
  const sections = useMemo<Section[]>(() => {
    const liveTechnicians = technicians.filter(t => t.status === 'live');
    
    // Near You - sorted by proximity (when location is available)
    // Show when we have coordinates OR when we have detected location with county
    let nearYouTechs: Technician[] = [];
    const hasLocation = (detectedLat && detectedLng) || (detectedLocation && county);
    
    if (hasLocation) {
      if (detectedLat && detectedLng) {
        // Use coordinates if available
        nearYouTechs = [...liveTechnicians]
          .filter(t => t.latitude && t.longitude)
          .map(t => ({
            ...t,
            distance: calculateDistance(detectedLat, detectedLng, t.latitude!, t.longitude!)
          }))
          .sort((a, b) => (a.distance || 0) - (b.distance || 0))
          .slice(0, 8);
        
        // If no technicians with coordinates, fall back to county/area
        if (nearYouTechs.length === 0 && county) {
          const areaMatch = liveTechnicians.filter(t => 
            t.area?.toLowerCase() === detectedLocation.toLowerCase() ||
            t.area?.toLowerCase().includes(detectedLocation.toLowerCase())
          );
          
          if (areaMatch.length > 0) {
            nearYouTechs = areaMatch.slice(0, 8);
          } else {
            const countyMatch = liveTechnicians.filter(t => 
              t.county?.toLowerCase() === county.toLowerCase()
            );
            nearYouTechs = countyMatch.slice(0, 8);
          }
        }
      } else if (county) {
        // Use county/area as fallback
        const areaMatch = liveTechnicians.filter(t => 
          t.area?.toLowerCase() === detectedLocation.toLowerCase() ||
          t.area?.toLowerCase().includes(detectedLocation.toLowerCase())
        );
        
        if (areaMatch.length > 0) {
          nearYouTechs = areaMatch.slice(0, 8);
        } else {
          const countyMatch = liveTechnicians.filter(t => 
            t.county?.toLowerCase() === county.toLowerCase()
          );
          nearYouTechs = countyMatch.slice(0, 8);
        }
      }
    }

    // Top Rated - highest ratings with at least 1 review
    const topRatedTechs = [...liveTechnicians]
      .filter(t => (t.review_count || 0) >= 1)
      .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
      .slice(0, 8);

    // New category-based sections
    const bodyExteriorTechs = liveTechnicians.filter(t =>
      t.technician_services?.some(s => s.category === 'body_exterior')
    ).slice(0, 8);

    const electricalsTechs = liveTechnicians.filter(t =>
      t.technician_services?.some(s => s.category === 'car_electricals_security')
    ).slice(0, 8);

    const mechanicalTechs = liveTechnicians.filter(t =>
      t.technician_services?.some(s => s.category === 'mechanical_repair')
    ).slice(0, 8);

    const interiorTechs = liveTechnicians.filter(t =>
      t.technician_services?.some(s => s.category === 'interior_detailing')
    ).slice(0, 8);

    // They Come To You - mobile technicians
    const mobileTechs = liveTechnicians
      .filter(t => t.mobile_service === 'yes' || t.mobile_service === 'both')
      .slice(0, 8);

    // New on Mekh - newly approved
    const newTechs = [...liveTechnicians]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);

    return [
      {
        id: 'near-you',
        title: 'Near You',
        technicians: nearYouTechs,
        showSeeAll: nearYouTechs.length >= 8,
        isVisible: Boolean(hasLocation)
      },
      {
        id: 'top-rated',
        title: 'Top Rated',
        technicians: topRatedTechs,
        showSeeAll: topRatedTechs.length >= 8,
        isVisible: Boolean(topRatedTechs.length >= 1)
      },
      {
        id: 'body_exterior',
        title: 'Body & Exterior',
        technicians: bodyExteriorTechs,
        showSeeAll: bodyExteriorTechs.length >= 8,
        isVisible: Boolean(bodyExteriorTechs.length > 0)
      },
      {
        id: 'car_electricals_security',
        title: 'Car Electricals & Security',
        technicians: electricalsTechs,
        showSeeAll: electricalsTechs.length >= 8,
        isVisible: Boolean(electricalsTechs.length > 0)
      },
      {
        id: 'mechanical_repair',
        title: 'Mechanical & Repair',
        technicians: mechanicalTechs,
        showSeeAll: mechanicalTechs.length >= 8,
        isVisible: Boolean(mechanicalTechs.length > 0)
      },
      {
        id: 'interior_detailing',
        title: 'Interior & Detailing',
        technicians: interiorTechs,
        showSeeAll: interiorTechs.length >= 8,
        isVisible: Boolean(interiorTechs.length > 0)
      },
      {
        id: 'mobile',
        title: 'They Come To You',
        technicians: mobileTechs,
        showSeeAll: mobileTechs.length >= 8,
        isVisible: Boolean(mobileTechs.length > 0)
      },
      {
        id: 'new',
        title: 'New on Mekh',
        technicians: newTechs,
        showSeeAll: newTechs.length >= 8,
        isVisible: Boolean(newTechs.length > 0)
      }
    ];
  }, [technicians, locationPermission, detectedLat, detectedLng, detectedLocation, county]);

  // Get filtered technicians when a service is selected
  const filteredTechnicians = useMemo(() => {
    if (!selectedService || selectedService === 'all') return [];
    
    const category = SERVICE_CATEGORIES.find(c => c.value === selectedService);
    if (!category || category.keywords.length === 0) return [];
    
    return technicians.filter(t => 
      t.status === 'live' &&
      t.technician_services?.some(s => 
        category.keywords.some(kw => 
          s.service_name.toLowerCase().includes(kw.toLowerCase())
        )
      )
    ).slice(0, 8);
  }, [technicians, selectedService]);

  // Get first 3 articles for Latest Insights
  const latestInsights = useMemo(() => {
    return articles
      .filter(a => a.is_published)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }, [articles]);

  // Truncate title to first 6 words
  const truncateTitle = (title: string) => {
    const words = title.split(' ');
    if (words.length <= 6) return title;
    return words.slice(0, 6).join(' ') + '...';
  };

  // Sanitize search input to prevent XSS and ReDoS
  const sanitizeSearch = (input: string): string => {
    return input
      .replace(/[<>'"`;]/g, '') // strip HTML/script chars
      .replace(/\s{3,}/g, '  '); // collapse excessive whitespace
  };

  // Rate-limit debounce more aggressively on mobile
  const SEARCH_DEBOUNCE_MS = /Mobi|Android/i.test(navigator.userAgent) ? 500 : 300;

  // Handle search input change — debounced to reduce re-renders on low-end devices
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.slice(0, 100);
    const value = sanitizeSearch(raw);
    setSearchInputValue(value); // Immediate update for responsive input

    // Debounce the expensive filtering by mobile-aware timing
    if (searchDebounceTimeout.current) clearTimeout(searchDebounceTimeout.current);
    searchDebounceTimeout.current = setTimeout(() => {
      setSearchQuery(value.trim());
    }, SEARCH_DEBOUNCE_MS);
  };

  // Handle share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Mekh',
        text: 'Find the best car technicians in Kenya on Mekh!',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <>
      <Helmet>
        <title>Find Reliable Automotive Technicians in Nairobi | Mekh</title>
        <meta name="description" content="Find automotive technicians in Nairobi. Book verified car detailing, window tinting, car wrapping, ceramic coating, PPF, and tuning services. Mobile technicians come to you." />
        <link rel="canonical" href="https://mekh.app/" />
      </Helmet>
      <div className="pb-20">
      {/* Location Banner - Slim notification that slides in from top */}
      {showLocationBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
          <div className="bg-blue-600 border-b border-blue-600 px-4 py-3 shadow-lg">
            <div className="max-w-md mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-[#ffff] flex-shrink-0">
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-[#ffff] truncate">
                  See technicians near you
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleBannerDismiss}
                  className="text-[#ffff] hover:text-blue-500 text-xs px-2 py-1"
                >
                  Skip
                </button>
                <button
                  onClick={handleBannerEnable}
                  className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors"
                >
                  Enable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tagline and Search Section */}
      <section className="bg-primary-600 w-full py-2 pb-1">
        <div className="px-4 max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-[#ffff] text-center mb-3">
            Kenya's #1 Automotive Services Marketplace
          </h1>
          
          {/* Search Bar - Pill-shaped with search icon */}
          <div className="relative max-w-2xl mx-auto">
            {/* Search Icon - Left side */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-blue-600">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </div>
            
            <input
              id="search-input"
              name="search"
              type="text"
              value={searchInputValue}
              onChange={handleSearchChange}
              maxLength={100}
              placeholder="Search services or location"
              className="w-full pl-12 pr-14 py-3.5 bg-slate-900 border border-blue-500 rounded-full text-slate-500 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/50 text-base shadow-sm"
            />
            
            {/* Location clear button (X) - shown when location is detected */}
            {detectedLocation && (
              <button
                onClick={handleClearLocation}
                className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Clear location"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            
            {/* Location icon button - Solid blue circle with white icon */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <button
                onClick={handleLocationIconClick}
                disabled={isRequestingLocation}
                className={`w-10 h-10 rounded-full bg-primary-500 hover:bg-primary-600 flex items-center justify-center transition-colors shadow-md ${isRequestingLocation ? 'animate-pulse' : ''}`}
                aria-label="Use my location"
              >
                {isRequestingLocation ? (
                  <svg className="w-5 h-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-white">
                    <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Tooltip for location denied */}
            {locationTooltip && (
              <div className="absolute top-full left-0 right-0 mt-2 z-10">
                <div className="bg-blue-500 text-[#ffff] text-xs px-3 py-2 rounded-lg shadow-lg text-center">
                  type your area instead e.g Karen
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CLIENT WELCOME STRIP ─────────────────────────────── */}
      {isClient && !loadingClient && (
        <section className="px-4 pt-4 pb-2">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">

            {/* Greeting row */}
            <div className="mb-4">
              <p className="text-blue-500 font-black text-sm">
                👋 Welcome back, {client?.name?.split(' ')[0] ?? session?.user?.user_metadata?.name?.split(' ')[0] ?? 'there'}
              </p>
              <p className="text-slate-500 text-[11px]">
                {clientLeads.length} booking{clientLeads.length !== 1 ? 's' : ''} total
              </p>
            </div>

            {/* Latest booking card */}
            {latestLead ? (
              <div className="bg-blue-500 rounded-xl p-3">
                <p className="text-[10px] font-black text-[#ffff] uppercase tracking-widest mb-2">
                  Latest Booking
                </p>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[#ffff] font-bold text-sm truncate">
                      {latestLead.technicians?.business_name ?? 'Technician'}
                    </p>
                    <p className="text-slate-400 text-xs truncate">
                      {latestLead.service_name}
                    </p>
                    {/* Status badge */}
                    <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      latestLead.status === 'job_done'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : latestLead.status === 'contacted'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : latestLead.status === 'no_response'
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {latestLead.status === 'job_done'
                        ? '✓ Completed'
                        : latestLead.status === 'contacted'
                        ? '● Contacted'
                        : latestLead.status === 'no_response'
                        ? '✕ No Response'
                        : '○ Pending'}
                    </span>
                  </div>
                  <Link
                    to={`/technician/${latestLead.technicians?.slug}`}
                    className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all"
                  >
                    View
                  </Link>
                </div>
              </div>
            ) : (
              // No bookings yet — gentle nudge
              <div className="bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-slate-500 text-xs">
                  You have not made any bookings yet.
                </p>
                <p className="text-blue-400 text-xs font-bold mt-1">
                  Browse technicians below ↓
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── REVIEW NUDGE ─────────────────────────────────────── */}
      {isClient && reviewableLeads.length > 0 && (
        <section className="px-4 pb-2">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">⭐</span>
            <div className="flex-1 min-w-0">
              <p className="text-blue-500 font-black text-sm">Leave a review</p>
              <p className="text-slate-400 text-xs">
                You have {reviewableLeads.length} completed booking{reviewableLeads.length !== 1 ? 's' : ''} waiting for a review.
              </p>
            </div>
            <Link
              to="/bookings"
              className="flex-shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl transition-all"
            >
              Review
            </Link>
          </div>
        </section>
      )}

      {/* Service Filter Chips - Temporarily hidden */}
      {/*
      <section className="px-4 pb-4 mt-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {SERVICE_CATEGORIES.map((category) => (
            <button
              key={category.value}
              onClick={() => handleServiceChipClick(category.value)}
              className={`flex items-center gap-1 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === category.value
                  ? 'bg-blue-600 text-white border-2 border-blue-600'
                  : 'bg-slate-800 text-slate-300 border-2 border-slate-700 hover:border-slate-600'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      </section>
      */}

      {/* Search Results - Show when searching */}
      {searchQuery.trim().length > 0 && !loadingTechnicians ? (
        <section className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-bold text-blue-500">
                {hasSearchResults ? `Results for "${searchQuery}"` : 'Search Results'}
              </h2>
              {detectedLocation && (
                <p className="text-slate-400 text-sm mt-1">
                  📍 Prioritizing results near {detectedLocation}
                </p>
              )}
            </div>
            {hasSearchResults && (
              <span className="text-slate-400 text-sm">
                {searchResults.length} technician{searchResults.length !== 1 ? 's' : ''} found
              </span>
            )}
          </div>
          
          {hasSearchResults ? (
            <div 
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
              style={{ scrollBehavior: 'smooth', paddingBottom: '4px' }}
            >
              {searchResults.map((technician) => (
                <div 
                  key={technician.id} 
                  className="snap-start flex-shrink-0 w-[60vw] md:w-[44vw] lg:w-[30vw] max-w-[300px]"
                >
                  <TechnicianCard
                    technician={technician}
                    onBookNow={handleBookNow}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* No results message */
            <div className="text-center py-8 px-4">
              <div className="border border-blue-600 rounded-lg p-6 max-w-md mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-blue-500 mx-auto mb-4">
                  <path fillRule="evenodd" d="M8.25 6.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM15.75 9.75a3 3 0 116 0 3 3 0 01-6 0zM2.25 9.75a3 3 0 116 0 3 3 0 01-6 0zM6.31 15.117A6.745 6.745 0 0112 12a6.745 6.745 0 016.709 7.498.75.75 0 01-.372.568A12.696 12.696 0 0112 21.75c-2.305 0-4.47-.612-6.337-1.684a.75.75 0 01-.372-.568 6.787 6.787 0 011.019-4.38z" clipRule="evenodd" />
                  <path d="M5.082 14.254a8.287 8.287 0 00-1.308 5.135 9.687 9.687 0 01-1.764-.44l-.115-.04a.563.563 0 01-.373-.487l-.01-.121a3.75 3.75 0 013.57-4.047zM20.226 19.389a8.287 8.287 0 00-1.308-5.135 3.75 3.75 0 013.57 4.047l-.01.121a.563.563 0 01-.373.486l-.115.04c-.567.2-1.156.349-1.764.441z" />
                </svg>
                <p className="text-white text-lg font-medium mb-2">
                  No technicians found for "{searchQuery}"
                </p>
                <p className="text-slate-400 text-sm mb-4">
                  Know someone who does this?
                </p>
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" />
                  </svg>
                  Share Mekh with them
                </button>
              </div>
            </div>
          )}
        </section>
      ) : (
        /* Regular Sections - Show when not searching */
        <>
          {/* Selected Service Header - Shows when a service is selected */}
          {selectedService && selectedService !== 'all' && (
            <section className="px-4 pb-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  {SERVICE_CATEGORIES.find(c => c.value === selectedService)?.label || 'Results'}
                </h2>
                <button
                  onClick={() => handleServiceChipClick('all')}
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  Show All Sections
                </button>
              </div>
              <p className="text-slate-400 text-sm">
                {filteredTechnicians.length} technician{filteredTechnicians.length !== 1 ? 's' : ''} found
              </p>
            </section>
          )}

          {/* Render sections - Only when no service filter and no search */}
          {(!selectedService || selectedService === 'all') && (
            <>
              {/* Render each section */}
              {sections.filter(s => s.isVisible).map((section) => (
                <section key={section.id} className="pb-6">
                  {/* Section Header */}
                  <div className="px-4 pb-3 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-blue-500">{section.title}</h2>
                    {section.showSeeAll && (
                      <Link
                        to={`/search?filter=${section.id}`}
                        className="text-blue-500 text-sm hover:text-blue-300"
                      >
                        See All
                      </Link>
                    )}
                  </div>
                  
                  {/* Horizontal Scrollable Cards */}
                  <div 
                    className="flex gap-3 overflow-x-auto px-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
                    style={{ 
                      scrollBehavior: 'smooth',
                      paddingBottom: '4px'
                    }}
                  >
                    {/* Card dimensions: mobile 80vw, tablet 44vw, desktop 30vw */}
                    {section.technicians.map((technician) => (
                      <div 
                        key={technician.id} 
                        className="snap-start flex-shrink-0 w-[60vw] md:w-[44vw] lg:w-[30vw] max-w-[300px]"
                      >
                        <TechnicianCard
                          technician={technician}
                          onBookNow={handleBookNow}
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              {/* Latest Insights Section - Only show when articles exist */}
              {latestInsights.length > 0 && (
                <section className="pb-6">
                  {/* Section Header */}
                  <div className="px-4 pb-3">
                    <h2 className="text-lg font-bold text-blue-500">Latest Insights</h2>
                  </div>
                  
                  {/* Horizontal Scrollable Blog Links */}
                  <div 
                    className="flex gap-3 overflow-x-auto px-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
                    style={{ 
                      scrollBehavior: 'smooth',
                      paddingBottom: '4px'
                    }}
                  >
                    {latestInsights.map((article) => (
                      <Link
                        key={article.id}
                        to={`/blogs/${article.slug}`}
                        className="snap-start flex-shrink-0 w-[80vw] md:w-[44vw] lg:w-[30vw] max-w-[300px] border border-blue-500 rounded-lg p-4 hover:border-blue-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium line-clamp-2">
                            {truncateTitle(article.title)}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0 ml-2">
                            <path fillRule="evenodd" d="M4.72 3.97a.75.75 0 011.06 0l8.25 8.25a.75.75 0 010 1.06l-8.25 8.25a.75.75 0 01-1.06-1.06L11.69 12 4.72 5.03a.75.75 0 010-1.06z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Filtered Results - Single Row when service is selected */}
          {selectedService && selectedService !== 'all' && (
            <section className="pb-6">
              <div 
                className="flex gap-3 overflow-x-auto px-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
                style={{ 
                  scrollBehavior: 'smooth',
                  paddingBottom: '4px'
                }}
              >
                {loadingTechnicians ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="snap-start flex-shrink-0 w-[80vw] md:w-[44vw] lg:w-[30vw] max-w-[300px]"
                    >
                      <TechnicianCardSkeleton />
                    </div>
                  ))
                ) : filteredTechnicians.length > 0 ? (
                  filteredTechnicians.map((technician) => (
                    <div 
                      key={technician.id} 
                      className="snap-start flex-shrink-0 w-[80vw] md:w-[44vw] lg:w-[30vw] max-w-[300px]"
                    >
                      <TechnicianCard
                        technician={technician}
                        onBookNow={handleBookNow}
                      />
                    </div>
                  ))
                ) : (
                  <div className="flex-shrink-0 w-full px-4 py-8 text-center">
                    <p className="text-slate-400">No technicians found for this service.</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* Booking Modal */}
      {selectedTechnician && (
        <BookingModal
          technician={selectedTechnician}
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          onNeedAuth={() => { 
            setBookingOpen(false);
            sessionStorage.setItem('pendingBookTechnician', JSON.stringify(selectedTechnician));
            navigate('/auth', { state: { redirectMessage: 'Sign in to book this technician', returnTo: '/' } });
          }}
          preSelectedService={selectedTechnician.technician_services?.[0]?.service_name}
        />
      )}
    </div>
    </>
  );
};

export default HomePage;
