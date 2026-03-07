import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Article, Product, Bundle } from '../types.ts';
import DOMPurify from 'dompurify';
import ProductCard from '../components/ProductCard';
import BundleCard from '../components/BundleCard';
import { API_BASE_URL } from '../constants.ts';

const ArticleDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [relatedBundles, setRelatedBundles] = useState<Bundle[]>([]);

  // Fetch article
  useEffect(() => {
    const fetchArticle = async () => {
      if (!slug) return;
      
      try {
        const response = await fetch(`${API_BASE_URL}/get-article.php?slug=${encodeURIComponent(slug)}`);
        if (response.ok) {
          const data = await response.json();
          setArticle(data);
          
          // Fetch related products and bundles
          if (data.related_products && data.related_products.length > 0) {
            await fetchRelatedProducts(data.related_products);
          }
          if (data.related_bundles && data.related_bundles.length > 0) {
            await fetchRelatedBundles(data.related_bundles);
          }
        } else {
          setError('Article not found');
        }
      } catch (err) {
        setError('Failed to load article');
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [slug]);

  const fetchRelatedProducts = async (productIds: string[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/get-products.php`);
      if (response.ok) {
        const products: Product[] = await response.json();
        const filtered = products.filter(p => productIds.includes(p.id));
        setRelatedProducts(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch related products:', err);
    }
  };

  const fetchRelatedBundles = async (bundleIds: string[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/get-bundles.php`);
      if (response.ok) {
        const bundles: Bundle[] = await response.json();
        const filtered = bundles.filter(b => bundleIds.includes(b.id));
        setRelatedBundles(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch related bundles:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-slate-950 overflow-x-hidden">
      <Helmet>
        <title>{article.title} | AutoGear Insights</title>
        <link rel="canonical" href={`https://autogearke.com/blogs/${article.slug}`} />
        <meta name="description" content={article.meta_description || article.excerpt} />
        <meta name="keywords" content={article.seo_keywords} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            "headline": article.title,
            "description": article.excerpt,
            "image": article.images?.[0]?.url 
            || (article.featuredImage?.startsWith('http') || article.featuredImage?.startsWith('data:') 
             ? article.featuredImage 
               : `/article-images/${article.featuredImage}`),
            "datePublished": article.publishedAt?.replace(' ', 'T'),
            "author": {
              "@type": "Organization",
              "name": "AutoGear KE"
            }
          })}
        </script>
      </Helmet>

      {/* Hero Section with Featured Image */}
      {(article.images?.[0]?.url || article.featuredImage) && (
      <section className="relative w-full h-[35vh] md:h-[45vh] lg:h-[50vh] overflow-hidden">
      <img
      src={article.images?.[0]?.url 
        || (article.featuredImage?.startsWith('http') || article.featuredImage?.startsWith('data:') 
            ? article.featuredImage 
            : `/article-images/${article.featuredImage}`)}
      alt={article.images?.[0]?.alt_text || article.title}
      className="w-full h-full object-cover"
     />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
        </section>
      )}

      {/* Article Header - Positioned below hero with proper spacing */}
      <section className="relative px-4 md:px-8 pt-6 md:pt-10 pb-8 bg-slate-950">
        <div className="max-w-4xl mx-auto w-full">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm mb-6 overflow-x-auto whitespace-nowrap">
            <Link to="/" className="text-slate-400 hover:text-white transition-colors flex-shrink-0">Home</Link>
            <span className="text-slate-600 flex-shrink-0">/</span>
            <Link to="/blogs" className="text-slate-400 hover:text-white transition-colors flex-shrink-0">Blog</Link>
            <span className="text-slate-600 flex-shrink-0">/</span>
            <span className="text-blue-400 flex-shrink-0 min-w-0 overflow-hidden text-ellipsis">{article.title}</span>
          </nav>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {article.category && (
              <span className="bg-blue-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full flex-shrink-0">
                {article.category}
              </span>
            )}
            {article.brand && article.brand !== 'General' && (
              <span className="bg-slate-800 text-slate-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-slate-700 flex-shrink-0">
                {article.brand}
              </span>
            )}
            <span className="text-slate-500 text-sm flex-shrink-0">
              {formatDate(article.publishedAt || article.created_at)}
            </span>
          </div>

          {/* Title - Fully visible on all screens */}
          <h1 className="text-xl md:text-2xl lg:text-4xl font-black text-white mb-6 leading-tight break-words w-full">
            {article.title}
          </h1>

          {/* Excerpt */}
          {article.excerpt && (
            <p className="text-base md:text-lg text-slate-300 leading-relaxed mb-6 border-l-4 border-blue-600 pl-4 md:pl-6 break-words">
              {article.excerpt}
            </p>
          )}
        </div>
      </section>

      {/* Article Content */}
      <section className="px-4 md:px-8 pb-10 bg-slate-950">
        <div className="max-w-3xl mx-auto w-full">
          <article 
            className="prose prose-lg prose-invert max-w-none
              prose-headings:font-bold prose-headings:text-white prose-headings:break-words
              prose-p:text-slate-300 prose-p:leading-relaxed prose-p:break-words
              prose-a:text-blue-400 prose-a:no-underline hover:prose-a:text-blue-300 prose-a:break-words
              prose-strong:text-white prose-strong:font-bold
              prose-ul:text-slate-300 prose-ol:text-slate-300
              prose-img:rounded-2xl prose-img:shadow-xl prose-img:max-w-full
              prose-blockquote:border-l-blue-500 prose-blockquote:bg-slate-900 prose-blockquote:rounded-r-xl prose-blockquote:p-6 prose-blockquote:break-words"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
          />
        </div>
      </section>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section className="px-4 md:px-8 pb-12 bg-slate-950">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-8 overflow-x-hidden">
              <div className="flex-1 h-px bg-gradient-to-r from-blue-600/50 to-transparent min-w-[20px]"></div>
              <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-white uppercase tracking-widest whitespace-nowrap">
                Recommended Products
              </h2>
              <div className="flex-1 h-px bg-gradient-to-l from-blue-600/50 to-transparent min-w-[20px]"></div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {relatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Bundles Section */}
      {relatedBundles.length > 0 && (
        <section className="px-4 md:px-8 pb-12 bg-slate-950">
          <div className="max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-4 mb-8 overflow-x-hidden">
              <div className="flex-1 h-px bg-gradient-to-r from-green-600/50 to-transparent min-w-[20px]"></div>
              <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-white uppercase tracking-widest whitespace-nowrap">
                Featured Bundles
              </h2>
              <div className="flex-1 h-px bg-gradient-to-l from-green-600/50 to-transparent min-w-[20px]"></div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {relatedBundles.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="px-4 md:px-8 pb-12 bg-slate-950">
        <div className="max-w-4xl mx-auto w-full">
          <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 rounded-2xl md:rounded-3xl p-5 md:p-10 lg:p-12 border border-blue-800/30 text-center">
            <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-white mb-3 md:mb-4">
              Interested in These Products?
            </h2>
            
            <p className="text-slate-300 text-sm md:text-base mb-6 md:mb-8 max-w-prose mx-auto">
              Contact us on WhatsApp for inquiries, pricing, and professional installation services.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4">
              <a 
                href="https://wa.me/254112493733"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 md:px-8 md:py-3 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider transition-all whitespace-nowrap"
              >
                WhatsApp Us
              </a>
              <Link 
                to="/blogs"
                className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 md:px-8 md:py-3 rounded-full font-bold text-xs md:text-sm uppercase tracking-wider transition-all border border-slate-700 whitespace-nowrap"
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
