import React from 'react';
import { Helmet } from 'react-helmet-async';
import { BUSINESS_NAME, CONTACT_EMAIL, WHATSAPP_NUMBER } from '../constants.ts';

const TermsPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Terms and Conditions | Mekh Legal Agreement</title>
        <meta name="description" content={`${BUSINESS_NAME} Terms and Conditions - Terms of service for our car service marketplace connecting clients with professional technicians in Kenya.`} />
      </Helmet>

      <div className="min-h-screen bg-gray-50 text-gray-600 py-12 px-4">
        <main className="max-w-4xl mx-auto px-4 py-2">
          <h1 className="text-3xl md:text-4xl font-black text-blue-500">Terms and Conditions</h1>
          <p className="text-gray-500 mb-8">Last updated: March 2025</p>

          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-500 mb-2">Service Marketplace Terms</h2>
                <p className="text-gray-600">{BUSINESS_NAME} is a platform that connects clients seeking car services with professional technicians. By using our platform, you agree to these terms.</p>
              </div>
            </div>
          </div>

          <nav className="mb-8 p-4 bg-white rounded-xl border border-gray-200">
            <ul className="flex flex-wrap gap-4 text-sm">
              <li><a href="#acceptance" className="text-blue-500 hover:text-blue-300 font-medium">Acceptance</a></li>
              <li><a href="#platform" className="text-blue-500 hover:text-blue-300 font-medium">Platform Use</a></li>
              <li><a href="#technicians" className="text-blue-500 hover:text-blue-300 font-medium">Technicians</a></li>
              <li><a href="#clients" className="text-blue-500 hover:text-blue-300 font-medium">Clients</a></li>
              <li><a href="#bookings" className="text-blue-500 hover:text-blue-300 font-medium">Bookings</a></li>
              <li><a href="#payments" className="text-blue-500 hover:text-blue-300 font-medium">Payments</a></li>
              <li><a href="#liability" className="text-blue-500 hover:text-blue-300 font-medium">Liability</a></li>
              <li><a href="#contact" className="text-blue-500 hover:text-blue-300 font-medium">Contact</a></li>
            </ul>
          </nav>

          <section id="acceptance" className="policy-section mb-12">
            <h2 className="text-2xl font-bold text-blue-500 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Acceptance of Terms
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-gray-600 mb-4">By accessing, browsing, or using the {BUSINESS_NAME} platform (https://mekh.app), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions, including our Privacy Policy.</p>
              <p className="text-gray-600">If you do not agree to these terms, please do not use our platform or services.</p>
            </div>
          </section>

          <section id="platform" className="policy-section mb-12">
            <h2 className="text-2xl font-bold text-blue-500 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
              Platform Use
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-gray-600 mb-4">Our platform provides a marketplace for connecting clients with automotive service providers. We reserve the right to modify, suspend, or terminate any part of our services at any time.</p>
              <p className="text-gray-600">Users must be at least 18 years old and have the legal capacity to enter into binding contracts to use our services.</p>
            </div>
          </section>

          <section id="technicians" className="policy-section mb-12">
            <h2 className="text-2xl font-bold text-blue-500 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              Technician Terms
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <p className="text-gray-600"><strong className="text-gray-900">Verification:</strong> All technicians must undergo verification processes including identity verification, skill assessment, and background checks.</p>
              <p className="text-gray-600"><strong className="text-gray-900">Service Standards:</strong> Technicians agree to provide services professionally, use quality materials, and maintain appropriate certifications.</p>
              <p className="text-gray-600"><strong className="text-gray-900">Insurance:</strong> Technicians are responsible for maintaining appropriate liability insurance for their business operations.</p>
              <p className="text-gray-600"><strong className="text-gray-900">Pricing:</strong> Technicians set their own prices but must provide transparent quotes before commencing work.</p>
            </div>
          </section>

          <section id="clients" className="policy-section mb-12">
            <h2 className="text-2xl font-bold text-blue-500 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
              </svg>
              Client Terms
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <p className="text-gray-600"><strong className="text-gray-900">Account Creation:</strong> Clients must create an account to book services and must provide accurate, complete information.</p>
              <p className="text-gray-600"><strong className="text-gray-900">Booking Obligations:</strong> When booking a service, clients agree to:</p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Provide accurate vehicle information</li>
                <li>Be available at the scheduled time</li>
                <li>Ensure safe access to the vehicle</li>
                <li>Communicate any special requirements clearly</li>
              </ul>
              <p className="text-gray-600"><strong className="text-blue-500">Cancellations:</strong> Clients may cancel bookings with appropriate notice as specified in the booking terms.</p>
            </div>
          </section>

          <section id="bookings" className="policy-section mb-12">
            <h2 className="text-2xl font-bold text-blue-500 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
              </svg>
              Booking Terms
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <p className="text-gray-600">All bookings are subject to availability. Confirmation will be sent via email or SMS after a technician accepts the booking request.</p>
              <p className="text-gray-600">Bookings may be rescheduled due to unforeseen circumstances. In such cases, all parties will be notified promptly.</p>
            </div>
          </section>

          <section id="payments" className="policy-section mb-12">
            <h2 className="text-2xl font-bold text-blue-500 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
              </svg>
              Payments
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <p className="text-gray-600">Payments for services are arranged directly between clients and technicians. Mekh facilitates the connection but does not process payments.</p>
              <p className="text-gray-600"><strong className="text-gray-900">Important:</strong> Mekh is a free platform for connecting clients with technicians. We do not charge any fees for using our service.</p>
            </div>
          </section>

          <section id="liability" className="policy-section mb-12">
            <h2 className="text-2xl font-bold text-blue-500 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              Liability
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <p className="text-gray-600">{BUSINESS_NAME} acts as a marketplace platform and is not directly responsible for the services provided by technicians.</p>
              <p className="text-gray-600">Technicians are independent contractors and are solely responsible for the quality of their services.</p>
              <p className="text-gray-600">We recommend clients verify technician credentials and discuss service expectations before booking.</p>
              <p className="text-gray-600">Any disputes regarding service quality should be resolved directly between the client and technician.</p>
            </div>
          </section>

          <section id="contact" className="policy-section mb-12">
            <h2 className="text-2xl font-bold text-blue-500 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
              </svg>
              Contact Us
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-gray-600 mb-6">If you have any questions about these Terms and Conditions, please contact us:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-green-600/10 border border-green-600/20 rounded-xl hover:bg-green-600/20 transition">
                  <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <div>
                    <div className="font-semibold text-gray-900">WhatsApp Us</div>
                    <div className="text-sm text-gray-600">+254 738 242 743</div>
                  </div>
                </a>
                <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-4 p-4 bg-purple-600/10 border border-purple-600/20 rounded-xl hover:bg-purple-600/20 transition">
                  <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <div>
                    <div className="font-semibold text-gray-900">Email Support</div>
                    <div className="text-sm text-gray-600">{CONTACT_EMAIL}</div>
                  </div>
                </a>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-gray-600 text-sm">
                  <strong className="text-gray-900">Location:</strong> Nairobi, Kenya<br/>
                  <strong className="text-gray-900">Business Hours:</strong> Mon-Sat 9:00 AM - 6:00 PM
                </p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default TermsPage;
