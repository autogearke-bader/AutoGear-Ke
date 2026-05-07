import React from 'react';
import { useNavigate } from 'react-router-dom';

export const OfflineFallback: React.FC = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Offline Icon */}
        <div className="mb-6">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            className="w-20 h-20 mx-auto text-blue-500"
          >
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-black text-blue-500 mb-3">
          You're Offline
        </h1>

        {/* Description */}
        <p className="text-slate-400 text-sm mb-6">
          It looks like you don't have an internet connection. Please check your network and try again.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleGoHome}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3 px-6 rounded-full transition-colors"
          >
            Go to Home
          </button>
        </div>

        {/* Tips */}
        <div className="mt-8 text-left bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-blue-500 font-bold text-xs mb-2">💡 Tips:</p>
          <ul className="text-slate-400 text-xs space-y-1">
            <li>• Check if your WiFi or mobile data is turned on</li>
            <li>• Try switching between WiFi and mobile data</li>
            <li>• Move to an area with better signal</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
