
import { NextRequest, NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const code = formData.get('code');
        const merchantId = formData.get('merchantId');
        const transactionId = formData.get('transactionId');
        const providerReferenceId = formData.get('providerReferenceId');
        
        const originalTransactionId = (transactionId as string).split('_').slice(0,3).join('_');
        const userId = originalTransactionId?.split('_')[1];

        if (code === 'PAYMENT_SUCCESS' && userId) {
            const userDocRef = doc(db, "users", userId);
            
            await updateDoc(userDocRef, {
                paymentStatus: 'paid',
                paymentDetails: {
                    transactionId,
                    providerReferenceId,
                    status: 'SUCCESS'
                }
            });
            
            return NextResponse.redirect(new URL(`/manage-partner?payment=success&tid=${transactionId}`, req.url));

        } else {
            return NextResponse.redirect(new URL(`/manage-partner/add?payment=failed&reason=payment_failed`, req.url));
        }

    } catch (error) {
        console.error("Callback handling error:", error);
        return NextResponse.redirect(new URL('/manage-partner/add?payment=error', req.url));
    }
}
