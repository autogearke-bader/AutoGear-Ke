import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { WHATSAPP_NUMBER, BUSINESS_NAME, API_BASE_URL } from '../constants.ts';
import ProductCard from '../components/ProductCard.tsx';
import BundleCard from '../components/BundleCard.tsx';
import { Product, Bundle, Article } from '../types.ts';

const CarAccessoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const bundlesScrollRef = useRef<HTMLDivElement>(null);

  const scrollBundles = (direction: 'left' | 'right') => {
    const container = bundlesScrollRef.current;
    if (container) {
      const cardWidth = container.querySelector('.bundle-card')?.getBoundingClientRect().width || 0;
      const gap = 16; // gap-4 = 16px
      const scrollAmount = cardWidth + gap;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);

    // Select existing meta elements
    const metaDescription = document.querySelector('meta[name="description"]');
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDescription = document.querySelector('meta[property="og:description"]');
    const ogUrl = document.querySelector('meta[property="og:url"]');
    const canonicalLink = document.querySelector('link[rel="canonical"]');

    // Store original values for cleanup
    const prevTitle = document.title;
    const prevDesc = metaDescription?.getAttribute('content');
    const prevKeywords = metaKeywords?.getAttribute('content');
    const prevOgTitle = ogTitle?.getAttribute('content');
    const prevOgDesc = ogDescription?.getAttribute('content');
    const prevOgUrl = ogUrl?.getAttribute('content');
    const prevCanonical = canonicalLink?.getAttribute('href');

    // Set Car Accessories SEO values
    document.title = `Car Accessories Kenya | Best Auto Gadgets & Interior Decor`;

    if (metaDescription) {
      metaDescription.setAttribute('content', 'Upgrade your ride with premium car accessories. Shop dash cams, floor mats, jump starters & tire inflators in Kenya. Quality auto gear for every vehicle.');
    }

    if (metaKeywords) {
      metaKeywords.setAttribute('content', 'car accessories nairobi, auto accessories kenya, car interior upgrades nairobi, ambient lighting kenya, smart car diffuser, retractable charger nairobi, car floor mats kenya, car seat covers nairobi, professional car fitting ngong road');
    }

    if (ogTitle) ogTitle.setAttribute('content', `Car Accessories in Nairobi | ${BUSINESS_NAME}`);
    if (ogDescription) ogDescription.setAttribute('content', 'Shop top-rated car accessories with expert fitting services. Ambient lighting, diffusers, chargers, and more. Fast delivery across Kenya.');
    if (ogUrl) ogUrl.setAttribute('content', 'https://autogearke.com/car-accessories');
    if (canonicalLink) canonicalLink.setAttribute('href', 'https://autogearke.com/car-accessories');

    // Cleanup: Revert to previous SEO state on unmount
    return () => {
      document.title = prevTitle;
      if (metaDescription && prevDesc) metaDescription.setAttribute('content', prevDesc);
      if (metaKeywords && prevKeywords) metaKeywords.setAttribute('content', prevKeywords);
      if (ogTitle && prevOgTitle) ogTitle.setAttribute('content', prevOgTitle);
      if (ogDescription && prevOgDesc) ogDescription.setAttribute('content', prevOgDesc);
      if (ogUrl && prevOgUrl) ogUrl.setAttribute('content', prevOgUrl);
      if (canonicalLink && prevCanonical) canonicalLink.setAttribute('href', prevCanonical);
    };
  }, []);

  const [products, setProducts] = useState<Product[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, bundlesRes, articlesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/get-products.php`),
          fetch(`${API_BASE_URL}/get-bundles.php`),
          fetch(`${API_BASE_URL}/get-featured-car.php?limit=1`)
        ]);
        if (productsRes.ok) {
          const allProducts = await productsRes.json();
          const carProducts = allProducts.filter((p: Product) => p.category === 'car');
          setProducts(carProducts);
        }
        if (bundlesRes.ok) {
          const bundlesData = await bundlesRes.json();
          setBundles(bundlesData.filter((b: Bundle) => b.category === 'car' || !b.category));
        }
        if (articlesRes.ok) {
          const articles = await articlesRes.json();
          setFeaturedArticles(articles);
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };
    fetchData();
  }, []);

  const customInquiryMessage = "Hi, I'm looking for a specific car accessory not on your list. Can you help me find it?";
  const customInquiryUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(customInquiryMessage)}`;

  return (
    <div className="pb-0">
      <Helmet>
        <title>Car Accessories | AutoGear Ke - Ngong Road Nairobi</title>
        <link rel="canonical" href="https://autogearke.com/car-accessories" />
        <meta name="description" content="Shop premium car accessories in Nairobi. Expert installation for ambient lighting, dash cams, floor mats, and seat covers. Pay on delivery available." />
      </Helmet>
      {/* BreadcrumbList Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://autogearke.com"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Car Accessories",
              "item": "https://autogearke.com/car-accessories/"
            }
          ]
        })}
      </script>

      {/* Product Grid Section */}
      <section className="px-6 pt-2 lg:pt-2 pb-6 max-w-7xl mx-auto">
        <div className="mb-2 md:mb-4">
          <h2 className="text-xl md:text-2xl font-black text-white uppercase mb-2">Shop Car Accessories</h2>
          <p className="text-slate-400 text-sm">Explore our range of car interior upgrades and accessories.</p>
        </div>
        {products.length > 0 ? (
          <div className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory scrollbar-hide will-change-transform -mx-6 px-6">
            {products.map((product) => (
              <div key={product.id} className="w-[45%] md:w-[30%] lg:w-[23.5%] flex-shrink-0 snap-start pr-6">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl">
            <p className="text-slate-500 text-sm">No car accessories found. Please check back later.</p>
          </div>
        )}
      </section>

      {/* Bundles Section */}
      <section className="px-6 pb-12 md:pb-20 bg-slate-100/50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 text-center md:text-left flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white uppercase mb-2">Exclusive Bundles</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">Best value car accessory kits in Kenya.</p>
            </div>
            {/* Navigation Arrows - Tablet & Desktop (only if more than 2 bundles) */}
            {bundles.length > 2 && (
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => scrollBundles('left')}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-600 active:bg-slate-700 transition-all shadow-lg"
                  aria-label="Previous bundle"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => scrollBundles('right')}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-100 hover:bg-slate-600 active:bg-slate-700 transition-all shadow-lg"
                  aria-label="Next bundle"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          {/* Bundle Scroll Container */}
          <div 
            ref={bundlesScrollRef}
            className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory scrollbar-hide will-change-transform -mx-6 px-6 items-start gap-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:overflow-visible"
          >
            {bundles.map((bundle) => (
              <div key={bundle.id} className="bundle-card min-w-[85vw] md:min-w-[45vw] lg:min-w-full snap-center">
                <BundleCard bundle={bundle} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pro-Guides Section - AutoGear Drive Guides */}
      {featuredArticles.length > 0 && (
        <section className="px-6 py-1 md:py-0 max-w-7xl mx-auto">
          <div className="mb-1">
            <h2 className="text-sm md:text-sm font-black text-slate-900 dark:text-white uppercase">AutoGear Drive Guides</h2>
          </div>
          
          {/* Article Links */}
          <div className="pb-4 space-y-2">
            {featuredArticles.slice(0, 2).map((article) => (
              <a
                key={article.id}
                href={`/blogs/${article.slug}`}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <span className="text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wide group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  {article.title.split(' ').slice(0, 6).join(' ') + (article.title.split(' ').length > 6 ? '...' : '')}
                </span>
                <span className="text-blue-500 dark:text-blue-400 text-[10px] group-hover:translate-x-1 transition-transform">
                  Read More →
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Availability Note / Custom Sourcing Section - Horizontal on Mobile */}
      <section className="px-6 py-4 md:py-8 bg-slate-900/30 border-y border-slate-800/50">
        <div className="max-w-4xl mx-auto rounded-xl md:rounded-[2rem] bg-slate-900 border border-slate-800 p-4 md:p-8 shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 flex flex-row items-center justify-between gap-4 md:block md:text-center">
            {/* Icon - Hidden on Mobile */}
            <div className="hidden md:block w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center mx-auto mb-4 transform transition-transform group-hover:scale-110 shadow-inner">
               <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
               </svg>
            </div>

            {/* Title - Smaller on Mobile */}
            <h3 className="text-sm md:text-xl md:text-2xl font-black text-white leading-tight md:mb-3">Need a specific accessory?</h3>

            {/* Description - Hidden on Mobile */}
            <p className="hidden md:block text-slate-400 text-sm md:mb-6 leading-relaxed max-w-2xl mx-auto">
              If you don't see the exact car accessory you're looking for, contact us. We have extensive stock and can source custom items.
            </p>

            {/* Compact Button on Mobile */}
            <a
              href={customInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-white text-slate-950 px-4 py-2 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition-all text-[10px] md:px-6 md:py-3 md:rounded-xl md:text-sm shadow-xl active:scale-95 shrink-0"
            >
              Inquire via WhatsApp <span className="hidden md:inline ml-2" aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </section>

      {/* Return Home Footer CTA */}
      <div className="hidden lg:flex flex-col items-center pt-6 lg:pt-8 pb-6 bg-slate-950">
        <Link
          to="/"
          className="px-8 py-4 border border-slate-800 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white hover:border-blue-600 transition-all"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default CarAccessoriesPage;
