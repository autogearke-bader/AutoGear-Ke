
import React from 'react';
import { WHATSAPP_NUMBER } from '../constants.ts';

interface WhatsAppButtonProps {
  message: string;
  label: string;
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

const WhatsAppButton: React.FC<WhatsAppButtonProps> = ({ 
  message, 
  label, 
  className = "", 
  fullWidth = false,
  disabled = false
}) => {
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  
  if (disabled) {
    return (
      <button 
        disabled
        className={`inline-flex items-center justify-center bg-slate-800 text-slate-500 font-bold py-3 px-6 rounded-lg cursor-not-allowed opacity-60 border border-slate-700 ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        Out of Stock
      </button>
    );
  }

  return (
    <a 
      href={waUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-all active:scale-95 hover:shadow-lg hover:shadow-green-900/20 ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      <svg className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.246 2.248 3.484 5.237 3.483 8.42-.003 6.557-5.338 11.892-11.893 11.892-1.997-.001-3.951-.5-5.688-1.448l-6.308 1.654zm6.222-4.715c1.581.933 3.404 1.423 5.263 1.423 5.461 0 9.903-4.444 9.906-9.907.002-2.651-1.032-5.147-2.908-7.024-1.876-1.877-4.372-2.91-7.022-2.911-5.463 0-9.906 4.444-9.909 9.907-.001 1.932.553 3.802 1.597 5.438l-1.057 3.856 3.951-1.036zm10.634-7.527c-.299-.149-1.765-.871-2.04-.971-.274-.1-.473-.149-.673.149-.199.299-.771.971-.945 1.17-.175.199-.349.224-.648.075-.299-.149-1.263-.465-2.403-1.482-.887-.791-1.487-1.769-1.661-2.068-.174-.299-.019-.461.13-.609.135-.133.299-.349.448-.523.149-.174.199-.299.299-.498.1-.199.05-.374-.025-.523-.075-.149-.673-1.62-.922-2.218-.242-.584-.487-.504-.673-.513-.173-.008-.373-.01-.573-.01-.2 0-.523.075-.797.373-.274.299-1.045 1.021-1.045 2.49 0 1.47 1.071 2.889 1.22 3.088.149.199 2.107 3.218 5.103 4.512.712.308 1.27.491 1.703.629.715.227 1.365.195 1.88.117.573-.088 1.765-.722 2.015-1.42.25-.698.25-1.296.174-1.42-.075-.124-.274-.199-.573-.348z"/></svg>
      {label}
    </a>
  );
};

export default WhatsAppButton;
