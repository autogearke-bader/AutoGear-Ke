import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Article } from '../types.ts';
import { supabase } from '../src/lib/supabase';
import ArticleCard from '../components/ArticleCard';

/** Apply on-the-fly Cloudinary transformation to an already-stored URL */
const cx = (url: string, params: string) =>
  url?.includes('cloudinary.com') ? url.replace('/upload/', `/upload/${params}/`) : url ?? '';

const BlogPage: React.FC = () => {
  const [articles,    setArticles]    = useState<Article[]>([]);
  const [categories,  setCategories]  = useState<{ id: string; name: string }[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch published articles
  useEffect(() => {
    const fetchData = async () => {
      const { data: articlesRes } = await supabase
        .from('articles')
        .select('id, slug, title, images, content, excerpt, meta_description, keywords, is_published, created_at, updated_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (articlesRes) setArticles(articlesRes);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesSearch =
        !searchQuery ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.excerpt ?? '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [articles, searchQuery]);

  const featuredArticle = articles[0] ?? null;

  return (
    <div className="min-h-screen w-full bg-slate-950">
      <Helmet>
        <title>Mekh Insights | Car Care Tips for Kenyan Drivers</title>
        {/* Dynamic meta description: use featured article or fallback to generic */}
        <meta name="description" content={featuredArticle?.meta_description || "Expert tips on car tinting, wrapping, PPF, ceramic coating, and detailing in Kenya. Your go-to source for car care advice from Mekh."} />
        <meta property="og:title"       content={featuredArticle?.title || "Mekh Insights |  Car Care Tips & Guides for Kenyan Drivers"} />
        <meta property="og:description" content={featuredArticle?.meta_description || featuredArticle?.excerpt || "Expert tips on car tinting, wrapping, PPF, ceramic coating, and detailing in Kenya."} />
        {/* Dynamic OG image: use featured article image or fallback to logo */}
        <meta property="og:image"       content={featuredArticle?.images?.[0]?.url ? cx(featuredArticle.images[0].url, 'w_1200,h_630,c_fill,q_auto,f_auto') : "https://mekh.app/assets/mekh.png"} />
        <meta property="og:url"         content="https://mekh.app/blogs" />
        <meta property="og:type"        content="website" />
        <meta property="og:site_name"   content="Mekh" />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={featuredArticle?.title || "Mekh Insights |  Car Care Tips & Guides for Kenyan Drivers"} />
        <meta name="twitter:description" content={featuredArticle?.meta_description || featuredArticle?.excerpt || "Expert tips on car tinting, wrapping, PPF, ceramic coating, and detailing in Kenya."} />
        <meta name="twitter:image"       content={featuredArticle?.images?.[0]?.url ? cx(featuredArticle.images[0].url, 'w_1200,h_630,c_fill,q_auto,f_auto') : "https://mekh.app/assets/mekh.png"} />
        <link rel="canonical" href="https://mekh.app/blogs/" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context':   'https://schema.org',
            '@type':      'Blog',
            name:         'Mekh Insights',
            description:  'Expert  Car Care Tips & Guides for Kenyan Drivers',
            publisher:    { '@type': 'Organization', name: 'Mekh' },
            url:          'https://mekh.app/blogs',
            image:        featuredArticle?.images?.[0]?.url ? cx(featuredArticle.images[0].url, 'w_1200,q_auto,f_auto') : undefined,
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
              {
                '@type': 'Question',
                name: 'What is car wrapping and how much does it cost in Nairobi?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Car wrapping is applying a vinyl film over a vehicle\'s paint to change colour or protect the surface. In Nairobi, a full wrap costs between KSh 35,000 and KSh 120,000 depending on vehicle size and vinyl brand.',
                },
              },
              {
                '@type': 'Question',
                name: 'How long does window tinting last in Kenya?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Quality window tinting in Kenya lasts 5 to 10 years when professionally installed using a reputable film such as 3M or Llumar.',
                },
              },
              {
                '@type': 'Question',
                name: 'How do I find a reliable car technician on Mekh?',
                acceptedAnswer: {
                  '@type': 'Answer',
                  text: 'Mekh is a marketplace connecting Kenyan car owners with verified auto technicians across Nairobi. Browse listings, compare reviews, and book a certified specialist directly through the app.',
                },
              },
            ],
          })}
        </script>
      </Helmet>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative py-2 md:py-10 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0" />
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">
            <span className="text-blue-500">Mekh Insights</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Your guide to car care, maintenance, and everything on Kenyan roads.
          </p>
        </div>
      </section>

      {/* ── Featured article (first / latest) ─────────── */}
      {!loading && featuredArticle && (
        <section className="px-4 md:px-8 pb-6">
          <div className="max-w-7xl mx-auto">
            <Link to={`/blogs/${featuredArticle.slug}`} className="group block">
              <div className="rounded-3xl overflow-hidden border border-slate-800 hover:border-blue-600/40 transition-all bg-slate-900">
               {/* Image */}
               {featuredArticle.images?.[0]?.url && (
                 <div className="relative">
                  <img
                    src={cx(featuredArticle.images[0].url || '', 'w_1400,h_500,c_fill,q_auto,f_auto')}
                    alt={featuredArticle.images[0].alt || featuredArticle.title}
                    className="w-full h-48 md:h-72 object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="eager"
                  />
                 {/* Gradient overlay — md and up only */}
                    <div className="hidden md:block absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                      {/* Text overlay — md and up only */}
                       <div className="hidden md:block absolute bottom-0 left-0 right-0 p-8">
                        <h2 className="text-2xl lg:text-3xl font-black text-white leading-tight mb-2">
                           {featuredArticle.title}
                         </h2>
                         {featuredArticle.excerpt && (
                        <p className="text-slate-500 text-base line-clamp-2 max-w-2xl">{featuredArticle.excerpt}</p>
                         )}
                       <p className="text-blue-500 text-[11px] font-black uppercase tracking-widest mt-3 group-hover:underline">Read Article →</p>
           </div>
          </div>
            )}

            {/* Text below image — mobile only */}
             <div className="md:hidden p-5">
                <h2 className="text-lg font-black text-blue-500 leading-tight mb-2">
                  {featuredArticle.title}
                </h2>
                 {featuredArticle.excerpt && (
                  <p className="text-slate-400 text-sm line-clamp-2">{featuredArticle.excerpt}</p>
                 )}
                 <p className="text-blue-400 text-[11px] font-black uppercase tracking-widest mt-3">Read Article →</p>
              </div>
             </div>
            </Link>
          </div>
        </section>
      )}

      {/* ── Articles grid ─────────────────────────────── */}
      <section className="px-4 md:px-8 pb-16">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 bg-slate-900 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {searchQuery || activeCategory !== 'all' ? 'No matching articles' : 'No Articles Yet'}
              </h3>
              <p className="text-slate-400 mb-6">
                {searchQuery || activeCategory !== 'all' ? 'Try a different search or category.' : 'Get notified when we publish our articles.'}
              </p>
              {(searchQuery || activeCategory !== 'all') && (
                <button onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-full font-bold text-sm uppercase tracking-widest transition-all">
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            // Skip the first article if it was rendered as featured above
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles
                .slice(activeCategory === 'all' && !searchQuery ? 1 : 0)
                .map(article => (
                  <ArticleCard key={article.id} article={article} />
                ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Content Section ─────────────────────────────── */}
      <section className="px-4 md:px-8 pb-16 border-t border-slate-800">
        <div className="max-w-4xl mx-auto pt-12">
          {/* Key Takeaways */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 mb-10">
            <p className="text-blue-500 text-[11px] font-black uppercase tracking-widest mb-3">
              Key Takeaways
            </p>
            <ul className="space-y-2 text-slate-300 text-sm list-none">
              <li>✦ Covers car wrapping, tinting, PPF, ceramic coating, and detailing for Kenyan drivers.</li>
              <li>✦ All guides are written with input from verified Mekh technicians.</li>
              <li>✦ Helps you compare costs and make confident car care decisions.</li>
              <li>✦ Mekh is Kenya's marketplace for booking trusted auto professionals.</li>
            </ul>
          </div>

          {/* About Mekh Insights */}
          <h2 className="text-xl md:text-2xl font-black text-blue-500 mb-4">
            About Mekh Insights
          </h2>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed mb-4">
            Mekh Insights is a car care knowledge hub for Kenyan vehicle owners.
            Every article covers real-world pricing, Nairobi road conditions, and
            advice from technicians verified on the Mekh platform.
          </p>
          
          {/* Quotable Statement */}
          <p className="text-slate-300 text-sm font-medium border-l-2 border-blue-600 pl-4 my-6 italic">
            "Mekh is Kenya's leading marketplace for connecting car owners with verified
            auto service technicians across Nairobi."
          </p>

          {/* What services do Mekh technicians offer */}
          <h3 className="text-lg font-bold text-blue-500 mt-8 mb-3">
            What services do Mekh technicians offer?
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed">
            Mekh technicians specialise in services such as car wrapping, window tinting, PPF,
            upholstery, ceramic coating, car diagnosis, auto detailing and many more services which are automotive related across Nairobi and surrounding areas.
          </p>

          {/* Key Car Care Terms Explained */}
          <h3 className="text-lg font-bold text-blue-500 mt-8 mb-3">
            Key Car Care Terms Explained
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-3">
            <strong className="text-blue-500">Car wrapping</strong> is the process of
            covering a vehicle's original paint with a vinyl film to change its colour
            or protect the surface.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed mb-3">
            <strong className="text-blue-500">Window tinting</strong> is the application
            of a thin laminate film to a car's glass to reduce heat, UV exposure, and glare.
          </p>
          <p className="text-slate-400 text-sm leading-relaxed">
            <strong className="text-blue-500">Ceramic coating</strong> is a liquid polymer
            that bonds to paintwork and creates a long-lasting hydrophobic shield against
            dust, UV rays, and contaminants.
          </p>

          {/* FAQ Section */}
          <h2 className="text-xl font-black text-blue-500 mt-12 mb-6">
            Frequently Asked Questions
          </h2>
          {[
            {
              q: 'What is car wrapping and how much does it cost in Nairobi?',
              a: 'A full car wrap in Nairobi costs between KSh 35,000 and KSh 120,000 depending on vehicle size and vinyl brand.',
            },
            {
              q: 'How long does window tinting last in Kenya?',
              a: 'Quality window tinting lasts 5–10 years when installed using a reputable film like 3M or Llumar.',
            },
            {
              q: 'How do I find a reliable car technician on Mekh?',
              a: 'Browse verified technicians, compare reviews, and book directly through the Mekh app.',
            },
          ].map((item, i) => (
            <details key={i} className="group bg-slate-900 border border-slate-800 rounded-xl mb-3 overflow-hidden">
              <summary className="flex justify-between items-center px-5 py-4 cursor-pointer list-none">
                <h3 className="text-slate-500 font-semibold text-sm pr-4">{item.q}</h3>
                <span className="text-blue-500 text-lg shrink-0 group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="px-5 pb-4 text-slate-400 text-sm">{item.a}</p>
            </details>
          ))}

          {/* Explore Our Services Links */}
          <div className="mt-12 pt-8 border-t border-slate-800">
            <p className="text-blue-600 text-xs uppercase tracking-widest mb-4">
              Explore Our Services
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Car Wrapping Nairobi', href: '/services/window-tinting/lavington' },
                { label: 'Window Tinting Lavington', href: '/services/ceramic-coating/nairobi' },
                { label: 'Ceramic Coating Nairobi', href: '/services/window-tinting/karen' },
                { label: 'Become a Technician', href: '/join' },
                { label: 'Home', href: '/' },
              ].map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-3 py-1.5 rounded-full border border-blue-600 hover:border-blue-500 text-slate-500 hover:text-blue-400 text-xs transition-all"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BlogPage;