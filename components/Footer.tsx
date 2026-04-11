import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  WHATSAPP_NUMBER,
  BUSINESS_NAME,
  TIKTOK_URL,
  INSTAGRAM_URL,
  X_URL,
  CONTACT_EMAIL,
} from '../constants.ts';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const check = () =>
      setIsPWA(
        window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true
      );
    check();
    const mq = window.matchMedia('(display-mode: standalone)');
    const handler = (e: MediaQueryListEvent) => setIsPWA(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Hide completely in PWA
  if (isPWA) return null;

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi ${BUSINESS_NAME}! I'd like to connect with you for support and inquiries.`
  )}`;

  const SocialIcons = ({ size = 'sm' }: { size?: 'sm' | 'lg' }) => {
    const cls = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5';
    return (
      <div className="flex items-center gap-5">
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
          aria-label="Instagram" className="text-slate-500 hover:text-pink-500 transition-all hover:scale-110">
          <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.247 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.061 1.366-.333 2.633-1.308 3.608-.975.975-2.242 1.247-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.061-2.633-.333-3.608-1.308-.975-.975-1.247-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.247 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.058-1.281.072-1.689.072-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98-1.28-.058-1.688-.072-4.947-.072zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </a>
        <a href={X_URL} target="_blank" rel="noopener noreferrer"
          aria-label="X / Twitter" className="text-slate-500 hover:text-blue-400 transition-all hover:scale-110">
          <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </a>
        <a href={TIKTOK_URL} target="_blank" rel="noopener noreferrer"
          aria-label="TikTok" className="text-slate-500 hover:text-white transition-all hover:scale-110">
          <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.617a8.13 8.13 0 0 0 5.373 1.934V7.098a4.781 4.781 0 0 1-1.589-.412z"/>
          </svg>
        </a>
        <a href={waUrl} target="_blank" rel="noopener noreferrer"
          aria-label="WhatsApp" className="text-slate-500 hover:text-emerald-400 transition-all hover:scale-110">
          <svg className={cls} fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      </div>
    );
  };

  return (
    <footer className="bg-slate-900 border-t border-slate-800">

      {/* ── MOBILE FOOTER ──────────────────────────────────────────── */}
      {/* Only social icons + copyright. Links are in bottom nav Menu */}
      <div className="sm:hidden px-6 py-6 flex flex-col items-center gap-4">
        <Link to="/" className="text-white font-black text-sm uppercase tracking-widest">
          AutoGear <span className="text-blue-500">Ke</span>
        </Link>
        <SocialIcons size="sm" />
        <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest text-center">
          &copy; {currentYear} {BUSINESS_NAME}. Car Service Marketplace. Nairobi, Kenya.
        </p>
      </div>

      {/* ── TABLET & DESKTOP FOOTER ─────────────────────────────────────────── */}
      <div className="hidden sm:block">
        <div className="max-w-6xl mx-auto px-8 py-12">

          {/* 3-column grid - responsive for tablet and desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-12 mb-10">

            {/* Column 1 — Brand */}
            <div>
              <Link to="/" className="text-white font-black text-lg uppercase tracking-widest mb-3 inline-block">
                AutoGear <span className="text-blue-500">Ke</span>
              </Link>
              <p className="text-slate-400 text-sm leading-relaxed mb-5">
                Kenya's car service marketplace. Connect with verified tinting, wrapping, PPF, ceramic coating, and detailing professionals near you.
              </p>
              <SocialIcons size="lg" />
            </div>

            {/* Column 2 — Quick Links */}
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                Quick Links
              </p>
              <div className="space-y-3">
                <Link to="/about"
                  className="text-slate-400 hover:text-white text-sm font-semibold block transition-colors">
                  About Us
                </Link>
                <Link to="/contact"
                  className="text-slate-400 hover:text-white text-sm font-semibold block transition-colors">
                  Contact Us
                </Link>
                <Link to="/blogs"
                  className="text-slate-400 hover:text-white text-sm font-semibold block transition-colors">
                  Blog
                </Link>
                <Link to="/terms"
                  className="text-slate-400 hover:text-white text-sm font-semibold block transition-colors">
                  Terms &amp; Conditions
                </Link>
                <Link to="/privacy"
                  className="text-slate-400 hover:text-white text-sm font-semibold block transition-colors">
                  Privacy Policy
                </Link>
              </div>
            </div>

            {/* Column 3 — Contact */}
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
                Contact
              </p>
              <div className="space-y-4">
                <a href="tel:0112493733"
                  className="flex items-center gap-3 text-slate-400 hover:text-white text-sm font-semibold transition-colors group">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/20 transition-all">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                  </div>
                  0112493733
                </a>
                <a href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-3 text-slate-400 hover:text-white text-sm font-semibold transition-colors group">
                  <div className="w-8 h-8 rounded-xl bg-blue-600/10 border border-blue-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/20 transition-all">
                    <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  {CONTACT_EMAIL}
                </a>
                <div className="flex items-center gap-3 text-slate-500 text-sm">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                  </div>
                  Nairobi · Mombasa · Across Kenya
                </div>
              </div>
            </div>
          </div>

          {/* Divider + copyright */}
          <div className="border-t border-slate-800 pt-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-slate-600 text-[11px] font-black uppercase tracking-widest">
              &copy; {currentYear} {BUSINESS_NAME}. Car Service Marketplace. Verified Technicians. Nairobi, Kenya.
            </p>
            <p className="text-slate-700 text-[10px] uppercase tracking-widest">
              Tinting · Wrapping · PPF · Ceramic · Detailing
            </p>
          </div>
        </div>
      </div>

    </footer>
  );
};

export default Footer;