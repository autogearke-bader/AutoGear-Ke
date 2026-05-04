import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Article } from '../types.ts';
import { supabase } from '../src/lib/supabase';
import DOMPurify from 'dompurify';

/** Apply on-the-fly Cloudinary transformation to an already-stored URL */
const cx = (url: string, params: string) =>
  url?.includes('cloudinary.com') ? url.replace('/upload/', `/upload/${params}/`) : url ?? '';

const ArticleDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchArticle = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('articles')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (err || !data) {
        setError('Article not found');
      } else {
        setArticle(data);
      }
      setLoading(false);
    };
    fetchArticle();
  }, [slug]);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

  // ── Loading ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ── 404 ──────────────────────────────────────────────
  if (error || !article) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 overflow-x-hidden">
        <h1 className="text-4xl font-black text-white mb-4">404</h1>
        <p className="text-slate-400 mb-8">{error || 'Article not found'}</p>
        <Link
          to="/blogs"
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold text-sm uppercase tracking-widest transition-all"
        >
          Back to Blog
        </Link>
      </div>
    );
  }

  const heroImage = article.images?.[0]?.url ?? null;
  const heroAlt   = article.images?.[0]?.alt  ?? article.title;

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      <Helmet>
        <title>{article.title} | Mekh Insights</title>
        <link rel="canonical" href={`https://mekh.app/blogs/${article.slug}`} />
        <meta name="description" content={article.meta_description || article.excerpt} />
        <meta property="og:title"       content={article.title} />
        <meta property="og:description" content={article.meta_description || article.excerpt} />
        {heroImage && <meta property="og:image" content={cx(heroImage, 'w_1200,h_630,c_fill,q_auto,f_auto')} />}
        <meta property="og:url"  content={`https://mekh.app/blogs/${article.slug}`} />
        <meta property="og:type" content="article" />
        <script type="application/ld+json">
          {JSON.stringify({
            '@context':     'https://schema.org',
            '@type':        'BlogPosting',
            headline:       article.title,
            description:    article.excerpt,
            image:          heroImage ? cx(heroImage, 'w_1200,q_auto,f_auto') : undefined,
            datePublished:  article.created_at,
            dateModified:   article.updated_at ?? article.created_at,
            author: { '@type': 'Organization', name: 'Mekh' },
            ...(article.faqs && article.faqs.length > 0 ? {
              mainEntity: {
                '@type': 'FAQPage',
                mainEntity: article.faqs.map(faq => ({
                  '@type': 'Question',
                  name: faq.question,
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: faq.answer
                  }
                }))
              }
            } : {}),
          })}
        </script>
      </Helmet>

      {/* ── Hero image ────────────────────────────────── */}
      {heroImage && (
        <section className="relative w-full h-[35vh] md:h-[45vh] lg:h-[50vh] overflow-hidden">
          <img
            src={cx(heroImage, 'w_1400,h_500,c_fill,q_auto,f_auto')}
            alt={heroAlt}
            className="w-full h-full object-cover"
            loading="eager"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        </section>
      )}

      {/* ── Article header ────────────────────────────── */}
      <section className="relative px-4 md:px-8 pt-6 md:pt-10 pb-8 bg-slate-950">
        <div className="max-w-4xl mx-auto w-full">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6 overflow-x-auto whitespace-nowrap">
            <Link to="/"      className="text-slate-400 hover:text-white transition-colors flex-shrink-0">Home</Link>
            <span className="text-slate-600 flex-shrink-0">/</span>
            <Link to="/blogs" className="text-slate-400 hover:text-white transition-colors flex-shrink-0">Blog</Link>
            <span className="text-slate-600 flex-shrink-0">/</span>
            <span className="text-blue-400 flex-shrink-0 overflow-hidden text-ellipsis">{article.title}</span>
          </nav>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-slate-500 text-sm">{formatDate(article.created_at)}</span>
          </div>

          {/* Title */}
          <h1 className="text-xl md:text-2xl lg:text-4xl font-black text-blue-500 mb-6 leading-tight break-words w-full">
            {article.title}
          </h1>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-base md:text-lg text-slate-300 leading-relaxed mb-6 border-l-4 border-blue-600 pl-4 md:pl-6 break-words">
              {article.excerpt}
            </p>
          )}

          {/* Author Bio */}
          {article.author_bio && (
            <div className="flex flex-col gap-3 mb-6 border-l-4 border-blue-600 pl-4 md:pl-6">
              <p className="text-sm text-slate-400 italic">
                {article.author_bio}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── Article body ──────────────────────────────── */}
      <section className="px-4 md:px-8 pb-10 bg-slate-950">
        <div className="max-w-3xl mx-auto w-full">
          <article
            className="prose prose-lg prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-black prose-headings:break-words
              prose-p:text-slate-700 prose-p:leading-relaxed prose-p:break-words
              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-blue-300 prose-a:break-words
              prose-strong:text-black prose-strong:font-bold
              prose-ul:text-slate-500 prose-ol:text-slate-500
              prose-img:rounded-2xl prose-img:shadow-xl prose-img:max-w-100%
              prose-blockquote:border-l-blue-500 prose-blockquote:bg-slate-900 prose-blockquote:rounded-xl prose-blockquote:p-6 prose-blockquote:break-words"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
          />
        </div>
      </section>

      {/* ── Related Links ─────────────────────────────── */}
      {article.internal_links && article.internal_links.length >= 2 && (
        <section className="px-4 md:px-8 pb-10 bg-slate-950">
          <div className="max-w-3xl mx-auto w-full">
            <h2 className="text-xl font-bold text-blue-500 mb-6">Related Links</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {article.internal_links.map((link, idx) => (
                <Link
                  key={idx}
                  to={link.url}
                  className="bg-slate-900 border border-blue-500 rounded-2xl p-4 hover:bg-blue-500 transition-colors"
                >
                  <p className="text-white font-semibold">{link.title}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── FAQs ─────────────────────────────────────── */}
      {article.faqs && article.faqs.length > 0 && (
        <section className="px-4 md:px-8 pb-10 bg-slate-950">
          <div className="max-w-3xl mx-auto w-full">
            <h2 className="text-xl font-bold text-blue-500 mb-6">Frequently Asked Questions</h2>
            {article.faqs.map((faq, idx) => (
              <details key={idx} className="mb-4">
                <summary className="text-black font-semibold cursor-pointer">{faq.question}</summary>
                <p className="text-slate-300 mt-2">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ── Gallery (remaining images after hero) ─────── */}
      {article.images && article.images.length > 1 && (
        <section className="px-4 md:px-8 pb-10 bg-slate-950">
          <div className="max-w-3xl mx-auto w-full">
            <p className="text-[15px] text-blue-500 font-black uppercase tracking-widest mb-4">Gallery</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {article.images.slice(1).map((img, idx) => (
                <img
                  key={idx}
                  src={cx(img.url || '', 'w_600,h_400,c_fill,q_auto,f_auto')}
                  alt={img.alt || article.title}
                  className="w-full h-40 object-cover rounded-2xl border border-slate-800"
                  loading="lazy"
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ───────────────────────────────────────── */}
      <section className="px-4 md:px-8 pb-12 bg-slate-950">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl md:rounded-3xl p-5 md:p-10 lg:p-12 border border-blue-800/30 text-center">
            <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-white mb-3 md:mb-4">
              Need a Technician?
            </h2>
            <p className="text-slate-300 text-sm md:text-base mb-6 md:mb-8 max-w-prose mx-auto">
              Find verified tinting, wrapping, PPF, and detailing professionals near you on Mekh.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
              <Link
                to="/"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 md:px-8 md:py-3 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider transition-all whitespace-nowrap"
              >
                Find Technicians
              </Link>
              <Link
                to="/blogs"
                className="bg-slate-800 hover:bg-slate-700 text-blue-500 px-6 py-3 md:px-8 md:py-3 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider transition-all border border-slate-700 whitespace-nowrap"
              >
                More Articles
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ArticleDetailPage;