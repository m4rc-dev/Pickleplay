import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../services/supabase';
import { sendPaymentReceiptEmail } from '../../services/paymentReceiptEmail';
import {
  Banknote,
  CheckCircle2,
  ChevronDown,
  Eye,
  Loader2,
  MapPin,
  QrCode,
  RefreshCw,
  Search,
  Upload,
  User,
  X,
  XCircle,
  RefreshCw as RefreshIcon,
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  owner_id: string;
  location_id: string | null;
  payment_type: string;
  account_name: string;
  qr_code_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface LocationOption { id: string; name: string; }

interface PaymentGroup {
  id: string; // payment_id or fallback booking id
  payment_id?: string | null;
  status: 'pending' | 'verified' | 'rejected' | 'resubmit';
  payment_status?: string | null;
  payment_method?: string | null;
  reference_number?: string | null;
  proof_image_url?: string | null;
  amount: number;
  player?: any;
  court?: any;
  bookings: any[];
  created_at?: string | null;
}

const formatTimeRangeGroup = (group: PaymentGroup) => {
  if (!group.bookings?.length) return '';
  const sorted = [...group.bookings].sort((a, b) => new Date(`${a.date}T${a.start_time || '00:00:00'}`).getTime() - new Date(`${b.date}T${b.start_time || '00:00:00'}`).getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const to12h = (t?: string) => (t ? t.slice(0, 5) : '');
  if (first.date === last.date) return `${first.date} • ${to12h(first.start_time)} – ${to12h(last.end_time)}`;
  return `${first.date} ${to12h(first.start_time)} → ${last.date} ${to12h(last.end_time)}`;
};

const statusColors: Record<string, string> = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  verified: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  resubmit: 'border-blue-200 bg-blue-50 text-blue-700',
};

const Transactions: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'payments' | 'methods'>('payments');
  const [isLoading, setIsLoading] = useState(true);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [methodForm, setMethodForm] = useState({
    payment_type: 'gcash',
    account_name: '',
    location_id: '' as string,
    qr_file: null as File | null,
    qr_preview: '' as string,
  });
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [isSavingMethod, setIsSavingMethod] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payments state
  const [payments, setPayments] = useState<PaymentGroup[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'verified' | 'rejected' | 'resubmit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [proofViewUrl, setProofViewUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [resubmitReason, setResubmitReason] = useState('');

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { setIsLoading(false); return; }
      setUser(u);
      await Promise.all([
        fetchPaymentMethods(u.id),
        fetchLocations(u.id),
        fetchPayments(u.id),
      ]);
      setIsLoading(false);
    };
    init();
  }, []);

  const fetchPaymentMethods = async (ownerId: string) => {
    const { data } = await supabase
      .from('court_owner_payment_methods')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    setPaymentMethods(data || []);
  };

  const fetchLocations = async (ownerId: string) => {
    const { data } = await supabase
      .from('locations')
      .select('id, name')
      .eq('owner_id', ownerId)
      .order('name');
    setLocations(data || []);
  };

  const fetchPayments = async (ownerId: string) => {
    const { data: ownerCourts } = await supabase.from('courts').select('id').eq('owner_id', ownerId);
    const courtIds = ownerCourts?.map(c => c.id) || [];
    if (!courtIds.length) { setPayments([]); return; }

    const { data: rows, error } = await supabase
      .from('bookings')
      .select(`
        id, date, start_time, end_time, total_price, status, payment_status, payment_proof_status, payment_id, payment_method, created_at,
        payment:payments!bookings_payment_id_fkey(id, total_amount, status, payment_status, payment_method, payment_date, created_at),
        booking_payments(id, payment_type, account_name, reference_number, proof_image_url, status, created_at),
        court:courts(id, name, location:locations(id, name)),
        player:profiles!bookings_player_id_fkey(id, email, full_name, username, avatar_url)
      `)
      .in('court_id', courtIds)
      .order('date', { ascending: false });

    if (error || !rows) { setPayments([]); return; }

    const map = new Map<string, PaymentGroup>();
    rows.forEach((b: any) => {
      const latestProof = (b.booking_payments || []).sort((a: any, c: any) => new Date(c.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
      const referenceKey = latestProof?.reference_number ? `${latestProof.reference_number}:${latestProof.payment_type || ''}` : null;
      const key = b.payment_id || b.payment?.id || referenceKey || b.id;

      const existing = map.get(key) || {
        id: key,
        payment_id: b.payment_id || b.payment?.id || null,
        status: 'pending' as PaymentGroup['status'],
        payment_status: b.payment?.payment_status,
        payment_method: b.payment?.payment_method || b.payment_method,
        reference_number: latestProof?.reference_number || null,
        proof_image_url: latestProof?.proof_image_url || null,
        amount: 0,
        player: b.player,
        court: b.court,
        bookings: [],
        created_at: b.payment?.payment_date || b.created_at,
      };

      if (!existing.reference_number && latestProof?.reference_number) existing.reference_number = latestProof.reference_number;
      if (!existing.proof_image_url && latestProof?.proof_image_url) existing.proof_image_url = latestProof.proof_image_url;
      if (!existing.payment_method) existing.payment_method = latestProof?.payment_type || b.payment?.payment_method || b.payment_method;

      existing.bookings.push(b);
      existing.amount += b.total_price || 0;

      const payStatus = b.payment?.payment_status;
      const proofStatus = b.payment_proof_status;
      if (payStatus === 'paid' || proofStatus === 'payment_verified') {
        existing.status = 'verified';
        existing.payment_status = 'paid';
      } else if (proofStatus === 'payment_rejected') {
        existing.status = 'rejected';
      } else if (proofStatus === 'resubmit_requested') {
        existing.status = 'resubmit';
      } else if (payStatus === 'proof_submitted') {
        existing.status = 'pending';
        existing.payment_status = 'proof_submitted';
      }

      map.set(key, existing);
    });

    const grouped = Array.from(map.values()).map(g => {
      const matchedPayment = g.payment_id
        ? rows.find((b: any) => (b.payment_id || b.payment?.id) === g.payment_id)
        : null;
      const paymentRecord = Array.isArray(matchedPayment?.payment)
        ? matchedPayment?.payment[0]
        : matchedPayment?.payment;
      const computedAmount = paymentRecord?.total_amount ?? g.amount;
      return {
        ...g,
        amount: computedAmount,
      };
    }).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

    setPayments(grouped);
  };

  const handleQRFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    setMethodForm(prev => ({ ...prev, qr_file: file, qr_preview: previewUrl }));
  };

  const savePaymentMethod = async () => {
    if (!user) return;
    if (!methodForm.account_name.trim()) { alert('Please enter account name'); return; }
    if (!methodForm.qr_file && !editingMethod?.qr_code_url) { alert('Please upload a QR code'); return; }
    setIsSavingMethod(true);
    try {
      let qrUrl = editingMethod?.qr_code_url || '';
      if (methodForm.qr_file) {
        const filePath = `${user.id}/${Date.now()}_${methodForm.payment_type}.png`;
        const { error: uploadError } = await supabase.storage.from('payment-qr').upload(filePath, methodForm.qr_file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('payment-qr').getPublicUrl(filePath);
        qrUrl = urlData.publicUrl;
      }

      if (editingMethod) {
        await supabase
          .from('court_owner_payment_methods')
          .update({
            payment_type: methodForm.payment_type,
            account_name: methodForm.account_name.trim(),
            location_id: methodForm.location_id || null,
            qr_code_url: qrUrl,
          })
          .eq('id', editingMethod.id);
      } else {
        await supabase
          .from('court_owner_payment_methods')
          .insert({
            owner_id: user.id,
            payment_type: methodForm.payment_type,
            account_name: methodForm.account_name.trim(),
            location_id: methodForm.location_id || null,
            qr_code_url: qrUrl,
            is_active: true,
          });
      }

      setEditingMethod(null);
      setMethodForm({ payment_type: 'gcash', account_name: '', location_id: '', qr_file: null, qr_preview: '' });
      await fetchPaymentMethods(user.id);
    } catch (err: any) {
      alert(err.message || 'Save failed');
    } finally {
      setIsSavingMethod(false);
    }
  };

  const toggleMethodActive = async (method: PaymentMethod) => {
    await supabase.from('court_owner_payment_methods').update({ is_active: !method.is_active }).eq('id', method.id);
    if (user) await fetchPaymentMethods(user.id);
  };

  const deletePaymentMethod = async (method: PaymentMethod) => {
    if (!confirm('Delete this payment method?')) return;
    await supabase.from('court_owner_payment_methods').delete().eq('id', method.id);
    if (user) await fetchPaymentMethods(user.id);
  };

  const verifyPayment = async (paymentId: string) => {
    if (!user) return;
    setIsVerifying(paymentId);
    try {
      const group = payments.find(p => p.id === paymentId);
      if (!group) throw new Error('Payment not found');
      const now = new Date().toISOString();

      if (group.payment_id) {
        await supabase.from('payments').update({ status: 'verified', payment_status: 'paid', payment_date: now }).eq('id', group.payment_id);
      }
      const bookingIds = group.bookings.map(b => b.id);
      if (bookingIds.length) {
        await supabase.from('bookings').update({ status: 'confirmed', payment_status: 'paid', payment_proof_status: 'payment_verified' }).in('id', bookingIds);
        await supabase.from('booking_payments').update({ status: 'verified', updated_at: now, verified_at: now, verified_by: user.id }).in('booking_id', bookingIds);
      }

      const lead = group.bookings[0];
      if (lead?.player?.email) {
        sendPaymentReceiptEmail({
          email: lead.player.email,
          playerName: lead.player.full_name || lead.player.username || 'Player',
          courtName: lead.court?.name || 'Pickleball Court',
          locationName: lead.court?.location?.name || '',
          date: lead.date,
          startTime: lead.start_time?.slice(0, 5),
          endTime: lead.end_time?.slice(0, 5),
          totalPrice: group.amount,
          referenceId: group.payment_id || lead.id,
          paymentMethod: group.payment_method || 'cash',
        }).catch(() => {});
      }

      await fetchPayments(user.id);
    } catch (err: any) {
      alert(err.message || 'Verify failed');
    } finally {
      setIsVerifying(null);
    }
  };

  const rejectPayment = async (paymentId: string) => {
    if (!user) return;
    setIsVerifying(paymentId);
    try {
      const group = payments.find(p => p.id === paymentId);
      if (!group) throw new Error('Payment not found');
      const now = new Date().toISOString();
      if (group.payment_id) {
        await supabase.from('payments').update({ status: 'rejected', payment_status: 'unpaid', payment_date: now }).eq('id', group.payment_id);
      }
      const bookingIds = group.bookings.map(b => b.id);
      if (bookingIds.length) {
        await supabase.from('bookings').update({ payment_proof_status: 'payment_rejected', payment_status: 'unpaid' }).in('id', bookingIds);
        await supabase.from('booking_payments').update({ status: 'rejected', rejection_reason: rejectionReason || 'Payment proof not valid', updated_at: now }).in('booking_id', bookingIds);
      }
      await fetchPayments(user.id);
    } catch (err: any) {
      alert(err.message || 'Reject failed');
    } finally {
      setIsVerifying(null);
    }
  };

  const requestResubmit = async (paymentId: string) => {
    if (!user) return;
    setIsVerifying(paymentId);
    try {
      const group = payments.find(p => p.id === paymentId);
      if (!group) throw new Error('Payment not found');
      const now = new Date().toISOString();
      if (group.payment_id) {
        await supabase.from('payments').update({ status: 'pending', payment_status: 'unpaid', payment_date: now }).eq('id', group.payment_id);
      }
      const bookingIds = group.bookings.map(b => b.id);
      if (bookingIds.length) {
        await supabase.from('bookings').update({ payment_proof_status: 'resubmit_requested', payment_status: 'unpaid' }).in('id', bookingIds);
        await supabase.from('booking_payments').update({ rejection_reason: resubmitReason || 'Please resubmit correct payment proof/reference.', updated_at: now }).in('booking_id', bookingIds);
      }
      await fetchPayments(user.id);
    } catch (err: any) {
      alert(err.message || 'Resubmit failed');
    } finally {
      setIsVerifying(null);
    }
  };

  const filteredPayments = payments.filter(p => {
    if (paymentFilter !== 'all' && p.status !== paymentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const playerName = p.player?.full_name || p.player?.username || '';
      const courtName = p.court?.name || '';
      const refNum = p.reference_number || '';
      if (!playerName.toLowerCase().includes(q) && !courtName.toLowerCase().includes(q) && !refNum.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const stats = [
    { label: 'Total', count: payments.length },
    { label: 'Pending', count: payments.filter(p => p.status === 'pending').length },
    { label: 'Resubmit', count: payments.filter(p => p.status === 'resubmit').length },
    { label: 'Verified', count: payments.filter(p => p.status === 'verified').length },
    { label: 'Rejected', count: payments.filter(p => p.status === 'rejected').length },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest ${activeTab === 'payments' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>Payments</button>
          <button onClick={() => setActiveTab('methods')} className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest ${activeTab === 'methods' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>Payment Methods</button>
        </div>
        <button onClick={() => user && fetchPayments(user.id)} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600"><RefreshIcon size={14} /> Refresh</button>
      </div>

      {activeTab === 'methods' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Add / Edit Method</p>
                  <h3 className="text-lg font-black text-slate-900">QR Payments</h3>
                </div>
                <QrCode size={24} className="text-slate-300" />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500">Payment Type</label>
                  <select value={methodForm.payment_type} onChange={e => setMethodForm(prev => ({ ...prev, payment_type: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 mt-1">
                    <option value="gcash">GCash</option>
                    <option value="maya">Maya</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500">Account Name</label>
                  <input value={methodForm.account_name} onChange={e => setMethodForm(prev => ({ ...prev, account_name: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 mt-1" />
                </div>
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500">Location (optional)</label>
                  <select value={methodForm.location_id} onChange={e => setMethodForm(prev => ({ ...prev, location_id: e.target.value }))} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 mt-1">
                    <option value="">All Locations</option>
                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase text-slate-500">QR Code</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 flex items-center gap-2"><Upload size={14} /> Upload</button>
                    {methodForm.qr_preview && <img src={methodForm.qr_preview} alt="QR" className="h-14 rounded-lg border" />}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleQRFileSelect} />
                </div>
                <div className="flex gap-2">
                  <button onClick={savePaymentMethod} disabled={isSavingMethod} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-60">
                    {isSavingMethod ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Save Method
                  </button>
                  {editingMethod && (
                    <button onClick={() => { setEditingMethod(null); setMethodForm({ payment_type: 'gcash', account_name: '', location_id: '', qr_file: null, qr_preview: '' }); }} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2">
                      <X size={14} /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Your Payment Methods</p>
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {paymentMethods.map(method => (
                  <div key={method.id} className="border border-slate-200 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900 capitalize">{method.payment_type}</p>
                      <p className="text-xs text-slate-500">{method.account_name}</p>
                      {method.location_id && <p className="text-[11px] text-slate-400 flex items-center gap-1"><MapPin size={12} /> {locations.find(l => l.id === method.location_id)?.name || 'Location'}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleMethodActive(method)} className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${method.is_active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                        {method.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button onClick={() => setEditingMethod(method) || setMethodForm({ payment_type: method.payment_type, account_name: method.account_name, location_id: method.location_id || '', qr_file: null, qr_preview: method.qr_code_url })} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">Edit</button>
                      <button onClick={() => deletePaymentMethod(method)} className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-200">Delete</button>
                    </div>
                  </div>
                ))}
                {paymentMethods.length === 0 && <p className="text-sm text-slate-500">No methods yet.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payments' && (
        <div className="space-y-5">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search player, court, or reference..." className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700" />
            </div>
            <div className="flex gap-2">
              {(['all','pending','verified','rejected','resubmit'] as const).map(f => (
                <button key={f} onClick={() => setPaymentFilter(f)} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest ${paymentFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>{f === 'all' ? 'All' : f}</button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {stats.map(s => (
              <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-slate-900">{s.count}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {filteredPayments.map(payment => {
              const isExpanded = expandedPayment === payment.id;
              const player = payment.player;
              const court = payment.court;
              const location = court?.location;
              const timeLabel = formatTimeRangeGroup(payment);

              return (
                <div key={payment.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <button onClick={() => setExpandedPayment(isExpanded ? null : payment.id)} className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50/50">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden">
                      {player?.avatar_url ? <img src={player.avatar_url} alt="" className="w-full h-full object-cover" /> : <User size={18} className="text-slate-300" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{player?.full_name || player?.username || 'Player'}</p>
                      <p className="text-[10px] text-slate-400 font-medium truncate">{court?.name}{location ? ` • ${location.name}` : ''}{payment.bookings.length > 1 ? ` • ${payment.bookings.length} slots` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900">₱{payment.amount}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${statusColors[payment.status]}`}>{payment.status}</span>
                    </div>
                    <ChevronDown size={16} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date & Time</p>
                          <p className="font-bold text-slate-800 mt-0.5">{timeLabel}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Via</p>
                          <p className="font-bold text-slate-800 mt-0.5 capitalize">{payment.payment_method || 'cash'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference #</p>
                          <p className="font-bold text-slate-800 mt-0.5 font-mono">{payment.reference_number || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bookings</p>
                          <p className="font-bold text-slate-800 mt-0.5">{payment.bookings.length} slot(s)</p>
                        </div>
                      </div>

                      {payment.bookings.length > 1 && (
                        <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                          {payment.bookings.map(b => (
                            <div key={b.id} className="flex items-center justify-between text-xs">
                              <div>
                                <p className="font-bold text-slate-800">{b.date}</p>
                                <p className="text-slate-500">{b.start_time?.slice(0,5)} – {b.end_time?.slice(0,5)}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-800">₱{b.total_price}</p>
                                <p className="text-[10px] text-slate-400">{b.id.slice(0,6)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {payment.proof_image_url && (
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Proof of Payment</p>
                          <button onClick={() => setProofViewUrl(payment.proof_image_url as string)} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><Eye size={18} className="text-blue-500" /></div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700">View Receipt Image</p>
                              <p className="text-[10px] text-slate-400">Tap to view proof of payment</p>
                            </div>
                            <ChevronDown size={14} className="text-slate-300 -rotate-90" />
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {payment.status !== 'verified' && (
                          <button onClick={() => verifyPayment(payment.id)} disabled={!!isVerifying} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl disabled:opacity-60">
                            {isVerifying === payment.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Verify Payment
                          </button>
                        )}
                        {payment.status !== 'rejected' && payment.status !== 'verified' && (
                          <button onClick={() => { setExpandedPayment(payment.id); setRejectionReason(''); rejectPayment(payment.id); }} className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">
                            <XCircle size={14} /> Reject
                          </button>
                        )}
                        {payment.status !== 'verified' && (
                          <button onClick={() => { setExpandedPayment(payment.id); setResubmitReason(''); requestResubmit(payment.id); }} className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl">
                            <RefreshCw size={14} /> Request Resubmit
                          </button>
                        )}
                        {payment.proof_image_url && (
                          <button onClick={() => setProofViewUrl(payment.proof_image_url!)} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 hover:border-blue-300 text-[10px] font-black uppercase tracking-widest rounded-xl">
                            <Eye size={14} /> View Proof
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredPayments.length === 0 && (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-10 text-center text-slate-500 font-semibold">
                No payments found.
              </div>
            )}
          </div>
        </div>
      )}

      {proofViewUrl && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setProofViewUrl(null)}>
          <img src={proofViewUrl} alt="Proof" className="max-h-[80vh] max-w-[90vw] rounded-xl border border-white/20" />
        </div>
      )}
    </div>
  );
};

export default Transactions;
