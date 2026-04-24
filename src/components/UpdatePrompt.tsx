// src/components/UpdatePrompt.tsx
import React from 'react';
import { useServiceWorker } from '../hooks/useServiceWorker';

export const UpdatePrompt: React.FC = () => {
  const { needRefresh, update } = useServiceWorker();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-36 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div className="bg-slate-800 border border-blue-500/50 rounded-xl shadow-2xl p-4 flex items-center gap-4 max-w-sm w-full pointer-events-auto animate-slide-up">
        {/* Icon */}
        <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold">Update Available</p>
          <p className="text-slate-400 text-xs mt-0.5">A new version of Mekh is ready</p>
        </div>

        {/* Button */}
        <button
          onClick={update}
          className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors"
        >
          Update
        </button>
      </div>
    </div>
  );
};