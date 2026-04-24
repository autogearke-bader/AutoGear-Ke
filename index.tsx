
import React from 'react';
import ReactDOM from 'react-dom/client';
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
    <App />
  </React.StrictMode>
);

registerSW({
  onRegistered(r) {
    // Check for updates every 60 seconds in the background
    r && setInterval(() => r.update(), 60 * 1000);
  },
  onOfflineReady() {
    console.log('Mekh ready for offline use');
  },
  immediate: true,
});
