import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, HelpCircle, Sparkles, BookOpen, MessageCircle, Mail, Search, TrendingUp, Clock, CheckCircle2, User, AlertCircle, X } from 'lucide-react';
import { supabase } from '../services/supabase';

const FAQ_ITEMS = [
  {
    category: "Getting Started",
    questions: [
      {
        question: "What is Pickleplay?",
        answer: "Pickleplay is the premier digital platform for the Philippine pickleball community, connecting players, coaches, and court owners. We provide a seamless ecosystem for booking courts, finding coaches, joining tournaments, and staying updated with the latest news."
      },
      {
        question: "I'm a new pickleball player. How do I get started?",
        answer: "Getting started is easy! We recommend checking out our 'How to Play' guides in the Academy section and finding a local coach or clinic through our platform. You can also use our court locator to find 'dink spots' near you where beginners are always welcome."
      },
      {
        question: "What equipment do I need?",
        answer: "To start playing, you'll need a pickleball paddle, some pickleballs (indoor or outdoor depending on the court), and standard court shoes. Many venues also offer equipment rentals. Check out our 'Pro Shop' for high-quality gear curated for PH players."
      }
    ]
  },
  {
    category: "Bookings & Courts",
    questions: [
      {
        question: "How do I book a court?",
        answer: "Simply use our 'Locate' search on the homepage or head to the 'Booking' page. You can filter by region (Luzon, Visayas, Mindanao) or city, view available time slots, and book your court in just a few clicks."
      },
      {
        question: "How do I cancel or reschedule a booking?",
        answer: "Go to 'My Bookings' in your dashboard, select the booking you want to modify, and choose either 'Reschedule' or 'Cancel'. Please note our cancellation policy: cancellations made 24 hours before the booking time are eligible for a full refund."
      },
      {
        question: "What payment methods do you accept?",
        answer: "We accept various payment methods including credit/debit cards, GCash, PayMaya, and bank transfers. All transactions are secured and encrypted for your safety."
      }
    ]
  },
  {
    category: "Professional Accounts",
    questions: [
      {
        question: "How do I become a certified coach on Pickleplay?",
        answer: "Navigate to your Dashboard and click on 'PRO UPGRADE'. Submit your coaching certification, valid government ID, and professional experience documents. Our team will review your application within 3-5 business days."
      },
      {
        question: "How can I register my court facility?",
        answer: "Court owners can apply through the 'PRO UPGRADE' section on the Dashboard. You'll need to provide a valid business permit, facility utility bill, and government ID. Once approved, you can list your courts and start accepting bookings."
      },
      {
        question: "What are the benefits of a professional account?",
        answer: "Professional accounts (Coach or Court Owner) unlock features like revenue analytics, booking management, tournament hosting, calendar management, and priority support. Court owners also get a 30-day free trial with full access to all premium features."
      },
      {
        question: "Can I host my own tournaments?",
        answer: "Yes! If you are a Court Owner or an Event Organizer, you can apply for a professional account. Once approved, you'll have access to our Tournament Manager where you can create events, manage registrations, and track prize pools."
      }
    ]
  },
  {
    category: "Features & Tools",
    questions: [
      {
        question: "Can I track my DUPR rating on Pickleplay?",
        answer: "Yes! Players can manually log their DUPR rating from the Dashboard. Click on 'Log DUPR' and enter your current rating. Your rating history will be tracked and displayed in your performance chart."
      },
      {
        question: "How do tournaments work on Pickleplay?",
        answer: "Browse available tournaments in the 'Tournaments' section. You can filter by location, skill level, and date. Register for tournaments that match your skill level, pay the entry fee, and receive updates about brackets and schedules."
      },
      {
        question: "What is the Academy section?",
        answer: "The Academy is your learning hub featuring guides, tutorials, and skill rating quizzes. Whether you're a beginner learning the basics or an advanced player refining your strategy, you'll find valuable resources to improve your game."
      },
      {
        question: "How do I find a coach?",
        answer: "Visit the 'Coaches' section to browse certified coaches in your area. You can view their profiles, ratings, specialties, and pricing. Book a lesson directly through the platform and leave reviews after your session."
      }
    ]
  },
  {
    category: "Support",
    questions: [
      {
        question: "How do I contact support?",
        answer: "For assistance, you can reach our support team through the contact form on our website, email us at support@pickleplay.ph, or use the in-app messaging feature. We typically respond within 24 hours during business days."
      }
    ]
  }
];

const FAQ: React.FC = () => {
  const navigate = useNavigate();
  const [activeFaqIndex, setActiveFaqIndex] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState<{ show: boolean, type: 'success' | 'error', title: string, message: string }>({
    show: false,
    type: 'success',
    title: '',
    message: ''
  });

  const categories = ['All', ...FAQ_ITEMS.map(cat => cat.category)];

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Insert support ticket into database
      const { error } = await supabase.from('support_tickets').insert({
        user_id: user?.id || null,
        name: contactForm.name,
        email: contactForm.email,
        subject: contactForm.subject,
        message: contactForm.message,
        status: 'open'
      });

      if (error) throw error;

      // Send email notification (you'll need to set up Supabase Edge Function or email service)
      // For now, we'll just show success
      setShowContactModal(false);
      setContactForm({ name: '', email: '', subject: '', message: '' });
      setShowStatusModal({
        show: true,
        type: 'success',
        title: 'Message Sent!',
        message: 'Your support request has been submitted successfully. Our team will respond within 24 hours.'
      });
    } catch (err: any) {
      console.error('Support submission error:', err);
      setShowStatusModal({
        show: true,
        type: 'error',
        title: 'Submission Failed',
        message: `Failed to submit your request: ${err.message}. Please try again or email us directly at support@pickleplay.ph`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFAQs = FAQ_ITEMS.filter(cat => {
    if (selectedCategory !== 'All' && cat.category !== selectedCategory) return false;
    if (!searchQuery) return true;
    return cat.questions.some(q =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }).map(cat => ({
    ...cat,
    questions: cat.questions.filter(q =>
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0);

  const totalQuestions = FAQ_ITEMS.reduce((sum, cat) => sum + cat.questions.length, 0);

  return (
    <div className="space-y-8 md:space-y-10 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Help Center</p>
          </div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-tight">
            Frequently Asked Questions
          </h1>
        </div>
        <div className="flex gap-2 md:gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <button
            onClick={() => navigate('/dashboard')}
            className="whitespace-nowrap bg-white border border-slate-200 text-slate-500 font-black text-[9px] md:text-[10px] uppercase tracking-widest h-12 px-6 rounded-2xl transition-all flex items-center gap-2 hover:text-slate-950 hover:border-slate-300 shadow-sm"
          >
            <ArrowLeft size={16} /> Back
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all group relative">
          <div className="absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-blue-50 text-blue-600">
            <span>Live</span>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 mb-4 group-hover:scale-105 transition-transform">
            <BookOpen className="text-blue-600" size={24} />
          </div>
          <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Total Articles</h3>
          <p className="text-4xl font-black text-slate-900 tracking-tighter">{totalQuestions}</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all group relative">
          <div className="absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-lime-50 text-lime-600">
            <span>Fast</span>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-purple-50 mb-4 group-hover:scale-105 transition-transform">
            <Clock className="text-purple-600" size={24} />
          </div>
          <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Response Time</h3>
          <p className="text-4xl font-black text-slate-900 tracking-tighter">24h</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm hover:border-slate-300 transition-all group relative">
          <div className="absolute top-4 right-4 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider bg-green-50 text-green-600">
            <span>100%</span>
          </div>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-lime-50 mb-4 group-hover:scale-105 transition-transform">
            <CheckCircle2 className="text-lime-600" size={24} />
          </div>
          <h3 className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Satisfaction</h3>
          <p className="text-4xl font-black text-slate-900 tracking-tighter">High</p>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200/60 shadow-sm">
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search for answers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-6 py-4 pl-14 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
            />
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ Content by Category */}
      {filteredFAQs.length > 0 ? (
        <div className="space-y-8">
          {filteredFAQs.map((category, catIdx) => (
            <div key={catIdx} className="space-y-4">
              {/* Category Header */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="text-blue-600" size={16} />
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{category.category}</h2>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Questions in Category */}
              <div className="space-y-3">
                {category.questions.map((item, idx) => {
                  const uniqueId = `${catIdx}-${idx}`;
                  return (
                    <div
                      key={uniqueId}
                      className="bg-white border-2 border-slate-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300"
                    >
                      <button
                        onClick={() => setActiveFaqIndex(activeFaqIndex === uniqueId ? null : uniqueId)}
                        className="w-full text-left px-6 py-5 flex items-center justify-between gap-3 group"
                      >
                        <span className="text-base md:text-lg font-black text-slate-900 tracking-tight transition-colors group-hover:text-blue-600">
                          {item.question}
                        </span>
                        <div className={`w-10 h-10 flex-shrink-0 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          activeFaqIndex === uniqueId
                            ? 'bg-blue-600 border-blue-600 text-white rotate-180'
                            : 'bg-slate-50 border-slate-200 text-blue-500 group-hover:border-blue-200 group-hover:bg-blue-50'
                        }`}>
                          <ChevronDown size={20} className="transition-transform" />
                        </div>
                      </button>
                      <div
                        className={`transition-all duration-500 ease-in-out border-t border-slate-50 ${
                          activeFaqIndex === uniqueId ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'
                        }`}
                      >
                        <div className="px-6 md:px-8 py-6 text-slate-600 text-sm md:text-base font-medium leading-relaxed bg-slate-50/50">
                          {item.answer}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-16 rounded-3xl border border-slate-200/60 shadow-sm text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="text-slate-400" size={40} />
          </div>
          <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">No Results Found</h3>
          <p className="text-slate-500 font-medium">Try searching with different keywords or select another category</p>
        </div>
      )}

      {/* Contact Support Card */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 p-8 rounded-3xl shadow-2xl shadow-blue-100 relative overflow-hidden group animate-fade-in">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 group-hover:scale-110 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight uppercase">Still Need Help?</h3>
              <p className="text-blue-50 text-sm md:text-base font-medium leading-relaxed max-w-xl">
                Can't find what you're looking for? Our support team is here to help you with any questions or issues.
              </p>
            </div>
            <button 
              onClick={() => setShowContactModal(true)}
              className="shrink-0 bg-white text-blue-600 font-black px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-black/10 hover:scale-105 hover:shadow-2xl transition-all flex items-center gap-3 group/button"
            >
              <Mail size={18} className="group-hover/button:rotate-12 transition-transform" />
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {/* Contact Support Modal */}
      {showContactModal && ReactDOM.createPortal(
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white rounded-[40px] p-8 md:p-12 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300 my-8">
            <form onSubmit={handleContactSubmit}>
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100/50 text-blue-600">
                    <Mail size={32} />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Contact Support</h3>
                  <p className="text-slate-500 text-sm font-medium mt-1">We'll get back to you within 24 hours</p>
                </div>

                {/* Name Field */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Your Name</label>
                  <div className="relative">
                    <input
                      name="name"
                      type="text"
                      required
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full px-5 py-4 pl-12 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Email Address</label>
                  <div className="relative">
                    <input
                      name="email"
                      type="email"
                      required
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full px-5 py-4 pl-12 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>

                {/* Subject Field */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Subject</label>
                  <input
                    name="subject"
                    type="text"
                    required
                    value={contactForm.subject}
                    onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                    placeholder="How can we help you?"
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Message Field */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Message</label>
                  <textarea
                    name="message"
                    required
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="Please describe your issue or question in detail..."
                    rows={5}
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 bg-slate-50 font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowContactModal(false);
                      setContactForm({ name: '', email: '', subject: '', message: '' });
                    }}
                    className="flex-1 py-4 bg-slate-100 text-slate-900 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Status Modal (Success/Error) */}
      {showStatusModal.show && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className={`p-8 text-center ${showStatusModal.type === 'success' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-6 ${showStatusModal.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                {showStatusModal.type === 'success' ? <CheckCircle2 size={40} /> : <AlertCircle size={40} />}
              </div>
              <h3 className={`text-2xl font-black uppercase tracking-tighter mb-2 ${showStatusModal.type === 'success' ? 'text-emerald-900' : 'text-rose-900'}`}>
                {showStatusModal.title}
              </h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                {showStatusModal.message}
              </p>
            </div>
            <div className="p-6 bg-white">
              <button
                onClick={() => setShowStatusModal({ ...showStatusModal, show: false })}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all
                  ${showStatusModal.type === 'success'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100 hover:bg-emerald-700 hover:shadow-emerald-200'
                    : 'bg-rose-600 text-white shadow-lg shadow-rose-100 hover:bg-rose-700 hover:shadow-rose-200'
                  }`}
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default FAQ;
