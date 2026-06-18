// src/components/ui/PasswordStrength.jsx
import React from 'react';

const PasswordStrength = ({ password = '' }) => {
  const getPasswordStrength = (pass) => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const score = getPasswordStrength(password);
  const labels = ['Unavailable', 'Weak', 'Fair', 'Good', 'Strong'];
  const textColors = ['text-slate-400', 'text-red-500', 'text-orange-500', 'text-yellow-600', 'text-green-600'];
  const segmentColors = ['bg-slate-200', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];

  return (
    <div className="mt-2 space-y-1.5 print:hidden">
      <div className="flex gap-1.5 h-1">
        {[1, 2, 3, 4].map((index) => (
          <div
            key={index}
            className={`h-full rounded-full flex-1 transition-all duration-300
              ${index <= score ? segmentColors[score] : 'bg-slate-200'}`}
          />
        ))}
      </div>
      {password && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">Security rating:</span>
          <span className={`font-bold ${textColors[score]}`}>
            {labels[score]}
          </span>
        </div>
      )}
    </div>
  );
};

export default PasswordStrength;
