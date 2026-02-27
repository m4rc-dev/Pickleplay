import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import useSEO from '../hooks/useSEO';

const DEFAULT_TERMS_SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content: 'By registering for and using the PicklePlay platform ("Service"), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions ("Terms"). If you do not agree to these Terms, you may not use the Service.',
  },
  {
    title: '2. Account Registration',
    content: 'You must provide accurate, current, and complete information during the registration process. You are responsible for safeguarding your password and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.',
  },
  {
    title: '3. User Conduct',
    content: 'You agree not to:',
    list: [
      'Use the Service for any unlawful purpose or in violation of any applicable law',
      'Impersonate any person or entity, or misrepresent your affiliation',
      'Upload or transmit any harmful, offensive, or inappropriate content',
      'Attempt to gain unauthorized access to any part of the Service',
      'Interfere with or disrupt the Service or servers',
    ],
  },
  {
    title: '4. Court Bookings & Payments',
    content: 'All court bookings made through the platform are subject to availability and the policies of the respective court owners. Cancellation and refund policies are determined by individual court owners and will be displayed at the time of booking.',
  },
  {
    title: '5. Professional Roles',
    content: 'Users who apply for Coach or Court Owner roles are subject to additional verification and approval. PicklePlay reserves the right to approve or reject applications at its sole discretion.',
  },
  {
    title: '6. Privacy & Data',
    content: 'Your use of the Service is also governed by our Privacy Policy. We collect and process personal data as described therein. By using the Service, you consent to such processing.',
  },
  {
    title: '7. Intellectual Property',
    content: 'All content, trademarks, and intellectual property on the platform are owned by PicklePlay Philippines. You may not copy, reproduce, or distribute any content without prior written permission.',
  },
  {
    title: '8. Limitation of Liability',
    content: 'PicklePlay is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.',
  },
  {
    title: '9. Termination',
    content: 'We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion.',
  },
  {
    title: '10. Changes to Terms',
    content: 'We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.',
  },
  {
    title: '11. Contact',
    content: 'For questions about these Terms, please contact us through the platform\'s support channels or email us at phpickleplay@gmail.com.',
  },
];

const TermsOfService: React.FC = () => {
  const [remoteContent, setRemoteContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useSEO({
    title: 'Terms of Service – PicklePlay Philippines',
    description: 'Read the terms and conditions governing the use of the PicklePlay Philippines platform.',
    canonical: 'https://www.pickleplay.ph/terms',
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('platform_content')
          .select('content')
          .eq('slug', 'terms-and-conditions')
          .maybeSingle();
        if (data?.content) setRemoteContent(data.content);
      } catch { /* fall back to local content */ }
      finally { setLoading(false); }
    })();
  }, []);

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
              <Shield size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Terms of Service</h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">
            Effective Date: February 18, 2026
          </p>
          <p className="mt-4 text-slate-600 leading-relaxed">
            Welcome to PicklePlay Philippines. By creating an account and using our platform, you agree to the following terms and conditions.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-blue-600" />
          </div>
        ) : remoteContent ? (
          /* If DB has custom content, render it as HTML */
          <div className="prose prose-slate max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-slate-900 prose-h2:text-lg prose-h2:mt-8 prose-h2:mb-3 prose-p:text-slate-600 prose-p:leading-relaxed prose-li:text-slate-600 prose-ul:my-3 prose-ol:my-3"
            dangerouslySetInnerHTML={{ __html: remoteContent }}
          />
        ) : (
          /* Default local content rendered as styled components */
          <div className="space-y-8">
            {DEFAULT_TERMS_SECTIONS.map((section, i) => (
              <div key={i}>
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mb-3">{section.title}</h2>
                <p className="text-slate-600 leading-relaxed">{section.content}</p>
                {section.list && (
                  <ul className="mt-3 space-y-2 pl-5">
                    {section.list.map((item, j) => (
                      <li key={j} className="text-slate-600 leading-relaxed flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-slate-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Last Updated: February 18, 2026
            </p>
            <div className="flex items-center gap-4">
              <Link to="/policy" className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">
                Privacy Policy
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

export default TermsOfService;
