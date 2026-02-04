import React, { useState, useEffect } from 'react';
import { TrendingUp, CreditCard, Wallet, Calendar, ArrowUpRight, ArrowDownRight, Download, Filter, Landmark, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '../../services/supabase';

const COLORS = ['#F59E0B', '#1E40AF', '#CBD5E1'];

const Revenue: React.FC = () => {
    const [revenueData, setRevenueData] = useState<any[]>([]);
    const [monthlyRevenue, setMonthlyRevenue] = useState(0);
    const [totalBookings, setTotalBookings] = useState(0);
    const [sourceData, setSourceData] = useState([
        { name: 'Online Booking', value: 100 },
        { name: 'Manual Entry', value: 0 },
    ]);
    const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRevenueMetrics();
    }, []);

    const fetchRevenueMetrics = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: myCourts } = await supabase
                .from('courts')
                .select('id, name')
                .eq('owner_id', user.id);

            const myCourtIds = myCourts?.map(c => c.id) || [];

            const { data: bookings, error } = await supabase
                .from('bookings')
                .select(`
                    *,
                    courts (name)
                `)
                .in('court_id', myCourtIds)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const totalRevenue = bookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0;
            setMonthlyRevenue(totalRevenue);
            setTotalBookings(bookings?.length || 0);

            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const weeklyData = days.map(day => ({ name: day, revenue: 0 }));

            bookings?.forEach(b => {
                const date = new Date(b.date);
                const dayName = days[date.getDay()];
                const dayObj = weeklyData.find(d => d.name === dayName);
                if (dayObj) dayObj.revenue += Number(b.total_price);
            });
            setRevenueData(weeklyData);

            setRecentTransactions(bookings?.slice(0, 5).map(b => ({
                id: b.id,
                name: `Booking #${b.id.slice(0, 5)} - ${b.courts?.name}`,
                date: new Date(b.created_at).toLocaleDateString(),
                amount: `₱${Number(b.total_price).toLocaleString()}`,
                type: 'Income'
            })) || []);

        } catch (err) {
            console.error('Error fetching revenue metrics:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadReport = () => {
        if (recentTransactions.length === 0) return;

        const content = [
            ["--- REVENUE REPORT ---"],
            [`Date: ${new Date().toLocaleDateString()}`],
            [`Monthly Revenue: ${monthlyRevenue}`],
            [`Total Bookings: ${totalBookings}`],
            [""],
            ["--- RECENT TRANSACTIONS ---"],
            ["ID", "Description", "Date", "Amount"],
            ...recentTransactions.map(tx => [tx.id, tx.name, tx.date, tx.amount])
        ].map(r => r.join(",")).join("\n");

        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `revenue_report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                    <button
                        onClick={handleDownloadReport}
                        className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-all shadow-xl active:scale-95"
                    >
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
                            <h2 className="text-6xl font-black tracking-tighter mt-4 mb-2">₱{monthlyRevenue.toLocaleString()}</h2>
                            <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                                <ArrowUpRight size={20} /> +0% <span className="opacity-40 text-xs tracking-widest uppercase ml-2">from last month</span>
                            </div>
                        </div>

                        <div className="flex-1 grid grid-cols-2 gap-6">
                            <MiniFinancial icon={<CreditCard size={18} />} label="Total Bookings" value={totalBookings.toString()} />
                            <MiniFinancial icon={<Landmark size={18} />} label="Daily Avg" value={`₱${Math.round(monthlyRevenue / 30).toLocaleString()}`} />
                            <MiniFinancial icon={<Wallet size={18} />} label="Online Pay" value="100%" />
                            <MiniFinancial icon={<Calendar size={18} />} label="This week" value={`₱${revenueData.reduce((s, d) => s + d.revenue, 0).toLocaleString()}`} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Booking Channels</h3>
                        <div className="h-48 w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={sourceData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {sourceData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {sourceData.map((item, i) => (
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
                    {isLoading ? (
                        <div className="w-full h-full bg-slate-50 rounded-2xl animate-pulse"></div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={revenueData}>
                                <defs>
                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} dy={10} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: '900' }}
                                    cursor={{ stroke: '#F59E0B', strokeWidth: 2 }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="#F59E0B" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Transaction Ledger */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden p-10">
                <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-8">Recent Transactions</h3>
                <div className="space-y-6">
                    {isLoading ? (
                        Array(3).fill(0).map((_, i) => <div key={i} className="h-20 bg-slate-50 rounded-3xl animate-pulse"></div>)
                    ) : recentTransactions.length > 0 ? (
                        recentTransactions.map((tx) => (
                            <TransactionRow key={tx.id} name={tx.name} date={tx.date} amount={tx.amount} type={tx.type} />
                        ))
                    ) : (
                        <p className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-[10px]">No recent transactions</p>
                    )}
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
