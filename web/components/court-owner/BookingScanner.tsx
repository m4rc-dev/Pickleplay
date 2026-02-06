import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, QrCode, CheckCircle2, AlertCircle, Camera } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface BookingScannerProps {
    onClose: () => void;
}

interface ScannedBooking {
    bookingId: string;
    courtName: string;
    date: string;
    startTime: string;
    timestamp: string;
}

interface BookingDetails {
    id: string;
    court_id: string;
    player_id: string;
    date: string;
    start_time: string;
    end_time: string;
    total_price: number;
    status: string;
    payment_status: string;
    checked_in_at?: string;
    courts: {
        name: string;
        owner_id: string;
    };
    profiles: {
        username: string;
        full_name: string;
    };
}

const BookingScanner: React.FC<BookingScannerProps> = ({ onClose }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const isMountedRef = useRef(false);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const [scannedData, setScannedData] = useState<ScannedBooking | null>(null);
    const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);

    const onScanSuccess = async (decodedText: string) => {
        try {
            // Parse QR code data
            const data: ScannedBooking = JSON.parse(decodedText);
            setScannedData(data);

            // Stop scanner immediately
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.log('Clear error:', err));
                scannerRef.current = null;
            }

            // Stop media stream
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
                mediaStreamRef.current = null;
            }

            // Verify booking
            await verifyBooking(data.bookingId);
        } catch (err) {
            setError('Invalid QR code format');
            console.error('QR scan error:', err);
        }
    };

    const onScanError = (errorMessage: string) => {
        // Ignore scan errors (they happen frequently during scanning)
    };

    useEffect(() => {
        // Prevent double initialization
        if (isMountedRef.current || scannerRef.current) {
            return;
        }

        isMountedRef.current = true;

        // Small delay to ensure DOM is ready
        const timer = setTimeout(() => {
            const qrReaderElement = document.getElementById('qr-reader');
            if (!qrReaderElement) return;

            // Clear any existing content
            qrReaderElement.innerHTML = '';

            // Initialize scanner
            const html5QrcodeScanner = new Html5QrcodeScanner(
                'qr-reader',
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0
                },
                false
            );

            html5QrcodeScanner.render(onScanSuccess, onScanError);
            scannerRef.current = html5QrcodeScanner;

            // Capture media stream reference for cleanup
            setTimeout(() => {
                const videoElement = qrReaderElement.querySelector('video');
                if (videoElement && videoElement.srcObject) {
                    mediaStreamRef.current = videoElement.srcObject as MediaStream;
                }
            }, 500);
        }, 100);

        return () => {
            clearTimeout(timer);
            isMountedRef.current = false;

            // Stop all media stream tracks
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => {
                    track.stop();
                    console.log('Camera track stopped');
                });
                mediaStreamRef.current = null;
            }

            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.log('Scanner cleanup:', err));
                scannerRef.current = null;
            }

            // Clear DOM
            const qrReaderElement = document.getElementById('qr-reader');
            if (qrReaderElement) {
                qrReaderElement.innerHTML = '';
            }
        };
    }, []); // Empty dependency array - only run once

    const verifyBooking = async (bookingId: string) => {
        setIsVerifying(true);
        setError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Fetch booking details with court and player info
            const { data: booking, error: fetchError } = await supabase
                .from('bookings')
                .select(`
          *,
          courts!inner (
            name,
            owner_id
          ),
          profiles!inner (
            username,
            full_name
          )
        `)
                .eq('id', bookingId)
                .single();

            if (fetchError) throw new Error('Booking not found');

            // Verify court ownership
            if (booking.courts.owner_id !== user.id) {
                throw new Error('This booking is not for your court');
            }

            // Verify booking date is today or in the future
            const bookingDate = new Date(booking.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (bookingDate < today) {
                throw new Error('This booking has expired');
            }

            // Check if already checked in
            if (booking.checked_in_at) {
                throw new Error('This booking has already been checked in');
            }

            setBookingDetails(booking);
        } catch (err: any) {
            setError(err.message || 'Failed to verify booking');
            console.error('Verification error:', err);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleCheckIn = async () => {
        if (!bookingDetails) return;

        setIsVerifying(true);
        setError('');

        try {
            // Update booking with check-in timestamp
            const { error: updateError } = await supabase
                .from('bookings')
                .update({
                    checked_in_at: new Date().toISOString(),
                    status: 'confirmed'
                })
                .eq('id', bookingDetails.id);

            if (updateError) throw updateError;

            setSuccess(true);

            // Auto-close after 2 seconds
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to check in');
            console.error('Check-in error:', err);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleReset = () => {
        setScannedData(null);
        setBookingDetails(null);
        setError('');
        setSuccess(false);
        // Close and reopen the modal to restart scanner
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center">
                            <QrCode className="text-blue-600" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Scan Booking QR</h2>
                            <p className="text-xs text-slate-500 font-medium">Verify player check-in</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                    >
                        <X size={20} className="text-slate-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {!scannedData && !bookingDetails && (
                        <div>
                            <div id="qr-reader" className="rounded-2xl overflow-hidden mb-4"></div>
                            <div className="text-center bg-blue-50 rounded-xl p-4">
                                <Camera className="mx-auto text-blue-600 mb-2" size={32} />
                                <p className="text-sm font-bold text-blue-900 mb-1">Position QR code in frame</p>
                                <p className="text-xs text-blue-700">The scanner will automatically detect the code</p>
                            </div>
                        </div>
                    )}

                    {isVerifying && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-sm font-bold text-slate-900">Verifying booking...</p>
                        </div>
                    )}

                    {error && !bookingDetails && (
                        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
                            <AlertCircle className="mx-auto text-red-600 mb-3" size={48} />
                            <h3 className="text-lg font-black text-red-900 mb-2">Verification Failed</h3>
                            <p className="text-sm text-red-700 mb-4">{error}</p>
                            <button
                                onClick={handleReset}
                                className="px-6 py-3 bg-red-600 text-white rounded-2xl font-bold text-sm hover:bg-red-700 transition-all"
                            >
                                Scan Again
                            </button>
                        </div>
                    )}

                    {bookingDetails && !success && (
                        <div className="space-y-4">
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
                                <CheckCircle2 className="mx-auto text-emerald-600 mb-3" size={48} />
                                <h3 className="text-lg font-black text-emerald-900 mb-1">Valid Booking</h3>
                                <p className="text-sm text-emerald-700">Ready to check in</p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Booking Details</h4>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-600">Player</span>
                                    <span className="text-sm font-bold text-slate-900">
                                        {bookingDetails.profiles.full_name || bookingDetails.profiles.username}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-600">Court</span>
                                    <span className="text-sm font-bold text-slate-900">{bookingDetails.courts.name}</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-600">Date</span>
                                    <span className="text-sm font-bold text-slate-900">
                                        {new Date(bookingDetails.date).toLocaleDateString()}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-600">Time</span>
                                    <span className="text-sm font-bold text-slate-900">
                                        {bookingDetails.start_time} - {bookingDetails.end_time}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-medium text-slate-600">Amount</span>
                                    <span className="text-sm font-bold text-slate-900">₱{bookingDetails.total_price.toFixed(2)}</span>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                                    <p className="text-sm font-bold text-red-900">{error}</p>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={handleReset}
                                    className="flex-1 px-6 py-3 bg-slate-200 text-slate-900 rounded-2xl font-bold text-sm hover:bg-slate-300 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCheckIn}
                                    disabled={isVerifying}
                                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isVerifying ? 'Processing...' : 'Confirm Check-In'}
                                </button>
                            </div>
                        </div>
                    )}

                    {success && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                            <CheckCircle2 className="mx-auto text-emerald-600 mb-4" size={64} />
                            <h3 className="text-2xl font-black text-emerald-900 mb-2">Check-In Successful!</h3>
                            <p className="text-sm text-emerald-700">Player has been checked in</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingScanner;
