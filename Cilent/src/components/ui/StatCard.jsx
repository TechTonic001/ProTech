// src/components/ui/StatCard.jsx
import React from 'react';

const StatCard = ({
  label,
  value,
  subtext,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
  trendValue,
  trendDirection,
  extraBadge,
  onClick,
  pulse = false,
  className = '',
}) => {
  const content = (
    <>
      {extraBadge}
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="text-3xl font-black text-slate-900 mt-3 tracking-tight">{value}</div>
      {subtext && <div className="text-xs text-slate-500 mt-0.5">{subtext}</div>}

      {trendValue && (
        <div className="text-xs font-semibold mt-2">
          {trendDirection === 'up' ? (
            <span className="text-green-600">↑ {trendValue}</span>
          ) : (
            <span className="text-red-500">↓ {trendValue}</span>
          )}
        </div>
      )}
      {onClick && (
        <div className="text-xs text-slate-300 mt-2 group-hover:text-slate-400 transition-colors">
          Click to view →
        </div>
      )}
      {pulse && (
        <span className="absolute top-3 right-3 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative w-full text-left bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer group ${className}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={`relative bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition duration-200 ${className}`}>
      {content}
    </div>
  );
};

export default React.memo(StatCard);
