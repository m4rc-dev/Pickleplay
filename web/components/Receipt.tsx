import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, CheckCircle2, QrCode, AlertCircle, Clock, Banknote } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { toPng } from 'html-to-image';

interface ReceiptProps {
    bookingData: {
        id: string;
        courtName: string;
        courtLocation: string;
        locationName?: string;
        date: string;
        startTime: string;
        endTime: string;
        pricePerHour: number;
        totalPrice: number;
        playerName?: string;
        ownerName?: string;
        status?: string;
        confirmedAt?: string;
        paymentMethod?: string;
        paymentStatus?: string;
        amountTendered?: number;
        changeAmount?: number;
    };
    onClose: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({ bookingData, onClose }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Generate QR code on mount
    useEffect(() => {
        const generateQRCode = async () => {
            if (bookingData.status !== 'confirmed') return;

            try {
                // Create verification data
                const qrData = JSON.stringify({
                    bookingId: bookingData.id,
                    courtName: bookingData.courtName,
                    date: bookingData.date,
                    startTime: bookingData.startTime,
                    timestamp: new Date().toISOString()
                });

                // Generate QR code as data URL
                const dataUrl = await QRCodeLib.toDataURL(qrData, {
                    width: 300,
                    margin: 2,
                    color: {
                        dark: '#0f172a',
                        light: '#ffffff'
                    }
                });

                setQrCodeDataUrl(dataUrl);
            } catch (error) {
                console.error('Error generating QR code:', error);
            }
        };

        generateQRCode();
    }, [bookingData]);

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        if (!receiptRef.current) return;

        setIsDownloading(true);
        try {
            // Wait a small bit for any images to load
            await new Promise(resolve => setTimeout(resolve, 500));

            const dataUrl = await toPng(receiptRef.current, {
                quality: 1,
                backgroundColor: '#ffffff',
                cacheBust: true,
                style: {
                    borderRadius: '0'
                }
            });

            const link = document.createElement('a');
            link.download = `pickleplay-receipt-${bookingData.id.slice(0, 8)}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Error saving image:', err);
            alert('Failed to save receipt as image. Please try printing or taking a screenshot.');
        } finally {
            setIsDownloading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (timeStr: string) => {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${period}`;
    };

    const isConfirmed = bookingData.status === 'confirmed';

    const modalContent = (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full my-4 relative animate-in zoom-in-95 duration-300 max-h-[92vh] flex flex-col">
                {/* Header - Hidden when printing */}
                <div className="flex items-center justify-between p-4 md:p-6 border-b border-slate-100 print:hidden shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isConfirmed ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                            {isConfirmed ? (
                                <CheckCircle2 className="text-emerald-600" size={22} />
                            ) : (
                                <Clock className="text-blue-600 animate-pulse" size={22} />
                            )}
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                                {isConfirmed ? 'Booking Confirmed' : 'Booking Pending'}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                {isConfirmed ? 'Your digital pass is ready' : 'Waiting for owner confirmation'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-all group"
                    >
                        <X size={20} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                    </button>
                </div>

                {/* Receipt Wrapper for Image Export */}
                <div id="receipt-content" className="bg-white overflow-y-auto flex-1 min-h-0">
                    <div ref={receiptRef} className="p-4 md:p-6 bg-white">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-12">
                            {/* Left Side: Booking Details */}
                            <div className="lg:col-span-7">
                                {/* Receipt Aesthetic Header */}
                                <div className="mb-4 md:mb-6 pb-3 md:pb-4 border-b-2 border-dashed border-slate-100">
                                    <div className="inline-block px-3 py-1 bg-slate-950 text-white rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] mb-2 md:mb-3">
                                        OFFICIAL RECEIPT
                                    </div>
                                    <h1 className="text-xl md:text-2xl font-black text-slate-950 uppercase tracking-tighter mb-0.5">PicklePlay</h1>
                                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Philippines Network</p>
                                </div>

                                {/* Status Banner */}
                                <div className={`mb-3 md:mb-5 p-2 md:p-3 rounded-xl border-2 text-center font-black uppercase tracking-[0.15em] text-[10px] md:text-xs ${isConfirmed
                                    ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                    : 'bg-blue-50 border-blue-100 text-blue-600'
                                    }`}>
                                    STATUS: {bookingData.status?.toUpperCase() || 'PENDING'}
                                </div>

                                {/* Receipt Info Grid */}
                                <div className="grid grid-cols-2 gap-3 md:gap-6 mb-3 md:mb-5 pb-3 md:pb-5 border-b border-slate-100">
                                    <div>
                                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest mb-1 md:mb-2">Receipt No.</p>
                                        <p className="text-sm md:text-lg font-black text-slate-900 font-mono">#{bookingData.id.slice(0, 8).toUpperCase()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest mb-1 md:mb-2">Issue Date</p>
                                        <p className="text-xs md:text-sm font-black text-slate-900 uppercase">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                </div>

                                {/* Detailed Table */}
                                <div className="space-y-4 md:space-y-6">
                                    <div className="space-y-3 md:space-y-4">
                                        <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest border-b border-slate-50 pb-2">Venue & Schedule</h3>

                                        <div className="flex justify-between items-start gap-4 md:gap-8">
                                            <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-wide">Court</span>
                                            <span className="text-xs md:text-sm font-black text-slate-900 uppercase italic text-right">{bookingData.courtName}</span>
                                        </div>

                                        {bookingData.locationName && (
                                            <div className="flex justify-between items-start gap-4 md:gap-8">
                                                <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-wide">Venue</span>
                                                <span className="text-xs md:text-sm font-black text-slate-900 uppercase text-right max-w-[180px] md:max-w-[240px] leading-tight">{bookingData.locationName}</span>
                                            </div>
                                        )}

                                        <div className="flex justify-between items-start gap-4 md:gap-8">
                                            <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-wide">Address</span>
                                            <span className="text-xs md:text-sm font-black text-slate-900 uppercase text-right max-w-[180px] md:max-w-[240px] leading-tight">{bookingData.courtLocation}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-wide">Date</span>
                                            <span className="text-xs md:text-sm font-black text-slate-900 uppercase">{formatDate(bookingData.date)}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-wide">Time Slot</span>
                                            <span className="text-xs md:text-sm font-black text-blue-600 bg-blue-50 px-2 md:px-3 py-0.5 md:py-1 rounded-lg uppercase">
                                                {formatTime(bookingData.startTime)} - {formatTime(bookingData.endTime)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="pt-4 md:pt-6 space-y-3 md:space-y-4 border-t border-slate-100">
                                        <h3 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest border-b border-slate-50 pb-2">Financials</h3>

                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-wide">Player</span>
                                            <span className="text-xs md:text-sm font-black text-slate-900 uppercase">{bookingData.playerName || 'Guest'}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-wide">Rate / HR</span>
                                            <span className="text-xs md:text-sm font-black text-slate-900 uppercase">{bookingData.pricePerHour > 0 ? `₱${bookingData.pricePerHour.toFixed(2)}` : 'FREE'}</span>
                                        </div>

                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-wide">Payment Method</span>
                                            <span className="text-xs md:text-sm font-black text-slate-900 uppercase flex items-center gap-1.5">
                                                <Banknote size={12} className="md:w-[14px] md:h-[14px] text-slate-400" />
                                                {bookingData.paymentMethod || 'Cash'}
                                            </span>
                                        </div>

                                        <div className="pt-3 md:pt-4 border-t-2 border-slate-950 flex justify-between items-center">
                                            <div className="space-y-1">
                                                <span className="text-base md:text-lg font-black text-slate-950 uppercase tracking-tighter">TOTAL AMOUNT</span>
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${bookingData.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                                        }`}>
                                                        {bookingData.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-2xl md:text-3xl font-black text-slate-950 tracking-tighter">{bookingData.totalPrice > 0 ? `₱${bookingData.totalPrice.toFixed(2)}` : 'FREE'}</span>
                                        </div>

                                        {bookingData.paymentStatus === 'paid' && bookingData.paymentMethod?.toLowerCase() === 'cash' && bookingData.amountTendered !== undefined && (
                                            <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                                                <div className="flex justify-between items-center opacity-60">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase">Cash Received</span>
                                                    <span className="text-xs font-black text-slate-900">₱{bookingData.amountTendered.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[10px] font-black text-blue-600 uppercase">Change Returned</span>
                                                    <span className="text-sm font-black text-blue-600">₱{(bookingData.changeAmount || 0).toFixed(2)}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: QR Pass */}
                            <div className="lg:col-span-5 flex flex-col">
                                <div className={`flex-1 p-4 md:p-8 rounded-3xl md:rounded-[40px] flex flex-col items-center justify-center relative overflow-hidden transition-all duration-700 ${isConfirmed ? 'bg-slate-50 border-2 border-slate-900' : 'bg-slate-50 border-2 border-dashed border-slate-200 opacity-80'
                                    }`}>

                                    {/* Confirmation/Submission Stamp */}
                                    <div className="absolute top-3 md:top-6 right-3 md:right-6 -rotate-12 pointer-events-none opacity-20">
                                        <div className={`border-2 md:border-4 ${isConfirmed ? 'border-emerald-600 text-emerald-600' : 'border-blue-600 text-blue-600'} px-2 md:px-4 py-1 md:py-2 rounded-lg md:rounded-xl`}>
                                            <p className="text-[8px] md:text-[10px] font-black uppercase tracking-wider md:tracking-widest text-center leading-none">
                                                {isConfirmed ? 'Confirmed' : 'Submitted'}
                                            </p>
                                            <p className="text-[7px] md:text-[8px] font-bold mt-0.5 md:mt-1 uppercase text-center">
                                                {bookingData.confirmedAt
                                                    ? new Date(bookingData.confirmedAt).toLocaleDateString()
                                                    : new Date().toLocaleDateString()
                                                }
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4 md:mb-8 text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-400">
                                        <QrCode size={12} className={`md:w-[14px] md:h-[14px] ${isConfirmed ? 'text-slate-950' : 'text-slate-300'}`} />
                                        Digital Check-in Pass
                                    </div>

                                    {isConfirmed ? (
                                        <div className="p-3 md:p-4 bg-white rounded-2xl md:rounded-3xl shadow-2xl border-2 md:border-3 border-slate-950 mb-3 md:mb-5 transform hover:scale-105 transition-transform duration-500">
                                            <img src={qrCodeDataUrl} alt="Booking QR Code" className="w-32 h-32 md:w-40 md:h-40" />
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 md:w-40 md:h-40 bg-white/50 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center border-2 md:border-3 border-dashed border-slate-200 mb-3 md:mb-5 relative overflow-hidden group">
                                            <QrCode className="text-slate-200 group-hover:scale-110 transition-transform duration-500" size={60} />
                                            <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] flex items-center justify-center p-4 md:p-8 text-center text-balance">
                                                <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase leading-relaxed tracking-widest">
                                                    Locked Until Confirmation
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className={`text-center max-w-sm p-3 md:p-5 rounded-2xl md:rounded-3xl ${isConfirmed ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'bg-slate-100/80 text-slate-400'}`}>
                                        {isConfirmed ? (
                                            <>
                                                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest mb-1">Pass Activated</p>
                                                <p className="text-[9px] md:text-[10px] font-bold opacity-80 leading-relaxed uppercase">Present this QR code to the court manager upon arrival.</p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[10px] md:text-xs font-black uppercase tracking-widest mb-1">Pass Pending</p>
                                                <p className="text-[9px] md:text-[10px] font-bold opacity-80 leading-relaxed uppercase">Your QR code will generate once the owner confirms your booking.</p>
                                            </>
                                        )}
                                    </div>

                                    {/* Confirmation Timestamp Footnote */}
                                    <div className="mt-4 md:mt-8 pt-4 md:pt-8 border-t border-slate-200/50 w-full text-center">
                                        <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider md:tracking-widest mb-1">Confirmation Details</p>
                                        <p className="text-[8px] md:text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                            {isConfirmed
                                                ? `Verified at ${new Date(bookingData.confirmedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })} • ${new Date(bookingData.confirmedAt || Date.now()).toLocaleDateString()}`
                                                : 'Awaiting Verification'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Verification Note */}
                        <div className="mt-4 md:mt-6 text-center space-y-1 border-t border-slate-50 pt-3 md:pt-4">
                            <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] md:tracking-[0.3em]">Verified Secure Transaction • 2026</p>
                            <p className="text-[7px] md:text-[8px] text-slate-300 font-bold uppercase tracking-wider md:tracking-widest">PicklePlay Philippines • www.pickleplay.ph</p>
                        </div>
                    </div>
                </div>

                {/* Desktop Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 p-3 md:p-5 border-t border-slate-100 print:hidden bg-slate-50/50 rounded-b-3xl shrink-0">
                    <button
                        onClick={handlePrint}
                        className="flex-1 h-12 md:h-14 bg-white border-2 border-slate-900 text-slate-900 rounded-2xl md:rounded-[20px] font-black text-xs md:text-sm uppercase tracking-wide md:tracking-widest hover:bg-slate-950 hover:text-white transition-all shadow-xl shadow-slate-200/50 flex items-center justify-center gap-2 active:scale-95"
                    >
                        <Printer size={18} className="md:w-4 md:h-4" />
                        Print Order
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex-1 h-12 md:h-14 bg-blue-600 text-white rounded-2xl md:rounded-[20px] font-black text-xs md:text-sm uppercase tracking-wide md:tracking-widest hover:bg-slate-950 transition-all shadow-xl shadow-blue-200/50 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
                    >
                        {isDownloading ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Download size={18} className="md:w-4 md:h-4" />
                                Export Pass
                            </>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 h-12 md:h-14 bg-slate-900 text-white rounded-2xl md:rounded-[20px] font-black text-xs md:text-sm uppercase tracking-wide md:tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-200/50 flex items-center justify-center gap-2 active:scale-95"
                    >
                        Done
                    </button>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #receipt-content, #receipt-content * { 
                        visibility: visible; 
                        box-shadow: none !important; 
                        border: none !important;
                    }
                    #receipt-content {
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100%;
                        background: white !important;
                    }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );

    if (!mounted) return null;

    return createPortal(modalContent, document.body);
};

export default Receipt;
