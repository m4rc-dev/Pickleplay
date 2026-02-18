import React, { useState } from 'react';
import { MessageCircle, X, Send, Bot, Sparkles } from 'lucide-react';

const ChatbotButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');

  const quickQuestions = [
    "How do I book a court?",
    "What is DUPR rating?",
    "How to become a coach?",
    "Payment methods?"
  ];

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 right-6 z-[200] animate-in fade-in slide-in-from-bottom-4 duration-500">
        {!isOpen ? (
          <button
            onClick={() => setIsOpen(true)}
            className="group relative bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 text-white w-16 h-16 rounded-full shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 flex items-center justify-center hover:scale-110 active:scale-95"
          >
            {/* Pulse Ring */}
            <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 opacity-75 group-hover:opacity-100 transition-opacity" />
            
            {/* Icon */}
            <MessageCircle size={28} className="relative z-10 group-hover:rotate-12 transition-transform" />
            
            {/* Notification Badge */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-lime-400 rounded-full border-2 border-white flex items-center justify-center">
              <Sparkles size={12} className="text-slate-900" fill="currentColor" />
            </div>
          </button>
        ) : (
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-[380px] max-w-[calc(100vw-3rem)] animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-purple-600 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30">
                    <Bot size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">PickleBot</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 bg-lime-400 rounded-full animate-pulse" />
                      <p className="text-xs font-bold text-blue-100">Online</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="p-6 space-y-4 h-[400px] overflow-y-auto bg-slate-50">
              {/* Welcome Message */}
              <div className="flex gap-3 animate-in slide-in-from-left-4 fade-in duration-300">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-white rounded-2xl rounded-tl-sm p-4 shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-900 leading-relaxed">
                      👋 Hi there! I'm <span className="font-black text-blue-600">PickleBot</span>, your virtual assistant. How can I help you today?
                    </p>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 ml-2">Just now</p>
                </div>
              </div>

              {/* Quick Questions */}
              <div className="space-y-2 animate-in slide-in-from-left-4 fade-in duration-500 delay-150">
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider ml-2">Quick Questions:</p>
                <div className="space-y-2">
                  {quickQuestions.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMessage(question)}
                      className="w-full text-left px-4 py-3 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition-all text-sm font-bold text-slate-700 hover:text-blue-600 group"
                    >
                      <span className="flex items-center justify-between">
                        {question}
                        <Send size={14} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coming Soon Notice */}
              <div className="bg-gradient-to-br from-lime-50 to-green-50 border-2 border-lime-200 rounded-2xl p-4 animate-in slide-in-from-bottom-4 fade-in duration-500 delay-300">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-lime-400 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sparkles size={16} className="text-slate-900" fill="currentColor" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-lime-900 uppercase tracking-wider mb-1">Coming Soon</p>
                    <p className="text-sm font-medium text-lime-800 leading-relaxed">
                      AI-powered chat is currently in development. Stay tuned for intelligent responses!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  disabled
                  className="flex-1 px-4 py-3 rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  disabled
                  className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <Send size={18} className="group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
              <p className="text-[10px] font-bold text-slate-400 text-center mt-2">
                Chatbot is currently static • Full functionality coming soon
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatbotButton;
