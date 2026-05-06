import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Helmet>
        <title>Professional PPF Services | Protect Your Car | Mekh</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="max-w-md w-full text-center">
        {/* 404 Icon */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-slate-900 border-2 border-slate-800">
            <svg
              className="w-12 h-12 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <h1 className="text-4xl font-black text-blue-500 mb-3">Page Not Found</h1>
        <p className="text-slate-400 text-lg mb-8">
          Sorry, we couldn't find the page you're looking for. It may have been moved or doesn't exist.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="text-blue-500 px-6 py-3 rounded-full font-bold text-sm transition-colors border border-blue-600"
          >
            ← Go Back
          </button>
          <Link
            to="/"
            className="bg-blue-500 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold text-sm transition-colors inline-block"
          >
            Go Home
          </Link>
        </div>

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-blue-500 text-sm mb-4">Looking for something specific?</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link
              to="/"
              className="text-slate-400 hover:text-blue-600 text-sm transition-colors"
            >
              Find Technicians
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              to="/blogs"
              className="text-slate-400 hover:text-blue-600 text-sm transition-colors"
            >
              Blog
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              to="/join"
              className="text-slate-400 hover:text-blue-600 text-sm transition-colors"
            >
              Join as Technician
            </Link>
            <span className="text-slate-700">•</span>
            <Link
              to="/contact"
              className="text-slate-400 hover:text-blue-600 text-sm transition-colors"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
