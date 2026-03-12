// web/services/paymentReceiptEmail.ts

interface PaymentReceiptEmailData {
    email: string;
    playerName: string;
    courtName: string;
    locationName?: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:MM AM/PM
    endTime: string; // HH:MM AM/PM
    totalPrice: number;
    referenceId: string;
    paymentMethod: string;
}

export const sendPaymentReceiptEmail = async (data: PaymentReceiptEmailData): Promise<{ success: boolean; error?: string }> => {
    try {
        const apiUrl = import.meta.env.VITE_APP_URL || 'https://www.pickleplay.ph';
        
        // When running in dev, use VITE_SERVER_URL (port 5001), otherwise use relative path when deployed to Vercel
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5001';
        const endpoint = isDev ? `${serverUrl}/api/send-receipt-email` : '/api/send-receipt-email';

        console.log(`Sending payment receipt email to ${data.email} via ${endpoint}...`);

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            let errorMsg = 'Failed to send receipt email';
            try {
                const errData = await response.json();
                errorMsg = errData.error || errorMsg;
            } catch (e) {
                // Ignore json parsing error
            }
            throw new Error(errorMsg);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to send receipt email');
        }

        return { success: true };
    } catch (err: any) {
        console.error('Payment receipt email error:', err);
        return { success: false, error: err?.message || 'Failed to send email' };
    }
};
