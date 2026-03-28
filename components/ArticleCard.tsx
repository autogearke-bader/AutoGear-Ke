import React from 'react';
import { Link } from 'react-router-dom';
import { Article } from '../types.ts';

// Map keywords to service slugs for internal linking
const KEYWORD_TO_SERVICE: Record<string, string> = {
  'tinting': 'window-tinting',
  'tint': 'window-tinting',
  'window': 'window-tinting',
  'wrapping': 'car-wrapping',
  'wrap': 'car-wrapping',
  'ppf': 'ppf',
  'paint protection': 'ppf',
  'ceramic': 'ceramic-coating',
  'coating': 'ceramic-coating',
  'buffing': 'car-buffing',
  'polish': 'car-buffing',
  'detailing': 'car-detailing',
  'detail': 'car-detailing',
  'headlight': 'headlight-restoration',
  'tuning': 'car-tuning',
  'riveting': 'car-riveting',
  'identity': 'car-identity',
};

// Kenya locations for internal linking
const LOCATIONS = ['nairobi', 'mombasa', 'kisumu', 'nakuru', 'eldoret', 'kiambu', 'thika', 'machakos', 'westlands', 'karen', 'kilimani'];

// Detect service from article content
const detectServiceSlug = (article: Article): string | null => {
  const content = `${article.title} ${article.keywords} ${article.excerpt}`.toLowerCase();
  for (const [keyword, slug] of Object.entries(KEYWORD_TO_SERVICE)) {
    if (content.includes(keyword)) return slug;
  }
  return null;
};

// Detect location from article content
const detectLocationSlug = (article: Article): string | null => {
  const content = `${article.title} ${article.keywords} ${article.excerpt}`.toLowerCase();
  for (const location of LOCATIONS) {
    if (content.includes(location.toLowerCase())) return location;
  }
  return null;
};

interface ArticleCardProps {
  article: Article;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  // Improved formatter to handle MySQL strings and naming mismatches
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently Published';

    try {
      // Replace the space with 'T' to make it compatible with all browsers
      const formattedString = dateString.replace(' ', 'T');
      const date = new Date(formattedString);

      if (isNaN(date.getTime())) return 'Recently Published';

      return date.toLocaleDateString('en-KE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (e) {
      return 'Recently Published';
    }
  };

// Use the full URL from images array first, fallback to featuredImage
const imageUrl = article.images?.[0]?.url 
  || (article.featuredImage 
      ? (article.featuredImage.startsWith('http') || article.featuredImage.startsWith('data:')
          ? article.featuredImage 
          : `/article-images/${article.featuredImage}`)
      : 'https://placehold.co/800x450/1e293b/94a3b8?text=No+Image');

  return (
    <div className="group bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 flex flex-col h-auto shadow-lg transition-all duration-500 hover:shadow-blue-900/10 hover:-translate-y-1 hover:border-blue-600/50">
      {/* Image Section */}
      <div className="aspect-video relative overflow-hidden cursor-pointer bg-slate-800">
        <img
          src={imageUrl}
          alt={article.title}
          loading="lazy"
          className="object-cover w-full h-full transition-all duration-700 ease-out group-hover:scale-110"
        />
      </div>
      
      <div className="p-4 flex flex-col flex-grow text-left">
        {/* Date */}
        <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">
          {formatDate(article.publishedAt || article.published_at || article.created_at)}
        </span>
        
        {/* Title */}
        <h3 className="text-lg font-bold text-white mb-3 leading-tight group-hover:text-blue-400 transition-colors line-clamp-2">
          {article.title}
        </h3>
        
        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2 flex-grow">
            {article.excerpt}
          </p>
        )}
        
        {/* Footer Link */}
        <div className="mt-auto pt-3 border-t border-slate-800">
          <Link 
            to={`/blogs/${article.slug}`}
            className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
          >
            Read Full Article
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
          
          {/* Internal link to service/location page */}
          {(() => {
            const serviceSlug = detectServiceSlug(article);
            const locationSlug = detectLocationSlug(article);
            if (serviceSlug && locationSlug) {
              return (
                <Link 
                  to={`/${serviceSlug}/${locationSlug}`}
                  className="mt-2 text-slate-500 hover:text-blue-400 text-xs transition-colors flex items-center gap-1"
                >
                  View {serviceSlug.replace('-', ' ')} in {locationSlug}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </Link>
              );
            }
            return null;
          })()}
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;
