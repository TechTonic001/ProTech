// src/components/ui/Modal.jsx
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block">
      <div 
        className="fixed inset-0 print:hidden" 
        onClick={onClose}
      />
      <div 
        className={`bg-white rounded-3xl w-full shadow-2xl overflow-hidden transform transition-all duration-300 relative z-10 print:shadow-none print:w-full print:max-w-none print:rounded-none ${sizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between print:hidden">
          {title && <h3 className="text-lg font-bold text-slate-900">{title}</h3>}
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="max-h-[calc(100vh-8rem)] overflow-y-auto print:max-h-none print:overflow-visible">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
