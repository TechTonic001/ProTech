// src/components/ui/StatCard.jsx
import React from 'react';

const StatCard = ({ label, value, subtext, icon: Icon, iconColor = 'text-blue-600', iconBg = 'bg-blue-50', trendValue, trendDirection }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition duration-200">
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
    </div>
  );
};

export default StatCard;
