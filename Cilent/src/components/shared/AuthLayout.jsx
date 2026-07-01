import React from 'react';
import logoDark from '../../assets/logo-dark.png';

const AuthLayout = ({
  children, accentColor = 'blue', roleLabel,
  roleIcon, tagline
}) => {
  const gradients = {
    blue:   'from-[#0A1628] via-[#0F2A5E] to-[#1565C0]',
    indigo: 'from-[#0A1628] via-[#1E1B4B] to-[#4338CA]',
    slate:  'from-[#0F172A] via-[#1E293B] to-[#334155]'
  };

  return (
    <div className="min-h-screen flex">
      {/* inject animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes breathe {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(2%, -4%) scale(1.08); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-breathe {
          animation: breathe 8s ease-in-out infinite alternate;
        }
      `}} />

      <div className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br ${gradients[accentColor]}
                        relative overflow-hidden items-center justify-center p-12 select-none`}>
        {/* Subtle breathing radial gradient overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15)_0%,transparent_65%)] animate-breathe pointer-events-none" />

        <div className="relative z-10 text-center max-w-md">
          <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center
                          justify-center mx-auto mb-6 border border-white/10 shadow-lg">
            {roleIcon}
          </div>
          <img src={logoDark} alt="ProTech" className="h-12 mx-auto" />
          <span className="inline-block mt-3 bg-amber-400 text-slate-900
                            text-xs font-bold px-3 py-1 rounded-full shadow-md">
            {roleLabel}
          </span>
          <p className="text-white/70 text-lg italic mt-6">{tagline}</p>
          <div className="w-12 h-1 bg-amber-400 rounded-full mx-auto my-8" />
          <p className="text-white/30 text-xs absolute bottom-8 left-0 right-0">
            SQI College of ICT, Ogbomoso © 2026
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8 md:py-12 bg-white">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;
