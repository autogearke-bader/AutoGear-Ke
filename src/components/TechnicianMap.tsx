// Renders a Leaflet map on the technician profile page.
// Uses OpenStreetMap tiles — completely free, no API key needed.
// Shows technician's general area with a marker.
// Leaflet CSS must be imported in index.html.

import { useEffect, useRef, useId } from 'react';
import { COUNTY_COORDINATES } from '../lib/location';

interface TechnicianMapProps {
  county: string;
  area: string;
  lat?: number;
  lng?: number;
}

export const TechnicianMap = ({ county, area, lat, lng }: TechnicianMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const initialized = useRef(false);
  const mapId = useId();

  useEffect(() => {
    // Prevent multiple initializations
    if (initialized.current || !mapRef.current) return;

    // Check if map is already initialized on this container
    if (mapInstance.current) return;

    // Ensure we have valid numbers - handle string values from database
    const latNum = typeof lat === 'number' ? lat : parseFloat(String(lat));
    const lngNum = typeof lng === 'number' ? lng : parseFloat(String(lng));
    
    // Validate coordinates are valid numbers within Kenya bounds
    const isValidCoords = 
      !isNaN(latNum) && !isNaN(lngNum) && 
      latNum >= -5 && latNum <= 5 &&  // Kenya latitude range
      lngNum >= 33 && lngNum <= 42;  // Kenya longitude range

    // Use provided coords or fall back to county center
    const coords = isValidCoords
      ? [latNum, lngNum]
      : COUNTY_COORDINATES[county] || [-1.2921, 36.8219];

    // Dynamically import Leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Double-check after async import
      if (initialized.current || !mapRef.current) return;
      
      // Check if Leaflet has already initialized a map on this container
      if ((L.default as any)._mapPanels && (L.default as any)._mapPanels[mapRef.current.id]) {
        return;
      }

      try {
        const map = L.default.map(mapRef.current, {
          center: coords as [number, number],
          zoom: 14,
          zoomControl: true,
          scrollWheelZoom: false,
        });

        // OpenStreetMap tiles — free, no API key
        L.default.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(map);

        // Custom marker
        const icon = L.default.divIcon({
          html: '<div style="background:#e8a020;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
          className: '',
        });

        L.default.marker(coords as [number, number], { icon })
          .addTo(map)
          .bindPopup(`<b>${area}</b><br>${county}`)
          .openPopup();

        mapInstance.current = map;
        initialized.current = true;
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    });

    return () => {
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch (e) {
          // Ignore removal errors
        }
        mapInstance.current = null;
        initialized.current = false;
      }
    };
  }, [county, area, lat, lng]);

  return (
    <div
      id={mapId}
      ref={mapRef}
      style={{ height: '220px', width: '100%' }}
      className="rounded border border-slate-700 z-0"
    />
  );
};
