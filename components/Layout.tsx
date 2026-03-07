
import React from 'react';
import Header from './Header.tsx';
import Footer from './Footer.tsx';
import FloatingWhatsApp from './FloatingWhatsApp.tsx';
import MobileBottomNav from './MobileBottomNav.tsx';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50 relative">
      <Header />
      <main className="flex-grow w-full max-w-7xl mx-auto">
        {children}
      </main>
      <FloatingWhatsApp />
      <MobileBottomNav />
      <Footer />
    </div>
  );
};

export default Layout;
