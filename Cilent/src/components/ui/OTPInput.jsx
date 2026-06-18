// src/components/ui/OTPInput.jsx
import React, { useRef, useState, useEffect } from 'react';

const OTPInput = ({ length = 6, value = '', onChange, hasError = false }) => {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Synchronize local state with props
    const valString = String(value || '');
    const newDigits = Array(length).fill('');
    for (let i = 0; i < length; i++) {
      newDigits[i] = valString[i] || '';
    }
    setDigits(newDigits);
  }, [value, length]);

  const triggerChange = (newDigits) => {
    const combinedVal = newDigits.join('');
    if (onChange) onChange(combinedVal);
  };

  const handleInput = (e, index) => {
    const val = e.target.value;
    const digit = val.slice(-1); // Take only the last typed character
    
    if (!/^\d*$/.test(digit)) return; // Allow only numbers

    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    triggerChange(newDigits);

    // Auto-advance if digit entered and not on last input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      const newDigits = [...digits];
      
      if (!newDigits[index] && index > 0) {
        // If current is empty, delete previous and focus previous
        newDigits[index - 1] = '';
        setDigits(newDigits);
        triggerChange(newDigits);
        inputRefs.current[index - 1].focus();
      } else {
        // Just clear current
        newDigits[index] = '';
        setDigits(newDigits);
        triggerChange(newDigits);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    
    if (!pasteData) return;

    const newDigits = Array(length).fill('');
    for (let i = 0; i < length; i++) {
      newDigits[i] = pasteData[i] || '';
    }
    setDigits(newDigits);
    triggerChange(newDigits);

    // Focus last filled box
    const focusIndex = Math.min(pasteData.length, length - 1);
    if (inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex].focus();
    }
  };

  return (
    <div className="flex justify-between gap-2 print:hidden" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          type="text"
          maxLength={1}
          value={digit}
          ref={(el) => (inputRefs.current[i] = el)}
          onChange={(e) => handleInput(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          className={`w-12 h-14 border-2 rounded-xl text-center text-2xl font-black text-slate-900 font-mono transition outline-none
            ${hasError 
              ? 'border-red-400 bg-red-50 focus:ring-red-200' 
              : digit 
                ? 'border-blue-400 bg-blue-50 focus:border-blue-500' 
                : 'border-slate-200 bg-slate-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20'
            }`}
        />
      ))}
    </div>
  );
};

export default OTPInput;
