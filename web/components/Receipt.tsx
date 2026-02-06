import React, { useRef, useEffect, useState } from 'react';
import { X, Printer, Download, CheckCircle2, QrCode } from 'lucide-react';
import QRCodeLib from 'qrcode';

interface ReceiptProps {
    bookingData: {
        id: string;
        courtName: string;
        courtLocation: string;
        date: string;
        startTime: string;
        endTime: string;
        pricePerHour: number;
        totalPrice: number;
        playerName?: string;
        ownerName?: string;
    };
    onClose: () => void;
}

const Receipt: React.FC<ReceiptProps> = ({ bookingData, onClose }) => {
    const receiptRef = useRef<HTMLDivElement>(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

    // Generate QR code on mount
    useEffect(() => {
        const generateQRCode = async () => {
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
                    width: 200,
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

    const handleDownload = () => {
        // Simple download as HTML - for PDF we'd need a library like jsPDF
        const receiptContent = receiptRef.current?.innerHTML || '';
        const blob = new Blob([`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${bookingData.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .receipt { max-width: 600px; margin: 0 auto; }
          </style>
        </head>
        <body>
          ${receiptContent}
        </body>
      </html>
    `], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${bookingData.id}.html`;
        a.click();
        URL.revokeObjectURL(url);
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
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 || 12;
        return `${displayHour}:${minutes} ${period}`;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header - Hidden when printing */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <CheckCircle2 className="text-emerald-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Booking Confirmed</h2>
                            <p className="text-xs text-slate-500 font-medium">Your receipt is ready</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                        <X size={20} className="text-slate-600" />
                    </button>
                </div>

                {/* Receipt Content */}
                <div ref={receiptRef} className="p-8">
                    {/* Receipt Header */}
                    <div className="text-center mb-8 pb-6 border-b-2 border-dashed border-slate-200">
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">PicklePlay</h1>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Court Booking Receipt</p>
                    </div>

                    {/* Receipt Number & Date */}
                    <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-200">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Receipt No.</p>
                            <p className="text-sm font-bold text-slate-900 font-mono">#{bookingData.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Issue Date</p>
                            <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString()}</p>
                        </div>
                    </div>

                    {/* Booking Details */}
                    <div className="mb-6 pb-6 border-b border-slate-200">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Booking Details</h3>

                        <div className="space-y-3">
                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-slate-600">Court</span>
                                <span className="text-sm font-bold text-slate-900 text-right">{bookingData.courtName}</span>
                            </div>

                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-slate-600">Location</span>
                                <span className="text-sm font-bold text-slate-900 text-right max-w-xs">{bookingData.courtLocation}</span>
                            </div>

                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-slate-600">Date</span>
                                <span className="text-sm font-bold text-slate-900">{formatDate(bookingData.date)}</span>
                            </div>

                            <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-slate-600">Time</span>
                                <span className="text-sm font-bold text-slate-900">
                                    {formatTime(bookingData.startTime)} - {formatTime(bookingData.endTime)}
                                </span>
                            </div>

                            {bookingData.playerName && (
                                <div className="flex justify-between items-start">
                                    <span className="text-sm font-medium text-slate-600">Booked By</span>
                                    <span className="text-sm font-bold text-slate-900">{bookingData.playerName}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pricing */}
                    <div className="mb-6 pb-6 border-b-2 border-slate-900">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Payment Summary</h3>

                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">Hourly Rate</span>
                                <span className="text-sm font-bold text-slate-900">₱{bookingData.pricePerHour.toFixed(2)}</span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-slate-600">Duration</span>
                                <span className="text-sm font-bold text-slate-900">1 hour</span>
                            </div>
                        </div>

                        <div className="flex justify-between items-center pt-4">
                            <span className="text-lg font-black text-slate-900 uppercase">Total Amount</span>
                            <span className="text-2xl font-black text-slate-900">₱{bookingData.totalPrice.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* QR Code Section */}
                    <div className="mb-6 pb-6 border-b border-slate-200">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 text-center">Booking QR Code</h3>
                        <div className="flex flex-col items-center">
                            {qrCodeDataUrl ? (
                                <>
                                    <div className="bg-white p-4 rounded-2xl border-4 border-slate-900 shadow-lg mb-3">
                                        <img src={qrCodeDataUrl} alt="Booking QR Code" className="w-48 h-48" />
                                    </div>
                                    <div className="text-center bg-blue-50 rounded-xl p-3 max-w-sm">
                                        <p className="text-xs font-bold text-blue-900 mb-1">📱 Show this QR code at the court</p>
                                        <p className="text-[10px] text-blue-700">The court owner will scan this to verify your booking</p>
                                    </div>
                                </>
                            ) : (
                                <div className="w-48 h-48 bg-slate-100 rounded-2xl flex items-center justify-center">
                                    <QrCode className="text-slate-400" size={48} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center">
                        <p className="text-xs text-slate-500 font-medium mb-2">Thank you for booking with PicklePlay!</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                            For inquiries, please contact support@pickleplays.com
                        </p>
                    </div>
                </div>

                {/* Action Buttons - Hidden when printing */}
                <div className="flex gap-3 p-6 border-t border-slate-200 print:hidden">
                    <button
                        onClick={handlePrint}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
                    >
                        <Printer size={18} />
                        Print Receipt
                    </button>
                    <button
                        onClick={handleDownload}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg"
                    >
                        <Download size={18} />
                        Download
                    </button>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          ${receiptRef.current ? `
            #receipt-content,
            #receipt-content * {
              visibility: visible;
            }
            #receipt-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
          ` : ''}
        }
      `}</style>
        </div>
    );
};

export default Receipt;
