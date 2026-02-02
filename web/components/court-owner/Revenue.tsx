import React from 'react';
import { TrendingUp, CreditCard, Wallet, Calendar, ArrowUpRight, ArrowDownRight, Download, Filter, Landmark } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';

const REVENUE_DATA = [
    { name: 'Mon', revenue: 4500 },
    { name: 'Tue', revenue: 5200 },
    { name: 'Wed', revenue: 4800 },
    { name: 'Thu', revenue: 6100 },
    { name: 'Fri', revenue: 7500 },
    { name: 'Sat', revenue: 9800 },
    { name: 'Sun', revenue: 8900 },
];

const SOURCE_DATA = [
    { name: 'Mobile App', value: 65 },
    { name: 'Web Portal', value: 25 },
    { name: 'Manual Entry', value: 10 },
];

const COLORS = ['#F59E0B', '#1E40AF', '#CBD5E1'];

const Revenue: React.FC = () => {
    return (
        <div className="space-y-10 animate-in fade-in duration-700 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Revenue Analytics</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Track your court earnings and performance.</p>
                </div>

                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                        <Filter size={18} /> Filters
                    </button>
                    <button className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all shadow-xl active:scale-95">
                        <Download size={18} /> Generate Report
                    </button>
                </div>
            </div>

            {/* Hero Financials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-slate-950 p-10 rounded-[48px] text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[100px]"></div>
                    <div className="relative z-10 flex flex-col md:flex-row justify-between gap-10">
                        <div className="flex-1">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">Monthly Revenue</span>
                            <h2 className="text-6xl font-black tracking-tighter mt-4 mb-2">₱46,800</h2>
                            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                                <ArrowUpRight size={20} /> +12.5% <span className="opacity-40 text-xs tracking-widest uppercase ml-2">from last month</span>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-6">
                            <MiniFinancial icon={<CreditCard size={18} />} label="Online Booking" value="₱32,400" />
                            <MiniFinancial icon={<Landmark size={18} />} label="On-site Pay" value="₱14,400" />
                            <MiniFinancial icon={<Wallet size={18} />} label="Pending Fees" value="₱2,800" />
                            <MiniFinancial icon={<Calendar size={18} />} label="Avg daily" value="₱6,685" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Booking Channels</h3>
                        <div className="h-48 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={SOURCE_DATA} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {SOURCE_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {SOURCE_DATA.map((item, i) => (
                            <div key={item.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.name}</span>
                                </div>
                                <span className="text-xs font-black text-slate-900">{item.value}%</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Revenue Performance</h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Current Week View</p>
                    </div>
                    <div className="flex bg-slate-50 p-1.5 rounded-2xl gap-2">
                        <button className="px-4 py-2 bg-white text-slate-950 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-sm">Daily</button>
                        <button className="px-4 py-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest">Monthly</button>
                    </div>
                </div>

                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={REVENUE_DATA}>
                            <defs>
                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} />
                            <Tooltip
                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: '900' }}
                                cursor={{ stroke: '#F59E0B', strokeWidth: 2 }}
                            />
                            <Area type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Transaction Ledger */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden p-10">
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-8">Recent Transactions</h3>
                <div className="space-y-6">
                    <TransactionRow name="Premium Booking #421" date="Today, 2:30 PM" amount="₱1,200" type="Income" />
                    <TransactionRow name="Court Lighting Upgrade" date="Yesterday" amount="₱8,500" type="Expense" />
                    <TransactionRow name="Subscription Payout" date="Mar 16" amount="₱4,500" type="Income" />
                    <TransactionRow name="Manual Booking - Cash" date="Mar 15" amount="₱600" type="Income" />
                </div>
            </div>
        </div>
    );
};

const MiniFinancial: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
    <div className="space-y-1">
        <div className="flex items-center gap-2 opacity-30">
            {icon}
            <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <p className="text-sm font-black tracking-tight">{value}</p>
    </div>
);

const TransactionRow: React.FC<{ name: string, date: string, amount: string, type: 'Income' | 'Expense' }> = ({ name, date, amount, type }) => (
    <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-3xl border border-slate-100 transition-hover hover:border-amber-200 cursor-default">
        <div className="flex items-center gap-5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${type === 'Income' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {type === 'Income' ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
            </div>
            <div>
                <p className="font-black text-slate-900 tracking-tight uppercase text-sm">{name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{date}</p>
            </div>
        </div>
        <span className={`text-lg font-black tracking-tighter ${type === 'Income' ? 'text-emerald-500' : 'text-slate-900'}`}>
            {type === 'Income' ? '+' : '-'}{amount}
        </span>
    </div>
);

export default Revenue;
