import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Product } from '../types.ts';
import WhatsAppButton from '../components/WhatsAppButton.tsx';
import DOMPurify from 'dompurify';

const CATEGORY_KEYWORDS = {
  car: ['car-interior', 'luxury-car', 'auto-tech'],
  gadget: ['gadget', 'tech-accessories', 'smartphone']
};

const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageStatuses, setImageStatuses] = useState<Record<number, 'loading' | 'ready' | 'fallback'>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  // Determine category from URL path
  const getCategoryFromPath = (pathname: string): 'car' | 'gadget' => {
    if (pathname.includes('/car-accessories/')) return 'car';
    if (pathname.includes('/mobile-accessories/')) return 'gadget';
    return 'car'; // default fallback
  };

  const categoryFromUrl = getCategoryFromPath(location.pathname);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!slug) return;
      try {
        const response = await fetch(`/api/get-product.php?slug=${slug}`);
        if (!response.ok) throw new Error('Product not found');
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    if (product) {
      setImageStatuses({});
      setActiveImageIndex(0);
    }
  }, [product]);

  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      container.scrollTo({
        left: container.offsetWidth * activeImageIndex,
        behavior: 'smooth'
      });
    }
  }, [activeImageIndex]);

  const handleImageLoad = (index: number) => setImageStatuses(prev => ({ ...prev, [index]: 'ready' }));
  const handleImageError = (index: number) => {
    if (imageStatuses[index] !== 'fallback') {
      setImageStatuses(prev => ({ ...prev, [index]: 'fallback' }));
    }
  };

  const getFallback = (index: number = 0) => {
    if (!product) return '';
    const keywords = CATEGORY_KEYWORDS[product.category] || CATEGORY_KEYWORDS.car;
    const charSum = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const keyword = keywords[(charSum + index) % keywords.length];
    return `https://images.unsplash.com/photo-1?auto=format&fit=crop&q=80&w=800&h=600&${keyword}&sig=${product.id}-${index}`;
  };

  const getStockInfo = () => {
    if (!product) return null;
    const status = product.stockStatus || 'in-stock';
    switch (status) {
      case 'in-stock': return { label: 'In Stock', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20', dot: 'bg-emerald-500' };
      case 'limited': return { label: 'Limited', color: 'text-amber-400 bg-amber-400/10 border-amber-500/20', dot: 'bg-amber-500' };
      case 'out-of-stock': return { label: 'Sold Out', color: 'text-slate-500 bg-slate-800 border-slate-700', dot: 'bg-slate-600' };
      default: return null;
    }
  };

  const stockInfo = product ? getStockInfo() : null;
  const videoUrl = product ? (product.youtubeUrl || product.tiktokUrl || product.instagramUrl || product.videoUrl) : '';
  const hasVideo = !!videoUrl;
  const isOutOfStock = product ? (product.stockStatus === 'out-of-stock') : false;

  const handleOpenDemo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoUrl) window.open(videoUrl, '_blank');
  };

  const getVideoPlatformIcon = () => {
    return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <button onClick={() => navigate('/car-accessories/')} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  // Handle both old (string array) and new (object array) image formats
  const getProductImages = () => {
    if (!product || !product.images) return [];
    
    // Images are already in ProductImage format (objects with image_name)
    return product.images
      .filter((img: any) => img.image_name?.trim() !== '')
      .slice(0, 4)
      .map((img: any) => ({
        src: `/product-images/${product.slug}-${img.image_name}`,
        alt: img.alt_text || `${product.name} - High-quality ${product.category} accessory from AutoGear KE, Nairobi Kenya`
      }));
  };
  
  const productImages = getProductImages();

  const metaTitle = `${product.name} | AutoGear Ke | Nairobi, Kenya`;
  const categoryText = product.category === 'car' ? 'car accessories' : 'mobile accessories';
  const categoryPath = product.category === 'car' ? 'car-accessories' : 'mobile-accessories';
  const metaDescription = `Buy ${product.name} at AutoGear Ke. High-quality ${categoryText} available for nationwide delivery in Kenya. Pay on delivery options available.`.substring(0, 150);
  // Dynamic canonical URL based on current location (strips tracking params)
  const getCanonicalUrl = () => {
    const baseUrl = `https://autogearke.com/${categoryPath}/${product.slug}`;
    // Strip tracking parameters
    return baseUrl.split('?')[0];
  };
  const canonicalUrl = getCanonicalUrl();

  const availabilityMap = {
    'in-stock': 'InStock',
    'limited': 'LimitedAvailability',
    'out-of-stock': 'OutOfStock'
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description,
    "image": productImages.map(img => img.src),
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "KES",
      "availability": `https://schema.org/${availabilityMap[product.stockStatus || 'in-stock']}`,
      "seller": {
        "@type": "Organization",
        "name": "AutoGear Ke"
      }
    },
    "brand": {
      "@type": "Brand",
      "name": "AutoGear Ke"
    },
    "category": product.category === 'car' ? 'Car Accessories' : 'Mobile Accessories',
    "url": canonicalUrl
  };

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={productImages[0]?.src} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="product" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={productImages[0]?.src} />
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-slate-950 text-slate-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            {/* Close Button */}
            <div className="p-6 border-b border-slate-800">
              <button onClick={() => navigate(`/${product.category === 'car' ? 'car-accessories' : 'mobile-accessories'}/`)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                </svg>
                Back to Products
              </button>
            </div>

            <div className="flex flex-col lg:flex-row">
              {/* Left Column: Image Carousel */}
              <div className="w-full lg:w-1/2 flex flex-col bg-slate-950">
                <div
                  ref={scrollRef}
                  className="flex overflow-x-hidden snap-x snap-mandatory h-96 lg:flex-1 flex-shrink-0 lg:h-auto bg-slate-950"
                >
                  {productImages.map((img, idx) => (
                    <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
                      <div className={`w-full h-full flex items-center justify-center ${Array.isArray(product.useWhiteBg) && product.useWhiteBg[idx] ? 'bg-white' : (product.useWhiteBg === true ? 'bg-white' : 'bg-slate-950')}`}>
                        <img
                          src={imageStatuses[idx] === 'fallback' ? getFallback(idx) : img.src}
                          alt={img.alt}
                          onLoad={() => handleImageLoad(idx)}
                          onError={() => handleImageError(idx)}
                          className={`w-full h-full object-cover object-center transition-all duration-500 ${!imageStatuses[idx] ? 'opacity-0' : 'opacity-100'}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {productImages.length > 1 && (
                  <div className="p-4 grid grid-cols-4 gap-3 bg-slate-900/50">
                    {productImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImageIndex(idx)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-800 opacity-40 hover:opacity-100'} ${Array.isArray(product.useWhiteBg) && product.useWhiteBg[idx] ? 'bg-white' : (product.useWhiteBg === true ? 'bg-white' : 'bg-slate-800')}`}
                      >
                        <img src={imageStatuses[idx] === 'fallback' ? getFallback(idx) : img.src} alt={img.alt} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Details */}
              <div className="w-full lg:w-1/2 p-6 lg:p-10 flex flex-col text-left overflow-y-auto flex-1">
                <div className="mb-2">
                  {/* Category Badge */}
                  <span className="inline-block bg-slate-800 text-slate-400 text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-slate-700/50 mb-2">
                    {product.category === 'car' ? 'CAR INTERIOR' : 'GADGET'}
                  </span>

                  <h1 className="text-2xl lg:text-3xl font-black text-white mb-2 leading-tight tracking-tight">
                    {product.name}
                  </h1>

                  <div className="flex items-center gap-3 mb-4 lg:mb-8">
                    <span className="text-xl lg:text-2xl font-black text-white">KSh {product.price.toLocaleString()}</span>
                    {stockInfo && (
                      <span className="bg-amber-400/10 text-amber-400 text-xs font-black px-3 py-1 rounded-full border border-amber-400/20 uppercase tracking-widest">
                        {stockInfo.label}
                      </span>
                    )}
                  </div>

                  {/* Details Separator */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="h-px bg-slate-800 flex-grow"></div>
                    <span className="text-slate-500 text-xs font-black uppercase tracking-[0.4em]">Details</span>
                    <div className="h-px bg-slate-800 flex-grow"></div>
                  </div>

                  <div 
                    className="product-description text-slate-400 leading-relaxed text-sm mb-4 prose prose-invert prose-sm max-w-none
                      prose-headings:font-bold prose-headings:text-white
                      prose-p:text-slate-400 prose-p:leading-relaxed
                      prose-strong:text-white prose-strong:font-bold
                      prose-ul:text-slate-400 prose-ol:text-slate-400
                      prose-li:marker:text-blue-400"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.description) }}
                  />

                  {/* Watch Demo Button */}
                  <div className="space-y-4">
                    {hasVideo && (
                      <button
                        onClick={handleOpenDemo}
                        className="flex items-center justify-center gap-3 w-full bg-slate-800/60 hover:bg-slate-800 text-white py-4 rounded-2xl border border-slate-800 transition-all group shadow-sm"
                      >
                        <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        <span className="font-bold text-xs uppercase tracking-widest">Watch Product Demo</span>
                      </button>
                    )}

                    {/* Installation Info */}
                    {product.hasInstallation && (
                      <div className="flex items-start gap-4 text-blue-400 text-xs font-bold bg-blue-600/5 p-4 rounded-2xl border border-blue-500/10">
                        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        <span>Expert fitting available in Nairobi. WhatsApp for a quote.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Button */}
                <div className="mt-auto pt-6 border-t border-slate-800">
                  <WhatsAppButton
                    fullWidth
                    label="Order via WhatsApp"
                    message={`Hello AutoGear, I want to order the ${product.name}.`}
                    className="py-3 lg:py-5 text-sm lg:text-base rounded-2xl bg-green-600 hover:bg-green-700 shadow-xl shadow-green-900/10 uppercase tracking-widest"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductDetailPage;