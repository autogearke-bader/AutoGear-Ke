import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Technician } from '../types';
import { getPublicTechnicians } from '../src/lib/api';
import { TechnicianCard, TechnicianCardSkeleton } from '../src/components/TechnicianCard';

// ─── Service Slugs ────────────────────────────────────────────────────────────
export const SERVICE_SLUGS: Record<string, string> = {
  'window-tinting': 'Window Tinting',
  'car-wrapping': 'Car Wrapping',
  'ppf': 'PPF Installation',
  'ceramic-coating': 'Ceramic Coating',
  'car-buffing': 'Car Buffing',
  'car-detailing': 'Car Detailing',
  'headlight-restoration': 'Headlight Restoration',
  'car-tuning': 'Car Tuning',
};

// ─── Location Slugs (all lowercase + hyphens for URL safety) ──────────────────
export const LOCATION_SLUGS: Record<string, string> = {
  'nairobi': 'Nairobi',
  'mombasa': 'Mombasa',
  'kisumu': 'Kisumu',
  'nakuru': 'Nakuru',
  'eldoret': 'Eldoret',
  'kiambu': 'Kiambu',
  'thika': 'Thika',
  'machakos': 'Machakos',
  // Nairobi estates — all fixed to lowercase + hyphens
  'lavington': 'Lavington',
  'gigiri': 'Gigiri',
  'kiambu-road': 'Kiambu Road',
  'westlands': 'Westlands',
  'karen': 'Karen',
  'kilimani': 'Kilimani',
  'ruiru': 'Ruiru',
  'mombasa-road': 'Mombasa Road',
  'ngong-road': 'Ngong Road',
  'kasarani': 'Kasarani',
  'langata': 'Langata',
  'south-b': 'South B',
  'south-c': 'South C',
  'ruaka': 'Ruaka',
  'kitengela': 'Kitengela',
  'athi-river': 'Athi River',
};

// ─── Service Content ───────────────────────────────────────────────────────────
interface ServiceContent {
  intro: string;
  faqs: { question: string; answer: string }[];
  pricingContext: string;
  benefits: string[];
  metaDescription: string;
}

export const SERVICE_CONTENT: Record<string, ServiceContent> = {
  'window-tinting': {
    metaDescription: `Find the best window tinting services in {location}, Kenya. Compare ceramic tint, 3M & Llumar options. View prices, portfolios & book a certified technician on Mekh.`,
    intro: `Looking for professional window tinting in {location}? Mekh connects you with certified technicians offering premium window tinting solutions — from carbon dyed and 3M films to high-performance ceramic tints. Enhance your vehicle's look, block UV rays, and stay cooler on the road.`,
    faqs: [
      {
        question: 'How much does car tinting cost in {location}?',
        answer: 'Window tinting in {location} typically ranges from KES 3,000 for basic carbon tint to KES 35,000 for premium ceramic tint on a full vehicle. Prices vary by film brand (3M, Llumar, ceramic) and number of windows.',
      },
      {
        question: 'Is window tinting legal in Kenya?',
        answer: 'Yes, window tinting is legal in Kenya. The recommended minimum is 35% VLT (Visible Light Transmission) for front windows. Our technicians only install tints that comply with Kenyan traffic regulations.',
      },
      {
        question: 'Is ceramic tint better than regular tint?',
        answer: 'Yes. Ceramic tint blocks significantly more heat and UV rays than standard carbon or dyed tints, without interfering with GPS or phone signals. It also lasts longer and maintains clarity better over time.',
      },
      {
        question: 'How long does window tinting take?',
        answer: 'Most vehicle window tinting jobs take 2–4 hours depending on the number of windows and film type. Mobile tinting appointments may vary.',
      },
      {
        question: 'How long does window tint last?',
        answer: 'Quality window tint lasts 5–10 years with proper care. Premium ceramic tints from brands like 3M and Llumar often come with manufacturer warranties.',
      },
      {
        question: 'Can I wash my car after tinting?',
        answer: 'Wait 3–5 days before cleaning tinted windows to allow the film to fully cure. Avoid ammonia-based cleaners on tinted surfaces.',
      },
    ],
    pricingContext: 'Window tinting in {location} starts from KES 3,000 for basic carbon tint to KES 35,000 for premium ceramic tint on a full vehicle. 3M and Llumar film options are available at varying price points.',
    benefits: [
      'Blocks up to 99% of harmful UV rays',
      'Reduces interior heat by up to 60%',
      'Enhances vehicle appearance',
      'Protects upholstery from fading',
      'Improves privacy and security',
      'Reduces glare for safer driving',
    ],
  },

  'car-wrapping': {
    metaDescription: `Professional car wrapping services in {location}, Kenya. Full wraps, partial wraps & commercial branding. Compare prices, view portfolios & book on Mekh.`,
    intro: `Transform your vehicle with professional car wrapping in {location}. Mekh connects you with expert wrap installers offering full vehicle wraps, partial wraps, and custom designs using premium vinyl films from 3M, Avery, and more. Protect your original paint while turning heads on the road.`,
    faqs: [
      {
        question: 'How much does car wrapping cost in {location}?',
        answer: 'Car wrapping in {location} starts from KES 25,000 for partial wraps (hood or roof) to KES 80,000–200,000 for a full vehicle wrap. Price depends on vehicle size, wrap type, and the brand of vinyl film used.',
      },
      {
        question: 'Is car wrapping legal in Kenya?',
        answer: 'Yes, car wrapping is legal in Kenya. However, if you change your vehicle\'s color via a wrap, you should update your logbook to reflect the change. Our technicians can advise you on the correct process.',
      },
      {
        question: 'Does car wrapping damage the paint?',
        answer: 'No — professionally installed wraps actually protect your original paint from stone chips, scratches, and UV damage. The wrap can be cleanly removed anytime, revealing your original paintwork.',
      },
      {
        question: 'How long does a car wrap last?',
        answer: 'A quality car wrap lasts 5–7 years with proper care. Premium films from brands like 3M and Avery Dennison can last even longer.',
      },
      {
        question: 'How long does it take to wrap a car?',
        answer: 'Full vehicle wraps typically take 3–5 days. Partial wraps (hood, roof, mirrors) can be completed in 1–2 days.',
      },
      {
        question: 'Can a wrapped car go through a carwash?',
        answer: 'Hand washing with mild soap is recommended. Avoid high-pressure jets near wrap edges and skip automatic carwashes — the brushes and chemicals can lift edges and reduce the wrap\'s lifespan.',
      },
    ],
    pricingContext: 'Car wrapping in {location} starts from KES 25,000 for partial wraps up to KES 80,000–200,000 for full vehicle wraps. Commercial fleet branding packages are also available.',
    benefits: [
      'Complete vehicle colour transformation',
      'Protects original factory paint',
      'Fully reversible — remove anytime',
      'Commercial branding opportunity',
      'Wide range of finishes: matte, gloss, satin, chrome',
      'Increases resale value by protecting paint',
    ],
  },

  'ppf': {
    metaDescription: `PPF installation in {location}, Kenya. Paint Protection Film for new & used cars. Self-healing film, transparent protection. Book a certified installer on Mekh.`,
    intro: `Protect your vehicle's paint with professional PPF (Paint Protection Film) installation in {location}. Mekh connects you with certified PPF installers offering self-healing urethane films that guard against stone chips, scratches, road debris, and environmental damage — keeping your car looking showroom-fresh for years.`,
    faqs: [
      {
        question: 'How much does PPF cost in {location}?',
        answer: 'PPF installation in {location} ranges from KES 15,000 for partial front coverage (bonnet, bumper) to KES 100,000+ for full body protection. Pricing depends on coverage area and film brand.',
      },
      {
        question: 'What is PPF and how does it work?',
        answer: 'PPF (Paint Protection Film) is a transparent urethane film applied to your car\'s painted surfaces. It absorbs impacts from stone chips and road debris, and self-heals from minor scratches when exposed to heat.',
      },
      {
        question: 'Which is better — PPF or ceramic coating?',
        answer: 'They serve different purposes. PPF provides physical protection against chips and scratches. Ceramic coating provides chemical and UV protection plus hydrophobic properties. Many car owners use both together for maximum protection.',
      },
      {
        question: 'How long does PPF last?',
        answer: 'Quality PPF lasts 5–10 years with proper maintenance. Premium brands like XPEL and SunTek offer lifetime warranties against yellowing, cracking, and peeling.',
      },
      {
        question: 'Does PPF affect the appearance of my car?',
        answer: 'Modern PPF is virtually invisible and actually enhances the gloss and depth of your vehicle\'s paint. Matte PPF options are also available for matte-finish vehicles.',
      },
      {
        question: 'Can PPF be applied to headlights?',
        answer: 'Yes. PPF can be applied to headlights, mirrors, door edges, and any painted panel. High-impact areas like the bonnet, front bumper, and fenders are the most popular starting points.',
      },
    ],
    pricingContext: 'PPF installation in {location} ranges from KES 15,000 for partial front protection to KES 100,000+ for full body coverage. Partial kits covering the bonnet, bumper, and mirrors are the most popular starting package.',
    benefits: [
      'Self-healing from minor scratches with heat',
      'Virtually invisible protection',
      'Preserves resale value',
      'Blocks UV rays and chemical damage',
      'Guards against stone chips and road debris',
      'Compatible with ceramic coating on top',
    ],
  },

  'ceramic-coating': {
    metaDescription: `Ceramic coating services in {location}, Kenya. Long-lasting nano-ceramic protection for your car. Compare prices, technicians & book on Mekh.`,
    intro: `Get long-lasting protection and a stunning shine with professional ceramic coating in {location}. Mekh connects you with nano-ceramic coating specialists whose products bond with your vehicle's paint to deliver years of protection against UV rays, chemical damage, and environmental contaminants — with hydrophobic properties that make washing effortless.`,
    faqs: [
      {
        question: 'How much does ceramic coating cost in {location}?',
        answer: 'Ceramic coating in {location} ranges from KES 15,000 for a single-layer application to KES 50,000+ for multi-layer professional systems with longer warranties.',
      },
      {
        question: 'How long does ceramic coating last?',
        answer: 'Professional ceramic coatings last 2–5 years or more depending on the product tier and your maintenance routine. Higher-grade coatings like Gtechniq and IGL Coatings offer 5+ year protection.',
      },
      {
        question: 'Is ceramic coating better than wax?',
        answer: 'Yes. Ceramic coating lasts years versus weeks for wax, offers superior chemical resistance, and provides a harder surface layer. It also has far better hydrophobic properties, making water bead and roll off the paint.',
      },
      {
        question: 'What are the disadvantages of ceramic coating?',
        answer: 'Ceramic coating does not protect against rock chips or deep scratches — that\'s what PPF is for. It also requires thorough paint correction before application to avoid sealing in swirl marks or defects.',
      },
      {
        question: 'Can rain damage ceramic coating?',
        answer: 'No — rain actually helps rinse your car clean when ceramic coating is applied, because of its hydrophobic properties. However, avoid washing or getting the car wet in the first 24–48 hours after application.',
      },
      {
        question: 'Does ceramic coating make your car shinier?',
        answer: 'Yes. A properly prepared and coated surface has significantly more gloss and depth than uncoated paint. The difference is most visible in direct sunlight.',
      },
    ],
    pricingContext: 'Ceramic coating in {location} starts from KES 15,000 for a single layer up to KES 50,000+ for multi-layer professional systems. Paint correction (polishing) before application is recommended and may be quoted separately.',
    benefits: [
      'Years of protection from a single application',
      'Hydrophobic — water beads and rolls off',
      'Enhanced gloss and paint depth',
      'UV and chemical resistance',
      'Easier to clean — dirt doesn\'t bond easily',
      'Reduces need for waxing',
    ],
  },

  'car-buffing': {
    metaDescription: `Car buffing & paint polishing in {location}, Kenya. Remove swirl marks, scratches & oxidation. Find professional detailers & book on Mekh.`,
    intro: `Restore your vehicle's shine with professional car buffing and polishing in {location}. Mekh connects you with skilled technicians who use machine buffing to remove swirl marks, oxidation, light scratches, and water spots — bringing your paint back to showroom condition.`,
    faqs: [
      {
        question: 'How much does car buffing cost in {location}?',
        answer: 'Car buffing and polishing in {location} typically costs KES 5,000–20,000 depending on vehicle size, paint condition, and the level of correction required.',
      },
      {
        question: 'Does buffing remove scratches?',
        answer: 'Buffing removes light to moderate surface scratches and swirl marks. Deep scratches that penetrate the clear coat or base coat may require touch-up paint or panel respray.',
      },
      {
        question: 'How often should I buff my car?',
        answer: 'Most vehicles benefit from professional buffing once a year. Over-buffing thins the clear coat over time, so it\'s best done by professionals who know how to measure and preserve paint thickness.',
      },
      {
        question: 'Is buffing safe for my car?',
        answer: 'Yes — when done by trained professionals with the correct machine, pad, and product combination. Improper buffing by untrained hands can cause holograms, thin spots, or heat damage.',
      },
    ],
    pricingContext: 'Car buffing and polishing in {location} typically costs KES 5,000–20,000 depending on vehicle size and the level of paint correction needed.',
    benefits: [
      'Removes swirl marks and oxidation',
      'Restores showroom shine and clarity',
      'Eliminates water spots and light scratches',
      'Great preparation before ceramic coating or PPF',
      'Increases resale value',
      'Safe for all paint types when done professionally',
    ],
  },

  'car-detailing': {
    metaDescription: `Professional car detailing in {location}, Kenya. Interior deep clean, exterior polish & full detailing packages. Find trusted detailers & book on Mekh.`,
    intro: `Experience the ultimate car detailing services in {location}. Mekh connects you with professional detailers offering everything from interior deep cleaning and leather conditioning to exterior paint correction and show-car preparation. We use professional-grade products and techniques to restore your vehicle inside and out.`,
    faqs: [
      {
        question: 'How much does car detailing cost in {location}?',
        answer: 'Car detailing in {location} ranges from KES 5,000 for basic wash-and-vacuum packages to KES 25,000+ for full interior and exterior premium detailing.',
      },
      {
        question: 'What is included in full car detailing?',
        answer: 'Full detailing includes exterior wash, clay bar, machine polish, wax or sealant, interior vacuuming, steam cleaning of surfaces, leather conditioning, wheel and tyre cleaning, and glass treatment.',
      },
      {
        question: 'How long does car detailing take?',
        answer: 'A basic detail takes 2–3 hours. Full interior and exterior detailing typically takes 4–8 hours for thorough results.',
      },
      {
        question: 'How often should I detail my car?',
        answer: 'Full detailing every 4–6 months is ideal for maintaining your vehicle\'s condition and value. Regular maintenance washes every 2–4 weeks in between keep things fresh.',
      },
    ],
    pricingContext: 'Car detailing in {location} starts from KES 5,000 for basic packages and goes up to KES 25,000+ for premium full interior and exterior detailing services.',
    benefits: [
      'Complete interior and exterior transformation',
      'Removes bacteria and allergens from cabin',
      'Protects paint and interior surfaces',
      'Maintains vehicle resale value',
      'Professional-grade products for lasting results',
      'Healthier and more comfortable driving environment',
    ],
  },
};

// ─── Default Content Fallback ──────────────────────────────────────────────────
const getDefaultContent = (service: string, location: string): ServiceContent => ({
  metaDescription: `Find professional ${service.toLowerCase()} services in ${location}, Kenya. Browse certified technicians, compare prices & book on Mekh.`,
  intro: `Looking for professional ${service.toLowerCase()} services in ${location}? Mekh connects you with certified automotive technicians in your area. Browse profiles, compare services, and book with confidence.`,
  faqs: [
    {
      question: `How much does ${service.toLowerCase()} cost in ${location}?`,
      answer: `Pricing varies depending on your vehicle type and specific requirements. Browse technician profiles on Mekh to see rates and request quotes directly.`,
    },
    {
      question: 'How long does the service take?',
      answer: 'Service duration varies depending on your vehicle and requirements. Contact the technician directly for a time estimate.',
    },
    {
      question: 'Do technicians offer mobile services?',
      answer: 'Many Mekh technicians offer mobile services and can come to your location. Check individual profiles for mobile availability.',
    },
  ],
  pricingContext: `Contact technicians in ${location} directly on Mekh for a customised quote based on your specific vehicle and requirements.`,
  benefits: [
    'Verified professional technicians',
    'Transparent pricing and portfolios',
    'Convenient online booking',
    'Trusted by car owners across Kenya',
  ],
});

// ─── Search Term Mapping ───────────────────────────────────────────────────────
const SERVICE_SEARCH_TERMS: Record<string, string[]> = {
  'Window Tinting': ['tinting', 'tint', 'window'],
  'Car Wrapping': ['wrapping', 'wrap'],
  'PPF Installation': ['ppf', 'paint protection', 'film'],
  'Ceramic Coating': ['ceramic', 'coating'],
  'Car Buffing': ['buffing', 'buff', 'polish'],
  'Car Detailing': ['detailing', 'detail', 'wash'],
  'Headlight Restoration': ['headlight restoration', 'headlight', 'tail light'],
  'Car Tuning': ['tuning', 'tune', 'ecu'],
  'Car Riveting': ['riveting', 'rivet'],
  'Car Identity': ['identity'],
};

// ─── Component ─────────────────────────────────────────────────────────────────
const ServiceLocationPage: React.FC = () => {
  const { service, location } = useParams<{ service: string; location: string }>();
  const navigate = useNavigate();

  // Guard: redirect invalid service/location to 404
  if (!service || !location || !SERVICE_SLUGS[service] || !LOCATION_SLUGS[location]) {
    return <Navigate to="/404" replace />;
  }

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number[]>([]);

  // Display names
  const serviceName = service ? SERVICE_SLUGS[service] || service : '';
  const locationName = location ? LOCATION_SLUGS[location] || location : '';

  // Content with {location} replaced
  const rawContent = service
    ? SERVICE_CONTENT[service] || getDefaultContent(serviceName, locationName)
    : null;

  const serviceContent = useMemo(() => {
    if (!rawContent) return null;
    const replace = (str: string) => str.replace(/\{location\}/g, locationName);
    return {
      ...rawContent,
      intro: replace(rawContent.intro),
      pricingContext: replace(rawContent.pricingContext),
      metaDescription: replace(rawContent.metaDescription),
      faqs: rawContent.faqs.map((faq) => ({
        question: replace(faq.question),
        answer: replace(faq.answer),
      })),
    };
  }, [rawContent, locationName]);

  // Expand all FAQs by default for SEO
  useEffect(() => {
    if (serviceContent?.faqs) {
      setExpandedFaq(serviceContent.faqs.map((_, idx) => idx));
    }
  }, [serviceContent]);

  // Toggle FAQ expansion
  const toggleFaq = (idx: number) => {
    setExpandedFaq(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  // Fetch technicians
  useEffect(() => {
    const fetchTechnicians = async () => {
      setLoading(true);
      try {
        const terms = SERVICE_SEARCH_TERMS[serviceName];
        const search = terms ? terms[0] : serviceName.toLowerCase();
        const data = await getPublicTechnicians({
          county: locationName,
          service: search,
        });
        setTechnicians(data);
      } catch (error) {
        console.error('Failed to fetch technicians:', error);
        setTechnicians([]);
      } finally {
        setLoading(false);
      }
    };

    if (serviceName && locationName) fetchTechnicians();
  }, [service, location, serviceName, locationName]);

  // Structured data
  const localBusinessSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: `${serviceName} in ${locationName}`,
    description: serviceContent?.intro || '',
    areaServed: {
      '@type': 'City',
      name: locationName,
      containedInPlace: {
        '@type': 'Country',
        name: 'Kenya',
      },
    },
    provider: {
      '@type': 'Organization',
      name: 'Mekh',
      url: 'https://mekh.app',
    },
  }), [serviceName, locationName, serviceContent]);

  // FAQ schema — triggers rich results in Google
  const faqSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: serviceContent?.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })) || [],
  }), [serviceContent]);

  // Breadcrumb schema
  const breadcrumbSchema = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mekh.app' },
      { '@type': 'ListItem', position: 2, name: serviceName, item: `https://mekh.app/${service}/nairobi` }, // Link to service in a default location
      { '@type': 'ListItem', position: 3, name: locationName, item: `https://mekh.app/${service}/${location}` },
    ],
  }), [serviceName, locationName, service, location]);



  return (
    <div className="min-h-screen bg-slate-950">

      {/* ─── SEO Head ─────────────────────────────────────────────────────── */}
      <Helmet>
        {/* Title: Primary keyword + location | Brand */}
        <title>{serviceName} in {locationName} | Mekh</title>

        {/* Meta description: 150–160 chars, includes location + service + CTA */}
        <meta name="description" content={serviceContent?.metaDescription || ''} />

        {/* Canonical URL */}
        <link rel="canonical" href={`https://mekh.app/${service}/${location}`} />

        {/* Open Graph */}
        <meta property="og:title" content={`${serviceName} in ${locationName} | Mekh`} />
        <meta property="og:description" content={serviceContent?.metaDescription || ''} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://mekh.app/services/${service}/${location}`} />
        <meta property="og:site_name" content="Mekh" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${serviceName} in ${locationName} | Mekh`} />
        <meta name="twitter:description" content={serviceContent?.metaDescription || ''} />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(localBusinessSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
      </Helmet>

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative py-12 md:py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-slate-950 to-slate-950" />
        <div className="relative max-w-4xl mx-auto text-center">

          {/* Breadcrumb nav — also renders schema above */}
          <nav aria-label="Breadcrumb" className="mb-4 text-sm">
            <ol className="flex items-center justify-center gap-2 flex-wrap">
              <li>
                <Link to="/" className="text-slate-400 hover:text-blue-400 transition-colors">
                  Home
                </Link>
              </li>
              <li className="text-slate-600">/</li>
              <li>
                <Link
                  to={`/services/${service}`}
                  className="text-slate-400 hover:text-blue-400 transition-colors"
                >
                  {serviceName}
                </Link>
              </li>
              <li className="text-slate-600">/</li>
              <li className="text-white font-medium">{locationName}</li>
            </ol>
          </nav>

          {/* H1 — primary keyword: Service in Location */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 tracking-tight">
            {serviceName}{' '}
            <span className="text-blue-500">in {locationName}</span>
          </h1>

          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-6 leading-relaxed">
            {serviceContent?.intro}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() =>
                document.getElementById('technicians-section')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold text-sm transition-colors"
            >
              Browse Technicians
            </button>
            <Link
              to="/join"
              className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-full font-bold text-sm transition-colors border border-slate-700"
            >
              Join as a Technician
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Pricing Context ──────────────────────────────────────────────── */}
      <section className="px-4 pb-8" aria-label="Pricing information">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex gap-4 items-start">
            <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              {/* H2 — secondary keyword: pricing */}
              <h2 className="text-lg font-bold text-white mb-1">
                How Much Does {serviceName} Cost in {locationName}?
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                {serviceContent?.pricingContext}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Benefits ─────────────────────────────────────────────────────── */}
      {serviceContent?.benefits && serviceContent.benefits.length > 0 && (
        <section className="px-4 pb-10" aria-label="Benefits">
          <div className="max-w-4xl mx-auto">
            {/* H2 — secondary keyword: why choose */}
            <h2 className="text-2xl font-bold text-white mb-4">
              Why Choose Professional {serviceName}?
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {serviceContent.benefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 bg-slate-900/30 border border-slate-800 rounded-lg p-4"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-slate-300 text-sm">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Technicians ──────────────────────────────────────────────────── */}
      <section id="technicians-section" className="px-4 pb-16" aria-label="Available technicians">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            {/* H2 — location keyword reinforcement */}
            <h2 className="text-2xl font-bold text-white">
              {serviceName} Technicians in {locationName}
            </h2>
            {!loading && (
              <span className="text-slate-400 text-sm">
                {technicians.length} {technicians.length === 1 ? 'technician' : 'technicians'} found
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <TechnicianCardSkeleton key={i} />
              ))}
            </div>
          ) : technicians.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {technicians.map((technician) => (
                <TechnicianCard key={technician.id} technician={technician} />
              ))}
            </div>
          ) : (
            // ── Empty state — still shows full content so page has SEO value ──
            <div className="text-center py-12 bg-slate-900/30 border border-slate-800 rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                No {serviceName} Technicians in {locationName} Yet
              </h3>
              <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm">
                We're growing in {locationName}. Be the first {serviceName.toLowerCase()} specialist 
                to list your business on Mekh and reach customers in your area.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/join"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold text-sm transition-colors"
                >
                  List Your Business Free
                </Link>
                <button
                  onClick={() => navigate('/')}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-full font-bold text-sm transition-colors"
                >
                  Browse All Technicians
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── FAQs ─────────────────────────────────────────────────────────── */}
      {serviceContent?.faqs && serviceContent.faqs.length > 0 && (
        <section className="px-4 pb-16" aria-label="Frequently asked questions">
          <div className="max-w-3xl mx-auto">
            {/* H2 — question keywords */}
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              Frequently Asked Questions about {serviceName} in {locationName}
            </h2>

            <div className="space-y-3">
              {serviceContent.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"
                >
                  <button
                    type="button"
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={expandedFaq.includes(idx) ? true : false}
                    aria-controls={`faq-answer-${idx}`}
                  >

                    <h3 className="text-white font-semibold text-sm leading-snug">
                      {faq.question}
                    </h3>
                    <svg
                      className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                        expandedFaq.includes(idx) ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {expandedFaq.includes(idx) && (
                    <div id={`faq-answer-${idx}`} className="px-5 pb-4">
                      <p className="text-slate-400 text-sm leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-slate-400 text-sm mb-3">
                More questions about {serviceName.toLowerCase()} in {locationName}?
              </p>
              <Link to="/contact" className="text-blue-400 hover:underline font-medium text-sm">
                Contact Mekh →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ─── Other Services ────────────────────────────────────────────── */}
      <section className="px-4 pb-12" aria-label="Other services">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-4">
            Other Services in {locationName}
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SERVICE_SLUGS)
              .filter(([slug]) => slug !== service)
              .map(([slug, name]) => (
                <Link
                  key={slug}
                  to={`/${slug}/${location}`}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-full text-sm transition-colors"
                >
                  {name} in {locationName}
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* ─── Related Locations ────────────────────────────────────────────── */}
      <section className="px-4 pb-12" aria-label="Other locations">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-lg font-bold text-white mb-4">
            {serviceName} in Other Areas
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(LOCATION_SLUGS)
              .filter(([slug]) => slug !== location)
              .slice(0, 10)
              .map(([slug, name]) => (
                <Link
                  key={slug}
                  to={`/services/${service}/${slug}`}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-full text-sm transition-colors"
                >
                  {serviceName} in {name}
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* ─── Technician CTA ───────────────────────────────────────────────── */}
      <section className="px-4 pb-16">
        <div className="max-w-4xl mx-auto bg-gradient-to-r from-blue-900/50 to-slate-900 border border-blue-800/50 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Are You a {serviceName} Specialist in {locationName}?
          </h2>
          <p className="text-slate-300 mb-6 max-w-xl mx-auto">
            Join Mekh to connect with customers actively searching for {serviceName.toLowerCase()} 
            services in {locationName}. Create your free profile and start receiving leads today.
          </p>
          <Link
            to="/join"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold text-base transition-colors"
          >
            Join as a Technician — It's Free
          </Link>
        </div>
      </section>

    </div>
  );
};

export default ServiceLocationPage;