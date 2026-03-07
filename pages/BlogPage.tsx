import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Article } from '../types.ts';
import ArticleCard from '../components/ArticleCard';
import CategoryFilter from '../components/CategoryFilter';
import { BLOG_BRANDS, BLOG_CATEGORIES, BLOG_SUBTITLE, API_BASE_URL } from '../constants.ts';

const BlogPage: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState('All');

  // Blog Schema JSON-LD
  const blogSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "AutoGear Insights",
    "description": "Expert insights into car and mobile accessories in Kenya",
    "publisher": {
      "@type": "Organization",
      "name": "AutoGear KE"
    },
    "url": "https://autogear.co.ke/blogs"
  });

  // Open Graph Meta Tags
  const ogTitle = "AutoGear Insights | Car & Mobile Accessory Tips & Guides";
  const ogDescription = "Stay ahead with the latest car gadget reviews, mobile accessory guides, and expert installation tips from AutoGear KE.";
  const ogImage = "https://autogearke.com/assets/logo-4.png";
  const ogUrl = "https://autogearke.com/blogs";

  // Fetch articles
  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const url = selectedBrand === 'All' 
          ? `${API_BASE_URL}/get-articles.php`
          : `${API_BASE_URL}/get-articles.php?brand=${encodeURIComponent(selectedBrand)}`;
        
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setArticles(data);
        }
      } catch (error) {
        console.error('Failed to fetch articles:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [selectedBrand]);

  // Filter articles by brand (client-side fallback)
  const filteredArticles = useMemo(() => {
    if (selectedBrand === 'All') return articles;
    return articles.filter(article => article.brand === selectedBrand);
  }, [articles, selectedBrand]);

  return (
    <div className="min-h-screen bg-slate-950">
      <Helmet>
        <title>AutoGear Insights | Car & Mobile Accessory Tips & Guides</title>
        <meta name="description" content="Stay ahead with the latest car gadget reviews, mobile accessory guides, and expert installation tips from AutoGear KE. Your go-to source for Nairobi car tech." />
        <meta name="keywords" content="car accessories blog, smart car tech, car upgrades, auto gadgets, vehicle accessories Kenya" />
        
        {/* Open Graph Meta Tags */}
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={ogUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="AutoGear KE" />
        
        {/* Twitter Card Meta Tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@autogear_ke" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image" content={ogImage} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={ogUrl} />
        
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: blogSchema }} />
      </Helmet>

      {/* Hero Section */}
      <section className="relative py-4 md:py-6 px-4 md:px-8 overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-950 to-slate-950"></div>
        
        <div className="relative max-w-7xl mx-auto text-center">
          {/* Main Title */}
          <h1 className="text-1xl md:text-3xl lg:text-4xl font-black text-white mb-3 tracking-tight">
            AutoGear <span className="text-blue-500">Insights</span>
          </h1>
          
          {/* Subtitle with Categories */}
          <p className="text-sm md:text-lg text-slate-400 max-w-4xl mx-auto leading-relaxed">
            {BLOG_SUBTITLE}
          </p>
        </div>
      </section>

      {/* Brand Filter Pills */}
      <CategoryFilter 
        categories={BLOG_BRANDS}
        selectedCategory={selectedBrand}
        onSelect={setSelectedBrand}
      />

      {/* Articles Grid */}
      <section className="px-4 md:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            // Loading State
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : filteredArticles.length === 0 ? (
            // Empty State
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-900 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">No Articles Yet</h3>
              <p className="text-slate-400 mb-6">Check back soon for new insights and guides!</p>
              <Link 
                to="/"
                className="hidden lg:inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
            </div>
          ) : (
            // Articles Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BlogPage;
