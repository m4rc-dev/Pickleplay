import React from 'react';
import { Building2, MapPin, Activity, CheckCircle, AlertCircle, Clock, Plus, LayoutGrid, List } from 'lucide-react';

interface Court {
    id: string;
    name: string;
    type: 'Indoor' | 'Outdoor';
    surface: 'Acrylic' | 'Pro-Cushion';
    status: 'Available' | 'Occupied' | 'Maintenance';
    nextAvailable?: string;
}

const MOCK_COURTS: Court[] = [
    { id: '1', name: 'Court Alpha', type: 'Indoor', surface: 'Pro-Cushion', status: 'Occupied', nextAvailable: '04:00 PM' },
    { id: '2', name: 'Court Beta', type: 'Indoor', surface: 'Pro-Cushion', status: 'Available' },
    { id: '3', name: 'Court Gamma', type: 'Outdoor', surface: 'Acrylic', status: 'Available' },
    { id: '4', name: 'Court Delta', type: 'Outdoor', surface: 'Acrylic', status: 'Maintenance' },
];

const Courts: React.FC = () => {
    return (
        <div className="space-y-10 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Manage Courts</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Real-time utilization and status monitoring.</p>
                </div>

                <div className="flex gap-2">
                    <button className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><LayoutGrid size={20} /></button>
                    <button className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 transition-all"><List size={20} /></button>
                    <button className="px-8 py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 ml-2">
                        Add Court
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatusMetric label="Total Courts" count="12" subtext="All locations" />
                <StatusMetric label="Available" count="8" subtext="Ready to play" color="text-emerald-500" />
                <StatusMetric label="Occupied" count="3" subtext="Live matches" color="text-amber-500" />
                <StatusMetric label="Maintenance" count="1" subtext="Scheduled repair" color="text-rose-500" />
            </div>

            {/* Courts Visual Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {MOCK_COURTS.map((court) => (
                    <CourtCard key={court.id} court={court} />
                ))}
            </div>

            {/* Utilization Heatmap Placeholder */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm overflow-hidden relative">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Utilization Trends</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Last 24 Hours</p>
                    </div>
                    <select className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest outline-none">
                        <option>Today</option>
                        <option>This Week</option>
                    </select>
                </div>

                <div className="h-40 flex items-end gap-1.5 md:gap-3">
                    {[45, 60, 85, 95, 100, 90, 75, 40, 30, 55, 80, 70, 45, 30, 20, 40, 60, 80, 100, 95, 70, 50, 40, 30].map((height, i) => (
                        <div
                            key={i}
                            className={`flex-1 rounded-t-lg transition-all duration-1000 bg-amber-500/10 hover:bg-amber-500 hover:scale-x-110 cursor-pointer group`}
                            style={{ height: `${height}%` }}
                        >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {height}% Cap.
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-4 px-1">
                    <span className="text-[10px] font-black text-slate-400">12 AM</span>
                    <span className="text-[10px] font-black text-slate-400">12 PM</span>
                    <span className="text-[10px] font-black text-slate-400">11 PM</span>
                </div>
            </div>
        </div>
    );
};

const StatusMetric: React.FC<{ label: string, count: string, subtext: string, color?: string }> = ({ label, count, subtext, color = "text-slate-900" }) => (
    <div className="bg-white p-8 rounded-[40px] border border-slate-100/50 shadow-sm relative overflow-hidden group">
        <div className="absolute -right-4 -top-4 w-20 h-20 bg-slate-50 rounded-full group-hover:scale-125 transition-transform duration-700"></div>
        <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{label}</p>
            <p className={`text-4xl font-black tracking-tighter mb-1 ${color}`}>{count}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtext}</p>
        </div>
    </div>
);

const CourtCard: React.FC<{ court: Court }> = ({ court }) => (
    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm hover:shadow-2xl transition-all duration-500 group overflow-hidden">
        <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-6">
                <div className={`p-3 rounded-2xl ${court.status === 'Available' ? 'bg-emerald-50 text-emerald-600' : court.status === 'Occupied' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                    <MapPin size={24} />
                </div>
                <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${court.status === 'Available' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : court.status === 'Occupied' ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
                    {court.status}
                </div>
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase group-hover:text-amber-500 transition-colors">{court.name}</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{court.type} • {court.surface}</p>
        </div>

        <div className="px-8 pb-8 pt-4">
            {court.status === 'Occupied' && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Clock size={16} className="text-amber-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Available At</span>
                    </div>
                    <span className="text-sm font-black text-amber-900 tracking-tight uppercase">{court.nextAvailable}</span>
                </div>
            )}

            {court.status === 'Maintenance' && (
                <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={16} className="text-rose-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">Inspection Scheduled</span>
                    </div>
                </div>
            )}

            {court.status === 'Available' && (
                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mb-6 flex items-center gap-3">
                    <Activity size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Ready for Play</span>
                </div>
            )}

            <div className="flex gap-2">
                <button className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all active:scale-95 shadow-lg shadow-slate-200">
                    Book Manually
                </button>
                <button className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl border border-slate-100 transition-colors">
                    Settings
                </button>
            </div>
        </div>
    </div>
);

export default Courts;
