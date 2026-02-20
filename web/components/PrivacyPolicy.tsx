import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>
        
        <div className="text-slate-600 space-y-6 leading-relaxed">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">1. Introduction</h2>
            <p>
              PicklePlay Philippines ("we," "us," "our," or "Company") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and otherwise handle your information when 
              you use our website and mobile applications.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">2. Information We Collect</h2>
            <p>We may collect information about you in a variety of ways, including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Personal identification information (name, email, phone number, etc.) when you register or interact with our services</li>
              <li>Court booking information and payment details</li>
              <li>Profile information including photos and preferences</li>
              <li>Usage data through cookies and analytics tools</li>
              <li>Information collected via OAuth providers (Google, Facebook)</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">3. How We Use Your Information</h2>
            <p>We use the information we collect for purposes including:</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Providing and improving our services</li>
              <li>Processing bookings and payments</li>
              <li>Authenticating user accounts</li>
              <li>Sending notifications and updates</li>
              <li>Analyzing usage patterns to improve our platform</li>
              <li>Preventing fraud and enhancing security</li>
            </ul>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">4. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information 
              against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission 
              over the internet or electronic storage is 100% secure.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">5. Third-Party Services</h2>
            <p>
              Our platform uses third-party services including Supabase for authentication and data storage, 
              and payment processors for handling transactions. These providers have their own privacy policies 
              governing how they handle your data.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">6. User Rights</h2>
            <p>
              You have the right to access, update, or delete your personal information at any time. 
              You can manage your account settings or contact us to exercise these rights.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">7. Cookies</h2>
            <p>
              We use cookies and similar tracking technologies to enhance your experience. Most web browsers 
              allow you to control cookies through their settings.
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">8. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our privacy practices, 
              please contact us at: <strong>phpickleplay@gmail.com</strong>
            </p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">9. Policy Updates</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              updating the "Last Updated" date of this Privacy Policy.
            </p>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500">
              Last Updated: February 19, 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
