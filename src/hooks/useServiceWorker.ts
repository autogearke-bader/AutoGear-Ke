// src/hooks/useServiceWorker.ts
import { useState, useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const useServiceWorker = () => {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Check for updates every 60 seconds
      if (r) {
        setInterval(() => r.update(), 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const update = () => updateServiceWorker(true);

  return { needRefresh, update };
};