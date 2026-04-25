import React from 'react';

/**
 * LoadingSpinner Component
 * Reusable animated loader indicating background processing.
 * @param {Object} props
 * @param {string} [props.text] - Optional accessible loading text
 * @param {string} [props.size] - 'sm' | 'md' | 'lg'
 */
const LoadingSpinner = ({ text = 'Loading...', size = 'md' }) => {
  // Map size prop to Tailwind dimensions
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div 
      className="flex flex-col items-center justify-center p-4 space-y-3"
      // A11y attributes for loading state
      role="status"
      aria-live="polite"
    >
      {/* 
        Animated circle using Tailwind's animate-spin 
        Transparent right border creates the spinning segment effect 
      */}
      <div 
        className={`${selectedSize} border-blue-600 rounded-full animate-spin border-r-transparent`}
        aria-hidden="true"
      />
      
      {/* Screen reader only text if not visibly displayed, otherwise visible */}
      {text ? (
        <span className="text-sm font-medium text-gray-500">
          {text}
        </span>
      ) : (
        <span className="sr-only">Loading...</span>
      )}
    </div>
  );
};

export default LoadingSpinner;
