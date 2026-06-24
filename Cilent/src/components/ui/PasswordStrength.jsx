// src/components/ui/PasswordStrength.jsx
import React from 'react';
import { Check, X } from 'lucide-react';
import { validatePassword } from '../../utils/validatePassword';

const PasswordStrength = ({ password }) => {
  if (!password) return null;
  const { checks, score, strength } = validatePassword(password);

  const strengthColors = {
    weak: 'bg-red-400',
    fair: 'bg-orange-400',
    medium: 'bg-yellow-400',
    strong: 'bg-green-500'
  };
  const strengthTextColors = {
    weak: 'text-red-500',
    fair: 'text-orange-500',
    medium: 'text-yellow-600',
    strong: 'text-green-600'
  };
  const strengthLabels = {
    weak: 'Weak',
    fair: 'Fair',
    medium: 'Good',
    strong: 'Strong'
  };

  const checkItems = [
    { key: 'length', label: '8+ characters' },
    { key: 'uppercase', label: 'Uppercase letter' },
    { key: 'lowercase', label: 'Lowercase letter' },
    { key: 'number', label: 'Number' },
    { key: 'special', label: 'Special character' }
  ];

  return (
    <div className="mt-2 space-y-2">
      {/* Strength bar */}
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div
            key={i}
            className={`h-1 rounded-full flex-1 transition-all duration-300 ${
              i <= score ? strengthColors[strength] : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-semibold ${strengthTextColors[strength]}`}>
        {strengthLabels[strength]}
      </p>

      {/* Requirements checklist */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
        {checkItems.map(item => (
          <div key={item.key} className="flex items-center gap-1.5">
            {checks[item.key] ? (
              <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-slate-300 flex-shrink-0" />
            )}
            <span className={`text-[11px] ${checks[item.key] ? 'text-green-600' : 'text-slate-400'}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
