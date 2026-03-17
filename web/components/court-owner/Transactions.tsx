import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../services/supabase';
import {
  CreditCard, QrCode, Upload, Trash2, CheckCircle2, XCircle, Clock, Eye,
  ChevronDown, Loader2, Plus, Pencil,
  Banknote, Search, X, Check, Ban, RefreshCw, User, MapPin
} from 'lucide-react';
import { sendPaymentReceiptEmail } from '../../services/paymentReceiptEmail';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────
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

const PREDEFINED_PAYMENT_TYPES = [
  { id: 'gcash', name: 'GCash', tag: 'Globe FinTech', color: 'bg-blue-600', borderColor: 'border-blue-500', activeBg: 'bg-blue-50', icon: 'G', logo: '/images/bank_logos/gcash.jpg' },
  { id: 'maya', name: 'Maya', tag: 'PayMaya', color: 'bg-green-600', borderColor: 'border-green-500', activeBg: 'bg-green-50', icon: 'M', logo: '/images/bank_logos/maya.jpg' },
  { id: 'bdo', name: 'BDO', tag: 'Banco De Oro', color: 'bg-blue-800', borderColor: 'border-blue-800', activeBg: 'bg-blue-50', icon: 'B', logo: '/images/bank_logos/bdo.jpg' },
  { id: 'bpi', name: 'BPI', tag: 'Bank of the PI', color: 'bg-red-700', borderColor: 'border-red-700', activeBg: 'bg-red-50', icon: 'B', logo: '/images/bank_logos/bpi.jpg' },
  { id: 'unionbank', name: 'UnionBank', tag: 'Union Bank', color: 'bg-orange-600', borderColor: 'border-orange-500', activeBg: 'bg-orange-50', icon: 'U', logo: '/images/bank_logos/union.jpg' },
  { id: 'other', name: 'Other Bank', tag: 'Custom Bank', color: 'bg-slate-700', borderColor: 'border-slate-700', activeBg: 'bg-slate-50', icon: '🏦', logo: null }
];

export const getPaymentTypeDetails = (typeId: string) => {
  const predefined = PREDEFINED_PAYMENT_TYPES.find(t => t.id === typeId);
  if (predefined) return predefined;
  return { 
    id: typeId, 
    name: typeId, 
    tag: 'Custom Bank', 
    color: 'bg-slate-700', 
    borderColor: 'border-slate-700', 
    activeBg: 'bg-slate-50', 
    icon: typeId.charAt(0).toUpperCase(),
    logo: null
  };
};

interface BookingPayment {
  id: string;
  booking_id: string;
  player_id: string;
  payment_type: string;
  account_name: string | null;
  reference_number: string | null;
  proof_image_url: string | null;
  amount: number;
  status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  booking?: any;
  player?: any;
}

interface LocationOption {
  id: string;
  name: string;
}

// ────────────────────────────────────────────────────────────────
// QR Code Auto-Crop Utility
// ────────────────────────────────────────────────────────────────
function autoCropQR(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      let minX = img.width, minY = img.height, maxX = 0, maxY = 0;
      const threshold = 240;

      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const i = (y * img.width + x) * 4;
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 50 || (r > threshold && g > threshold && b > threshold)) continue;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      if (maxX <= minX || maxY <= minY) {
        const size = Math.min(img.width, img.height);
        const ox = (img.width - size) / 2;
        const oy = (img.height - size) / 2;
        minX = ox; minY = oy; maxX = ox + size; maxY = oy + size;
      }

      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const pad = Math.max(contentW, contentH) * 0.05;
      const cropX = Math.max(0, minX - pad);
      const cropY = Math.max(0, minY - pad);
      const cropW = Math.min(img.width - cropX, contentW + pad * 2);
      const cropH = Math.min(img.height - cropY, contentH + pad * 2);

      const squareSize = Math.max(cropW, cropH);
      const finalX = cropX - (squareSize - cropW) / 2;
      const finalY = cropY - (squareSize - cropH) / 2;

      const outSize = Math.min(squareSize, 600);
      const outCanvas = document.createElement('canvas');
      outCanvas.width = outSize;
      outCanvas.height = outSize;
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) { reject(new Error('Canvas not supported')); return; }

      outCtx.fillStyle = '#FFFFFF';
      outCtx.fillRect(0, 0, outSize, outSize);

      outCtx.drawImage(
        img,
        Math.max(0, finalX), Math.max(0, finalY), squareSize, squareSize,
        0, 0, outSize, outSize
      );

      outCanvas.toBlob(
        (blob) => { if (blob) resolve(blob); else reject(new Error('Failed to create blob')); },
        'image/png', 0.95
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

// ────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────
const Transactions: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'payments' | 'methods'>('payments');

  // Payment Methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodForm, setMethodForm] = useState({
    payment_type: 'gcash',
    custom_bank_name: '',
    account_name: '',
    location_id: '' as string,
    qr_file: null as File | null,
    qr_preview: '' as string,
    is_cropping: false,
  });
  const [isSavingMethod, setIsSavingMethod] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Transactions / Payments
  const [payments, setPayments] = useState<BookingPayment[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null);
  const [proofViewUrl, setProofViewUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  // ──────── Init ────────
  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (u) {
        setUser(u);
        await Promise.all([
          fetchPaymentMethods(u.id),
          fetchLocations(u.id),
          fetchPayments(u.id),
        ]);
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const fetchPaymentMethods = async (ownerId: string) => {
    const { data, error } = await supabase
      .from('court_owner_payment_methods')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });
    if (!error && data) setPaymentMethods(data);
  };

  const fetchLocations = async (ownerId: string) => {
    const { data, error } = await supabase
      .from('locations')
      .select('id, name')
      .eq('owner_id', ownerId)
      .order('name');
    if (!error && data) setLocations(data);
  };

  const fetchPayments = async (ownerId: string) => {
    const { data: ownerCourts } = await supabase
      .from('courts')
      .select('id')
      .eq('owner_id', ownerId);
    const courtIds = ownerCourts?.map(c => c.id) || [];
    if (courtIds.length === 0) { setPayments([]); return; }

    // Get bookings for owner's courts
    const { data: ownerBookings } = await supabase
      .from('bookings')
      .select('id')
      .in('court_id', courtIds);
    const bookingIds = ownerBookings?.map((b: any) => b.id) || [];
    if (bookingIds.length === 0) { setPayments([]); return; }

    const { data, error } = await supabase
      .from('booking_payments')
      .select(`
        *,
        booking:bookings(
          id, date, start_time, end_time, total_price, status, payment_status, payment_proof_status,
          court:courts(id, name, location_id,
            location:locations(id, name)
          ),
          player:profiles!bookings_player_id_fkey(id, email, full_name, username, avatar_url)
        )
      `)
      .in('booking_id', bookingIds)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const normalized = (data as any[]).map((p) => {
        const booking = p.booking;
        const bookingPaymentStatus = booking?.payment_status;
        const bookingProofStatus = booking?.payment_proof_status;

        let normalizedStatus = p.status;
        if (bookingPaymentStatus === 'paid' || bookingProofStatus === 'payment_verified') {
          normalizedStatus = 'verified';
        } else if (bookingProofStatus === 'payment_rejected') {
          normalizedStatus = 'rejected';
        }

        return {
          ...p,
          status: normalizedStatus,
        };
      });

      setPayments(normalized as any);
    }
  };

  // ──────── Handle QR File Select with Auto-Crop ────────
  const handleQRFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMethodForm(prev => ({ ...prev, is_cropping: true }));

    try {
      const croppedBlob = await autoCropQR(file);
      const croppedFile = new File([croppedBlob], `qr_${Date.now()}.png`, { type: 'image/png' });
      const previewUrl = URL.createObjectURL(croppedBlob);
      setMethodForm(prev => ({ ...prev, qr_file: croppedFile, qr_preview: previewUrl, is_cropping: false }));
    } catch (err) {
      console.error('QR crop failed:', err);
      const previewUrl = URL.createObjectURL(file);
      setMethodForm(prev => ({ ...prev, qr_file: file, qr_preview: previewUrl, is_cropping: false }));
    }
  };

  // ──────── Save Payment Method ────────
  const savePaymentMethod = async () => {
    if (!user) return;
    
    let finalPaymentType = methodForm.payment_type;
    if (finalPaymentType === 'other') {
      if (!methodForm.custom_bank_name.trim()) { alert('Please enter the custom bank name.'); return; }
      finalPaymentType = methodForm.custom_bank_name.trim();
    }
    
    if (!methodForm.account_name.trim()) { alert('Please enter the account name.'); return; }
    if (!methodForm.qr_file && !editingMethod?.qr_code_url) { alert('Please upload a QR code image.'); return; }

    setIsSavingMethod(true);
    try {
      let qrUrl = editingMethod?.qr_code_url || '';

      if (methodForm.qr_file) {
        const filePath = `${user.id}/${Date.now()}_${finalPaymentType}.png`;
        const { error: uploadError } = await supabase.storage
          .from('payment-qr')
          .upload(filePath, methodForm.qr_file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('payment-qr').getPublicUrl(filePath);
        qrUrl = urlData.publicUrl;
      }

      if (editingMethod) {
        const { error } = await supabase
          .from('court_owner_payment_methods')
          .update({
            payment_type: finalPaymentType,
            account_name: methodForm.account_name.trim(),
            location_id: methodForm.location_id || null,
            qr_code_url: qrUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingMethod.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('court_owner_payment_methods')
          .insert({
            owner_id: user.id,
            payment_type: finalPaymentType,
            account_name: methodForm.account_name.trim(),
            location_id: methodForm.location_id || null,
            qr_code_url: qrUrl,
            is_active: true,
          });
        if (error) throw error;
      }

      resetMethodForm();
      await fetchPaymentMethods(user.id);
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setIsSavingMethod(false);
    }
  };

  const deletePaymentMethod = async (method: PaymentMethod) => {
    if (!confirm(`Delete ${method.payment_type.toUpperCase()} payment method for "${method.account_name}"?`)) return;
    const { error } = await supabase.from('court_owner_payment_methods').delete().eq('id', method.id);
    if (error) alert(`Delete failed: ${error.message}`);
    else if (user) await fetchPaymentMethods(user.id);
  };

  const toggleMethodActive = async (method: PaymentMethod) => {
    const { error } = await supabase
      .from('court_owner_payment_methods')
      .update({ is_active: !method.is_active, updated_at: new Date().toISOString() })
      .eq('id', method.id);
    if (!error && user) await fetchPaymentMethods(user.id);
  };

  // ──────── Verify Payment ────────
  const verifyPayment = async (paymentId: string) => {
    if (!user) return;
    setIsVerifying(paymentId);
    try {
      const payment = payments.find(p => p.id === paymentId);

      const { error: paymentError } = await supabase
        .from('booking_payments')
        .update({ status: 'verified', verified_by: user.id, verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', paymentId);
      if (paymentError) throw paymentError;

      if (payment) {
        await supabase
          .from('booking_payments')
          .update({ status: 'verified', verified_by: user.id, verified_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('booking_id', payment.booking_id)
          .in('status', ['pending', 'submitted']);

        await supabase.from('bookings').update({ status: 'confirmed', payment_status: 'paid', payment_proof_status: 'payment_verified' }).eq('id', payment.booking_id);

        // Send payment receipt email
        const bk = payment.booking;
        // console.log('DEBUG: verifyPayment triggered. Booking data:', bk);
        
        if (bk && bk.player?.email) {
          // console.log('DEBUG: Sending receipt email to:', bk.player.email);
          sendPaymentReceiptEmail({
            email: bk.player.email,
            playerName: bk.player.full_name || bk.player.username || 'Player',
            courtName: bk.court?.name || 'Pickleball Court',
            locationName: bk.court?.location?.name || '',
            date: bk.date,
            startTime: bk.start_time.slice(0, 5),
            endTime: bk.end_time.slice(0, 5),
            totalPrice: payment.amount,
            referenceId: payment.booking_id,
            paymentMethod: payment.payment_type
          }).then(res => {
            if (!res.success) {
              console.error('DEBUG: Receipt email service reported failure:', res.error);
            }
          }).catch(err => console.error('DEBUG: Unexpected catch in email service call:', err));
        } else {
          console.warn('DEBUG: Cannot send email - player email missing or booking data incomplete', bk);
        }
      }

      await fetchPayments(user.id);
    } catch (err: any) {
      alert(`Verify failed: ${err.message}`);
    } finally {
      setIsVerifying(null);
    }
  };

  // ──────── Reject Payment ────────
  const rejectPayment = async (paymentId: string) => {
    if (!user) return;
    setIsVerifying(paymentId);
    try {
      const { error: paymentError } = await supabase
        .from('booking_payments')
        .update({
          status: 'rejected', verified_by: user.id, verified_at: new Date().toISOString(),
          rejection_reason: rejectionReason || 'Payment proof not valid', updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
      if (paymentError) throw paymentError;

      const payment = payments.find(p => p.id === paymentId);
      if (payment) {
        await supabase.from('bookings').update({ payment_proof_status: 'payment_rejected' }).eq('id', payment.booking_id);
      }

      setShowRejectModal(null);
      setRejectionReason('');
      await fetchPayments(user.id);
    } catch (err: any) {
      alert(`Reject failed: ${err.message}`);
    } finally {
      setIsVerifying(null);
    }
  };

  const resetMethodForm = () => {
    setShowAddMethod(false);
    setEditingMethod(null);
    setMethodForm({ payment_type: 'gcash', custom_bank_name: '', account_name: '', location_id: '', qr_file: null, qr_preview: '', is_cropping: false });
  };

  const openEditMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    const isPredefined = PREDEFINED_PAYMENT_TYPES.some(t => t.id === method.payment_type && t.id !== 'other');
    setMethodForm({
      payment_type: isPredefined ? method.payment_type : 'other',
      custom_bank_name: isPredefined ? '' : method.payment_type,
      account_name: method.account_name,
      location_id: method.location_id || '', qr_file: null, qr_preview: method.qr_code_url, is_cropping: false,
    });
    setShowAddMethod(true);
  };

  const filteredPayments = payments.filter(p => {
    if (paymentFilter !== 'all' && p.status !== paymentFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const playerName = p.booking?.player?.full_name || p.booking?.player?.username || '';
      const courtName = p.booking?.court?.name || '';
      const refNum = p.reference_number || '';
      if (!playerName.toLowerCase().includes(q) && !courtName.toLowerCase().includes(q) && !refNum.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const statusColors: Record<string, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-50 text-red-700 border-red-200',
  };
  const statusIcons: Record<string, React.ReactNode> = {
    pending: <Clock size={12} />, verified: <CheckCircle2 size={12} />, rejected: <XCircle size={12} />,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Transactions</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">Manage payment methods & view received payments</p>
        </div>
        <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'payments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Banknote size={14} className="inline mr-1.5 -mt-0.5" /> Payments
          </button>
          <button
            onClick={() => setActiveTab('methods')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'methods' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <QrCode size={14} className="inline mr-1.5 -mt-0.5" /> QR Payments
          </button>
        </div>
      </div>

      {/* ═══ TAB: Payment Methods / QR Setup ═══ */}
      {activeTab === 'methods' && (
        <div className="space-y-6">
          {showAddMethod ? (
            <div className="bg-white p-6 md:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-900">{editingMethod ? 'Edit' : 'Add'} Payment QR</h2>
                <button onClick={resetMethodForm} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X size={18} className="text-slate-400" />
                </button>
              </div>

              {/* Payment Type */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Payment Type</label>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {PREDEFINED_PAYMENT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setMethodForm(prev => ({ ...prev, payment_type: type.id }))}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                        methodForm.payment_type === type.id
                          ? `${type.activeBg} ${type.borderColor}`
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${type.color}`}>
                        {type.logo ? (
                          <img src={type.logo} alt={type.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-black text-sm">{type.icon}</span>
                        )}
                      </div>
                      <div className="text-left min-w-0 pr-1 flex-1">
                        <p className="text-sm font-bold text-slate-900 truncate">{type.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{type.tag}</p>
                      </div>
                      {methodForm.payment_type === type.id && (
                        <CheckCircle2 size={18} className={`shrink-0 ${type.color.replace('bg-', 'text-')} ml-auto`} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {methodForm.payment_type === 'other' && (
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Custom Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Metrobank, RCBC, Security Bank"
                    value={methodForm.custom_bank_name}
                    onChange={e => setMethodForm(prev => ({ ...prev, custom_bank_name: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                  />
                </div>
              )}

              {/* Location */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Assign to Location (Optional)</label>
                <select
                  value={methodForm.location_id}
                  onChange={e => setMethodForm(prev => ({ ...prev, location_id: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                >
                  <option value="">All Locations (Global)</option>
                  {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                </select>
              </div>

              {/* Account Name */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Account Name</label>
                <input
                  type="text"
                  placeholder="e.g. Juan Dela Cruz"
                  value={methodForm.account_name}
                  onChange={e => setMethodForm(prev => ({ ...prev, account_name: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                />
              </div>

              {/* QR Code Upload */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">QR Code Image</label>
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full md:w-1/2 aspect-square max-w-[280px] border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  >
                    {methodForm.is_cropping ? (
                      <>
                        <Loader2 size={24} className="animate-spin text-blue-500" />
                        <p className="text-xs font-bold text-blue-600">Auto-cropping QR...</p>
                      </>
                    ) : methodForm.qr_preview ? (
                      <img src={methodForm.qr_preview} alt="QR Preview" className="w-full h-full object-contain rounded-xl p-2" />
                    ) : (
                      <>
                        <Upload size={24} className="text-slate-300" />
                        <p className="text-xs font-bold text-slate-400">Click to upload QR</p>
                        <p className="text-[10px] text-slate-300">Auto-crops the QR square</p>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleQRFileSelect} />

                  {methodForm.qr_preview && (
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Preview Display</p>
                      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 max-w-[260px]">
                        <div className="flex items-center gap-2 mb-3">
                          {(() => {
                            const details = getPaymentTypeDetails(methodForm.payment_type === 'other' && methodForm.custom_bank_name ? methodForm.custom_bank_name.trim() : methodForm.payment_type);
                            return (
                              <>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${details.color}`}>
                                  {details.logo ? (
                                    <img src={details.logo} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-white font-black text-xs">{details.icon}</span>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1 pr-1">
                                  <p className="text-xs font-black text-slate-900 truncate">{details.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium truncate">{methodForm.account_name || 'Account Name'}</p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        <div className="bg-white rounded-xl border border-slate-100 p-2">
                          <img src={methodForm.qr_preview} alt="QR" className="w-full aspect-square object-contain" />
                        </div>
                        <p className="text-[9px] text-slate-300 text-center mt-2 font-bold uppercase tracking-widest">Scan to Pay</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save */}
              <div className="flex gap-3">
                <button onClick={resetMethodForm} className="px-6 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm hover:bg-slate-200 transition-all">Cancel</button>
                <button
                  onClick={savePaymentMethod}
                  disabled={isSavingMethod}
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-200/50 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSavingMethod ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {editingMethod ? 'Update' : 'Save'} Payment Method
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddMethod(true)}
              className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-bold text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={18} /> Add Payment QR Code
            </button>
          )}

          {/* Existing Methods */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paymentMethods.map(method => {
              const locName = locations.find(l => l.id === method.location_id)?.name;
              const details = getPaymentTypeDetails(method.payment_type);
              return (
                <div key={method.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${method.is_active ? 'border-slate-100' : 'border-slate-100 opacity-60'}`}>
                  <div className="bg-slate-50 p-4 flex items-center justify-center">
                    <div className="w-40 h-40 bg-white rounded-xl border border-slate-100 p-2 shadow-sm">
                      <img src={method.qr_code_url} alt="QR Code" className="w-full h-full object-contain" />
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${details.color}`}>
                        {details.logo ? (
                          <img src={details.logo} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-white font-black text-xs">{details.icon}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <p className="text-sm font-bold text-slate-900 truncate">{method.account_name}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{details.name}</p>
                      </div>
                      <div className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${method.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                        {method.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                    {locName && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                        <MapPin size={10} /> {locName}
                      </div>
                    )}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button onClick={() => openEditMethod(method)} className="flex-1 py-2 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-all flex items-center justify-center gap-1">
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => toggleMethodActive(method)}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${method.is_active ? 'text-amber-600 bg-amber-50 hover:bg-amber-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}
                      >
                        {method.is_active ? <><Ban size={12} /> Disable</> : <><Check size={12} /> Enable</>}
                      </button>
                      <button onClick={() => deletePaymentMethod(method)} className="py-2 px-3 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {paymentMethods.length === 0 && !showAddMethod && (
            <div className="text-center py-16 bg-white rounded-[32px] border border-slate-100">
              <QrCode size={48} className="text-slate-200 mx-auto mb-4" />
              <h3 className="text-lg font-black text-slate-900 mb-1">No Payment Methods</h3>
              <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto">
                Add your GCash or Maya QR code so players can pay when booking your courts.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: Received Payments / Transactions ═══ */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                type="text"
                placeholder="Search player, court, or reference..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-medium focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'pending', 'verified', 'rejected'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPaymentFilter(f)}
                  className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentFilter === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                >
                  {f === 'all' ? 'All' : f}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Total', count: payments.length, color: 'bg-slate-900 text-white' },
              { label: 'Pending', count: payments.filter(p => p.status === 'pending').length, color: 'bg-amber-50 text-amber-700' },
              { label: 'Verified', count: payments.filter(p => p.status === 'verified').length, color: 'bg-emerald-50 text-emerald-700' },
              { label: 'Rejected', count: payments.filter(p => p.status === 'rejected').length, color: 'bg-red-50 text-red-700' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.color} rounded-2xl p-4 text-center`}>
                <p className="text-2xl font-black">{stat.count}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button onClick={() => user && fetchPayments(user.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-colors">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {/* Payment List */}
          <div className="space-y-3">
            {filteredPayments.map(payment => {
              const isExpanded = expandedPayment === payment.id;
              const booking = payment.booking;
              const player = booking?.player;
              const court = booking?.court;
              const location = court?.location;

              return (
                <div key={payment.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all">
                  <button
                    onClick={() => setExpandedPayment(isExpanded ? null : payment.id)}
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
                      {player?.avatar_url ? (
                        <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User size={18} className="text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{player?.full_name || player?.username || 'Player'}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[10px] text-slate-400 font-medium truncate">
                          {court?.name}{location ? ` • ${location.name}` : ''}
                        </p>
                        {booking?.date && payment.created_at && booking.date > payment.created_at.slice(0, 10) && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                            Advanced
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900">₱{payment.amount}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${statusColors[payment.status]}`}>
                        {statusIcons[payment.status]} {payment.status}
                      </span>
                    </div>
                    <ChevronDown size={16} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</span>
                          <p className="font-bold text-slate-700 mt-0.5">{booking?.date}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Time</span>
                          <p className="font-bold text-slate-700 mt-0.5">{booking?.start_time?.slice(0, 5)} – {booking?.end_time?.slice(0, 5)}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment Via</span>
                          <p className="font-bold text-slate-700 mt-0.5 capitalize">{payment.payment_type}</p>
                        </div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reference #</span>
                          <p className="font-bold text-slate-700 mt-0.5 font-mono">{payment.reference_number || '—'}</p>
                        </div>
                      </div>

                      {payment.proof_image_url && (
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Proof of Payment</span>
                          <button
                            onClick={() => setProofViewUrl(payment.proof_image_url)}
                            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group w-full max-w-sm"
                          >
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                              <Eye size={18} className="text-blue-500" />
                            </div>
                            <div className="text-left flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors">View Receipt Image</p>
                              <p className="text-[10px] text-slate-400 font-medium">Tap to view proof of payment</p>
                            </div>
                            <ChevronDown size={14} className="text-slate-300 -rotate-90 group-hover:text-blue-400 transition-colors" />
                          </button>
                        </div>
                      )}

                      {payment.status === 'rejected' && payment.rejection_reason && (
                        <div className="p-3 bg-red-50 rounded-xl border border-red-100">
                          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Rejection Reason</p>
                          <p className="text-xs text-red-700 font-medium">{payment.rejection_reason}</p>
                        </div>
                      )}

                      {payment.status === 'pending' && (
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => verifyPayment(payment.id)}
                            disabled={isVerifying === payment.id}
                            className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-700 transition-all disabled:opacity-50"
                          >
                            {isVerifying === payment.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            Verify Payment
                          </button>
                          <button
                            onClick={() => setShowRejectModal(payment.id)}
                            disabled={isVerifying === payment.id}
                            className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-700 transition-all disabled:opacity-50"
                          >
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}

                      {payment.status === 'verified' && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-100">
                          <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                          <span className="text-xs font-bold text-emerald-700">Payment Verified</span>
                          {payment.verified_at && (
                            <span className="text-[10px] text-emerald-500 font-medium ml-auto">
                              {new Date(payment.verified_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Manila' })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredPayments.length === 0 && (
              <div className="text-center py-16 bg-white rounded-[32px] border border-slate-100">
                <Banknote size={48} className="text-slate-200 mx-auto mb-4" />
                <h3 className="text-lg font-black text-slate-900 mb-1">No Payments Found</h3>
                <p className="text-sm text-slate-400 font-medium">
                  {paymentFilter !== 'all' ? `No ${paymentFilter} payments` : 'Payment proofs from players will appear here.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ Proof Viewer Lightbox ═══ */}
      {proofViewUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setProofViewUrl(null)}>
          <div className="relative max-w-2xl w-full max-h-[90vh] overflow-hidden rounded-2xl bg-white" onClick={e => e.stopPropagation()}>
            <button onClick={() => setProofViewUrl(null)} className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors">
              <X size={16} />
            </button>
            <img src={proofViewUrl} alt="Payment Proof" className="w-full h-auto" />
          </div>
        </div>
      )}

      {/* ═══ Reject Modal ═══ */}
      {showRejectModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => { setShowRejectModal(null); setRejectionReason(''); }}>
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-black text-slate-900">Reject Payment</h3>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Reason (optional)</label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="e.g. Blurry screenshot, wrong amount, invalid reference..."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-medium resize-none focus:border-red-400 focus:ring-1 focus:ring-red-400 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowRejectModal(null); setRejectionReason(''); }} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-sm">Cancel</button>
              <button
                onClick={() => showRejectModal && rejectPayment(showRejectModal)}
                disabled={isVerifying !== null}
                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isVerifying ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
