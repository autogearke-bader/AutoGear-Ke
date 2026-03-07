
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BUSINESS_NAME, API_BASE_URL } from '../constants.ts';
import ProductCard from '../components/ProductCard.tsx';
import BundleCard from '../components/BundleCard.tsx';
import Testimonials from '../components/Testimonials.tsx';
import { Product, Bundle, Article } from '../types.ts';
import { getTrendingProducts, getValueBundles } from '../utils/storage.ts';

const HomePage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
    const [trendingProductIds, setTrendingProductIds] = useState<string[]>([]);
    const [valueBundleIds, setValueBundleIds] = useState<string[]>([]);
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

    // Filtered products and bundles for display
    const trendingProducts = useMemo(() => {
      if (trendingProductIds.length > 0) {
        return products.filter(p => trendingProductIds.includes(p.id));
      }
      return []; // Only show selected featured products
    }, [products, trendingProductIds]);

    const valueBundles = useMemo(() => {
      if (valueBundleIds.length > 0) {
        return bundles.filter(b => valueBundleIds.includes(b.id));
      }
      return []; // Only show selected featured bundles
    }, [bundles, valueBundleIds]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, bundlesRes, featuredRes, articlesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/get-products.php`),
          fetch(`${API_BASE_URL}/get-bundles.php`),
          fetch(`${API_BASE_URL}/get-featured.php`),
          fetch(`${API_BASE_URL}/get-featured-homepage.php?limit=2`)
        ]);
        
        // Process products with validation
        if (productsRes.ok) {
          const allProducts = await productsRes.json();
          // Validate products array
          if (Array.isArray(allProducts)) {
            setProducts(allProducts);
          }
        }
        
        // Process bundles with validation
        if (bundlesRes.ok) {
          const bundlesData = await bundlesRes.json();
          if (Array.isArray(bundlesData)) {
            setBundles(bundlesData);
          }
        }
        
        // Process featured with validation
        if (featuredRes.ok) {
          const featured = await featuredRes.json();
          if (featured && typeof featured === 'object') {
            setTrendingProductIds(Array.isArray(featured.trending) ? featured.trending : []);
            setValueBundleIds(Array.isArray(featured.valueBundles) ? featured.valueBundles : []);
          }
        } else {
          // Fallback to local storage
          setTrendingProductIds(getTrendingProducts());
          setValueBundleIds(getValueBundles());
        }
        
        // Process articles with validation
        if (articlesRes.ok) {
          const articles = await articlesRes.json();
          if (Array.isArray(articles)) {
            setFeaturedArticles(articles);
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
        // Fallback to local storage
        setTrendingProductIds(getTrendingProducts());
        setValueBundleIds(getValueBundles());
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    document.title = `AutoGear Ke | Premium Car &  Mobile Accessories Nairobi `;
  }, []);

  // Preload first 3 trending product images
  useEffect(() => {
    if (trendingProducts.length > 0) {
      const imagesToPreload = trendingProducts.slice(0, 3).map(product => {
        if (product.images && product.images.length > 0 && product.images[0]?.image_name?.trim() !== '') {
          const img = product.images[0];
          // Use url property if available, otherwise fall back to constructing the path
          const src = img.url || (img.image_name?.startsWith('http') || img.image_name?.startsWith('data:') ? img.image_name : `/product-images/${img.image_name}`);
          if (src.startsWith('http') || src.startsWith('data:')) return null;
          return src;
        }
        return null;
      }).filter(Boolean);

      imagesToPreload.forEach(src => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = src!;
        document.head.appendChild(link);
      });

      // Cleanup function to remove preload links when component unmounts or products change
      return () => {
        imagesToPreload.forEach(src => {
          const links = document.querySelectorAll(`link[rel="preload"][href="${src}"]`);
          links.forEach(link => link.remove());
        });
      };
    }
  }, [trendingProducts]);

  return (
    <div className="pb-20">
      {/* Hero Section */}
      <section className="px-4 pt-2 md:pt-1">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none"></div>

          <div className="relative z-10 text-center">
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-[1.1] mb-1">
              <span className="block mb-0.5 text-glow">Premium Car & Mobile Accessories</span>
              <span className="block text-blue-600 dark:text-blue-500 text-glow-blue opacity-90 text-sm sm:text-lg md:text-2xl">Clean. Stylish. Modern. Delivered Nationwide.</span>
            </h1>
          </div>
      </section>

      {/* Top Products Section */}
      <section className="px-6 pt-2 pb-10 md:pt-4 md:pb-16 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-2">
          <div>
            <h2 className="text-2xl md:text-2xl font-black text-slate-900 dark:text-white uppercase">TRENDING NOW!!</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Top-rated car & mobile accessories in Kenya</p>
          </div>
        </div>
        {/* Product Carousel - Horizontal Scroll */}
        <div className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory scrollbar-hide will-change-transform -mx-6 px-6">
          {trendingProducts.map((product) => (
            <div key={product.id} className="w-[45%] md:w-[30%] lg:w-[23.5%] flex-shrink-0 snap-start pr-6">
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </section>

      {/* Bundles Section */}
      <section className="px-6 pb-12 md:pb-20 bg-slate-100/50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-900">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 text-center md:text-left flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-2xl font-black text-slate-900 dark:text-white uppercase mb-2">Value Bundles</h2>
              <p className="text-slate-6 text-slate-400 text-sm">Save more with curated accessory kits</p>
            </div>
            {/* Navigation Arrows - Tablet & Desktop (only if more than 2 bundles) */}
            {valueBundles.length > 2 && (
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
          
          {/* Bundle Carousel */}
          <div 
            ref={bundlesScrollRef}
            className="flex flex-nowrap overflow-x-auto snap-x snap-mandatory scrollbar-hide will-change-transform -mx-6 px-6 gap-4"
          >
            {valueBundles.length === 0 ? (
              <div className="w-full text-center py-12">
              </div>
            ) : (
              valueBundles.map((bundle) => (
                <div key={bundle.id} className="w-[85%] md:w-[40%] lg:w-[31.5%] flex-shrink-0 snap-start pr-6 bundle-card">
                  <BundleCard bundle={bundle} />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Latest Insights Section */}
      {featuredArticles.length > 0 && (
        <section className="px-6 py-1 md:py-0 max-w-7xl mx-auto">
          <div className="mb-1">
            <h2 className="text-sm md:text-sm font-black text-slate-900 dark:text-white uppercase">Latest Insights</h2>
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

      {/* Trust Builder Section */}
      <section className="px-6 py-8 md:py-10 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex flex-col items-center text-center p-4 dark:bg-slate-900 rounded-xl">
            <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Secure Payments</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Pay safely via trusted Kenyan payment methods</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-slate-100 dark:bg-slate-900 rounded-xl">
            <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Fast Delivery</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Same-day Nairobi • 24–48 hrs nationwide</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-slate-100 dark:bg-slate-900 rounded-xl">
            <svg className="w-8 h-8 text-blue-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">Quality Checked</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Tested before dispatch no cheap knockoffs</p>
          </div>
          <div className="flex flex-col items-center text-center p-4 bg-slate-100 dark:bg-slate-900 rounded-xl">
            <svg className="w-8 h-8 text-green-500 mb-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">WhatsApp Support</span>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Real humans. Fast replies. No bots.</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="px-6 py-0 md:py-2 bg-slate-100/50 dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-900">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-1xl md:text-2xl font-black text-slate-900 dark:text-white uppercase mb-0 text-center">Verfied Customer Reviews</h2>
          <Testimonials />
        </div>
      </section>
    </div>

    
  );
};

export default HomePage;
