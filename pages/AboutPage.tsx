import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { BUSINESS_NAME, CONTACT_EMAIL, WHATSAPP_NUMBER } from '../constants.ts';

const AboutPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>About Us | {BUSINESS_NAME}</title>
        <meta name="description" content={`Learn about ${BUSINESS_NAME} - Kenya's premier car service marketplace connecting clients with verified professional technicians.`} />
      </Helmet>

      <div className="min-h-screen bg-slate-950 text-slate-50">
        {/* Header */}
        <header className="border-b border-slate-800 sticky top-0 bg-slate-950/80 backdrop-blur-md z-50">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="text-xl font-black text-white tracking-tight">
              <span className="text-blue-500">Mekh</span>
            </Link>
            <Link to="/" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition">
              ← Back to Home
            </Link>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-12">
          <h1 className="text-3xl md:text-4xl font-black text-white mb-4">About Us</h1>
          <p className="text-slate-400 mb-8">Learn more about {BUSINESS_NAME} - Kenya's Automotive Services Marketplace</p>

          {/* Introduction */}
          <section className="mb-12">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8">
              <h2 className="text-2xl font-bold text-white mb-4">Connecting Kenya's Best Technicians with Car Owners</h2>
              <div className="space-y-4 text-slate-400">
                <p>
                  {BUSINESS_NAME} is Kenya's Automotive Services marketplace that connects car owners with verified, 
                  professional automotive technicians. Whether you need window tinting, car wrapping, PPF (Paint 
                  Protection Film), ceramic coating, or detailing services, we've got you covered.
                </p>
                <p>
                  Our platform makes it easy to find trusted technicians in your area, compare services, 
                  and book appointments directly - all through WhatsApp for quick communication.
                </p>
                <p>
                  We believe every car owner deserves access to quality automotive services, and every 
                  skilled technician deserves a platform to showcase their expertise.
                </p>
              </div>
            </div>
          </section>

          {/* Trust Builder Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Why Choose {BUSINESS_NAME}?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col items-center text-center p-4 bg-slate-900 rounded-xl border border-slate-800">
                <svg className="w-10 h-10 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-sm font-bold text-white uppercase">Verified Technicians</span>
                <p className="text-xs text-slate-400 mt-2">All technicians vetted for quality and professionalism</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-slate-900 rounded-xl border border-slate-800">
                <svg className="w-10 h-10 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-bold text-white uppercase">Instant Booking</span>
                <p className="text-xs text-slate-400 mt-2">Connect directly on WhatsApp for fast responses</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-slate-900 rounded-xl border border-slate-800">
                <svg className="w-10 h-10 text-blue-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-bold text-white uppercase">Real Reviews</span>
                <p className="text-xs text-slate-400 mt-2">Genuine customer feedback from verified clients</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-slate-900 rounded-xl border border-slate-800">
                <svg className="w-10 h-10 text-green-500 mb-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                <span className="text-sm font-bold text-white uppercase">WhatsApp Support</span>
                <p className="text-xs text-slate-400 mt-2">Real humans. Fast replies.</p>
              </div>
            </div>
          </section>

          {/* Services Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Our Services</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold text-white mb-2">Window Tinting</h3>
                <p className="text-slate-400 text-sm">Professional window tinting services with premium films for heat rejection, UV protection, and privacy.</p>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold text-white mb-2">Car Wrapping</h3>
                <p className="text-slate-400 text-sm">Transform your vehicle's appearance with high-quality vinyl wraps in various colors and finishes.</p>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold text-white mb-2">PPF (Paint Protection)</h3>
                <p className="text-slate-400 text-sm">Protect your car's paint from scratches, chips, and environmental damage with professional PPF installation.</p>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold text-white mb-2">Detailing</h3>
                <p className="text-slate-400 text-sm">Comprehensive car detailing services including interior cleaning, polishing, and conditioning.</p>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold text-white mb-2">Ceramic Coating</h3>
                <p className="text-slate-400 text-sm">Long-lasting protection with ceramic coating that enhances gloss and shields against contaminants.</p>
              </div>
              <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
                <h3 className="text-lg font-bold text-white mb-2">Engine Bay Cleaning</h3>
                <p className="text-slate-400 text-sm">Professional engine bay cleaning and detailing to keep your vehicle's heart in top condition.</p>
              </div>
            </div>
          </section>

          {/* Coverage */}
          <section className="mb-12">
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 md:p-8">
              <h2 className="text-2xl font-bold text-white mb-4">Nationwide Coverage</h2>
              <p className="text-slate-400 mb-4">
                {BUSINESS_NAME} connects car owners with technicians across Kenya, including:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {['Nairobi', 'Mombasa', 'Karen', 'Kilimani', 'Kiambu Road', 'Thika-Road', 'Ngong-Road', 'Parklands', 'Westlands'].map((city) => (
                  <div key={city} className="flex items-center gap-2 text-slate-300">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {city}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Contact CTA */}
          <section className="mb-12">
            <div className="bg-blue-600 rounded-2xl p-6 md:p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">Get In Touch</h2>
              <p className="text-blue-100 mb-6">
                Have questions? We'd love to hear from you. Reach out to us through any of these channels:
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <a 
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  WhatsApp
                </a>
                <a 
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-2 bg-blue-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-800 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  Email Us
                </a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default AboutPage;
