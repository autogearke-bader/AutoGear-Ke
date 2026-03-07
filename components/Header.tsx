import React from 'react';
import { Link } from 'react-router-dom';
import { BUSINESS_NAME } from '../constants.ts';
import logoUrl from '../assets/logo-4.png';

const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 sticky top-0 bg-slate-950/90 backdrop-blur-md z-50">
      <div className="max-w-7xl mx-auto px-0 py-0 md:py-0.5 flex items-center justify-between">
        <Link to="/" className="text-xl font-black tracking-tighter text-white flex items-center group">
          <div className="relative mr-0 md:mr-4 logo-glow flex items-center justify-center">
            {/* Logo Image */}
            <img
              src={logoUrl}
              alt="AutoGear Ke Logo - Car Accessories Kenya"
              className="h-12 md:h-16 lg:h-18 w-auto object-contain transform group-hover:rotate-12 transition-transform duration-500 ease-in-out"
              decoding="async"
               onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <span className="flex tracking-tighter text-base md:text-2xl font-[900] mr-0 md:mr-4 pl-2 md:pl-0">
            <span className="text-white font-black arial">{BUSINESS_NAME.split(' ')[0]}</span>
            <span className="text-blue-500 ml-1 font-black arial">{BUSINESS_NAME.split(' ')[1]}</span>
          </span>
        </Link>
        <div className="flex-shrink-0 flex items-center space-x-2 lg:space-x-4">
          <Link
            to="/"
            className="hidden lg:block whitespace-nowrap text-[10px] xl:text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all active:scale-95 hover:underline decoration-2 underline-offset-4"
          >
            Home
          </Link>
          <Link
            to="/blogs"
            className="whitespace-nowrap text-[10px] md:text-[12px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all active:scale-95 ml-4 lg:ml-0 hover:underline decoration-2 underline-offset-4"
          >
            INSIGHTS
          </Link>
          <a
            href="/car-accessories/"
            className="hidden lg:flex whitespace-nowrap text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-blue-600 transition-all bg-slate-900 px-3 py-2.5 md:px-5 md:py-3 rounded-xl border border-slate-800 shadow-xl active:scale-95"
          >
            Car Accessories
          </a>
          <a
            href="/mobile-accessories/"
            className="hidden lg:flex whitespace-nowrap text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white hover:bg-blue-600 transition-all bg-slate-900 px-3 py-2.5 md:px-5 md:py-3 rounded-xl border border-slate-800 shadow-xl active:scale-95"
          >
            Mobile Accessories
          </a>
        </div>
      </div>
    </header>
  );
};

export default Header;
