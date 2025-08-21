
'use server'

// In a real application, you would use a secure method for storing OTPs,
// such as a database (Redis, Firestore, etc.) with expiration times.
// For this prototype, we'll use an in-memory map.
const otpStore = new Map<string, { otp: string; expires: number }>();

function generateOtp() {
  // Generate a 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Sends a One-Time Password (OTP) to the user's email.
 * NOTE: This is a simulated email sending for development.
 * The OTP will be logged to the server console.
 * In a production environment, replace this with a proper server-side email service.
 */
export async function sendOtp(email: string, name: string): Promise<void> {
    const otp = generateOtp();
    const expires = Date.now() + 5 * 60 * 1000; // OTP valid for 5 minutes
    
    otpStore.set(email, { otp, expires });

    const emailBody = `Hi ${name}, your One-Time Password for verification is: ${otp}`;
    
    console.log("--- OTP Service (Simulation) ---");
    console.log(`To: ${email}`);
    console.log(`Subject: Your OTP for Verification`);
    console.log(`Body: ${emailBody}`);
    console.log("---------------------------------");
    
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
