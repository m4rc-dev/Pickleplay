import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft } from 'lucide-react';
import useSEO from '../hooks/useSEO';

const PrivacyPolicy: React.FC = () => {
  useSEO({
    title: 'Privacy Policy – PicklePlay Philippines',
    description: 'Learn how PicklePlay Philippines collects, uses, and protects your personal information.',
    canonical: 'https://www.pickleplay.ph/policy',
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#EBEBE6' }}>
      {/* Header */}
      <div className="border-b border-slate-200/60 sticky top-0 z-10 backdrop-blur-xl" style={{ backgroundColor: 'rgba(235,235,230,0.85)' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold">
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back to PicklePlay</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-7 h-7 rounded-lg object-contain" />
            <div className="flex flex-col leading-none">
              <span className="text-sm font-black text-slate-900 tracking-tight uppercase">PicklePlay</span>
              <span className="text-[8px] font-bold tracking-widest text-blue-600 uppercase">Philippines</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Title Block */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Lock size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Effective Date: February 19, 2026
          </p>
          <p className="mt-4 text-slate-600 leading-relaxed">
            PicklePlay Philippines ("we," "us," "our," or "Company") is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and otherwise handle your information when
            you use our website and mobile applications.
          </p>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">1. Information We Collect</h2>
            <p className="text-slate-600 leading-relaxed">We may collect information about you in a variety of ways, including:</p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                'Personal identification information (name, email, phone number, etc.) when you register or interact with our services',
                'Court booking information and payment details',
                'Profile information including photos and preferences',
                'Usage data through cookies and analytics tools',
                'Information collected via OAuth providers (Google, Facebook)',
              ].map((item, i) => (
                <li key={i} className="text-slate-600 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">2. How We Use Your Information</h2>
            <p className="text-slate-600 leading-relaxed">We use the information we collect for purposes including:</p>
            <ul className="mt-3 space-y-2 pl-5">
              {[
                'Providing and improving our services',
                'Processing bookings and payments',
                'Authenticating user accounts',
                'Sending notifications and updates',
                'Analyzing usage patterns to improve our platform',
                'Preventing fraud and enhancing security',
              ].map((item, i) => (
                <li key={i} className="text-slate-600 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">3. Data Security</h2>
            <p className="text-slate-600 leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information
              against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission
              over the internet or electronic storage is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">4. Third-Party Services</h2>
            <p className="text-slate-600 leading-relaxed">
              Our platform uses third-party services including Supabase for authentication and data storage,
              and payment processors for handling transactions. These providers have their own privacy policies
              governing how they handle your data.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">5. User Rights</h2>
            <p className="text-slate-600 leading-relaxed">
              You have the right to access, update, or delete your personal information at any time.
              You can manage your account settings or contact us to exercise these rights.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">6. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience. Most web browsers
              allow you to control cookies through their settings.
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">7. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              If you have any questions about this Privacy Policy or our privacy practices,
              please contact us at: <strong className="text-slate-900">phpickleplay@gmail.com</strong>
            </p>
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">8. Policy Updates</h2>
            <p className="text-slate-600 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              updating the "Last Updated" date of this Privacy Policy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Last Updated: February 19, 2026
            </p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Terms of Service
              </Link>
              <span className="text-slate-300">|</span>
              <Link to="/" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Back to Home
              </Link>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2.5">
            <img src="/images/PicklePlayLogo.jpg" alt="PicklePlay" className="w-6 h-6 rounded-lg object-contain" />
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
              © 2026 PicklePlay Philippines. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
