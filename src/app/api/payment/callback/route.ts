
import { NextRequest, NextResponse } from 'next/server';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const code = formData.get('code');
        const merchantId = formData.get('merchantId');
        const transactionId = formData.get('transactionId');
        const providerReferenceId = formData.get('providerReferenceId');
        
        const merchantTransactionId = req.nextUrl.searchParams.get('merchantTransactionId');
        const userId = merchantTransactionId?.split('_')[1];

        if (code === 'PAYMENT_SUCCESS' && userId) {
            const partnerDataString = localStorage.getItem(`partner_draft_${userId}`);
            
            if (partnerDataString) {
                const partnerData = JSON.parse(partnerDataString);
                
                await setDoc(doc(db, "users", userId), {
                    ...partnerData,
                    paymentDetails: {
                        transactionId,
                        providerReferenceId,
                        status: 'SUCCESS'
                    }
                });

                localStorage.removeItem(`partner_draft_${userId}`);
                
                // Redirect to a success page
                return NextResponse.redirect(new URL('/manage-partner?payment=success', req.url));
            } else {
                 return NextResponse.redirect(new URL('/manage-partner?payment=failed&reason=nodata', req.url));
            }
        } else {
            return NextResponse.redirect(new URL('/manage-partner/add?payment=failed', req.url));
        }

    } catch (error) {
        console.error("Callback handling error:", error);
        return NextResponse.redirect(new URL('/manage-partner/add?payment=error', req.url));
    }
}
