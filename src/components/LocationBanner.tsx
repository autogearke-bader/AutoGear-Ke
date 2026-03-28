// This banner appears at the top of the page on first visit
// asking users to enable location for better technician matching.
// It persists until user either allows or explicitly dismisses it.
// Uses localStorage key 'location_banner_dismissed' to remember dismissal.

import { useState, useEffect } from 'react';
import { requestLocation, reverseGeocode } from '../lib/location';

interface LocationBannerProps {
  onLocationDetected: (areaName: string, lat: number, lng: number) => void;
}

export const LocationBanner = ({ onLocationDetected }: LocationBannerProps) => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const dismissed = localStorage.getItem('location_banner_dismissed');
    const alreadyGranted = localStorage.getItem('location_granted');
    if (!dismissed && !alreadyGranted) {
      // Show banner after 1.5 seconds so it does not feel intrusive on load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    setError('');
    try {
      const position = await requestLocation();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const areaName = await reverseGeocode(lat, lng);
      localStorage.setItem('location_granted', 'true');
      onLocationDetected(areaName, lat, lng);
      setVisible(false);
    } catch {
      setError('Location access denied. You can still search manually.');
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('location_banner_dismissed', 'true');
    setVisible(false);
  };

  if (!visible) return null;

  // Style using existing project Tailwind classes and color variables
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:bottom-6 md:left-6 md:right-auto md:max-w-sm">
      <div className="bg-card border border-border rounded-lg p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">📍</span>
          <div className="flex-1">
            <p className="font-semibold text-sm text-text mb-1">
              Enable location for better results
            </p>
            <p className="text-xs text-muted mb-3 leading-relaxed">
              We use your location to show technicians nearest to you first.
              Your location is never stored or shared publicly.
            </p>
            {error && (
              <p className="text-xs text-red-400 mb-2">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleEnable}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 px-3 rounded font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Detecting...' : 'Enable Location'}
              </button>
              <button
                onClick={handleDismiss}
                className="border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 text-xs py-2 px-3 rounded font-medium transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
