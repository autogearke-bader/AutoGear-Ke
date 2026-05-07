import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Technician } from '../types';
import { getPublicTechnicianBySlug } from '../src/lib/api';
import { supabase } from '../src/lib/supabase';
import { TechnicianCard, TechnicianCardSkeleton } from '../src/components/TechnicianCard';

// Helper function to calculate distance between two coordinates (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Helper function to extract keywords from area string
const extractAreaKeywords = (area: string): string[] => {
  if (!area) return [];
  // Remove common words and split by spaces, commas, and special characters
  const commonWords = ['opposite', 'near', 'next', 'to', 'at', 'in', 'on', 'the', 'a', 'an'];
  const words = area
    .toLowerCase()
    .replace(/[,\-()]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !commonWords.includes(word));
  return [...new Set(words)]; // Remove duplicates
};

// Helper function to check if two areas match based on keywords
const areasMatch = (area1: string, area2: string): boolean => {
  if (!area1 || !area2) return false;
  const keywords1 = extractAreaKeywords(area1);
  const keywords2 = extractAreaKeywords(area2);
  
  // Check if any keywords match
  return keywords1.some(keyword => 
    keywords2.some(k2 => k2.includes(keyword) || keyword.includes(k2))
  );
};

const NearbyTechniciansPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [currentTechnician, setCurrentTechnician] = useState<Technician | null>(null);
  const [nearbyTechnicians, setNearbyTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNearbyTechnicians = async () => {
      if (!slug) return;

      try {
        setLoading(true);
        
        // Fetch the current technician
        const current = await getPublicTechnicianBySlug(slug);
        setCurrentTechnician(current);

        // Fetch all live technicians
        const { data: allTechnicians, error: fetchError } = await supabase
          .from('technicians')
          .select(`
            id, first_name, last_name, business_name, slug, phone, email, bio, experience_years,
            county, area, mobile_service, instagram, tiktok_link, youtube_link, pricing_notes,
            status, user_id, profile_image, cover_photo, thumbnail_image, created_at,
            latitude, longitude, google_maps_link,
            technician_services(
              id, technician_id, service_name, category, price, negotiable, notes,
              service_variants(id, service_id, variant_name, price, is_negotiable)
            ),
            technician_photos(id, technician_id, photo_url, service, caption, alt_text, sort_order),
            technician_videos(id, technician_id, platform, video_url, video_id, service, alt_text, sort_order, created_at, thumbnail_url),
            technician_payments(id, method),
            avg_rating,
            review_count,
            reviews(id, technician_id, lead_id, client_id, client_name, rating, comment, would_rebook, is_visible, status, admin_notes, approved_by, updated_at, created_at)
          `)
          .eq('status', 'live')
          .neq('id', current.id); // Exclude current technician

        if (fetchError) throw fetchError;

        const technicians = (allTechnicians || []) as Technician[];
        
        // Strategy 1: Area name matching (fuzzy/partial match)
        const areaMatches = technicians.filter(tech => 
          areasMatch(current.area, tech.area)
        );

        // Strategy 2: Coordinate proximity matching (within 10km radius)
        const proximityMatches: (Technician & { distance?: number })[] = [];
        if (current.latitude && current.longitude) {
          technicians.forEach(tech => {
            if (tech.latitude && tech.longitude) {
              const distance = calculateDistance(
                current.latitude!,
                current.longitude!,
                tech.latitude,
                tech.longitude
              );
              
              // Include if within 10km radius
              if (distance <= 10) {
                proximityMatches.push({
                  ...tech,
                  distance // Add distance for sorting
                });
              }
            }
          });
        }

        // Combine both strategies and remove duplicates
        const combinedMatches = new Map<string, Technician & { distance?: number }>();
        
        // Add area matches first (higher priority)
        areaMatches.forEach(tech => {
          combinedMatches.set(tech.id, tech);
        });
        
        // Add proximity matches
        proximityMatches.forEach(tech => {
          if (!combinedMatches.has(tech.id)) {
            combinedMatches.set(tech.id, tech);
          }
        });

        // Convert to array and sort by distance if available, otherwise by rating
        const nearby = Array.from(combinedMatches.values()).sort((a, b) => {
          // If both have distance, sort by distance
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          // If only one has distance, prioritize it
          if (a.distance !== undefined) return -1;
          if (b.distance !== undefined) return 1;
          // Otherwise sort by rating
          return (b.avg_rating || 0) - (a.avg_rating || 0);
        });

        setNearbyTechnicians(nearby);
      } catch (err) {
        console.error('Error fetching nearby technicians:', err);
        setError('Failed to load nearby technicians');
      } finally {
        setLoading(false);
      }
    };

    fetchNearbyTechnicians();
  }, [slug]);

  if (!slug) {
    return <Navigate to="/404" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pt-16 md:pt-20">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="mb-8">
            <div className="h-8 w-64 bg-slate-800 rounded animate-pulse mb-2" />
            <div className="h-4 w-96 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <TechnicianCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentTechnician) {
    return (
      <div className="min-h-screen bg-slate-950 pt-16 md:pt-20 flex flex-col items-center justify-center px-4">
        <h1 className="text-4xl font-black text-blue-500 mb-4">Error</h1>
        <p className="text-slate-400 mb-8">{error || 'Technician not found'}</p>
        <Link 
          to="/"
          className="bg-blue-600 hover:bg-blue-700 text-[#ffff] px-8 py-3 rounded-full font-bold text-sm uppercase tracking-widest transition-all"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pt-16 md:pt-20">
      <Helmet>
        <title>Technicians near {currentTechnician.area} | Mekh</title>
        <meta 
          name="description" 
          content={`Find professional automotive technicians near ${currentTechnician.area}. Browse profiles, compare services, and book with confidence on Mekh.`} 
        />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to={`/technician/${currentTechnician.slug}`}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors inline-flex items-center gap-1 mb-4"
          >
            ← Back to {currentTechnician.business_name}
          </Link>
          
          <h1 className="text-3xl md:text-4xl font-black text-blue-500 mb-2">
            Technicians near {currentTechnician.area}
          </h1>
          <p className="text-slate-400">
            {nearbyTechnicians.length} {nearbyTechnicians.length === 1 ? 'technician' : 'technicians'} found in the area
          </p>
        </div>

        {/* Technicians Grid */}
        {nearbyTechnicians.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {nearbyTechnicians.map(technician => (
              <TechnicianCard key={technician.id} technician={technician} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg mb-4">
              No other technicians found near {currentTechnician.area}
            </p>
            <Link 
              to="/"
              className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Browse all technicians →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyTechniciansPage;
