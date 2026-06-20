// src/pages/public/ResetSuccess.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ShieldCheck, Mail } from 'lucide-react';

const ResetSuccess = () => {
  const navigate = useNavigate();

  const securityTips = [
    'Never share your password with anyone, including ProTech staff.',
    'Use a combination of upper/lowercase letters, numbers, and symbols.',
    'Enable two-factor authentication on your email account for extra security.',
    'Avoid reusing passwords across multiple websites.'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1628] via-[#0F2A5E] to-[#1565C0] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transition duration-200">
        
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 select-none">
          <div className="flex items-center flex-col">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white font-bold text-xs flex items-center justify-center">✓</div>
            <span className="text-[10px] text-green-600 font-bold mt-1">Email</span>
          </div>
          <div className="h-0.5 bg-green-500 flex-1 mx-2 -mt-4" />
          <div className="flex items-center flex-col">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white font-bold text-xs flex items-center justify-center">✓</div>
            <span className="text-[10px] text-green-600 font-bold mt-1">Verify OTP</span>
          </div>
          <div className="h-0.5 bg-green-500 flex-1 mx-2 -mt-4" />
          <div className="flex items-center flex-col">
            <div className="w-8 h-8 rounded-full bg-green-500 text-white font-bold text-xs flex items-center justify-center">✓</div>
            <span className="text-[10px] text-green-600 font-bold mt-1">Reset</span>
          </div>
        </div>

        {/* Success Header with Scale Animation */}
        <div className="text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-5 border border-green-200 animate-[scaleIn_0.4s_ease-out_forwards]">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 leading-tight">Password Reset!</h2>
          <p className="text-slate-500 text-sm mt-2 leading-relaxed">
            Your password has been successfully updated.
          </p>
        </div>

        {/* Email Notice Box */}
        <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3 items-start">
          <Mail className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-green-800 uppercase tracking-wider">Confirmation Email Sent</h4>
            <p className="text-xs text-green-700 mt-1 leading-relaxed">
              We've dispatched a security notification to your inbox confirming this password alteration.
            </p>
          </div>
        </div>

        {/* Security Tips */}
        <div className="mt-6 bg-slate-50 border border-slate-100 rounded-2xl p-5">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-1.5 mb-3">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            Security Tips
          </h4>
          <ul className="space-y-2 text-xs text-slate-500 leading-relaxed list-disc list-inside">
            {securityTips.map((tip, index) => (
              <li key={index} className="pl-1">{tip}</li>
            ))}
          </ul>
        </div>

        {/* Button */}
        <button
          onClick={() => navigate('/')}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm rounded-xl transition duration-150 mt-6 hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98]"
        >
          Sign In Now
        </button>

      </div>
    </div>
  );
};

export default ResetSuccess;
