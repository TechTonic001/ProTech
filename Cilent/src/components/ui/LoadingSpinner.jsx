// src/components/ui/LoadingSpinner.jsx
import React from 'react';

const LoadingSpinner = ({ fullPage = false, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  };

  const spinner = (
    <div className={`rounded-full border-blue-600 border-t-transparent animate-spin ${sizeClasses[size]}`} />
  );

  if (fullPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50/50 backdrop-blur-xs">
        {spinner}
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-center p-8">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
