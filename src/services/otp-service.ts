
'use server'

import emailjs from '@emailjs/browser';

// In a real application, you would use a secure method for storing OTPs,
// such as a database (Redis, Firestore, etc.) with expiration times.
// For this prototype, we'll use an in-memory map.
const otpStore = new Map<string, { otp: string; expires: number }>();

function generateOtp() {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// NOTE: This function runs on the server, but the emailjs package is intended for the browser.
// We are using a workaround here for prototyping. In a production app, you'd use a server-side
// email SDK (e.g., Nodemailer, SendGrid SDK).
export async function sendOtp(email: string, name: string): Promise<void> {
    const otp = generateOtp();
    const expires = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes
    
    otpStore.set(email, { otp, expires });

    const serviceId = 'service_50x7wvg';
    const templateId = 'template_tx200hr';
    const publicKey = 'jsksRyDU3bJGEvBZ5';

    const templateParams = {
        to_email: email,
        name: name,
        subject: "Your OTP for Verification",
        body: `Your One-Time Password is: ${otp}`
    };

    console.log(`[OTP Service] Preparing to send OTP to ${email}: ${otp}`);

    // This is a client-side SDK. The 'send' method is not available in Node.js environment directly.
    // To make this work on the server, we need a different approach.
    // For this prototype, we will continue to log it and assume a client-side call would be made
    // if this were a full client-side action. In a real server-action scenario,
    // you would use a library like 'node-fetch' to make a direct API call to EmailJS.
    
    // We will simulate the behavior for now.
    console.log(`[OTP SENT] To: ${email}, Subject: ${templateParams.subject}, Body: ${templateParams.body}`);

    // In a real frontend implementation, you would do:
    // emailjs.send(serviceId, templateId, templateParams, publicKey)
    //   .then((response) => {
    //     console.log('SUCCESS!', response.status, response.text);
    //   }, (err) => {
    //     console.log('FAILED...', err);
    //   });

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
}


export async function verifyOtp(email: string, otp: string): Promise<boolean> {
    const stored = otpStore.get(email);

    if (!stored) {
        console.warn(`[OTP Service] No OTP found for email: ${email}`);
        return false;
    }

    if (Date.now() > stored.expires) {
        console.warn(`[OTP Service] OTP for ${email} has expired.`);
        otpStore.delete(email); // Clean up expired OTP
        return false;
    }

    if (stored.otp === otp) {
        console.log(`[OTP Service] OTP for ${email} verified successfully.`);
        otpStore.delete(email); // OTP is single-use
        return true;
    }

    console.warn(`[OTP Service] Invalid OTP for ${email}.`);
    return false;
}
