import { useState, useEffect } from 'react';
import { supabase } from '../src/lib/supabase';
import { TechnicianService, ServiceVariant } from '../types';

interface ServiceWithVariants {
  id?: string;
  service_name: string;
  price?: number | null;
  negotiable: boolean;
  variants: ServiceVariant[];
}

interface ServiceManagerOptions {
  technicianId: string;
  initialServices?: ServiceWithVariants[];
  isTechnicianDashboard?: boolean;
}

export const useServiceManager = ({ technicianId, initialServices = [], isTechnicianDashboard = false }: ServiceManagerOptions) => {
  const [services, setServices] = useState<ServiceWithVariants[]>(initialServices);
  const [originalServices, setOriginalServices] = useState<ServiceWithVariants[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (initialServices.length > 0) {
      setServices(initialServices);
      setOriginalServices(JSON.parse(JSON.stringify(initialServices)));
    } else if (isTechnicianDashboard && technicianId) {
      loadServices();
    }
  }, [technicianId, isTechnicianDashboard, initialServices]);

  const loadServices = async () => {
    try {
      setLoading(true);
      // Load services and variants
      const { data: servicesData, error: servicesError } = await supabase
        .from('technician_services')
        .select('*')
        .eq('technician_id', technicianId);

      if (servicesError) throw servicesError;

      const servicesWithVariants: ServiceWithVariants[] = [];
      for (const service of servicesData || []) {
        const { data: variantsData } = await supabase
          .from('service_variants')
          .select('*')
          .eq('service_id', service.id);

        servicesWithVariants.push({
          ...service,
          variants: variantsData || [],
        });
      }

      setServices(servicesWithVariants);
      setOriginalServices(JSON.parse(JSON.stringify(servicesWithVariants)));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to check if a variant has changed
  const hasVariantChanged = (serviceId: string, variantId?: string) => {
    if (!isTechnicianDashboard) return true; // Always save for joinpage
    const originalService = originalServices.find(s => s.id === serviceId);
    const currentService = services.find(s => s.id === serviceId);
    if (!originalService || !currentService) return true;
    if (!variantId) return false; // Service itself not tracked for dirty
    const originalVariant = originalService.variants.find(v => v.id === variantId);
    const currentVariant = currentService.variants.find(v => v.id === variantId);
    return JSON.stringify(originalVariant) !== JSON.stringify(currentVariant);
  };

  // Update service
  const updateService = (serviceId: string, updates: Partial<ServiceWithVariants>) => {
    setServices(prev => prev.map(s => s.id === serviceId ? { ...s, ...updates } : s));
  };

  // Add variant
  const addVariant = (serviceId: string, variant: Omit<ServiceVariant, 'service_id'>) => {
    setServices(prev => prev.map(s =>
      s.id === serviceId ? { ...s, variants: [...s.variants, { ...variant, service_id: serviceId }] } : s
    ));
  };

  // Update variant
  const updateVariant = (serviceId: string, variantId: string, updates: Partial<ServiceVariant>) => {
    setServices(prev => prev.map(s =>
      s.id === serviceId ? {
        ...s,
        variants: s.variants.map(v => v.id === variantId ? { ...v, ...updates } : v)
      } : s
    ));
  };

  // Remove variant
  const removeVariant = (serviceId: string, variantId: string) => {
    setServices(prev => prev.map(s =>
      s.id === serviceId ? {
        ...s,
        variants: s.variants.filter(v => v.id !== variantId)
      } : s
    ));
  };

  // Add service
  const addService = (service: Omit<ServiceWithVariants, 'id'>) => {
    const newService = { ...service, id: `temp-${Date.now()}` };
    setServices(prev => [...prev, newService]);
  };

  // Remove service
  const removeService = (serviceId: string) => {
    setServices(prev => prev.filter(s => s.id !== serviceId));
  };

  // Prepare payload
  const preparePayload = () => {
    return {
      technicianId,
      services: services.map(service => ({
        ...service,
        variants: isTechnicianDashboard
          ? service.variants.filter(variant => hasVariantChanged(service.id!, variant.id))
          : service.variants
      }))
    };
  };

  // Save all
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = preparePayload();

      // Upsert services
      const servicesToUpsert = payload.services.map(s => ({
        id: s.id,
        technician_id: technicianId,
        service_name: s.service_name,
        price: s.price,
        negotiable: s.negotiable,
      }));

      const { data: savedServices, error: upsertError } = await supabase
        .from('technician_services')
        .upsert(servicesToUpsert)
        .select();

      if (upsertError) throw upsertError;

      // Map IDs
      const serviceIdMap: Record<string, string> = {};
      savedServices?.forEach(s => {
        serviceIdMap[s.service_name] = s.id;
      });

      // Collect changed variants
      const allVariants = payload.services.flatMap(s =>
        s.variants.map(v => ({
          ...v,
          service_id: serviceIdMap[s.service_name],
        }))
      );

      if (allVariants.length > 0) {
        // Delete existing variants for affected services
        const affectedServiceIds = [...new Set(allVariants.map(v => v.service_id))];
        await supabase.from('service_variants').delete().in('service_id', affectedServiceIds);

        // Insert all variants
        const { error: insertError } = await supabase.from('service_variants').insert(allVariants);
        if (insertError) throw insertError;
      }

      setSuccess('Saved successfully!');
      if (isTechnicianDashboard) {
        loadServices(); // Refresh
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    services,
    loading,
    error,
    success,
    updateService,
    addVariant,
    updateVariant,
    removeVariant,
    addService,
    removeService,
    handleSave,
  };
};