import React from 'react';
import { Helmet } from 'react-helmet-async';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy | How We Protect Your Data | Mekh</title>
        <meta name="description" content="Mekh Privacy Policy - Learn how we collect, use, and protect your data." />
      </Helmet>
      
      <div className="min-h-screen bg-gray-50 text-gray-600 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-black text-blue-500 mb-8 text-center">Privacy Policy</h1>
          <p className="text-gray-500 text-sm text-center mb-12">Last updated: March 2026</p>

          <div className="space-y-8">
            {/* Section 1: Who We Are */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">1. Who We Are</h2>
              <p className="text-gray-600 leading-relaxed">
                Mekh is a marketplace connecting car owners with automotive technicians in Kenya. 
                We provide a platform where clients can find and book services from verified technicians including 
                tinting, wrapping, PPF coating, ceramic coating, detailing, and tuning services.
              </p>
              <p className="text-gray-600 mt-4">
                For privacy concerns, contact us at: <a href="mailto:support@mekh.app" className="text-blue-400 hover:underline">support@mekh.app</a>
              </p>
            </section>

            {/* Section 2: What Data We Collect */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">2. What Data We Collect</h2>
              
              <h3 className="text-lg font-semibold text-blue-500 mb-3">From Technicians:</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                <li>Full name</li>
                <li>Business name</li>
                <li>Phone number</li>
                <li>WhatsApp number</li>
                <li>Email address</li>
                <li>Location (county and area)</li>
                <li>Profile photo</li>
                <li>Portfolio photos</li>
                <li>Years of experience</li>
                <li>Services offered and pricing</li>
              </ul>

              <h3 className="text-lg font-semibold text-blue-500 mb-3">From Clients:</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                <li>Name</li>
                <li>Phone number</li>
                <li>WhatsApp number</li>
                <li>Email address</li>
                <li>General location (when using location detect feature)</li>
              </ul>

              <h3 className="text-lg font-semibold text-blue-500 mb-3">Automatically Collected:</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2 mb-4">
                <li>Device type</li>
                <li>Browser information</li>
                <li>Pages visited</li>
                <li>Time spent on site</li>
              </ul>

              <h3 className="text-lg font-semibold text-blue-500 mb-3">From Bookings:</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-2">
                <li>Name</li>
                <li>Phone number</li>
                <li>Service requested</li>
                <li>Location submitted in booking form</li>
              </ul>
            </section>

            {/* Section 3: Why We Collect It */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">3. Why We Collect It</h2>
              <ul className="space-y-4">
                <li>
                  <span className="font-semibold text-blue-500">Contact details:</span>
                  <span className="text-gray-600"> To connect clients with technicians via WhatsApp for booking inquiries.</span>
                </li>
                <li>
                  <span className="font-semibold text-blue-500">Location:</span>
                  <span className="text-gray-600"> To show nearby technicians based on the client's area.</span>
                </li>
                <li>
                  <span className="font-semibold text-blue-500">Profile photos and portfolio:</span>
                  <span className="text-gray-600"> To display on the technician's public profile for clients to view.</span>
                </li>
                <li>
                  <span className="font-semibold text-blue-500">Email:</span>
                  <span className="text-gray-600"> To send account notifications, booking confirmations, and platform updates.</span>
                </li>
                <li>
                  <span className="font-semibold text-blue-500">Booking details:</span>
                  <span className="text-gray-600"> To log the lead and notify the relevant technician of the service request.</span>
                </li>
              </ul>
            </section>

            {/* Section 4: Who We Share It With */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">4. Who We Share It With</h2>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span className="text-gray-600"><span className="font-semibold">Technician profiles:</span> All technician profile information is publicly visible to anyone visiting the platform.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span className="text-gray-600"><span className="font-semibold">Client bookings:</span> When a client books a service, their booking details (name, phone, service requested, location) are shared with the specific technician they booked.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span className="text-gray-600"><span className="font-semibold">Analytics:</span> Basic usage analytics are shared with Cloudflare and other analytics providers to help us understand platform usage.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span className="text-gray-600"><span className="font-semibold">Third party sales:</span> We do NOT sell user data to any third parties.</span>
                </li>
              </ul>
            </section>

            {/* Section 5: Third Party Services */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">5. Third Party Services We Use</h2>
              <p className="text-gray-600 mb-4">We use the following services that access user data:</p>
              <ul className="space-y-3">
                <li className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-900">Supabase</span>
                  <span className="text-gray-600"> — Stores all user accounts, technician profiles, and booking data.</span>
                </li>
                <li className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-900">Cloudinary</span>
                  <span className="text-gray-600"> — Stores all uploaded photos including profile photos and portfolios.</span>
                </li>
                <li className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-900">Cloudflare</span>
                  <span className="text-gray-600"> — Hosts the website and handles DNS. Provides security and analytics.</span>
                </li>
                <li className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-900">WhatsApp</span>
                  <span className="text-gray-600"> — Used for all client-technician communication via click-to-chat.</span>
                </li>
                <li className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-900">Google</span>
                  <span className="text-gray-600"> — OAuth sign-in provider (if users choose to sign in with Google).</span>
                </li>
                <li className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-900">OpenStreetMap / Nominatim</span>
                  <span className="text-gray-600"> — Used for location detection to find nearby technicians. No GPS data is stored.</span>
                </li>
              </ul>
            </section>

            {/* Section 6: Location Data */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">6. Location Data</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Location is only requested when the user explicitly taps "Use my location" button.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>It is used solely to find and display nearby technicians in the user's area.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Only the general area name is stored (e.g., "Westlands", "Kilimani"), not precise GPS coordinates.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Users can manually enter their location instead of using GPS detection.</span>
                </li>
              </ul>
            </section>

            {/* Section 7: Photos and Portfolio Content */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">7. Photos and Portfolio Content</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Photos uploaded by technicians are stored on Cloudinary and displayed publicly on their profile page.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Technicians can request removal of their photos by contacting <a href="mailto:support@mekh.app" className="text-blue-500 hover:underline">support@mekh.app</a></span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Mekh does not claim ownership of photos uploaded by technicians. They remain the property of the uploader.</span>
                </li>
              </ul>
            </section>

            {/* Section 8: Data Retention */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">8. Data Retention</h2>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span><span className="font-semibold">Active accounts:</span> Data is kept as long as the account remains active.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span><span className="font-semibold">Suspended or deleted accounts:</span> Data is removed within 30 days of account deletion request.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span><span className="font-semibold">Booking/lead records:</span> Kept for 12 months then automatically deleted.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  <span>Users can request full data deletion at any time by emailing <a href="mailto:support@mekh.app" className="text-blue-500 hover:underline">support@mekh.app</a></span>
                </li>
              </ul>
            </section>

            {/* Section 9: User Rights */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">9. Your Rights (Kenyan Data Protection Act 2019)</h2>
              <p className="text-gray-600 mb-4">Under Kenya's Data Protection Act 2019, you have the following rights:</p>
              <ul className="space-y-3">
                <li className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-900">Right to be informed:</span>
                  <span className="text-gray-600"> Know what data we hold about you.</span>
                </li>
                <li className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-900">Right to correction:</span>
                  <span className="text-gray-600"> Request correction of inaccurate data.</span>
                </li>
                <li className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-900">Right to erasure:</span>
                  <span className="text-gray-600"> Request deletion of your data (also known as "right to be forgotten").</span>
                </li>
                <li className="bg-gray-50 p-3 rounded-lg">
                  <span className="font-semibold text-gray-900">Right to withdraw consent:</span>
                  <span className="text-gray-600"> Withdraw consent for data processing at any time.</span>
                </li>
              </ul>
              <p className="text-gray-600 mt-4">
                To exercise any of these rights, contact us at <a href="mailto:support@mekh.app" className="text-blue-500 hover:underline">support@mekh.app</a>
              </p>
            </section>

            {/* Section 10: Cookies */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">10. Cookies</h2>
              <p className="text-gray-600">
                We use minimal cookies on our platform:
              </p>
              <ul className="list-disc list-inside text-gray-600 mt-3 space-y-2">
                <li>Authentication session cookies (to keep you logged in)</li>
                <li>Basic analytics cookies (to understand how users navigate the site)</li>
              </ul>
              <p className="text-gray-600 mt-4">
                You can disable cookies in your browser settings at any time. Disabling cookies may affect some functionality of the platform.
              </p>
            </section>

            {/* Section 11: Children */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">11. Children</h2>
              <p className="text-gray-600">
                Mekh is not intended for anyone under the age of 18. We do not knowingly collect 
                personal data from minors. If you believe we have collected data from a minor, please 
                contact us immediately at <a href="mailto:support@mekh.app" className="text-blue-500 hover:underline">support@mekh.app</a> and we will delete such data.
              </p>
            </section>

            {/* Section 12: Changes to This Policy */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">12. Changes to This Policy</h2>
              <p className="text-gray-600">
                We may update this Privacy Policy from time to time. If we make significant changes, 
                we will notify users via the platform. Continued use of Mekh after any changes 
                to this policy constitutes acceptance of the updated terms.
              </p>
            </section>

            {/* Section 13: Contact */}
            <section className="bg-white rounded-xl p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-blue-500 mb-4">13. Contact Us</h2>
              <div className="space-y-3 text-gray-600">
                <p>
                  <span className="font-semibold">Email:</span> <a href="mailto:support@mekh.app" className="text-blue-500 hover:underline">support@mekh.app</a>
                </p>
                <p>
                  <span className="font-semibold">WhatsApp:</span> <a href="https://wa.me/254738242743" className="text-blue-500 hover:underline">0738242743</a>
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrivacyPolicyPage;