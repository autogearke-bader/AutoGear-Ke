// src/components/UpdatePrompt.tsx
import { useEffect, useState } from 'react';

export const UpdatePrompt = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  // ✅ Detect if running as installed PWA
  useEffect(() => {
    const checkPWA = () => {
      const isStandalone    = window.matchMedia('(display-mode: standalone)').matches;
      const isTabbed        = window.matchMedia('(display-mode: tabbed)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      setIsPWA(isStandalone || isTabbed || isIOSStandalone);
    };
    checkPWA();
  }, []);

  useEffect(() => {
    const handler = () => setShowPrompt(true);
    window.addEventListener('swUpdateAvailable', handler);
    return () => window.removeEventListener('swUpdateAvailable', handler);
  }, []);

  const handleUpdate = async () => {
    // Clear all caches before reloading
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }
    
    // Unregister service worker and reload
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
    
    window.location.reload();
  };

  // ✅ Only render if running as PWA AND update is available
  if (!isPWA || !showPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 bg-slate-900 border border-blue-600 rounded-2xl p-4 flex items-center gap-3 z-50 shadow-xl">
      <div className="flex-1">
        <p className="text-white font-bold text-sm">Update Available</p>
        <p className="text-slate-400 text-xs">A new version of Mekh is ready</p>
      </div>
      <button
        onClick={handleUpdate}
        className="bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-full"
      >
        Update
      </button>
      <button
        onClick={() => setShowPrompt(false)}
        className="text-slate-500 text-xs"
      >
        ✕
      </button>
    </div>
  );
};