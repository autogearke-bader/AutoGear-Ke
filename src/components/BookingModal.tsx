// IMPORTANT FLOW:
// 1. Client clicks Book Now on any technician card or profile
// 2. Check if client is authenticated (Supabase session exists)
// 3. If NOT authenticated → close BookingModal, open AuthModal
// 4. After AuthModal success → automatically reopen BookingModal
// 5. Client fills in their details in BookingModal
// 6. On submit → save lead to Supabase → redirect to WhatsApp

import { useState, useEffect } from 'react';
import { getSession, getMyClientProfile } from '../lib/auth';
import { getLocationWithName } from '../lib/location';
import { supabase } from '../lib/supabase';
import type { Technician, TechnicianService } from '../../types';

interface BookingModalProps {
  technician: Technician;
  preSelectedService?: string;
  isOpen: boolean;
  onClose: () => void;
  onNeedAuth: () => void; // called when client is not authenticated
}

export const BookingModal = ({ 
  technician, 
  preSelectedService, 
  isOpen, 
  onClose, 
  onNeedAuth 
}: BookingModalProps) => {
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedService, setSelectedService] = useState(preSelectedService || '');
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [serviceDetails, setServiceDetails] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [locationText, setLocationText] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState('');

  // Check auth and pre-fill data on open
  useEffect(() => {
    if (!isOpen) return;

    const checkAuth = async () => {
      const session = await getSession();
      if (!session) {
        onNeedAuth();
        return;
      }

      // Get client profile for pre-fill
      const client = await getMyClientProfile();
      if (client) {
        setClientName(client.name);
        setClientPhone(client.phone);
        setClientId(client.id);
        setClientEmail(session.user.email || ''); // Use session user email with fallback
      }
    };

    checkAuth();
  }, [isOpen, onNeedAuth]);

  // Pre-select service if provided
  useEffect(() => {
    if (preSelectedService) {
      if (preSelectedService.includes(' - ')) {
        const [serviceName, variantName] = preSelectedService.split(' - ', 2);
        setSelectedService(serviceName);
        setSelectedVariants([variantName]);
      } else {
        setSelectedService(preSelectedService);
      }
    }
  }, [preSelectedService]);

  // Reset variants when service changes
  useEffect(() => {
    setSelectedVariants([]);
  }, [selectedService]);

  const handleDetectLocation = async () => {
    try {
      const result = await getLocationWithName();
      setLocationText(result.areaName);
      setLocationLat(result.lat);
      setLocationLng(result.lng);
    } catch {
      // Location detection failed, user can still type manually
    }
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    // Ensure phone starts with 254
    if (phone.startsWith('0')) {
      return '254' + phone.slice(1);
    }
    if (phone.startsWith('254')) {
      return phone;
    }
    return '254' + phone;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!clientName.trim()) newErrors.name = 'Name is required';
    if (!selectedService) newErrors.service = 'Please select a service';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);

    // Build service string with variants
    const serviceWithVariants = selectedVariants.length > 0
      ? `${selectedService} (${selectedVariants.join(', ')})`
      : selectedService;

    // Save lead to Supabase
    const leadData = {
      technician_id: technician.id,
      client_id: clientId,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: formatPhoneForWhatsApp(clientPhone),
      service_requested: serviceWithVariants,
      client_location: locationText,
      client_lat: locationLat,
      client_lng: locationLng,
      vehicle_model: vehicleModel || null,
    };

    // Insert lead silently in background (fire and forget)
    (async () => {
      try {
        const { error: insertError } = await supabase.from('leads').insert([leadData]);
        
        if (insertError) {
          console.error('Failed to insert lead:', insertError);
          return;
        }
        
        // Notify technician via email and insert notification
        const { data, error: notificationError } = await supabase.functions.invoke('send-lead-notification', {
          body: {
            technician_id: technician.id,
            client_id: clientId,
            client_name: clientName,
            client_phone: formatPhoneForWhatsApp(clientPhone),
            service_requested: serviceWithVariants,
            client_location: locationText || undefined,
            vehicle_model: vehicleModel || undefined,
          }
        });
        
        if (notificationError) {
          console.error('Failed to send lead notification:', notificationError);
        } else {
          console.log('Lead notification sent successfully:', data);
        }
      } catch (err: any) {
        console.error('Error in lead submission process:', err);
      }
    })();

    // Build WhatsApp URL
    const vehicleInfo = vehicleModel ? ` I have a ${vehicleModel}.` : '';
    const location = locationText ? ` I am located in ${locationText}.` : '';
    const details = serviceDetails ? ` ${serviceDetails}.` : '';
    const msg = `Hi, I found you on Mekh. My name is ${clientName}.${vehicleInfo}${location}${details} I am interested in your ${serviceWithVariants} service. Can we talk?`;
    const url = `https://api.whatsapp.com/send/?phone=${formatPhoneForWhatsApp(technician.phone)}&text=${encodeURIComponent(msg)}&type=phone_number&app_absent=0`;
    window.open(url, '_blank');

    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  // Get services from technician
  const services = technician.technician_services || [];

  // Get selected service object and its variants
  const selectedServiceObj = services.find(s => s.service_name === selectedService);
  const serviceVariants = selectedServiceObj?.service_variants || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-blue-500 uppercase tracking-wide">
                Book Technician
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                {technician.business_name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-blue-500 mb-1">Your Name *</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-500 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="John Doe"
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>



          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-blue-500 mb-1">Service You Need *</label>
            <select
              title="Select a service"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-900 border-slate-500 rounded-lg text-slate-500 focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.service_name}>
                  {service.service_name} — {service.price ? `KSh ${service.price}` : 'Contact for price'}
                </option>
              ))}
            </select>
            {errors.service && <p className="text-red-500 text-xs mt-1">{errors.service}</p>}
          </div>

          {/* Service Variants - if available */}
          {serviceVariants.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-blue-500 mb-2">
                Select Options
                <span className="text-slate-500 font-normal ml-1">(optional)</span>
              </label>
              <div className="space-y-2">
                {serviceVariants.map((variant) => (
                  <label key={variant.id} className="flex items-center gap-2 text-slate-300 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedVariants.includes(variant.variant_name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVariants((prev) => [...prev, variant.variant_name]);
                        } else {
                          setSelectedVariants((prev) => prev.filter((v) => v !== variant.variant_name));
                        }
                      }}
                      className="text-blue-600 focus:ring-blue-500 shrink-0"
                    />
                    <span className="flex-1 min-w-0 truncate">{variant.variant_name}</span>
                    {variant.price && (<span className="text-green-400 font-medium shrink-0">Ksh {variant.price.toLocaleString()}</span>)}
                    {variant.is_negotiable && (<span className="bg-yellow-100 text-yellow-500 text-xs px-2 py-0.5 rounded border border-yellow-700 shrink-0">Negotiable</span>)}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Service Details - Always visible */}
          <div>
            <label className="block text-sm font-medium text-blue-500 mb-1">
              Additional Details
              <span className="text-slate-500 font-normal ml-1">(optional)</span>
            </label>
            <textarea
              value={serviceDetails}
              onChange={(e) => setServiceDetails(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-500 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="e.g. I need tinting for all windows, prefer dark shade, need it done this week..."
            />
            <p className="text-xs text-slate-500 mt-2">
              Add any specific details about the service you need.
            </p>
          </div>

          {/* Vehicle Model */}
          <div>
            <label className="block text-sm font-medium text-blue-500 mb-1">Vehicle Model</label>
            <input
              type="text"
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-500 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="e.g. Toyota Noah, BMW X5, Mercedes C300"
            />
            <p className="text-xs text-slate-500 mt-2">
              Let the technician know your car model for better service preparation.
            </p>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-blue-500 mb-1">Your Location</label>
            <input
              type="text"
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-500 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              placeholder="e.g. Kilimani, Nairobi"
            />
          </div>

          {/* Trust note */}
          <p className="text-xs text-slate-500 text-center">
            Your number is only shared with this technician. We never sell your data.
          </p>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            {loading ? 'Connecting...' : 'Connect on WhatsApp'}
          </button>
        </form>
      </div>
    </div>
  );
};
