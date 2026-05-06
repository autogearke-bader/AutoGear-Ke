import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

// Import the same constants from ServiceLocationPage
const SERVICE_SLUGS: Record<string, string> = {
  'window-tinting': 'Car Window Tinting',
  'car-wrapping': 'Car Wrapping',
  'ppf': 'PPF Installation',
  'ceramic-coating': 'Ceramic Coating',
  'car-detailing': 'Car Detailing',
  'headlight-restoration': 'Headlight Restoration',
  'car-tuning': 'Car Tuning',
};

const LOCATION_SLUGS: Record<string, string> = {
  'nairobi': 'Nairobi',
  'kileleshwa': 'Kileleshwa',
  'thika-road': 'Thika Road',
  'parklands': 'Parklands',
  'lavington': 'Lavington',
  'westlands': 'Westlands',
  'karen': 'Karen',
  'kilimani': 'Kilimani',
  'garden-estate': 'Garden Estate',
  'langata': 'Langata',
  'ngong-road': 'Ngong Road',
  'kiambu-road': 'Kiambu Road',
  'ruiru': 'Ruiru',
};

const ServicePage: React.FC = () => {
  const { service } = useParams<{ service: string }>();

  // Guard: redirect invalid service to 404
  if (!service || !SERVICE_SLUGS[service]) {
    return <Navigate to="/404" replace />;
  }

  const serviceName = SERVICE_SLUGS[service];

  const locations = Object.entries(LOCATION_SLUGS).map(([slug, name]) => ({ slug, name }));

  return (
    <div className="min-h-screen bg-slate-950">
      <Helmet>
        <title>{serviceName} Services | Mekh</title>
        <meta name="description" content={`Find professional ${serviceName.toLowerCase()} services in Kenya. Choose your location to book certified technicians on Mekh.`} />
        <link rel="canonical" href={`https://mekh.app/services/${service}`} />
      </Helmet>

      <section className="py-12 md:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-blue-500 mb-6 tracking-tight">
            {serviceName} Services
          </h1>
          <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            Choose your location to find certified {serviceName.toLowerCase()} technicians in your area.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {locations.map(({ slug, name }) => (
              <Link
                key={slug}
                to={`/services/${service}/${slug}`}
                className="block p-6 bg-slate-900 border border-slate-800 rounded-xl hover:border-blue-500 transition-colors text-center"
              >
                <h3 className="text-blue-500 font-bold text-lg mb-2">{name}</h3>
                <p className="text-slate-400 text-sm">
                  {serviceName} in {name}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default ServicePage;