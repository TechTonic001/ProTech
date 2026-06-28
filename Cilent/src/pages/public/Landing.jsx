// src/pages/public/Landing.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

/* ──────────────── floating animation keyframes ──────────────── */
const floatStyle1 = { animation: 'floatCard1 4s ease-in-out infinite' };
const floatStyle2 = { animation: 'floatCard2 5s ease-in-out infinite' };
const floatStyle3 = { animation: 'floatCard3 4.5s ease-in-out infinite' };

const Landing = () => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      {/* inject float keyframes */}
      <style>{`
        @keyframes floatCard1 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes floatCard2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-16px)} }
        @keyframes floatCard3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
      `}</style>

      {/* ═══ SECTION 1 — NAVIGATION ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              {/* <span className="text-2xl">🏠</span> */}
              <span className="text-xl font-extrabold text-slate-900">ProTech</span>
              {/* <span className="ml-1 text-[10px] font-bold bg-amber-400 text-slate-900 p-1.5 py-0.5 rounded-full">PWA</span> */}
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              {['Home', 'Features', 'How It Works', 'Vision', 'About', 'Contact'].map(s => (
                <a key={s} href={`#${s.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">{s}</a>
              ))}
            </div>

            {/* Desktop Buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <button onClick={() => navigate('/landlord/login')} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border-2 border-slate-800 text-slate-800 rounded-xl hover:bg-slate-800 hover:text-white transition">
                Landlord Login
              </button>
              <button onClick={() => navigate('/tenant/login')} className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition">
                👤 Tenant Login
              </button>
            </div>

            {/* Mobile Hamburger */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="lg:hidden p-2 text-slate-700">
              <div className="w-6 flex flex-col gap-1.5">
                <span className={`block h-0.5 bg-current transition-all ${mobileMenu ? 'rotate-45 translate-y-2' : ''}`} />
                <span className={`block h-0.5 bg-current transition-all ${mobileMenu ? 'opacity-0' : ''}`} />
                <span className={`block h-0.5 bg-current transition-all ${mobileMenu ? '-rotate-45 -translate-y-2' : ''}`} />
              </div>
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenu && (
            <div className="lg:hidden border-t py-4 space-y-3">
              {['Home', 'Features', 'How It Works', 'Vision', 'About', 'Contact'].map(s => (
                <a key={s} href={`#${s.toLowerCase().replace(/\s+/g, '-')}`} onClick={() => setMobileMenu(false)} className="block px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900">{s}</a>
              ))}
              <div className="flex flex-col gap-2 pt-3 border-t">
                <button onClick={() => { navigate('/landlord/login'); setMobileMenu(false); }} className="w-full px-4 py-2.5 text-sm font-semibold border-2 border-slate-800 text-slate-800 rounded-xl">🏠 Landlord Login</button>
                <button onClick={() => { navigate('/tenant/login'); setMobileMenu(false); }} className="w-full px-4 py-2.5 text-sm font-semibold bg-slate-800 text-white rounded-xl">👤 Tenant Login</button>
              </div>
            </div>
          )}
        </div>
      </nav>

    
      {/* ═══ SECTION 2 — HERO ═══ */}
      
      <section id="home" className="relative min-h-screen flex items-center pt-16" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)' }}>
        {/* Dot overlay */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — Text */}
          <div className="space-y-8">
            {/* <div className="flex items-center gap-3 border-l-4 border-amber-400 pl-4">
              <span className="text-amber-400 text-sm font-semibold">🏠  Nigeria's #1 Student Hostel Management Platform</span>
            </div> */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight">
              Manage Your Rental<br />Properties <span className="text-amber-400">Smarter.</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-lg">
            Property Technology (ProTech) automates rent collection, payment tracking, and tenant notifications for Nigerian landlords and hostel operators  so you never miss a payment again.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => navigate('/landlord/register')} className="px-8 py-4 bg-amber-400 text-slate-900 font-bold rounded-2xl text-lg hover:bg-amber-300 transition shadow-lg shadow-amber-400/20">
                Get Started as Landlord
              </button>
              <button onClick={() => navigate('/tenant/register')} className="px-8 py-4 border-2 border-white text-white font-bold rounded-2xl text-lg hover:bg-white/10 transition">
                Register as Tenant
              </button>
            </div>
            <div className="flex flex-wrap gap-6 text-sm text-white/80">
              <span>✅ Free to use</span>
              <span>✅ No Play Store needed</span>
              <span>✅ Works on any phone</span>
            </div>
          </div>

          {/* Right — CSS Building */}
          <div className="relative hidden lg:flex items-center justify-center">
            {/* Building */}
            <div className="relative w-64">
              {/* Roof */}
              <div className="w-0 h-0 mx-auto mb-0" style={{ borderLeft: '140px solid transparent', borderRight: '140px solid transparent', borderBottom: '50px solid rgba(15,23,42,0.8)' }} />
              {/* Body */}
              <div className="bg-white/15 backdrop-blur rounded-b-2xl p-6 border border-white/10">
                {/* Windows grid */}
                {[0, 1, 2, 3].map(row => (
                  <div key={row} className="grid grid-cols-4 gap-3 mb-3">
                    {[0, 1, 2, 3].map(col => (
                      <div key={col} className="h-8 rounded-md bg-blue-300/30 border border-blue-200/20 flex items-center justify-center">
                        <div className="w-3 h-4 rounded-sm bg-blue-200/50" />
                      </div>
                    ))}
                  </div>
                ))}
                {/* Door */}
                <div className="flex justify-center mt-2">
                  <div className="w-12 h-16 bg-amber-400/80 rounded-t-xl border-2 border-amber-300/60">
                    <div className="w-2 h-2 bg-slate-800 rounded-full mt-7 ml-8" />
                  </div>
                </div>
                <p className="text-center text-amber-400 text-xs font-bold mt-3 tracking-wider">HALLELUYAH COURT</p>
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute -top-4 -right-8 bg-white rounded-xl shadow-xl p-3 w-48" style={floatStyle1}>
              <p className="text-green-600 font-bold text-sm">✅ Rent Paid</p>
              <p className="text-xs text-slate-500">Bisi Adebayo ₦45,000</p>
              <p className="text-[10px] text-slate-400 mt-1">Just now</p>
            </div>
            <div className="absolute top-1/3 -left-16 bg-white rounded-xl shadow-xl p-3 w-44" style={floatStyle2}>
              <p className="text-blue-600 font-bold text-sm">🔔 Reminder Sent</p>
              <p className="text-xs text-slate-500">7 days until rent due</p>
              <p className="text-[10px] text-slate-400 mt-1">6:00 AM today</p>
            </div>
            <div className="absolute -bottom-8 right-4 bg-white rounded-xl shadow-xl p-3 w-48" style={floatStyle3}>
              <p className="text-purple-600 font-bold text-sm">📧 Email Delivered</p>
              <p className="text-xs text-slate-500">Receipt sent to tenant</p>
              <p className="text-[10px] text-slate-400 mt-1">Ref: REF-8921A4C</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3 — STATS STRIP ═══ */}
      <section className="bg-slate-900 py-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: '100%', label: 'Cashless Payments' },
            { val: '₦0', label: 'Setup Cost' },
            { val: '3', label: 'Reminder Thresholds' },
            { val: '24/7', label: 'Cloud Access' },
          ].map((s, i) => (
            <div key={i} className="border-r last:border-r-0 border-slate-700">
              <p className="text-3xl md:text-4xl font-black text-white">{s.val}</p>
              <p className="text-sm text-amber-400 mt-1 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ SECTION 4 — FEATURES ═══ */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Everything You Need to Manage Your Hostel</h2>
            <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto">From tenant onboarding to automatic rent reminders, ProTech handles it all.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🔔', color: 'bg-blue-100 text-blue-600', title: 'Automated Rent Reminders', body: 'Tenants receive email notifications at 30 days, 7 days, and 1 day before rent is due  automatically every morning at 6AM. No manual follow-up required.' },
              { icon: '💳', color: 'bg-green-100 text-green-600', title: 'Secure Paystack Payments', body: 'Tenants pay rent online via Paystack. Funds are automatically routed directly to your registered bank account. Every payment is verified and receipts are emailed instantly.' },
              { icon: '🧾', color: 'bg-amber-100 text-amber-600', title: 'Digital Receipts on Every Payment', body: 'A professionally formatted receipt showing your hostel name is automatically generated and emailed to the tenant after every confirmed payment. No paperwork needed.' },
              { icon: '📱', color: 'bg-purple-100 text-purple-600', title: 'Phone Notifications No App Download', body: 'ProTech works as a Progressive Web App. Landlords and tenants receive notifications directly on their phone screen like WhatsApp without downloading anything from the Play Store.' },
              { icon: '📊', color: 'bg-orange-100 text-orange-600', title: 'Real-Time Financial Dashboard', body: 'See your total revenue, occupied rooms, overdue tenants, and payment history at a glance. Charts update automatically every time a payment is confirmed.' },
              { icon: '📢', color: 'bg-red-100 text-red-600', title: 'Broadcast Announcements', body: 'Send a maintenance notice, security update, or any announcement to all your tenants at once. Every tenant receives it by email and on their phone instantly.' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-shadow border border-slate-100">
                <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center text-2xl mb-5`}>{f.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5 — HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900 mb-16">How ProTech Works</h2>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connector line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-0.5 bg-slate-200" />
            {[
              { step: '1', title: 'Register Your Hostel', body: 'Create a landlord account with your hostel name and address. Add your properties, define your rooms, set monthly rent amounts, and connect your bank account through our secure Paystack integration.' },
              { step: '2', title: 'Onboard Your Tenants', body: 'Tenants register themselves with their email address. You receive a notification and approve their account with one click. They receive a confirmation email immediately and can start using the portal.' },
              { step: '3', title: 'Everything Runs Automatically', body: 'ProTech sends rent reminders, processes payments, generates receipts, and updates your dashboard without any manual work. You collect your rent, we handle the administration.' },
            ].map((s, i) => (
              <div key={i} className="text-center relative">
                <div className="w-20 h-20 rounded-full bg-slate-800 text-white text-2xl font-black flex items-center justify-center mx-auto mb-6 relative z-10 ring-4 ring-white">{s.step}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6 — AIMS & OBJECTIVES ═══ */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16">
          {/* Aims */}
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Our Aims</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-8">What ProTech Sets Out to Achieve</h2>
            <div className="space-y-6">
              {[
                { t: 'Eliminate Manual Rent Collection', b: 'Replace paper ledgers, spreadsheets, and informal bank transfer verification with a single, automated digital platform that handles all financial tracking.' },
                { t: 'Protect Landlords from Payment Fraud', b: 'End the practice of WhatsApp screenshot payment proofs. Every payment is cryptographically verified through Paystack before any record is updated.' },
                { t: 'Give Tenants Full Transparency', b: 'Tenants deserve to see their own payment history, lease details, and due dates without having to physically find their landlord to ask.' },
                { t: 'Support Nigeria\'s Cashless Economy', b: 'ProTech directly supports the Central Bank of Nigeria\'s cashless economy initiative by moving student hostel rent payments fully online.' },
              ].map((a, i) => (
                <div key={i} className="border-l-4 border-amber-400 pl-5">
                  <h4 className="font-bold text-slate-900 mb-1">{a.t}</h4>
                  <p className="text-sm text-slate-500">{a.b}</p>
                </div>
              ))}
            </div>
          </div>
          {/* Objectives */}
          <div>
            <p className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-2">Our Objectives</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-8">Specific Goals of This System</h2>
            <ol className="space-y-4 list-decimal list-inside text-sm text-slate-600 leading-relaxed">
              <li>Build a secure role-based web application for landlords, estate managers, and tenants with separate authenticated portals for each user class.</li>
              <li>Integrate Paystack Subaccount architecture to enable automatic fund routing from tenant payments directly to landlord bank accounts.</li>
              <li>Develop a Dynamic Notification Engine that dispatches personalised rent reminders via email at 30 day, 7 day, and 1 day intervals using a daily automated cron job.</li>
              <li>Create a realtime financial dashboard that displays revenue, occupancy, overdue payments, and payment history without requiring any manual data entry.</li>
              <li>Implement a PWA push notification system that delivers alerts to users' phones like normal messages without requiring any Play Store installation.</li>
              <li>Provide a centralised announcement module enabling landlords to broadcast messages to all tenants simultaneously via email and push notification.</li>
            </ol>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 7 — VISION ═══ */}
      <section id="vision" className="py-24 relative" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4">Our Vision</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-snug mb-8">
            A Nigeria Where Every Landlord and Tenant Has a Fair, Transparent, and Fully Digital Rental Experience.
          </h2>
          <p className="text-slate-300 leading-relaxed max-w-2xl mx-auto mb-10">
            ProTech was built in Ogbomoso, Oyo State, for Nigerian hostel operators who deserve the same quality of property management tools available to large real estate firms. Our vision is to grow from a final  year academic project into a platform that serves thousands of properties across Nigeria  making rent collection honest, automated, and stress free for everyone involved.
          </p>
          <div className="w-20 h-1 bg-amber-400 mx-auto mb-12 rounded-full" />
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { t: 'Transparency', b: 'Every naira tracked, every notification logged, every receipt stored. No disputes, no confusion.' },
              { t: 'Automation', b: 'Technology should do the administrative work so landlords can focus on growing their portfolios.' },
              { t: 'Accessibility', b: 'Built as a PWA so any Nigerian with a smartphone and internet access can use it  no app download required.' },
            ].map((p, i) => (
              <div key={i} className="text-center">
                <h4 className="text-lg font-bold text-amber-400 mb-3">{p.t}</h4>
                <p className="text-sm text-slate-400">{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 8 — FOR LANDLORDS vs TENANTS ═══ */}
      <section className="grid md:grid-cols-2">
        {/* Landlords */}
        <div className="bg-slate-900 p-10 sm:p-14 lg:p-20">
          <p className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">For Landlords</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-8">Run Your Hostel Like a Business</h2>
          <ul className="space-y-3 mb-10">
            {[
              'Register multiple properties and all rooms in minutes',
              'Approve tenant accounts with a single click',
              'Receive rent directly in your bank  zero manual collection',
              'See exactly who has paid and who is overdue at a glance',
              'Send announcements to all tenants at once',
              'Download complete payment records any time',
              'Your hostel name appears on every digital receipt',
            ].map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-white/90 text-sm"><span className="text-green-400 mt-0.5">✓</span>{b}</li>
            ))}
          </ul>
          <button onClick={() => navigate('/landlord/register')} className="px-8 py-3.5 bg-amber-400 text-slate-900 font-bold rounded-xl hover:bg-amber-300 transition">
            Start as Landlord
          </button>
        </div>
        {/* Tenants */}
        <div className="bg-blue-700 p-10 sm:p-14 lg:p-20">
          <p className="text-xs font-bold text-white/70 uppercase tracking-widest mb-3">For Tenants</p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-8">Pay Rent Safely From Your Phone</h2>
          <ul className="space-y-3 mb-10">
            {[
              'Pay rent online  no cash, no bank queue',
              'Receive reminders before your due date by email',
              'Get a digital receipt emailed to you after payment',
              'View your complete payment history any time',
              'See exactly how many days remain on your lease',
              'Receive landlord announcements instantly on your phone',
              'Your receipt shows your hostel name for clear records',
            ].map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-white/90 text-sm"><span className="text-blue-300 mt-0.5">✓</span>{b}</li>
            ))}
          </ul>
          <button onClick={() => navigate('/tenant/register')} className="px-8 py-3.5 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition">
            Register as Tenant
          </button>
        </div>
      </section>

      {/* ═══ SECTION 9 — ABOUT / CONTACT ═══ */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16">
          {/* About */}
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">About This Project</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6">Built at SQI College of ICT, Ogbomoso</h2>
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>ProTech is a final-year capstone project developed by Amoo Halleluyah as part of the National Innovation Diploma (NID 2) programme at SQI College of ICT, Ogbomoso, Oyo State, Nigeria.</p>
              <p>The system was designed to solve real operational problems observed in student hostel management across Ogbomoso where most landlords still rely on paper records and informal bank transfers for rent collection.</p>
            </div>
            <div className="flex flex-wrap gap-3 mt-8">
              {[
                { icon: '📍', text: 'SQI College of ICT, Ogbomoso' },
                { icon: '🎓', text: 'NID 2  Computer Science' },
                { icon: '📅', text: 'June 2026' },
              ].map((b, i) => (
                <span key={i} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-xs font-medium text-slate-600">{b.icon} {b.text}</span>
              ))}
            </div>
          </div>
          {/* Contact */}
          <div id="contact">
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">Contact</p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-4">Get in Touch</h2>
            <p className="text-sm text-slate-500 mb-8">For enquiries about this project, collaboration, or to request a demo of the ProTech system.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: '👤', label: 'Developer', value: 'Amoo Halleluyah' },
                { icon: '🎓', label: 'Matric Number', value: '241295' },
                { icon: '🏫', label: 'Institution', value: 'SQI College of ICT, Ogbomoso, Oyo State' },
                { icon: '📧', label: 'Email', value: 'amooolamilekan307@gmail.com', href: 'mailto:amooolamilekan307@gmail.com' },

                { icon: '🌐', label: 'Department', value: 'Computer Science' },
              ].map((c, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4">
                  <p className="text-lg mb-1">{c.icon}</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">{c.label}</p>
                  {c.href ? (
                    <a href={c.href} className="text-sm font-semibold text-blue-600 hover:underline">{c.value}</a>
                  ) : (
                    <p className="text-sm font-semibold text-slate-800">{c.value}</p>
                  )}
                </div>
              ))}
            </div>
            {/* <p className="mt-6 text-xs text-slate-400 italic">Replace [YOUR EMAIL] and [YOUR PHONE] with your actual contact details before submitting this project.</p> */}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 10 — CTA BANNER ═══ */}
      <section className="py-16 bg-amber-400">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">Ready to Automate Your Hostel Management?</h2>
          <p className="text-lg text-slate-700 mb-8">Join landlords and tenants across Ogbomoso who are already using ProTech to manage rent the smart way.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={() => navigate('/landlord/register')} className="px-8 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition">Register Your Hostel</button>
            <button onClick={() => navigate('/tenant/register')} className="px-8 py-3.5 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition border-2 border-slate-200">Register as Tenant</button>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 11 — FOOTER ═══ */}
      <footer className="bg-slate-900 text-slate-300 pt-16 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🏠</span>
              <span className="text-xl font-extrabold text-white">ProTech</span>
            </div>
            <p className="text-sm mb-4">Automated Rent Tracking for Nigerian Landlords and Tenants</p>
            {/* <span className="inline-block px-3 py-1 text-[10px] font-bold bg-amber-400/20 text-amber-400 rounded-full">PWA No App Download Required</span> */}
            <p className="text-xs text-slate-500 mt-4">A SQI College of ICT Final Year Project 2026</p>
          </div>
          {/* Features */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">Features</h4>
            <ul className="space-y-2 text-sm">
              {['Rent Reminders', 'Paystack Payments', 'Digital Receipts', 'PWA Notifications', 'Financial Dashboard', 'Announcements'].map(f => (
                <li key={f} className="hover:text-white transition cursor-default">{f}</li>
              ))}
            </ul>
          </div>
          {/* For Users */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4">For Users</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/landlord/login" className="hover:text-white transition">Landlord Login</Link></li>
              <li><Link to="/tenant/login" className="hover:text-white transition">Tenant Login</Link></li>
              <li><Link to="/landlord/register" className="hover:text-white transition">Register as Landlord</Link></li>
              <li><Link to="/tenant/register" className="hover:text-white transition">Register as Tenant</Link></li>
              <li><Link to="/forgot-password" className="hover:text-white transition">Forgot Password</Link></li>
            </ul>
          </div>
          {/* Project Info */}
          {/* <div>
            <h4 className="text-sm font-bold text-white mb-4">Project Info</h4>
            <ul className="space-y-2 text-sm">
              <li>Student: Amoo Halleluyah</li>
              <li>Matric: 241295</li>
              <li>Programme: NID 2</li>
              <li>Department: Computer Science</li>
              <li>Institution: SQI College of ICT</li>
              <li>Supervisor: Ms. Oduleke O. Janet</li>
              <li>Year: 2026</li>
            </ul>
          </div> */}
        </div>
        {/* Bottom bar */}
        <div className="border-t border-slate-800 pt-6">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <p>© 2026 ProTech  Amoo Halleluyah. NID 2 Final Year Project.</p>
            <p>SQI College of ICT, Ogbomoso, Oyo State, Nigeria.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
