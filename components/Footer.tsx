import React from 'react';
import { WHATSAPP_NUMBER, BUSINESS_NAME, TIKTOK_URL, INSTAGRAM_URL, X_URL } from '../constants.ts';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const footerMessage = `Hi ${BUSINESS_NAME}, I'm interested in checking what other unique products are available or getting items delivered.`;
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(footerMessage)}`;
  
  return (
    <footer className="px-8 pb-20 md:pb-15 lg:pb-8 pt-2 bg-slate-900 border-t border-slate-800 text-center">
       <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-16">
         <div className="text-left md:border-r md:border-slate-800 pr-0 md:pr-10">
           <h3 className="font-black text-white mb-4 uppercase tracking-widest text-[14px] text-blue-500">Shop Anywhere, Anytime</h3>
           <p className="text-slate-400 text-sm mt-1">High-quality essentials for your vehicle and your devices</p>
           <a href="/blogs" className="text-blue-400 hover:text-blue-300 text-sm font-bold mt-2 inline-block transition-colors">
             Read Our Blog →
           </a>
         </div>
         
         <div className="text-left flex flex-col justify-center">
           <h3 className="font-black text-white mb-2 md:mb-4 uppercase tracking-widest text-[11px] text-blue-500">Fast Support</h3>
           <a href="tel:0112493733" className="text-slate-200 text-base md:text-xl font-black hover:text-blue-400 transition-colors flex items-center gap-2">
             <svg className="w-4 h-4 md:w-5 md:h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
             0112493733
           </a>
           <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-0 md:mt-2">Nationwide Delivery Available | Pay on Delivery</p>
         </div>
       </div>
       
       <div className="flex justify-center items-center gap-8 md:gap-12 mb-4 text-slate-400 border-t border-slate-800/50 pt-1">
         <a 
           href={INSTAGRAM_URL} 
           target="_blank"
           rel="noopener noreferrer"
           className="hover:text-pink-500 transition-all hover:scale-125" 
           aria-label="Follow us on Instagram"
         >
           <svg className="w-7 h-7 md:w-10 md:h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.247 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.061 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.247-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.061-2.633-.333-3.608-1.308-.975-.975-1.247-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.247 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.058-1.281.072-1.689.072-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98-1.28-.058-1.688-.072-4.947-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
         </a>
         <a
           href={X_URL}
           target="_blank"
           rel="noopener noreferrer"
           className="hover:text-blue-400 transition-all hover:scale-125"
           aria-label="Follow us on X"
         >
           <svg className="w-7 h-7 md:w-10 md:h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
         </a>
         <a
           href={TIKTOK_URL}
           target="_blank"
           rel="noopener noreferrer"
           className="text-slate-300 hover:text-white tiktok-glitch"
           aria-label="See us on TikTok"
         >
           <svg className="w-7 h-7 md:w-10 md:h-10" fill="currentColor" viewBox="0 0 24 24">
             <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.617a8.13 8.13 0 0 0 5.373 1.934V7.098a4.781 4.781 0 0 1-1.589-.412z"/>
           </svg>
         </a>
                 <a 
           href={waUrl} 
           target="_blank"
           rel="noopener noreferrer"
           className="hover:text-green-500 transition-all hover:scale-125"
           aria-label="Contact on WhatsApp"
         >
           <svg className="w-7 h-7 md:w-10 md:h-10" fill="currentColor" viewBox="0 0 24 24">
             <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
           </svg>
         </a>
       </div>

       <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.25em]">
         &copy; {currentYear} {BUSINESS_NAME}. Verified Accessories. Professional Installation. Nairobi, Kenya.
       </p>
    </footer>
  );
};

export default Footer;
