
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  ChevronRight,
  Zap,
  Target,
  ShieldCheck,
  ArrowRight,
  BookOpen,
  PlayCircle,
  Award,
  Video,
  ExternalLink,
  // Fix: Added missing Calendar icon import
  Calendar
} from 'lucide-react';

const Academy: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basics' | 'rules' | 'tactics'>('basics');

  return (
    <div className="pt-20 md:pt-24">
      <div className="space-y-12 animate-fade-in pb-20">
        {/* Header Section - Desktop Only */}
        <div className="hidden md:block space-y-6 mt-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-xs font-black text-blue-600 uppercase tracking-[0.4em] mb-4">PICKLEPLAY ACADEMY / MASTERCLASS</p>
              <h1 className="text-5xl md:text-6xl font-black text-slate-950 tracking-tighter uppercase">Learn the System.</h1>
            </div>

            <div className="flex bg-white p-1.5 rounded-[24px] border border-slate-200 shadow-sm">
              <button
                onClick={() => setActiveTab('basics')}
                className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'basics' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950'
                  }`}
              >
                THE BASICS
              </button>
              <button
                onClick={() => setActiveTab('rules')}
                className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'rules' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950'
                  }`}
              >
                RULES GUIDE
              </button>
              <button
                onClick={() => setActiveTab('tactics')}
                className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'tactics' ? 'bg-slate-950 text-white shadow-xl' : 'text-slate-400 hover:text-slate-950'
                  }`}
              >
                PRO TACTICS
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'basics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <GuideCard
              title="THE GRIP"
              difficulty="Newbie"
              content="Use the 'Continental' or 'Hammer' grip. Hold your paddle as if you are shaking hands with it. This allows for both forehand and backhand consistency without switching grips mid-rally."
              icon={<ShieldCheck className="text-blue-600" />}
            />
            <GuideCard
              title="THE READY POSITION"
              difficulty="Newbie"
              content="Keep your feet shoulder-width apart, knees slightly bent, and paddle up in front of your chest. This 'neutral' stance allows you to react instantly to fast balls at the NVZ line."
              icon={<Target className="text-lime-600" />}
            />
            <GuideCard
              title="MASTERING THE DINK"
              difficulty="Novice"
              content="A soft shot hit from the NVZ (Kitchen line) that lands in the opponent's NVZ. Focus on a short pendulum swing from your shoulder—don't flick your wrist!"
              icon={<Zap className="text-lime-500" />}
            />
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="space-y-8">
            <div className="bg-white p-12 rounded-[48px] border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-lime-400/5 blur-[80px] -z-10"></div>
              <h3 className="text-3xl font-black text-slate-950 mb-8 uppercase tracking-tighter flex items-center gap-3">
                <BookOpen className="text-blue-600" /> The Golden Rules
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <p className="font-black text-slate-900 text-lg uppercase">1. THE TWO-BOUNCE RULE</p>
                  <p className="text-slate-500 leading-relaxed">The ball must bounce once on each side before either team can volley it (hit it in the air). This means the serve must bounce, and the return of serve must bounce.</p>
                </div>
                <div className="space-y-4">
                  <p className="font-black text-slate-900 text-lg uppercase">2. THE KITCHEN (NVZ)</p>
                  <p className="text-slate-500 leading-relaxed">You cannot volley the ball while standing in the Non-Volley Zone (the 7ft area near the net). You can only enter the kitchen if the ball bounces there first.</p>
                </div>
                <div className="space-y-4">
                  <p className="font-black text-slate-900 text-lg uppercase">3. SCORING SYSTEM</p>
                  <p className="text-slate-500 leading-relaxed">Points can only be scored by the serving team. Games are usually played to 11, win by 2. Always call out the three numbers: (Your Score) - (Opponent Score) - (Server #).</p>
                </div>
                <div className="space-y-4">
                  <p className="font-black text-slate-900 text-lg uppercase">4. THE UNDERHAND SERVE</p>
                  <p className="text-slate-500 leading-relaxed">Serves must be made underhand, with the paddle contact made below the waist. The serve must go diagonally cross-court and clear the kitchen line.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tactics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-slate-950 p-12 rounded-[56px] text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <span className="bg-lime-400 text-slate-950 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block">ADVANCED META</span>
                <h3 className="text-4xl font-black mb-4 tracking-tighter uppercase">THE THIRD SHOT DROP.</h3>
                <p className="text-slate-400 text-lg mb-8 leading-relaxed font-medium">The most critical shot in high-level play. Instead of hitting a hard drive, hit a soft arc into the opponent's kitchen to allow your team to move to the net safely.</p>
                <button className="flex items-center gap-3 text-lime-400 font-black text-xs uppercase tracking-widest hover:text-white transition-colors">
                  WATCH PRO BREAKDOWN <Video size={16} />
                </button>
              </div>
              <PlayCircle className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5" />
            </div>

            <div className="bg-blue-600 p-12 rounded-[56px] text-white shadow-2xl relative overflow-hidden">
              <div className="relative z-10">
                <span className="bg-white/20 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 inline-block">TEAM STRATEGY</span>
                <h3 className="text-4xl font-black mb-4 tracking-tighter uppercase">STACKING & SWITCHING.</h3>
                <p className="text-indigo-100 text-lg mb-8 leading-relaxed font-medium">Coordinate your positioning with your partner to keep your best forehands in the middle. Learn how to switch sides mid-rally to exploit opponent weaknesses.</p>
                <button className="flex items-center gap-3 text-white font-black text-xs uppercase tracking-widest hover:text-lime-400 transition-colors">
                  VIEW POSITIONING GUIDE <ArrowRight size={16} />
                </button>
              </div>
              <Award className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5" />
            </div>
          </div>
        )}

        <section className="bg-white p-12 rounded-[48px] border border-slate-200 text-center space-y-8">
          <h3 className="text-3xl font-black text-slate-950 tracking-tighter uppercase">Ready to put it into practice?</h3>
          <p className="text-slate-500 max-w-2xl mx-auto font-medium">Knowledge is nothing without drills. Find a local court and start dinking today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/booking" className="bg-slate-950 text-white h-20 px-12 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-3 shadow-xl">
              BOOK A COURT <Calendar size={18} />
            </Link>
            <Link to="/coaches" className="bg-slate-100 text-slate-900 h-20 px-12 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-3">
              FIND A COACH <GraduationCap size={18} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

const GuideCard: React.FC<{ title: string, difficulty: string, content: string, icon: React.ReactNode }> = ({ title, difficulty, content, icon }) => (
  <div className="bg-white p-10 rounded-[48px] border border-slate-200 shadow-sm group hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
    <div className={`absolute top-0 right-0 w-32 h-32 opacity-5 group-hover:opacity-10 transition-opacity`}>
      {icon}
    </div>
    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{difficulty} LEVEL</span>
    <h3 className="text-2xl font-black text-slate-950 mb-4 tracking-tighter uppercase group-hover:text-blue-600 transition-colors">{title}</h3>
    <p className="text-slate-500 font-medium leading-relaxed">{content}</p>
  </div>
);

export default Academy;
