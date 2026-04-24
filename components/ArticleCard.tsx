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

const detectServiceSlug = (article: Article): string | null => {
  const content = `${article.title} ${article.keywords} ${article.excerpt}`.toLowerCase();
  for (const [keyword, slug] of Object.entries(KEYWORD_TO_SERVICE)) {
    if (content.includes(keyword)) return slug;
  }
  return null;
};

const detectLocationSlug = (article: Article): string | null => {
  const content = `${article.title} ${article.keywords} ${article.excerpt}`.toLowerCase();
  for (const location of LOCATIONS) {
    if (content.includes(location.toLowerCase())) return location;
  }
  return null;
};

const detectTags = (article: Article): string[] => {
  const content = `${article.title} ${article.keywords} ${article.excerpt}`.toLowerCase();
  const tags: string[] = [];
  const tagMap: Record<string, string> = {
    'tint': 'Window Tinting',
    'wrap': 'Car Wrapping',
    'ppf': 'PPF',
    'ceramic': 'Ceramic Coating',
    'detail': 'Detailing',
    'buff': 'Buffing',
    'headlight': 'Headlights',
    'tuning': 'Tuning',
  };
  for (const [keyword, label] of Object.entries(tagMap)) {
    if (content.includes(keyword)) tags.push(label);
    if (tags.length === 3) break;
  }
  return tags;
};

interface ArticleCardProps {
  article: Article;
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently Published';
    try {
      const date = new Date(dateString.replace(' ', 'T'));
      if (isNaN(date.getTime())) return 'Recently Published';
      return date.toLocaleDateString('en-KE', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Recently Published';
    }
  };

  const imageUrl = article.images?.[0]?.url
    || (article.featuredImage
      ? (article.featuredImage.startsWith('http') || article.featuredImage.startsWith('data:')
        ? article.featuredImage
        : `/article-images/${article.featuredImage}`)
      : 'https://placehold.co/800x450/1e293b/94a3b8?text=No+Image');

  const tags = detectTags(article);
  const serviceSlug = detectServiceSlug(article);
  const locationSlug = detectLocationSlug(article);

  return (
    <div className="group bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 hover:border-blue-600/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/10 flex flex-col">

      {/* ── Image — clean, no overlays ── */}
      <div className="aspect-[4/3] overflow-hidden bg-slate-800 flex-shrink-0">
        <img
          src={imageUrl}
          alt={article.images?.[0]?.alt || article.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>

      {/* ── All text content below image ── */}
      <div className="p-4 flex flex-col flex-grow">

        {/* Date */}
        <div className="flex items-center gap-1 mb-2">
          <svg className="w-3 h-3 text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            {formatDate(article.publishedAt || article.published_at || article.created_at)}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-[6px] sm:text-[15px] leading-snug mb-2 mt-4 line-clamp-2 group-hover:text-blue-400 transition-colors">
          {article.title}
        </h3>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="text-slate-400 text-[12px] leading-relaxed line-clamp-2 mb-3 flex-grow">
            {article.excerpt}
          </p>
        )}

        {/* Service tag pills */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {tags.map(tag => (
              <span
                key={tag}
                className="text-[10px] font-semibold text-slate-300 bg-slate-800 border border-slate-700 rounded-full px-2.5 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer row — Read link + optional location link */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 mt-auto">
          <Link
            to={`/blogs/${article.slug}`}
            className="text-blue-400 hover:text-blue-300 text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-1"
          >
            Read Full Article
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>

          {serviceSlug && locationSlug && (
            <Link
              to={`/${serviceSlug}/${locationSlug}`}
              className="text-slate-600 hover:text-blue-400 text-[10px] transition-colors"
            >
              {locationSlug.charAt(0).toUpperCase() + locationSlug.slice(1)}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArticleCard;