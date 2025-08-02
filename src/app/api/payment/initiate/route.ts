
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const { amount, merchantTransactionId, merchantUserId, redirectUrl } = await req.json();

        const merchantId = process.env.PHONEPE_CLIENT_ID;
        const saltKey = process.env.PHONEPE_CLIENT_SECRET;
        const saltIndex = 1;

        const payload = {
            merchantId: merchantId,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: merchantUserId,
            amount: amount * 100, // Amount in paisa
            redirectUrl: redirectUrl,
            redirectMode: 'POST',
            callbackUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/callback`,
            mobileNumber: '9999999999', // A dummy number, as it's required
            paymentInstrument: {
                type: 'PAY_PAGE',
            },
        };

        const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
        
        const stringToHash = `${base64Payload}/pg/v1/pay${saltKey}`;
        const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
        const xVerify = `${sha256}###${saltIndex}`;

        const options = {
            method: 'POST',
            url: 'https://api.phonepe.com/apis/hermes/pg/v1/pay',
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': xVerify,
            },
            data: {
                request: base64Payload,
            },
        };

        const response = await axios.request(options);

        return NextResponse.json(response.data);

    } catch (error: any) {
        console.error("PhonePe API Error:", error.response ? error.response.data : error.message);
        return NextResponse.json({
            success: false,
            message: error.response?.data?.message || 'An error occurred during payment initiation.',
        }, { status: 500 });
    }
}
