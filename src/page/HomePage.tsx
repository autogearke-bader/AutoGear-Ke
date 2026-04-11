import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Technician, ServiceCategory, SERVICE_CATEGORIES, Article } from '../../types';
import { getPublicTechnicians, getPublicArticles, getMyClientLeads, getMyClientNotifications, deleteNotification } from '../lib/api';
import { getSession, getMyClientProfile } from '../lib/auth';
import { TechnicianCard, TechnicianCardSkeleton } from '../components/TechnicianCard';
import { BookingModal } from '../components/BookingModal';
import { reverseGeocode } from '../lib/location';
import { Avatar } from '../components/Avatar';
import { profileFull } from '../lib/cloudinary';

// Service keywords for each category
const TINTING_SERVICES = ['tinting', 'tint', 'window', 'headlight restoration', 'tail light smoking', 'tail light', 'headlight'];
const WRAPPING_SERVICES = ['wrapping', 'wrap', 'ppf', 'paint protection', 'film', 'ceramic', 'coating', 'buffing', 'buff', 'polish'];
const DETAILING_SERVICES = ['detailing', 'detail', 'wash', 'clean', 'interior', 'exterior', 'polish'];

// All service keywords for search
const ALL_SERVICE_KEYWORDS = [
  ...TINTING_SERVICES,
  ...WRAPPING_SERVICES,
  ...DETAILING_SERVICES,
  'tuning', 'tune', 'ecu', 'performance',
  'riveting', 'rivet', 'identity', 'chrome', 'rim', 'license plate'
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
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingArticles, setLoadingArticles] = useState(true);
  
  // Service filter state
  const [activeFilter, setActiveFilter] = useState<ServiceCategory>('all');
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

  // Derived values from client data
  const isClient = session?.user?.user_metadata?.role === 'client';
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

  // Fetch technicians on mount
  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const data = await getPublicTechnicians();
        setTechnicians(data);
      } catch (error) {
        console.error('Failed to fetch technicians:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTechnicians();
  }, []);

  // Fetch articles
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await getPublicArticles();
        setArticles(data);
      } catch (error) {
        console.error('Failed to fetch articles:', error);
      } finally {
        setLoadingArticles(false);
      }
    };
    fetchArticles();
  }, []);

  // Fetch client data on mount
  useEffect(() => {
    const loadClientData = async () => {
      const currentSession = await getSession();
      setSession(currentSession);

      if (!currentSession) {
        setLoadingClient(false);
        return;
      }

      const role = currentSession.user?.user_metadata?.role;

      // Only load client data if user is a client
      // Technicians and admins are not clients
      if (role !== 'client') {
        setLoadingClient(false);
        return;
      }

      try {
        const [profile, leads, notifs] = await Promise.all([
          getMyClientProfile(),
          getMyClientLeads(),
          getMyClientNotifications(),
        ]);

        setClient(profile);
        setClientLeads(leads ?? []);
        setNotifications(notifs ?? []);
      } catch (err) {
        console.error('Failed to load client data:', err);
      } finally {
        setLoadingClient(false);
      }
    };

    loadClientData();
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

  // Update search input when location is detected
  useEffect(() => {
    if (detectedLocation) {
      setSearchInputValue(detectedLocation);
      setSearchQuery(detectedLocation);
    }
  }, [detectedLocation]);

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
          const technician = JSON.parse(pendingData) as Technician;
          const session = await getSession();
          if (session) {
            setSelectedTechnician(technician);
            setBookingOpen(true);
            setPendingBookTechnician(technician);
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
    
    const { service, location } = parseSearchQuery(query);
    const liveTechs = techs.filter(t => t.status === 'live');
    const lowerQuery = query.toLowerCase().trim();
    
    if (!service && !location) {
      // When no location keywords found, prioritize area matching
      // Try exact match first (highest priority)
      const exactAreaMatch = liveTechs.filter(t => 
        t.area?.toLowerCase() === lowerQuery
      );
      
      if (exactAreaMatch.length > 0) {
        return exactAreaMatch;
      }
      
      // Try prefix match (area starts with search term - e.g., "kasarani" matches "Kasarani location")
      const prefixAreaMatch = liveTechs.filter(t => 
        t.area?.toLowerCase().startsWith(lowerQuery)
      );
      
      if (prefixAreaMatch.length > 0) {
        return prefixAreaMatch;
      }
      
      // Try partial match on area
      const partialAreaMatch = liveTechs.filter(t => 
        t.area?.toLowerCase().includes(lowerQuery)
      );
      
      if (partialAreaMatch.length > 0) {
        return partialAreaMatch;
      }
      
      // Otherwise, do general search (business name, service keywords)
      // But exclude county matching to prioritize area-based searches
      return liveTechs.filter(t => 
        t.business_name?.toLowerCase().includes(lowerQuery) ||
        t.technician_services?.some(s => 
          s.service_name.toLowerCase().includes(lowerQuery)
        )
      );
    }
    
    // When we have a service but no explicit location keyword,
    // check if the service might actually be a location first
    if (service && !location) {
      const lowerService = service.toLowerCase().trim();
      
      // Try to match as location first (exact, prefix, then partial)
      const exactAreaMatch = liveTechs.filter(t => 
        t.area?.toLowerCase() === lowerService
      );
      
      if (exactAreaMatch.length > 0) {
        return exactAreaMatch;
      }
      
      const prefixAreaMatch = liveTechs.filter(t => 
        t.area?.toLowerCase().startsWith(lowerService)
      );
      
      if (prefixAreaMatch.length > 0) {
        return prefixAreaMatch;
      }
      
      const partialAreaMatch = liveTechs.filter(t => 
        t.area?.toLowerCase().includes(lowerService)
      );
      
      if (partialAreaMatch.length > 0) {
        return partialAreaMatch;
      }
      
      // If no area matches, treat as service search
      return liveTechs.filter(t => 
        t.technician_services?.some(s => 
          s.service_name.toLowerCase().includes(service)
        )
      );
    }
    
    let filtered = liveTechs;
    
    // Filter by service if specified (with explicit location keyword)
    if (service) {
      filtered = filtered.filter(t => 
        t.technician_services?.some(s => 
          s.service_name.toLowerCase().includes(service)
        )
      );
    }
    
    // Filter by location if specified - try exact, prefix, then partial match
    if (location) {
      const lowerLocation = location.toLowerCase().trim();
      
      // Try exact match first
      let locationMatches = filtered.filter(t =>
        t.area?.toLowerCase() === lowerLocation
      );
      
      // If no exact match, try prefix match
      if (locationMatches.length === 0) {
        locationMatches = filtered.filter(t =>
          t.area?.toLowerCase().startsWith(lowerLocation)
        );
      }
      
      // If still no match, try partial match
      if (locationMatches.length === 0) {
        locationMatches = filtered.filter(t =>
          t.area?.toLowerCase().includes(lowerLocation)
        );
      }
      
      filtered = locationMatches;
    }
    
    return filtered;
  }, [parseSearchQuery]);

  // Get search results
  const searchResults = useMemo(() => {
    return searchFilter(technicians, searchQuery);
  }, [technicians, searchQuery, searchFilter]);

  // Check if search has results
  const hasSearchResults = searchQuery.trim().length > 0 && searchResults.length > 0;
  const hasNoSearchResults = searchQuery.trim().length > 0 && searchResults.length === 0 && !loading;

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

    // Top Rated - highest ratings with 3+ reviews
    const topRatedTechs = [...liveTechnicians]
      .filter(t => (t.review_count || 0) >= 3)
      .sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0))
      .slice(0, 8);

    // Tinting, Head Restoration and Tail Light Smoking Specialists
    const tintingTechs = filterByService(liveTechnicians, TINTING_SERVICES).slice(0, 8);

    // Wrapping, PPF, Buffing and Ceramic Coating Specialists
    const wrappingTechs = filterByService(liveTechnicians, WRAPPING_SERVICES).slice(0, 8);

    // Car Detailing Nairobi Specialists
    const detailingTechs = filterByService(liveTechnicians, DETAILING_SERVICES).slice(0, 8);

    // They Come To You - mobile technicians
    const mobileTechs = liveTechnicians
      .filter(t => t.mobile_service === 'yes' || t.mobile_service === 'both')
      .slice(0, 8);

    // New on AutoGear Ke - newly approved
    const newTechs = [...liveTechnicians]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);

    return [
      {
        id: 'near-you',
        title: 'Near You',
        technicians: nearYouTechs,
        showSeeAll: nearYouTechs.length >= 8,
        isVisible: nearYouTechs.length > 0
      },
      {
        id: 'top-rated',
        title: 'Top Rated',
        technicians: topRatedTechs,
        showSeeAll: topRatedTechs.length >= 8,
        isVisible: topRatedTechs.length >= 3
      },
      {
        id: 'tinting',
        title: 'Tinting Specialists - Windows, Headlights & Tail Light Smoking',
        technicians: tintingTechs,
        showSeeAll: tintingTechs.length >= 8,
        isVisible: tintingTechs.length > 0
      },
      {
        id: 'wrapping',
        title: 'Car Wrapping, PPF & Ceramic Coating Specialists',
        technicians: wrappingTechs,
        showSeeAll: wrappingTechs.length >= 8,
        isVisible: wrappingTechs.length > 0
      },
      {
        id: 'detailing',
        title: 'Professional Detailing & Interior Care Experts',
        technicians: detailingTechs,
        showSeeAll: detailingTechs.length >= 8,
        isVisible: detailingTechs.length > 0
      },
      {
        id: 'mobile',
        title: 'They Come To You',
        technicians: mobileTechs,
        showSeeAll: mobileTechs.length >= 8,
        isVisible: mobileTechs.length > 0
      },
      {
        id: 'new',
        title: 'New on AutoGear Ke',
        technicians: newTechs,
        showSeeAll: newTechs.length >= 8,
        isVisible: newTechs.length > 0
      }
    ];
  }, [technicians, locationPermission, detectedLat, detectedLng, detectedLocation, county, filterByService]);

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

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInputValue(value);
    setSearchQuery(value);
  };

  // Handle share
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'AutoGear Ke',
        text: 'Find the best car technicians in Kenya on AutoGear Ke!',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="pb-20">
      {/* Location Banner - Slim notification that slides in from top */}
      {showLocationBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 animate-slide-down">
          <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 shadow-lg">
            <div className="max-w-md mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-400 flex-shrink-0">
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-white truncate">
                  See technicians near you
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleBannerDismiss}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1"
                >
                  Skip
                </button>
                <button
                  onClick={handleBannerEnable}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors"
                >
                  Enable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar - Single input with location icon */}
      <section className="px-4 pt-4">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 text-center">
          Kenya's #1 Automotive Services Marketplace
        </h1>
        <div className="relative">
          <input
            type="text"
            value={searchInputValue}
            onChange={handleSearchChange}
            placeholder="Search services or Location"
            className="w-full px-4 py-3 pr-20 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 text-base"
          />
          
          {/* Location clear button (X) - shown when location is detected */}
          {detectedLocation && (
            <button
              onClick={handleClearLocation}
              className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
              aria-label="Clear location"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          
          {/* Location icon button */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <button
              onClick={handleLocationIconClick}
              disabled={isRequestingLocation}
              className={`p-1.5 rounded-full transition-colors ${
                locationPermission === 'granted' 
                  ? 'text-blue-400 hover:text-blue-300' 
                  : 'text-slate-400 hover:text-white'
              } ${isRequestingLocation ? 'animate-pulse' : ''}`}
              aria-label="Use my location"
            >
              {isRequestingLocation ? (
                <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Tooltip for location denied */}
          {locationTooltip && (
            <div className="absolute top-full left-0 right-0 mt-2 z-10">
              <div className="bg-slate-700 text-white text-xs px-3 py-2 rounded-lg shadow-lg text-center">
                type your area instead e.g Karen
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── CLIENT WELCOME STRIP ─────────────────────────────── */}
      {isClient && !loadingClient && client && (
        <section className="px-4 pt-4 pb-2">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">

            {/* Greeting row */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar
                  imageUrl={client.profile_image ? profileFull(client.profile_image) : null}
                  name={client.name}
                  size="sm"
                />
                <div>
                  <p className="text-white font-black text-sm">
                    👋 Welcome back, {client.name?.split(' ')[0] ?? 'there'}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    {clientLeads.length} booking{clientLeads.length !== 1 ? 's' : ''} total
                  </p>
                </div>
              </div>

              {/* Notification bell */}
              <Link to="/notifications" className="relative">
                <div className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-all">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              </Link>
            </div>

            {/* Latest booking card */}
            {latestLead ? (
              <div className="bg-slate-800 rounded-xl p-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Latest Booking
                </p>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm truncate">
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

            {/* Quick action row */}
            <div className="flex gap-2 mt-3">
              <Link
                to="/bookings"
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                My Bookings
              </Link>
              <Link
                to="/profile"
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-black uppercase tracking-widest py-2.5 rounded-xl transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </Link>
            </div>

          </div>
        </section>
      )}

      {/* ── REVIEW NUDGE ─────────────────────────────────────── */}
      {isClient && reviewableLeads.length > 0 && (
        <section className="px-4 pb-2">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl flex-shrink-0">⭐</span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm">Leave a review</p>
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

      {/* Service Filter Chips */}
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

      {/* Search Results - Show when searching */}
      {searchQuery.trim().length > 0 && !loading ? (
        <section className="px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">
              {hasSearchResults ? `Results for "${searchQuery}"` : 'Search Results'}
            </h2>
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
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12 text-slate-500 mx-auto mb-4">
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
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" />
                  </svg>
                  Share AutoGear Ke with them
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
                    <h2 className="text-lg font-bold text-white">{section.title}</h2>
                    {section.showSeeAll && (
                      <Link
                        to={`/search?filter=${section.id}`}
                        className="text-blue-400 text-sm hover:text-blue-300"
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
                    <h2 className="text-lg font-bold text-white">Latest Insights</h2>
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
                        className="snap-start flex-shrink-0 w-[80vw] md:w-[44vw] lg:w-[30vw] max-w-[300px] bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm font-medium line-clamp-2">
                            {truncateTitle(article.title)}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400 flex-shrink-0 ml-2">
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
                {loading ? (
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
  );
};

export default HomePage;
