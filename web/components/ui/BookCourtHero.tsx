import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';

const BookCourtHero: React.FC = () => {
  const navigate = useNavigate();
  const [where, setWhere] = useState('');
  const [date, setDate] = useState<string>('');

  const goToBooking = () => {
    const params = new URLSearchParams();
    if (where) params.set('q', where);
    if (date) params.set('date', date);
    navigate(`/booking?${params.toString()}`);
  };

  return (
    <div className="rounded-3xl p-6 md:p-8 bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-xl">
      <div className="flex flex-col md:flex-row md:items-end gap-6">
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/80 mb-2">Quick Start</p>
          <h2 className="text-2xl md:text-3xl font-black leading-tight tracking-tight">Book a Court in Seconds</h2>
          <p className="text-white/80 mt-1 text-sm md:text-base">Search nearby courts and lock your time.</p>
        </div>
        <div className="flex-1 w-full">
          <div className="bg-white/10 backdrop-blur rounded-2xl p-3 md:p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 w-5 h-5" />
              <input
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                placeholder="City, area, or venue"
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-white/20 text-white placeholder-white/70 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 w-5 h-5" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-white/20 text-white placeholder-white/70 border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 [color-scheme:dark]"
              />
            </div>
            <button
              onClick={goToBooking}
              className="h-[42px] md:h-[44px] rounded-xl bg-white text-slate-900 font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-white/90 transition shadow-lg"
            >
              Book Now <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookCourtHero;
