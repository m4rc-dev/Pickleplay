import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface Venue {
  id: string;
  name?: string;
  city?: string | null;
  address?: string | null;
  image_url?: string | null;
}

const CourtDiscoveryStrip: React.FC = () => {
  const [venues, setVenues] = useState<Venue[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        // Try locations table first
        const { data, error } = await supabase
          .from('locations')
          .select('id, name, city, address, image_url')
          .limit(8);
        if (!error && data) {
          setVenues(data as Venue[]);
          return;
        }
      } catch (_) {}
      // Fallback: empty list (UI still shows shell)
      setVenues([]);
    };
    load();
  }, []);

  return (
    <div className="bg-white rounded-3xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-black uppercase tracking-widest text-slate-600">Court Discovery</h3>
        <a href="#" onClick={(e)=>e.preventDefault()} className="text-blue-600 text-sm font-semibold">View all</a>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
        {(venues.length ? venues : Array.from({length:6}).map((_,i)=>({id:String(i)} as Venue))).map((v, idx) => (
          <div key={v.id || idx} className="min-w-[220px] bg-slate-50 rounded-2xl border border-slate-100 hover:shadow-md transition">
            <div className="h-28 rounded-t-2xl overflow-hidden bg-gradient-to-br from-slate-200 to-slate-100">
              {v.image_url && (
                <img src={v.image_url} alt={v.name || 'Venue'} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="p-3">
              <p className="font-semibold text-slate-900 truncate">{v.name || 'Local Court'}</p>
              <p className="text-xs text-slate-600 flex items-center gap-1 truncate">
                <MapPin className="w-3.5 h-3.5" /> {v.city || v.address || 'Nearby'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CourtDiscoveryStrip;
