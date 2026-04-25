import React from 'react';

/**
 * ArticleCard Component
 * Displays a preview of an article with title, snippet, and category tag.
 * @param {Object} props
 * @param {Object} props.article - Article data object
 * @param {Function} props.onClick - Handler for navigating to full article
 */
const ArticleCard = ({ article, onClick }) => {
  // Provide fallbacks to prevent undefined errors
  const { title = 'Untitled', content = '', category = 'Uncategorized' } = article || {};
  
  // Truncate content for the preview snippet
  const snippet = content.length > 120 ? `${content.substring(0, 120)}...` : content;

  return (
    <article 
      // Tailwind structural and interactive classes
      className="flex flex-col p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer focus-within:ring-2 focus-within:ring-blue-500"
      onClick={onClick}
      // A11y roles and interactions
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      aria-labelledby={`article-title-${article._id}`}
    >
      <header className="flex justify-between items-start mb-3">
        <h3 
          id={`article-title-${article._id}`} 
          className="text-lg font-bold text-gray-900 line-clamp-2"
        >
          {title}
        </h3>
        
        {/* Category Badge */}
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ml-3 shrink-0">
          {category}
        </span>
      </header>

      <div className="flex-grow">
        <p className="text-sm text-gray-600 line-clamp-3">
          {snippet}
        </p>
      </div>

      <footer className="mt-4 pt-4 border-t border-gray-100 text-sm text-blue-600 font-medium">
        Read more →
      </footer>
    </article>
  );
};

export default ArticleCard;
