
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MoveLeft, Home, MapPinOff, ZapOff, Ghost } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center text-center p-6 pt-40 animate-fade-in">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-blue-600/10 blur-[100px] rounded-full scale-150"></div>
        <div className="relative z-10">
          <div className="w-32 h-32 bg-white rounded-[40px] border border-slate-200 shadow-2xl flex items-center justify-center mx-auto mb-8 group hover:scale-110 transition-transform duration-500">
            <MapPinOff size={56} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
          </div>
          <h1 className="text-[12rem] font-black text-slate-950 leading-none tracking-tighter opacity-10 absolute -top-16 left-1/2 -translate-x-1/2 select-none">
            404
          </h1>
        </div>
      </div>

      <div className="max-w-2xl space-y-6 relative z-10">
        <h2 className="text-5xl font-black text-slate-950 tracking-tighter uppercase leading-none">
          BALL OUT OF <br /><span className="text-blue-600 italic">BOUNDS.</span>
        </h2>
        <p className="text-slate-500 text-lg font-medium leading-relaxed">
          The coordinate you're looking for doesn't exist in our current network.
          The court might be closed, or the link has hit the net.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mt-12 relative z-10">
        <button
          onClick={() => navigate(-1)}
          className="h-16 px-10 rounded-2xl border border-slate-200 bg-white text-slate-950 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
        >
          <MoveLeft size={18} /> REWIND PLAY
        </button>
        <Link
          to="/"
          className="h-16 px-12 rounded-2xl bg-slate-950 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-slate-200"
        >
          RETURN TO BASE <Home size={18} />
        </Link>
      </div>

      {/* Decorative Grid Background for 404 context */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] -z-10">
        <div className="absolute inset-0 hero-pattern"></div>
      </div>
    </div>
  );
};

export default NotFound;
