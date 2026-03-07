import React from 'react';
import { Link } from 'react-router-dom';
import { Article } from '../types.ts';

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

  // Get brand names (support both legacy single brand and new array format)
  const brandNames = article.brand_names || (article.brand ? [article.brand] : []);

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
        {/* Category Badge */}
        {article.category && (
          <div className="absolute top-3 left-3">
            <span className="bg-blue-600/90 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md">
              {article.category}
            </span>
          </div>
        )}
        {/* Brand Badges */}
        {brandNames.length > 0 && (
          <div className="absolute top-3 right-3 flex flex-wrap gap-1 justify-end max-w-[60%]">
            {brandNames.slice(0, 2).map((brand, index) => (
              <span 
                key={index} 
                className="bg-slate-800/90 backdrop-blur-md text-slate-300 text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border border-slate-700"
              >
                {brand}
              </span>
            ))}
            {brandNames.length > 2 && (
              <span className="bg-slate-800/90 backdrop-blur-md text-slate-400 text-[8px] font-bold px-2 py-1 rounded-md">
                +{brandNames.length - 2}
              </span>
            )}
          </div>
        )}
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
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;
