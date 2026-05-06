
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './src/index.css';
import { registerSW } from 'virtual:pwa-register';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

registerSW({
  onRegistered(r) {
    // Check for updates every 60 seconds in the background
    r && setInterval(() => r.update(), 60 * 1000);
  },
  onNeedRefresh() {
    // ✅ Only notify if user is in PWA mode — browser users get silent update
    const isStandalone    = window.matchMedia('(display-mode: standalone)').matches;
    const isTabbed        = window.matchMedia('(display-mode: tabbed)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    const isPWA           = isStandalone || isTabbed || isIOSStandalone;

    if (isPWA) {
      // PWA: prompt user to update
      window.dispatchEvent(new CustomEvent('swUpdateAvailable'));
    } else {
      // Browser: silently activate the new SW — no disruption since
      // the browser tab will naturally reload on next navigation
      // (skipWaiting: false means it only activates when all tabs close)
    }
  },
  onOfflineReady() {
    console.log('Mekh ready for offline use');
  },
  immediate: true,
});
