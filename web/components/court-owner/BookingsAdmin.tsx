import React, { useState } from 'react';
import { Calendar, Search, Filter, Download, MoreHorizontal, CheckCircle, XCircle, Clock, MapPin, User, Phone } from 'lucide-react';

interface BookingRecord {
    id: string;
    userName: string;
    userPhone: string;
    courtName: string;
    date: string;
    time: string;
    duration: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled';
    price: number;
}

const MOCK_BOOKINGS: BookingRecord[] = [
    { id: 'BK-001', userName: 'Antonio Luna', userPhone: '0917-123-4567', courtName: 'Court Alpha', date: '2024-03-18', time: '09:00 AM', duration: '120 min', status: 'Confirmed', price: 1200 },
    { id: 'BK-002', userName: 'Jose Rizal', userPhone: '0918-999-8888', courtName: 'Court Beta', date: '2024-03-18', time: '11:00 AM', duration: '60 min', status: 'Pending', price: 600 },
    { id: 'BK-003', userName: 'Andres Bonifacio', userPhone: '0919-555-4444', courtName: 'Court Alpha', date: '2024-03-18', time: '02:00 PM', duration: '90 min', status: 'Confirmed', price: 900 },
    { id: 'BK-004', userName: 'Melchora Aquino', userPhone: '0920-111-2222', courtName: 'Court Gamma', date: '2024-03-19', time: '10:00 AM', duration: '120 min', status: 'Cancelled', price: 1200 },
    { id: 'BK-005', userName: 'Emilio Aguinaldo', userPhone: '0921-777-6666', courtName: 'Court Beta', date: '2024-03-19', time: '04:00 PM', duration: '60 min', status: 'Pending', price: 600 },
];

const BookingsAdmin: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2">Court Bookings</h1>
                    <p className="text-slate-500 font-medium tracking-tight">Administrative control for court reservations.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">
                        <Download size={18} /> Export Data
                    </button>
                    <button className="px-8 py-4 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-xl shadow-amber-200 active:scale-95">
                        New Booking
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, ID or court..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-6 py-4 bg-slate-50 border border-transparent rounded-[20px] focus:bg-white focus:border-amber-200 outline-none transition-all font-medium"
                    />
                </div>
                <div className="flex gap-4">
                    <button className="flex items-center gap-2 px-6 py-4 bg-slate-50 border border-transparent rounded-[20px] text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-white hover:border-slate-200 transition-all">
                        <Calendar size={18} /> Date Range
                    </button>
                    <button className="flex items-center gap-2 px-6 py-4 bg-slate-50 border border-transparent rounded-[20px] text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-white hover:border-slate-200 transition-all">
                        <Filter size={18} /> All Courts
                    </button>
                </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Reference</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">User Details</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Court & Schedule</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Price</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Status</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {MOCK_BOOKINGS.filter(b => b.userName.toLowerCase().includes(searchQuery.toLowerCase()) || b.courtName.toLowerCase().includes(searchQuery.toLowerCase())).map((booking) => (
                                <tr key={booking.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-6 text-sm font-black text-slate-900 tracking-tighter uppercase">{booking.id}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400"><User size={20} /></div>
                                            <div>
                                                <p className="font-black text-slate-900 tracking-tight uppercase">{booking.userName}</p>
                                                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Phone size={10} /> {booking.userPhone}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="space-y-1">
                                            <p className="font-black text-slate-900 tracking-tight flex items-center gap-2 uppercase">
                                                <MapPin size={12} className="text-amber-500" /> {booking.courtName}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                {new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} • {booking.time} ({booking.duration})
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center font-black text-slate-900 tracking-tighter">₱{booking.price}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-center">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${booking.status === 'Confirmed' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' :
                                                    booking.status === 'Pending' ? 'bg-amber-50 border-amber-100 text-amber-600' :
                                                        'bg-rose-50 border-rose-100 text-rose-600'
                                                }`}>
                                                {booking.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" title="Confirm"><CheckCircle size={20} /></button>
                                            <button className="p-2 text-slate-400 hover:text-rose-500 transition-colors" title="Cancel"><XCircle size={20} /></button>
                                            <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><MoreHorizontal size={20} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BookingsAdmin;
