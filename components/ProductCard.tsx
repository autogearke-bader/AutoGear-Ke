import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Product } from '../types.ts';
import WhatsAppButton from './WhatsAppButton.tsx';

interface ProductCardProps {
  product: Product;
}

const CATEGORY_KEYWORDS = {
  car: ['car-interior', 'luxury-car', 'auto-tech'],
  gadget: ['gadget', 'tech-accessories', 'smartphone']
};

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [imageStatuses, setImageStatuses] = useState<Record<number, 'loading' | 'ready' | 'fallback'>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const status = product.stockStatus || 'in-stock';
  const isOutOfStock = status === 'out-of-stock';

  const getFallback = (index: number = 0) => {
    const keywords = CATEGORY_KEYWORDS[product.category] || CATEGORY_KEYWORDS.car;
    const charSum = product.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const keyword = keywords[(charSum + index) % keywords.length];
    return `https://images.unsplash.com/photo-1?auto=format&fit=crop&q=80&w=800&h=600&${keyword}&sig=${product.id}-${index}`;
  };

  // Handle both old (string array) and new (object array) image formats
  const getProductImages = () => {
    if (!product || !product.images || product.images.length === 0) {
      return [{
        src: getFallback(0),
        alt: `${product.name} - ${product.category === 'car' ? 'Car Accessories Kenya' : 'Mobile Accessories Kenya'}`
      }];
    }
    
    // Check if images is in new format (objects with image_name and url)
    const firstImage = product.images[0];
    if (typeof firstImage === 'object' && firstImage !== null && 'image_name' in firstImage) {
      return product.images
        .filter((img: any) => img.image_name?.trim() !== '')
        .slice(0, 4)
        .map((img: any) => ({
          src: img.url || (img.image_name.startsWith('http') || img.image_name.startsWith('data:') || img.image_name.startsWith('blob:')
          ? img.image_name 
            : `/product-images/${img.image_name}`),
          alt: img.alt_text || `${product.name} - ${product.category === 'car' ? 'Car Accessories Kenya' : 'Mobile Accessories Kenya'}`
        }));
    }
    
    // Legacy string array format
    const stringImages = product.images.map((img: any) => typeof img === 'string' ? img : (img as any).image_name);
    return stringImages
      .filter((img: string) => img.trim() !== '')
      .slice(0, 4)
      .map((img: string) => ({
        src: img.startsWith('http') || img.startsWith('data:') || img.startsWith('blob:') 
          ? img 
          : `/product-images/${img}`,
        alt: `${product.name} - ${product.category === 'car' ? 'Car Accessories Kenya' : 'Mobile Accessories Kenya'}`
      }));
  };
  
  const productImages = getProductImages();
    
  useEffect(() => {
    setImageStatuses({});
    setActiveImageIndex(0);
  }, [product.id]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      if (scrollRef.current) scrollRef.current.scrollLeft = 0;
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isModalOpen]);

  useEffect(() => {
    if (isModalOpen && scrollRef.current) {
      const container = scrollRef.current;
      container.scrollTo({
        left: container.offsetWidth * activeImageIndex,
        behavior: 'smooth'
      });
    }
  }, [activeImageIndex, isModalOpen]);

  const handleImageLoad = (index: number) => setImageStatuses(prev => ({ ...prev, [index]: 'ready' }));
  const handleImageError = (index: number) => {
    if (imageStatuses[index] !== 'fallback') {
      setImageStatuses(prev => ({ ...prev, [index]: 'fallback' }));
    }
  };

  const getStockInfo = () => {
    switch (status) {
      case 'in-stock': return { label: 'In Stock', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20', dot: 'bg-emerald-500' };
      case 'limited': return { label: 'Limited', color: 'text-amber-400 bg-amber-400/10 border-amber-500/20', dot: 'bg-amber-500' };
      case 'out-of-stock': return { label: 'Sold Out', color: 'text-slate-500 bg-slate-800 border-slate-700', dot: 'bg-slate-600' };
      default: return null;
    }
  };

  const stockInfo = getStockInfo();
  const videoUrl = product.youtubeUrl || product.tiktokUrl || product.instagramUrl || product.videoUrl;
  const hasVideo = !!videoUrl;

  const handleOpenDemo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoUrl) window.open(videoUrl, '_blank');
  };

  const getVideoPlatformIcon = () => {
    return <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>;
  };

  return (
    <>
      <div className={`group bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 flex flex-col h-auto shadow-lg transition-all duration-500 hover:shadow-blue-900/10 ${isOutOfStock ? 'opacity-75' : 'hover:-translate-y-1.5 hover:border-blue-600/50'}`}>
        {/* Grid Card Image: aspect-square */}
        <div
          className={`aspect-square relative overflow-hidden cursor-pointer ${Array.isArray(product.useWhiteBg) && product.useWhiteBg[0] ? 'bg-white' : (product.useWhiteBg === true ? 'bg-white' : 'bg-slate-800')}`}
          onClick={() => !isOutOfStock && setIsModalOpen(true)}
        >
          {(!imageStatuses[0]) && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 animate-pulse">
              <div className="w-6 h-6 border-2 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          )}
          
          <img
            src={imageStatuses[0] === 'fallback' ? getFallback(0) : productImages[0].src}
            alt={productImages[0].alt}
            loading="lazy"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onLoad={() => handleImageLoad(0)}
            onError={() => handleImageError(0)}
            className={`object-contain object-center w-full h-full transition-all duration-700 ease-out ${!imageStatuses[0] ? 'opacity-0 scale-105' : 'opacity-100 scale-100'} ${isOutOfStock ? 'grayscale' : 'group-hover:scale-110'}`}
          />
          
          {/* Overlays */}
          <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
            {product.isNew && !isOutOfStock && (
              <span className="bg-amber-400 text-slate-950 text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-md shadow-lg">New</span>
            )}
          </div>

          {hasVideo && !isOutOfStock && (
            <button 
              onClick={handleOpenDemo}
              className="absolute bottom-2.5 right-2.5 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 hover:bg-blue-600 hover:border-blue-400 transition-all flex items-center gap-1.5 shadow-xl z-20"
            >
              {getVideoPlatformIcon()}
              <span className="text-[8px] font-black uppercase tracking-widest text-white">Demo</span>
            </button>
          )}
        </div>
        
        {/* Content Section */}
        <div className="p-3 flex flex-col flex-grow text-left">
          <div className="mb-2.5">
            <h3 className="text-xs md:text-xl font-bold text-white mb-0.5 leading-tight group-hover:text-blue-400 transition-colors line-clamp-none md:line-clamp-1">
              {product.name}
            </h3>
            <p className="text-slate-500 text-[14px] leading-snug line-clamp-2 min-h-[1.5rem] hidden">
              {product.description}
            </p>
            {!isOutOfStock && (
              <div className="hidden md:block">
                <Link to={`/${product.category === 'car' ? 'car-accessories' : 'mobile-accessories'}/${product.slug}`} className="text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase tracking-widest transition-colors">
                  View Details →
                </Link>
              </div>
            )}
          </div>
          
          <div className="mt-auto space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-xl font-black text-white">
                KSh {product.price.toLocaleString()}
              </span>
              {stockInfo && (
                <div className={`flex items-center gap-1 text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${stockInfo.color}`}>
                  <span className={`w-1 h-1 rounded-full ${stockInfo.dot} ${!isOutOfStock ? 'animate-pulse' : ''}`}></span>
                  {stockInfo.label}
                </div>
              )}
            </div>
            
            <div className="hidden">
              <WhatsAppButton
                fullWidth
                disabled={isOutOfStock}
                label={isOutOfStock ? "Out of Stock" : "Order via WhatsApp"}
                message={`Hello AutoGear, I'm interested in the ${product.name} (KSh ${product.price}). Please provide delivery/installation details.`}
                className="py-2.5 rounded-xl text-[10px] tracking-wider uppercase"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Full-Screen Modal Overlay rendered via Portal to document.body */}
      {isModalOpen && mounted && createPortal((
        <div 
          className="fixed inset-0 flex items-center md:items-center justify-center p-0"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => e.key === 'Escape' && setIsModalOpen(false)}
          style={{
            zIndex: 9999999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh'
          }}
        >
          {/* Full-screen backdrop */}
          <div 
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm"
            onClick={() => setIsModalOpen(false)}
            style={{
              position: 'absolute',
              zIndex: 9999998,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          ></div>
          
          {/* Modal Content Container */}
          <div 
            className="relative bg-slate-900 w-[82vw] h-[86vh] md:w-[95vw] md:max-w-4.5xl md:h-[75vh] md:max-h-[90vh] lg:w-[90%] lg:max-w-6xl lg:h-[90vh] lg:max-h-[85vh] rounded-[2.5rem] md:rounded-3xl overflow-hidden border-0 md:border md:border-slate-800 shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 fade-in duration-300 mb-2 md:mb-0"
            style={{
              position: 'relative',
              zIndex: 9999999,
              top: 0,
              left: 0
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button - Always Visible */}
            <button 
              onClick={() => setIsModalOpen(false)} 
              aria-label="Close modal" 
              className="absolute top-4 right-4 md:top-6 md:right-6 bg-slate-950/80 hover:bg-slate-800 text-white p-2.5 md:p-3 rounded-full backdrop-blur-md transition-all border border-white/10 hover:border-white/20 active:scale-90 shadow-lg z-50"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>

            {/* Left Column: Image Carousel */}
            <div 
              className="w-full md:w-1/2 lg:w-5/12 flex flex-col bg-slate-950"
            >
              <div
                ref={scrollRef}
                className="flex overflow-x-hidden snap-x snap-mandatory h-[40dvh] md:flex-1 md:min-h-[300px] lg:flex-1 lg:min-h-[250px] bg-slate-950 flex-shrink-0"
              >
                {productImages.map((img, idx) => (
                  <div key={idx} className="w-full h-full flex-shrink-0 snap-center relative">
                    <div className={`w-full h-full flex items-center justify-center ${Array.isArray(product.useWhiteBg) && product.useWhiteBg[idx] ? 'bg-white' : (product.useWhiteBg === true ? 'bg-white' : 'bg-slate-900/40')}`}>
                      <img 
                        src={imageStatuses[idx] === 'fallback' ? getFallback(idx) : img.src} 
                        alt={img.alt} 
                        onLoad={() => handleImageLoad(idx)}
                        onError={() => handleImageError(idx)}
                        className={`w-full h-full object-contain object-center transition-all duration-500 ${!imageStatuses[idx] ? 'opacity-0' : 'opacity-100'}`} 
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Thumbnail Indicators */}
              <div className="p-4 md:p-6 flex gap-2 md:gap-3 bg-slate-900/30 overflow-x-auto justify-center">
                {productImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                     className={`aspect-square flex-shrink-0 w-16 md:w-24 rounded-lg overflow-hidden border-2 transition-all relative ${activeImageIndex === idx ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-700 opacity-60 hover:opacity-100'} ${Array.isArray(product.useWhiteBg) && product.useWhiteBg[idx] ? 'bg-white' : (product.useWhiteBg === true ? 'bg-white' : 'bg-slate-800')}`}
                     >
                    {/* Loading overlay */}
                    {!imageStatuses[idx] && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
                        <div className="w-4 h-4 border-2 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
                      </div>
                    )}
                    <img
                      src={imageStatuses[idx] === 'fallback' ? getFallback(idx) : img.src}
                      alt={img.alt}
                      className={`w-full h-full object-cover ${!imageStatuses[idx] ? 'opacity-0' : 'opacity-100'}`}
                      onLoad={() => handleImageLoad(idx)}
                      onError={() => handleImageError(idx)}
                    />
                    {/* Status indicator dot */}
                    {imageStatuses[idx] === 'fallback' && (
                      <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-amber-500 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: Details */}
            <div 
              className="w-full md:w-1/2 lg:w-7/12 p-2 md:p-4 lg:p-2 flex flex-col text-left overflow-y-auto"
              style={{ 
                flex: '1 1 auto',
                maxHeight: 'calc(100vh - 2rem)'
              }}
            >
              <div className="mb-4 md:mb-6">
                <span className="inline-block bg-slate-800/80 text-slate-300 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-3 md:px-4 py-1 md:py-1.5 rounded-full border border-slate-700/50">
                  {product.category === 'car' ? 'CAR INTERIOR' : 'GADGET'}
                </span>
              </div>
              
              <h2 className="text-lg md:text-3xl lg:text-4xl font-black text-white mb-3 md:mb-4 leading-tight tracking-tight">
                {product.name}
              </h2>
              
              <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-5 md:mb-6">
                <span className="text-xl md:text-2xl lg:text-3xl font-black text-white">KSh {product.price.toLocaleString()}</span>
                {stockInfo && (
                  <span className={`text-[8px] md:text-[9px] font-black px-2.5 md:px-3 py-1 rounded-full border uppercase tracking-widest ${stockInfo.color}`}>
                    {stockInfo.label}
                  </span>
                )}
              </div>
              
              <div className="h-px bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 mb-5 md:mb-6"></div>

              <div 
                className="text-slate-300 md:text-slate-400 leading-relaxed text-xs md:text-sm mb-6 md:mb-8 line-clamp-none prose prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
              
              <div className="space-y-3 md:space-y-4 mb-6 md:mb-8">
                {hasVideo && (
                  <button 
                    onClick={handleOpenDemo}
                    className="flex items-center justify-center gap-2 md:gap-3 w-full bg-slate-800/70 hover:bg-slate-800 text-white py-3 md:py-4 rounded-xl md:rounded-2xl border border-slate-700 transition-all"
                  >
                    <svg className="w-4 md:w-5 h-4 md:h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <span className="font-bold text-[8px] md:text-[9px] uppercase tracking-widest">Watch Demo</span>
                  </button>
                )}

                {product.hasInstallation && (
                  <div className="flex items-start gap-3 text-blue-300 text-[8px] md:text-[9px] font-bold bg-blue-600/5 p-3 md:p-4 rounded-xl md:rounded-2xl border border-blue-500/10">
                    <svg className="w-4 h-4 md:w-5 md:h-5 shrink-0 mt-0.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    <span>Expert workshop fitting available in Nairobi. WhatsApp for a quote.</span>
                  </div>
                )}
              </div>

              <div className="mt-auto pt-5 md:pt-6 border-t border-slate-800">
                <WhatsAppButton 
                  fullWidth 
                  disabled={isOutOfStock}
                  label={isOutOfStock ? "Out of Stock" : "Order via WhatsApp"} 
                  message={`Hello AutoGear, I want to order the ${product.name} (KSh ${product.price}). Please provide details.`} 
                  className="py-3 md:py-4 text-[10px] md:text-xs rounded-xl md:rounded-2xl bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed shadow-xl shadow-green-900/10 uppercase tracking-widest font-bold" 
                />
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </>
  );
};

export default ProductCard;
