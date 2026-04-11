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
        .select('*')
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
    <div className="min-h-screen bg-slate-950">
      <Helmet>
        <title>AutoGear Insights | Car Service Tips & Guides</title>
        {/* Dynamic meta description: use featured article or fallback to generic */}
        <meta name="description" content={featuredArticle?.meta_description || "Expert tips on car tinting, wrapping, PPF, ceramic coating, and detailing in Kenya. Your go-to source for car care advice from AutoGear Ke."} />
        <meta property="og:title"       content={featuredArticle?.title || "AutoGear Insights | Car Service Tips & Guides"} />
        <meta property="og:description" content={featuredArticle?.meta_description || featuredArticle?.excerpt || "Expert tips on car tinting, wrapping, PPF, ceramic coating, and detailing in Kenya."} />
        {/* Dynamic OG image: use featured article image or fallback to logo */}
        <meta property="og:image"       content={featuredArticle?.images?.[0]?.url ? cx(featuredArticle.images[0].url, 'w_1200,h_630,c_fill,q_auto,f_auto') : "https://autogearke.com/assets/logo-4.png"} />
        <meta property="og:url"         content="https://autogearke.com/blogs" />
        <meta property="og:type"        content="website" />
        <meta property="og:site_name"   content="AutoGear Ke" />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={featuredArticle?.title || "AutoGear Insights | Car Service Tips & Guides"} />
        <meta name="twitter:description" content={featuredArticle?.meta_description || featuredArticle?.excerpt || "Expert tips on car tinting, wrapping, PPF, ceramic coating, and detailing in Kenya."} />
        <meta name="twitter:image"       content={featuredArticle?.images?.[0]?.url ? cx(featuredArticle.images[0].url, 'w_1200,h_630,c_fill,q_auto,f_auto') : "https://autogearke.com/assets/logo-4.png"} />
        <link rel="canonical" href="https://autogearke.com/blogs" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context':   'https://schema.org',
            '@type':      'Blog',
            name:         'AutoGear Insights',
            description:  'Expert car service tips and guides in Kenya.',
            publisher:    { '@type': 'Organization', name: 'AutoGear Ke' },
            url:          'https://autogearke.com/blogs',
            image:        featuredArticle?.images?.[0]?.url ? cx(featuredArticle.images[0].url, 'w_1200,q_auto,f_auto') : undefined,
          })}
        </script>
      </Helmet>

      {/* ── Hero ──────────────────────────────────────── */}
      <section className="relative py-10 md:py-14 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-950 to-slate-950" />
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">
            AutoGear <span className="text-blue-500">Insights</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
            Tinting, wrapping, PPF, detailing — everything you need to know about car care in Kenya.
          </p>
        </div>
      </section>

      {/* ── Featured article (first / latest) ─────────── */}
      {!loading && featuredArticle && (
        <section className="px-4 md:px-8 pb-10">
          <div className="max-w-7xl mx-auto">
            <Link to={`/blogs/${featuredArticle.slug}`} className="group block">
              <div className="relative rounded-3xl overflow-hidden border border-slate-800 hover:border-blue-600/40 transition-all bg-slate-900">
                {featuredArticle.images?.[0]?.url && (
                  <img
                    src={cx(featuredArticle.images[0].url || '', 'w_1400,h_500,c_fill,q_auto,f_auto')}
                    alt={featuredArticle.images[0].alt || featuredArticle.title}
                    className="w-full h-48 md:h-72 object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="eager"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-tight mb-2">
                    {featuredArticle.title}
                  </h2>
                  {featuredArticle.excerpt && (
                    <p className="text-slate-300 text-sm md:text-base line-clamp-2 max-w-2xl">{featuredArticle.excerpt}</p>
                  )}
                  <p className="text-blue-400 text-[11px] font-black uppercase tracking-widest mt-3 group-hover:underline">Read Article →</p>
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
                {searchQuery || activeCategory !== 'all' ? 'Try a different search or category.' : 'Check back soon for new insights and guides!'}
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
    </div>
  );
};

export default BlogPage;