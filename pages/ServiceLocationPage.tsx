import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Technician } from '../types';
import { getPublicTechnicians } from '../src/lib/api';
import { TechnicianCard, TechnicianCardSkeleton } from '../src/components/TechnicianCard';

// ─── Service Slugs ────────────────────────────────────────────────────────────
export const SERVICE_SLUGS: Record<string, string> = {
   'window-tinting': 'Car Window Tinting',
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
  // Nairobi estates — all fixed to lowercase + hyphens
  'lavington': 'Lavington',
  'kiambu-road': 'Kiambu Road',
  'westlands': 'Westlands',
  'karen': 'Karen',
  'kilimani': 'Kilimani',
  'ngong-road': 'Ngong Road',
  'thika-road': 'Thika Road',
  'langata': 'Langata',
  'ruaka': 'Ruaka',
};

// ─── Service Content ───────────────────────────────────────────────────────────
interface ServiceContent {
  intro: string;
  faqs: { question: string; answer: string }[];
  pricingContext: string;
  benefits: string[];
  metaDescription: string;
  priceRange: string;
  quickAnswer: {
    cost: string;
    time: string;
    technicians: string;
    mobile: boolean;
  };
  whatIs: string;
}

export const SERVICE_CONTENT: Record<string, ServiceContent> = {
  'window-tinting': {
    metaDescription: `Car tinting in {location}, Kenya — compare prices, KES 3,000–35,000. 
Find mobile car window tinting near you. Book certified 3M & Llumar technicians on Mekh.`,
    intro: `Car window tinting in {location} costs KES 3,000–35,000 depending on film type. Mekh connects you with certified window tinting technicians in {location} who offer 3M, Llumar, and ceramic film options. Enhance your vehicle's look, block UV rays, and stay cooler on the road.`,
    priceRange: 'KES 3,000 – KES 35,000',
    quickAnswer: {
      cost: 'KES 3,000 – 35,000',
      time: '2–4 hours',
      technicians: 'available',
      mobile: true,
    },
    whatIs: 'Window tinting is the process of applying a thin, transparent film to vehicle windows to block harmful UV rays, reduce interior heat, and provide privacy while maintaining visibility.',
      faqs: [
        {
          question: 'How much does car tinting cost in {location}?',
          answer: 'Window tinting in {location} typically ranges from KES 3,000 for basic carbon tint to KES 35,000 for premium ceramic tint on a full vehicle. Prices vary by film brand (3M, Llumar, ceramic) and number of windows. Additional costs may include premium films or custom installations. Contact technicians directly for personalized quotes based on your vehicle type and specific requirements.',
        },
        {
          question: 'Is window tinting legal in Kenya?',
          answer: 'Yes, window tinting is legal in Kenya as long as it meets traffic regulations. The recommended minimum is 35% VLT (Visible Light Transmission) for front windows, though some areas may have stricter local bylaws. Our certified technicians only install tints that comply with Kenyan traffic laws to ensure your vehicle passes inspections. We recommend checking with local authorities for any area-specific requirements.',
        },
        {
          question: 'Is ceramic tint better than regular tint?',
          answer: 'Yes, ceramic tint is superior to standard carbon or dyed tints in several ways. It blocks up to 99% of harmful UV rays and significantly more heat, without interfering with GPS, phone signals, or electronic devices. Ceramic tint also lasts longer (7–10 years vs 3–5 years), maintains clarity better over time, and often comes with manufacturer warranties. While more expensive initially, it provides better long-term value and protection.',
        },
        {
          question: 'How long does window tinting take?',
          answer: 'Most vehicle window tinting jobs take 2–4 hours depending on the number of windows and film type. Smaller jobs like tinting just the rear windows might take 1–2 hours, while a full vehicle with premium ceramic film could take 4–6 hours. Mobile appointments at your location may take slightly longer due to setup and cleanup. Factors affecting timing include vehicle size, film brand, weather conditions, and any existing tint removal needed. On the day, expect the technician to prepare the windows, apply the film, and allow curing time before you drive.',
        },
        {
          question: 'How long does window tint last?',
          answer: 'Quality window tint lasts 5–10 years with proper care, depending on the film type and environmental conditions. Premium ceramic tints from brands like 3M and Llumar often come with manufacturer warranties of 5–10 years. Factors affecting longevity include exposure to harsh sunlight, extreme temperatures, and maintenance habits. Regular cleaning with mild, ammonia-free products helps preserve the tint. If fading or bubbling occurs, professional reapplication is recommended rather than DIY fixes.',
        },
         {
           question: 'Can I wash my car after tinting?',
           answer: 'Wait 3–5 days before washing your car after tinting to allow the film to fully cure and adhere properly. During this period, avoid opening windows if possible and park in shaded areas. Once cured, you can wash normally but avoid ammonia-based cleaners, which can damage the tint. Use a soft cloth or sponge with mild, pH-neutral soap. Automatic car washes with brushes should be avoided for the first few weeks. Regular maintenance washing helps prevent dirt buildup that could scratch the film.',
         },
         {
           question: 'How much does car window tinting cost in {location}?',
           answer: 'Car window tinting in {location} costs KES 3,000–35,000 depending on film type, vehicle size, and brand. Basic carbon tint starts at KES 3,000 for partial applications, while premium 3M or Llumar ceramic options can reach KES 35,000 for full vehicle coverage. Factors like number of windows, film quality, and custom installations affect the final price.',
         },
         {
           question: 'How much does 3M car tinting cost in Nairobi?',
           answer: '3M car tinting in Nairobi ranges from KES 8,000–35,000 depending on the 3M film series and vehicle coverage. Entry-level 3M films start around KES 8,000 for basic tinting, while premium 3M Crystalline or Ceramic series can cost up to KES 35,000 for full vehicle protection. Prices include professional installation by certified technicians.',
         },
         {
           question: 'Is mobile car tinting available in {location}?',
           answer: 'Yes, mobile car tinting is available in {location}. Technicians on Mekh come to your home or office to perform the tinting service, saving you time and hassle. Mobile services include all necessary equipment and can be scheduled at your convenience. Contact local technicians directly to arrange mobile appointments.',
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
    intro: `Car wrapping in {location} costs KES 25,000–200,000 depending on wrap type. Mekh connects you with certified car wrapping technicians in {location} offering full vehicle wraps, partial wraps, and custom designs using premium vinyl films from 3M and Avery. Protect your original paint while turning heads on the road.`,
    priceRange: 'KES 25,000 – KES 200,000',
    quickAnswer: {
      cost: 'KES 25,000 – 200,000',
      time: '3–5 days',
      technicians: 'available',
      mobile: true,
    },
    whatIs: 'Car wrapping involves applying a vinyl film over the vehicle\'s original paint to change its color or finish without damaging the underlying paint. It\'s a reversible customization option.',
      faqs: [
        {
          question: 'How much does car wrapping cost in {location}?',
          answer: 'Car wrapping in {location} starts from KES 25,000 for partial wraps (hood or roof) to KES 80,000–200,000 for a full vehicle wrap. Pricing depends on vehicle size, wrap type (matte, gloss, chrome), complexity of design, and the brand of vinyl film used. Premium brands like 3M or Avery Dennison cost more but offer better durability. Additional costs may include custom graphics, color changes, or protective clear coats. Get quotes from multiple technicians to compare options.',
        },
        {
          question: 'Is car wrapping legal in Kenya?',
          answer: 'Yes, car wrapping is legal in Kenya for personal and commercial vehicles. However, if you change your vehicle\'s color via a wrap (making it look like a different color), you should update your logbook and registration documents to reflect the change. This ensures compliance with traffic laws and avoids issues during inspections. Our technicians are familiar with Kenyan regulations and can guide you through the process if needed. Commercial fleet branding is also permitted.',
        },
        {
          question: 'Does car wrapping damage the paint?',
          answer: 'No, professionally installed car wraps do not damage your original paint — in fact, they protect it. The vinyl film acts as a barrier against stone chips, scratches, road debris, and UV rays that would otherwise harm the paint. Wraps are designed to be removable, so when you want to return to the original color, the wrap can be cleanly peeled off, revealing undamaged paint underneath. This makes wrapping an excellent alternative to repainting for color changes.',
        },
        {
          question: 'How long does a car wrap last?',
          answer: 'A quality car wrap lasts 5–7 years with proper care, though premium films from brands like 3M and Avery Dennison can last 7–10 years or more. Lifespan depends on exposure to sunlight, weather conditions, driving habits, and maintenance. Wraps in sunny climates like Kenya may fade slightly faster due to UV exposure. Regular washing and waxing help preserve the color and finish. If fading or damage occurs, partial repairs or full rewrapping may be needed.',
        },
        {
          question: 'How long does it take to wrap a car?',
          answer: 'Full vehicle wraps typically take 3–5 days to complete professionally, while partial wraps (hood, roof, mirrors) can be done in 1–2 days. The process involves surface preparation, film application, and curing time. Factors affecting duration include vehicle size, design complexity, weather conditions (wraps can\'t be applied in rain), and any paint correction needed first. Mobile services may take longer due to equipment setup. On the day, expect multiple visits if it\'s a full wrap.',
        },
        {
          question: 'Can a wrapped car go through a carwash?',
          answer: 'Hand washing with mild, pH-neutral soap is recommended for wrapped cars to avoid damaging the film. Avoid automatic car washes with brushes, as they can lift wrap edges or cause scratches. High-pressure jets near seams should also be avoided. Tunnel washes without brushes are sometimes okay, but hand washing gives the best results. Regular maintenance prevents dirt buildup that could wear down the wrap over time. Use microfiber cloths and avoid harsh chemicals.',
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
    intro: `PPF installation in {location} costs KES 15,000–100,000+ depending on coverage. Mekh connects you with certified PPF installers in {location} offering self-healing urethane films that guard against stone chips, scratches, and road debris — keeping your car looking showroom-fresh for years.`,
    priceRange: 'KES 15,000 – KES 100,000+',
    quickAnswer: {
      cost: 'KES 15,000 – 100,000+',
      time: '4–8 hours',
      technicians: 'available',
      mobile: true,
    },
    whatIs: 'Paint Protection Film (PPF) is a clear urethane film applied to a vehicle\'s painted surfaces to protect against stone chips, scratches, and environmental damage. It self-heals minor scratches with heat.',
      faqs: [
        {
          question: 'How much does PPF cost in {location}?',
          answer: 'PPF installation in {location} ranges from KES 15,000 for partial front coverage (bonnet, bumper) to KES 100,000+ for full body protection. Pricing depends on coverage area, film thickness, and brand quality. Popular packages start with front bumper and bonnet protection, while full vehicle coverage can cost significantly more. Premium brands like XPEL or SunTek are more expensive but offer better durability. Installation complexity and vehicle size also affect final pricing.',
        },
        {
          question: 'What is PPF and how does it work?',
          answer: 'PPF (Paint Protection Film) is a transparent, thermoplastic urethane film applied to your car\'s painted surfaces. It works by absorbing impacts from stone chips, road debris, and minor scratches, distributing the energy across the film rather than penetrating the paint. The film self-heals from minor scratches when exposed to heat (from sunlight or a heat gun), returning to its clear, protective state. PPF is essentially an invisible shield that protects your vehicle\'s paint from everyday damage.',
        },
        {
          question: 'Which is better — PPF or ceramic coating?',
          answer: 'PPF and ceramic coating serve different but complementary purposes. PPF provides physical protection against rock chips, scratches, and road debris — damage that ceramic coating cannot prevent. Ceramic coating offers chemical resistance, UV protection, and hydrophobic properties that make washing easier and enhance gloss. Many car owners use both: PPF for impact protection and ceramic coating on top for added shine and water repellency. The best choice depends on your driving conditions and budget.',
        },
        {
          question: 'How long does PPF last?',
          answer: 'Quality PPF lasts 5–10 years with proper maintenance, depending on film quality and environmental conditions. Premium brands like XPEL and SunTek offer lifetime warranties against yellowing, cracking, and peeling. The film may become less effective over time as it absorbs impacts, but it won\'t completely fail. In Kenya\'s climate, regular washing and protection from extreme heat help maximize lifespan. Professional inspection can determine when reapplication is needed.',
        },
        {
          question: 'Does PPF affect the appearance of my car?',
          answer: 'Modern PPF is virtually invisible once applied and actually enhances the gloss and depth of your vehicle\'s paint by adding a protective layer. High-quality films have excellent clarity and don\'t alter the original color or finish. Matte PPF options are available for matte-finish vehicles. Some budget films may have a slight orange peel texture or yellowing over time, which is why choosing reputable brands is important. The protection is worth any minimal visual change.',
        },
        {
          question: 'Can PPF be applied to headlights?',
          answer: 'Yes, PPF can be applied to headlights, mirrors, door edges, rocker panels, and any painted surface. High-impact areas like the bonnet, front bumper, front fenders, and door leading edges are the most popular starting points for protection. Headlight PPF protects against stone chips and weathering, maintaining clarity and brightness. The film can be custom-cut to fit any contour, including complex curves. Some packages include protection for wheel arches and lower body panels prone to road debris damage.',
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
    intro: `Ceramic coating in {location} costs KES 15,000–50,000 depending on the system. Mekh connects you with certified ceramic coating specialists in {location} whose products bond with your vehicle's paint to deliver years of protection against UV rays, chemical damage, and environmental contaminants — with hydrophobic properties that make washing effortless.`,
    priceRange: 'KES 15,000 – KES 50,000',
    quickAnswer: {
      cost: 'KES 15,000 – 50,000',
      time: '4–6 hours',
      technicians: 'available',
      mobile: true,
    },
    whatIs: 'Ceramic coating is a liquid polymer applied to the vehicle\'s exterior that bonds with the paint to create a protective layer against UV rays, chemicals, and minor scratches, resulting in a hydrophobic, high-gloss finish.',
      faqs: [
        {
          question: 'How much does ceramic coating cost in {location}?',
          answer: 'Ceramic coating in {location} ranges from KES 15,000 for a single-layer application to KES 50,000+ for multi-layer professional systems with longer warranties. Pricing depends on the coating brand (like Gtechniq, IGL, or Ceramic Pro), number of layers, and whether paint correction is included. Basic packages cover the exterior paint, while premium options may include wheels, glass, or interior surfaces. Professional-grade systems with 5+ year warranties cost more but provide better long-term protection.',
        },
        {
          question: 'How long does ceramic coating last?',
          answer: 'Professional ceramic coatings last 2–5 years or more depending on the product tier, application quality, and your maintenance routine. Higher-grade coatings like Gtechniq Crystal Serum Ultra or IGL coatings offer 5+ year protection with proper care. Factors affecting longevity include exposure to harsh chemicals, frequent washing, and environmental conditions. Regular maintenance with pH-neutral products helps maximize the coating\'s lifespan. Some coatings may require annual top-ups for continued protection.',
        },
        {
          question: 'Is ceramic coating better than wax?',
          answer: 'Yes, ceramic coating is significantly better than traditional wax. While wax lasts only weeks and provides minimal protection, ceramic coating creates a permanent bond with the paint that lasts years. It offers superior chemical resistance against bird droppings, tree sap, and road salts, plus a harder surface layer that resists minor scratches. Ceramic coatings also have far better hydrophobic properties, making water bead up and roll off the surface, which reduces water spots and makes cleaning easier. The enhanced gloss and depth are also more durable.',
        },
        {
          question: 'What are the disadvantages of ceramic coating?',
          answer: 'Ceramic coating does not protect against rock chips or deep scratches — that\'s what PPF (Paint Protection Film) is designed for. It also requires thorough paint correction before application to avoid sealing in existing swirl marks, scratches, or defects permanently. The coating process is more expensive than wax and requires professional application for best results. Some lower-quality coatings may not live up to expectations, and improper maintenance can reduce effectiveness. It\'s not a substitute for regular washing and care.',
        },
        {
          question: 'Can rain damage ceramic coating?',
          answer: 'No, rain does not damage ceramic coating — in fact, it helps maintain it by rinsing away contaminants. The hydrophobic properties cause water to bead up and roll off, preventing water spots and mineral deposits. However, avoid washing or exposing the vehicle to rain in the first 24–48 hours after application while the coating cures. Once fully cured, rain actually helps keep the coating clean. In Kenya\'s climate, this self-cleaning effect is particularly beneficial for maintaining the coating\'s appearance.',
        },
        {
          question: 'Does ceramic coating make your car shinier?',
          answer: 'Yes, ceramic coating significantly enhances the shine and depth of your vehicle\'s paint. A properly prepared and coated surface has much more gloss and clarity than uncoated paint, especially visible in direct sunlight. The coating fills minor imperfections and creates a smooth, reflective surface. Different coating types offer varying levels of gloss, from natural to high-shine finishes. The enhanced appearance is one of the main reasons car owners choose ceramic coating, as it makes the paint look showroom-fresh for years.',
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
    intro: `Car buffing and polishing in {location} costs KES 5,000–20,000 depending on vehicle size. Mekh connects you with certified technicians in {location} who use machine buffing to remove swirl marks, oxidation, light scratches, and water spots — bringing your paint back to showroom condition.`,
    priceRange: 'KES 5,000 – KES 20,000',
    quickAnswer: {
      cost: 'KES 5,000 – 20,000',
      time: '2–3 hours',
      technicians: 'available',
      mobile: true,
    },
    whatIs: 'Car buffing, also known as paint polishing, uses rotary buffers and compounds to remove swirl marks, oxidation, and light scratches from the vehicle\'s paint, restoring its shine and clarity.',
      faqs: [
        {
          question: 'How much does car buffing cost in {location}?',
          answer: 'Car buffing and polishing in {location} typically costs KES 5,000–20,000 depending on vehicle size, paint condition, and the level of correction required. Basic swirl mark removal starts lower, while extensive oxidation or deep scratch correction costs more. Premium compounds and professional-grade equipment may increase pricing. The final cost depends on how much work is needed to restore your vehicle\'s shine. Many technicians offer packages that include wax or sealant application after buffing.',
        },
        {
          question: 'Does buffing remove scratches?',
          answer: 'Buffing can remove light to moderate surface scratches and swirl marks that are only in the clear coat layer. Deep scratches that penetrate the clear coat or reach the base coat paint cannot be fully removed by buffing alone and may require touch-up paint or panel respray. The effectiveness depends on scratch depth and paint condition. Professional technicians can assess your vehicle and recommend the best approach. Some light scratches may become less visible after buffing, even if not completely eliminated.',
        },
        {
          question: 'How often should I buff my car?',
          answer: 'Most vehicles benefit from professional buffing once a year, or every 12–18 months depending on driving conditions and paint care. Vehicles exposed to harsh sunlight, road salt, or frequent washing may need it more often. Over-buffing can thin the clear coat over time, so it\'s best done by professionals who measure paint thickness and use appropriate techniques. Regular waxing and proper washing between buffing sessions help maintain the results longer.',
        },
        {
          question: 'Is buffing safe for my car?',
          answer: 'Yes, buffing is safe when done by trained professionals using the correct machine, pad, compound, and technique combination. They know how to avoid heat buildup that could damage paint or plastic parts. Improper buffing by untrained hands can cause holograms (rainbow effects), thin spots in the clear coat, or even burn the paint. Always choose certified technicians with experience in paint correction. Professional buffing actually strengthens and protects the paint when done correctly.',
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

   'headlight-restoration': {
     metaDescription: `Professional headlight restoration services in {location}, Kenya. Restore cloudy headlights to clear, bright condition. Compare prices, portfolios & book certified technicians on Mekh.`,
     intro: `Headlight restoration in {location} costs KES 2,000–8,000 per headlight depending on condition. Mekh connects you with certified technicians in {location} who restore cloudy, yellowed headlights to clear, bright condition using professional sanding and coating techniques. Improve visibility and safety while enhancing your vehicle's appearance.`,
     priceRange: 'KES 2,000 – KES 8,000',
     quickAnswer: {
       cost: 'KES 2,000 – 8,000',
       time: '1–2 hours',
       technicians: 'available',
       mobile: true,
     },
     whatIs: 'Headlight restoration is the process of removing oxidation, scratches, and yellowing from plastic headlight lenses to restore clarity and brightness. Using sanding compounds and UV-protective coatings, technicians return headlights to their original clear state, improving nighttime visibility and vehicle appearance.',
     faqs: [
       {
         question: 'How much does headlight restoration cost in {location}?',
         answer: 'Headlight restoration in {location} costs KES 2,000–8,000 per headlight depending on the level of oxidation and damage. Basic yellowing removal starts at the lower end, while severe clouding or cracking costs more. Both headlights together typically range from KES 4,000–15,000. Professional restoration includes UV-protective coating for long-lasting results. Prices may vary by technician experience and materials used.',
       },
       {
         question: 'How long does headlight restoration take?',
         answer: 'Headlight restoration typically takes 1–2 hours per headlight, though severe cases may take longer. The process involves cleaning, sanding with multiple grits of compound, polishing, and applying protective coating. Mobile services at your location may take slightly longer due to equipment setup. You can usually drive the vehicle the same day, but avoid wet conditions for 24 hours while the coating cures.',
       },
       {
         question: 'How long does restored headlights last?',
         answer: 'Professional headlight restoration with UV-protective coating lasts 1–2 years, depending on exposure to sunlight and weather conditions. In Kenya\'s sunny climate, the coating helps prevent future yellowing. Without protection, headlights may yellow again within 6–12 months. Regular cleaning and waxing help maintain the restoration. Some technicians offer warranties on their work.',
       },
       {
         question: 'Can I do headlight restoration myself?',
         answer: 'While DIY headlight restoration kits are available, professional restoration provides better results and longevity. DIY methods often don\'t achieve the same clarity and may damage the headlights if not done correctly. Professional technicians have the right equipment, experience with different headlight types, and apply proper protective coatings. For best results and safety, choose a certified professional.',
       },
       {
         question: 'Does headlight restoration improve visibility?',
         answer: 'Yes, headlight restoration significantly improves nighttime visibility by removing oxidation that reduces light output by up to 80%. Clear headlights provide better illumination for safer driving. Many customers report improved visibility, especially in rain or fog. Restoration also enhances the vehicle\'s overall appearance, making it look newer and more maintained.',
       },
       {
         question: 'Are headlight covers better than restoration?',
         answer: 'Headlight covers provide temporary protection but don\'t restore clarity or improve light output like professional restoration. Covers can yellow over time and may reduce light transmission. Restoration removes the problem at the source and includes protective coating to prevent future damage. Covers are better as a preventive measure, while restoration is ideal for already damaged headlights.',
       },
     ],
     pricingContext: 'Headlight restoration in {location} costs KES 2,000–8,000 per headlight depending on condition. Basic yellowing removal is more affordable than severe oxidation treatment. Both headlights typically cost KES 4,000–15,000 total.',
     benefits: [
       'Restores clear, bright headlight visibility',
       'Improves nighttime driving safety',
       'Enhances vehicle appearance',
       'Prevents future yellowing with UV protection',
       'Cost-effective alternative to replacement',
       'Professional results with warranty',
     ],
   },

   'car-tuning': {
     metaDescription: `Professional car tuning services in {location}, Kenya. ECU remapping, performance upgrades & diagnostics. Compare prices, portfolios & book certified mechanics on Mekh.`,
     intro: `Car tuning in {location} costs KES 5,000–50,000+ depending on the type of modifications. Mekh connects you with certified mechanics in {location} offering ECU remapping, exhaust upgrades, suspension tuning, and performance diagnostics. Enhance your vehicle\'s power, efficiency, and driving experience with professional tuning services.`,
     priceRange: 'KES 5,000 – KES 50,000+',
     quickAnswer: {
       cost: 'KES 5,000 – 50,000+',
       time: '2–8 hours',
       technicians: 'available',
       mobile: true,
     },
     whatIs: 'Car tuning involves modifying a vehicle\'s engine management system, exhaust, suspension, or other components to improve performance, fuel efficiency, or handling. This can include ECU remapping for more power, exhaust system upgrades for better flow, or suspension adjustments for improved ride quality.',
     faqs: [
       {
         question: 'How much does car tuning cost in {location}?',
         answer: 'Car tuning in {location} costs KES 5,000–50,000+ depending on the type of modifications. Basic ECU remapping starts at KES 5,000–15,000, while comprehensive performance packages can cost KES 30,000–100,000 or more. Exhaust system upgrades range from KES 10,000–30,000, and suspension tuning costs KES 8,000–25,000. Prices vary by vehicle make/model and complexity. Always get quotes from certified technicians.',
       },
       {
         question: 'What is ECU remapping and how much does it cost?',
         answer: 'ECU remapping reprograms your vehicle\'s engine control unit to optimize performance, potentially increasing horsepower and torque by 10–30%. In {location}, ECU remapping costs KES 5,000–15,000 depending on the vehicle. It can improve acceleration, fuel efficiency, and throttle response. The process takes 1–2 hours and requires specialized software and equipment. Not all vehicles are suitable for remapping, and warranty implications should be considered.',
       },
       {
         question: 'How long does car tuning take?',
         answer: 'Car tuning duration varies by service: ECU remapping takes 1–2 hours, exhaust installation 2–4 hours, suspension tuning 4–8 hours, and comprehensive packages may span multiple days. Mobile services may take longer due to equipment setup. Some modifications require test drives or dyno testing. Plan for the vehicle to be unavailable during the tuning process, though many services allow same-day completion for simpler jobs.',
       },
       {
         question: 'Does tuning void my car warranty?',
         answer: 'Some tuning modifications may affect manufacturer warranty coverage, particularly ECU remapping or exhaust changes. In Kenya, warranty terms vary by brand and dealer. Many reputable tuners provide their own warranty on work performed. Always check your warranty terms and consider having modifications done by authorized dealers if warranty preservation is important. Some modifications are undetectable and won\'t affect warranty claims.',
       },
       {
         question: 'Is car tuning safe for my vehicle?',
         answer: 'Professional car tuning by certified technicians is safe when done correctly and within reasonable parameters. Poor quality tuning can cause engine damage, reduced reliability, or warranty issues. Choose ASE-certified mechanics with experience in your vehicle make. Start with conservative tunes and monitor performance. Regular maintenance becomes even more important with tuned vehicles. Always follow manufacturer recommendations for modifications.',
       },
       {
         question: 'What are the benefits of car tuning?',
         answer: 'Car tuning can improve performance, fuel efficiency, and driving dynamics. Benefits include increased horsepower/torque, better throttle response, improved fuel economy (in some cases), enhanced suspension handling, and customized driving experience. Some tunings reduce emissions or improve towing capacity. Results vary by vehicle and tuning type. Professional tuning ensures optimal performance without compromising reliability.',
       },
     ],
     pricingContext: 'Car tuning in {location} ranges from KES 5,000 for basic diagnostics to KES 50,000+ for comprehensive performance packages. ECU remapping costs KES 5,000–15,000, while exhaust and suspension upgrades cost KES 10,000–30,000 each.',
     benefits: [
       'Increased engine performance and power',
       'Improved fuel efficiency in some cases',
       'Better throttle response and acceleration',
       'Enhanced handling and ride quality',
       'Customized driving experience',
       'Professional diagnostics and maintenance',
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
  'Car Audio Installation': ['audio', 'sound', 'stereo'],
  'Car Alarm Installation': ['alarm', 'security'],
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
    '@type': ['AutoRepair', 'LocalBusiness'],
    name: `${serviceName} in ${locationName}`,
    description: serviceContent?.intro || '',
    priceRange: serviceContent?.priceRange,
    telephone: '+254700000000', // Placeholder, replace with actual
    address: {
      '@type': 'PostalAddress',
      addressLocality: locationName,
      addressCountry: 'KE',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      reviewCount: '47',
    },
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
      { '@type': 'ListItem', position: 2, name: serviceName, item: `https://mekh.app/services/${service}` },
      { '@type': 'ListItem', position: 3, name: locationName, item: `https://mekh.app/${service}/${location}` },
    ],
  }), [serviceName, locationName, service, location]);



  return (
    <div className="min-h-screen bg-slate-950">

      {/* ─── SEO Head ─────────────────────────────────────────────────────── */}
      <Helmet>
        {/* Title: Primary keyword + location | Brand */}
        <title>{service === 'window-tinting' ? `Car Tinting in ${locationName} | Prices & Mobile Service Near You | Mekh` : `${serviceName} in ${locationName} | Mekh`}</title>

        {/* Meta description: 150–160 chars, includes location + service + CTA */}
        <meta name="description" content={serviceContent?.metaDescription || ''} />

        {/* Canonical URL */}
        <link rel="canonical" href={`https://mekh.app/${service}/${location}`} />

        {/* Open Graph */}
        <meta property="og:title" content={`${serviceName} in ${locationName} | Mekh`} />
        <meta property="og:description" content={serviceContent?.metaDescription || ''} />
        <meta property="og:image" content={`https://mekh.app/assets/${service}.jpg`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://mekh.app/${service}/${location}`} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${serviceName} in ${locationName} | Mekh`} />
        <meta name="twitter:description" content={serviceContent?.metaDescription || ''} />
        <meta name="twitter:image" content={`https://mekh.app/assets/${service}.jpg`} />

        {/* Structured Data */}
        <script type="application/ld+json">{JSON.stringify(localBusinessSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbSchema)}</script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: ['.intro-paragraph', '.pricing-context'],
            },
          })}
        </script>
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
            {service === 'window-tinting' ? `Car Window Tinting in ${locationName} — Mobile Service Near You` : `${serviceName} in ${locationName}`}
          </h1>

          <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-6 leading-relaxed intro-paragraph">
            {serviceContent?.intro}
          </p>

          {/* What Is [Service]? */}
          {serviceContent?.whatIs && (
            <div className="max-w-2xl mx-auto mb-6">
              <h3 className="text-white font-bold text-lg mb-2">What is {serviceName}?</h3>
              <p className="text-slate-400 leading-relaxed">{serviceContent.whatIs}</p>
            </div>
          )}

          {/* Quick Answer Box */}
          {serviceContent?.quickAnswer && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6 max-w-2xl mx-auto">
              <h3 className="text-white font-bold text-lg mb-4 text-center">
                {serviceName} in {locationName} — Quick Facts
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-slate-400 text-sm">Cost</p>
                  <p className="text-white font-semibold">{serviceContent.quickAnswer.cost}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Time</p>
                  <p className="text-white font-semibold">{serviceContent.quickAnswer.time}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Technicians</p>
                  <p className="text-white font-semibold">{serviceContent.quickAnswer.technicians}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Mobile Service</p>
                  <p className="text-white font-semibold">{serviceContent.quickAnswer.mobile ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          )}

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
              <p className="text-slate-300 text-sm leading-relaxed pricing-context">
                {serviceContent?.pricingContext}
              </p>
            </div>
          </div>
          </div>
        </section>

        {/* ─── How It Works ────────────────────────────────────────────────── */}
        <section className="px-4 pb-10" aria-label="How it works">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              How It Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">1</span>
                </div>
                <h3 className="text-white font-semibold mb-2">Browse Verified Technicians</h3>
                <p className="text-slate-400 text-sm">Find certified {serviceName.toLowerCase()} professionals in {locationName} with portfolios and reviews.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">2</span>
                </div>
                <h3 className="text-white font-semibold mb-2">Compare Prices & Reviews</h3>
                <p className="text-slate-400 text-sm">Review portfolios, check pricing, and read customer feedback to choose the best fit.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">3</span>
                </div>
                <h3 className="text-white font-semibold mb-2">Book & Get Confirmation</h3>
                <p className="text-slate-400 text-sm">Book directly and receive a WhatsApp confirmation for your {serviceName.toLowerCase()} service.</p>
              </div>
            </div>
            {/* HowTo Schema */}
            <script type="application/ld+json">
              {JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'HowTo',
                name: `How to Get ${serviceName} in ${locationName}`,
                description: `Step-by-step guide to finding and booking ${serviceName.toLowerCase()} services in ${locationName} on Mekh.`,
                step: [
                  {
                    '@type': 'HowToStep',
                    position: 1,
                    name: 'Browse Verified Technicians',
                    text: 'Find certified professionals with portfolios and reviews.',
                  },
                  {
                    '@type': 'HowToStep',
                    position: 2,
                    name: 'Compare Prices & Reviews',
                    text: 'Review options and choose the best technician.',
                  },
                  {
                    '@type': 'HowToStep',
                    position: 3,
                    name: 'Book & Get Confirmation',
                    text: 'Book directly and receive WhatsApp confirmation.',
                  },
                ],
              })}
            </script>
          </div>
        </section>

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
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {technicians.map((technician) => (
                  <TechnicianCard key={technician.id} technician={technician} />
                ))}
              </div>
              {/* ItemList Schema */}
              <script type="application/ld+json">
                {JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'ItemList',
                  name: `${serviceName} Technicians in ${locationName}`,
                  numberOfItems: technicians.length,
                  itemListElement: technicians.map((tech, index) => ({
                    '@type': 'ListItem',
                    position: index + 1,
                    item: {
                      '@type': 'LocalBusiness',
                      name: tech.business_name || tech.name,
                      url: `https://mekh.app/technician/${tech.slug}`,
                    },
                  })),
                })}
              </script>
            </>
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
                    aria-expanded={expandedFaq.includes(idx) ? "true" : "false"}
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
            {[
              // Prioritize high-population areas
              ...['nairobi', 'westlands', 'kiambu-road', 'thika-road'].filter(slug => slug !== location && LOCATION_SLUGS[slug]),
              // Then others
              ...Object.keys(LOCATION_SLUGS).filter(slug => slug !== location && !['nairobi', 'westlands', 'kiambu-road', 'thika-road'].includes(slug))
            ]
              .slice(0, 10)
              .map((slug) => {
                const name = LOCATION_SLUGS[slug];
                return (
                  <Link
                    key={slug}
                    to={`/services/${service}/${slug}`}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-full text-sm transition-colors"
                  >
                    {serviceName} in {name}
                  </Link>
                );
              })}
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