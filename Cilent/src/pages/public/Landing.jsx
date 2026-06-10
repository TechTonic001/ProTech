// src/pages/public/Landing.jsx
import { Link } from 'react-router-dom';

const Landing = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 text-white px-6">
    <div className="max-w-3xl text-center space-y-6">
      <h1 className="text-4xl sm:text-5xl font-semibold">ProTech Rent Management</h1>
      <p className="text-lg text-slate-300">Automated rent tracking, secure payments, notices, and tenant approval workflows all in one modern PWA.</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link to="/login" className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 transition">Login</Link>
        <a href="#features" className="px-6 py-3 rounded-xl border border-white/20 hover:bg-white/10 transition">Learn More</a>
      </div>
    </div>
  </div>
);

export default Landing;
