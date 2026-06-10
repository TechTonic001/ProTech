// src/pages/public/ResetSuccess.jsx
import { Link } from 'react-router-dom';

const ResetSuccess = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
    <div className="w-full max-w-lg bg-white/5 border border-white/10 backdrop-blur rounded-3xl p-10 text-center shadow-2xl shadow-slate-950/20">
      <h2 className="text-3xl font-semibold text-white mb-4">Password Reset Successful</h2>
      <p className="text-slate-300 mb-8">Your password has been updated. You can now log in with your new credentials.</p>
      <Link to="/login" className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-6 py-3 text-white font-semibold transition hover:bg-blue-500">
        Back to Login
      </Link>
    </div>
  </div>
);

export default ResetSuccess;
