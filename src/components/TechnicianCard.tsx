import React from 'react';
import { Link } from 'react-router-dom';
import { Technician } from '../../types';
import { cardThumbnail } from '../lib/cloudinary';
import { createWhatsAppLead } from '../lib/api';

interface TechnicianCardProps {
  technician: Technician;
  onBookNow?: (technician: Technician) => void;
}

export const TechnicianCard: React.FC<TechnicianCardProps> = ({ technician, onBookNow }) => {
  // Use thumbnail_image if available, otherwise fall back to cover_photo or first photo
  const coverPhoto = technician.thumbnail_image || technician.cover_photo || technician.technician_photos?.[0]?.photo_url;
  
  // Handle WhatsApp click - creates lead and redirects to WhatsApp
  const handleWhatsAppClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Get the first service or use a default message
    const service = technician.technician_services?.[0]?.service_name || 'General Inquiry';
    
    try {
      // Create lead (this also sends notification to technician)
      await createWhatsAppLead(technician.id, service);
    } catch (error) {
      console.error('Failed to create lead:', error);
      // Continue anyway to allow WhatsApp redirect
    }
    
    // Redirect to WhatsApp with technician's phone number
    const phoneNumber = technician.phone.replace(/\D/g, ''); // Remove non-digits
    const message = encodeURIComponent(`Hi ${technician.business_name}, I'm interested in your services. Could you please provide more information?`);
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on action buttons
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
      return;
    }
  };
  
  return (
    <Link 
      to={`/technician/${technician.slug}`}
      className="bg-[#f8fafc] border border-slate-200 rounded-lg overflow-hidden hover:border-primary-600 transition-colors group block"
      onClick={handleCardClick}
    >
      {/* Cover Image */}
      <div className="relative h-42 md:h-42 lg:h-42 overflow-hidden">
        {coverPhoto ? (
          <img
            src={cardThumbnail(coverPhoto)}
            alt={`${technician.business_name} - ${technician.technician_services?.[0]?.service_name || 'Auto services'} in ${technician.area}, ${technician.county}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            width={400}
            height={250}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-900 to-slate-900 flex items-center justify-center">
            <span className="text-2xl"></span>
          </div>
        )}
    
        {/* Rating Badge */}
        <div className="absolute top-1 right-1 bg-blue-500 backdrop-blur-sm px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <span className="text-[#F59E0B] text-[15px]">★</span>
          <span className="text-[#ffff] text-[10px] font-medium">
            {technician.review_count > 0 ? (technician.avg_rating || 0).toFixed(1) : 'New'}
          </span>
          <span className="text-[#ffff] text-[8px]">({technician.review_count || 0})</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-2 md:p-3">
        {/* Business Name */}
        <h3 className="font-bold text-[#0f172a] text-xs md:text-sm mb-0.5 truncate group-hover:text-primary-600 transition-colors">
          {technician.business_name}
        </h3>

        {/* Location - Using SVG icon */}
        <p className="text-blue-500 text-[10px] md:text-xs mb-1 flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
            <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
          </svg>
          {technician.area}
        </p>

        {/* Services Preview */}
        <div className="flex flex-wrap gap-0.5 mb-1">
          {technician.technician_services?.slice(0, 2).map((service, idx) => (
            <span 
              key={idx}
              className="text-[9px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded truncate max-w-[80px]"
            >
              {service.service_name}
            </span>
          ))}
          {(technician.technician_services?.length || 0) > 2 && (
            <span className="text-[8px] text-slate-500">
              +{technician.technician_services!.length - 2}
            </span>
          )}
        </div>

        {/* Service Type Badge */}
        <div className="flex items-center gap-1">
          {technician.mobile_service === 'yes' && (
            <span className="inline-flex items-center gap-0.5 text-[9px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded border border-primary-200">
              Mobile
            </span>
          )}
          {technician.mobile_service === 'no' && (
            <span className="inline-flex items-center gap-0.5 text-[9px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded border border-primary-200">
              Studio
            </span>
          )}
          {technician.mobile_service === 'both' && (
            <span className="inline-flex items-center gap-0.5 text-[9px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded border border-primary-200">
              Both
            </span>
          )}
        </div>
        
      </div>
    </Link>
  );
};

// Skeleton loading state
export const TechnicianCardSkeleton: React.FC = () => {
  return (
    <div className="bg-[#f8fafc] border border-slate-200 rounded-lg overflow-hidden animate-pulse">
      <div className="h-24 md:h-28 lg:h-32 bg-slate-200" />
      <div className="p-2 md:p-3">
        <div className="h-3 bg-slate-200 rounded w-3/4 mb-1.5" />
        <div className="h-2 bg-slate-200 rounded w-1/2 mb-2" />
        <div className="flex gap-1 mb-2">
          <div className="h-4 bg-slate-200 rounded w-14" />
          <div className="h-4 bg-slate-200 rounded w-14" />
        </div>
        <div className="h-5 bg-slate-200 rounded w-16" />
      </div>
    </div>
  );
};
