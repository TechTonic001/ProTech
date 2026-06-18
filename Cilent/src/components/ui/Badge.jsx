// src/components/ui/Badge.jsx
import React from 'react';

const Badge = ({ children, status }) => {
  const getStyles = () => {
    const s = String(status || children || '').toLowerCase();
    
    if (['paid', 'active', 'approved', 'success'].includes(s)) {
      return 'bg-green-100 text-green-700 border-green-200';
    }
    if (['overdue', 'terminated', 'rejected', 'failed', 'danger', 'inactive'].includes(s)) {
      return 'bg-red-100 text-red-700 border-red-200';
    }
    if (['pending', 'unpaid', 'warning'].includes(s)) {
      return 'bg-amber-100 text-amber-700 border-amber-200';
    }
    // Default / info / indigo
    return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStyles()}`}>
      {children}
    </span>
  );
};

export default Badge;
