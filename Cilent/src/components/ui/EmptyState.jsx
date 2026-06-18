// src/components/ui/EmptyState.jsx
import React from 'react';
import { Plus } from 'lucide-react';

const EmptyState = ({ icon: Icon, title, message, actionText, onActionClick }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center shadow-sm max-w-lg mx-auto flex flex-col items-center justify-center">
      {Icon && (
        <div className="w-16 h-16 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-4 border border-slate-100">
          <Icon className="w-8 h-8" />
        </div>
      )}
      <h3 className="text-lg font-bold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">{message}</p>
      
      {actionText && onActionClick && (
        <button
          onClick={onActionClick}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition duration-150 active:scale-95 hover:shadow-lg hover:shadow-blue-500/25"
        >
          <Plus className="w-4 h-4" />
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
