import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = parseInt(process.env.SMTP_PORT || '587');
const secure = port === 465; // SSL if port is 465, TLS/STARTTLS if 587
const user = process.env.EMAIL_USER || process.env.SMTP_USER;
const pass = process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASS;

let transporter = null;

if (user && pass) {
  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Sends a clean, branded HTML verification OTP email.
 * Wrapped in try-catch to prevent SMTP errors from blocking commuter registration flows.
 */
export const sendOTPEmail = async (toEmail, otp, userName = 'Commuter') => {
  try {
    const mailOptions = {
      from: `"DailyPool" <${user || 'no-reply@dailypool.com'}>`,
      to: toEmail,
      subject: `DailyPool OTP Verification Code — ${otp}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0e1012; color: #a0aaba; max-width: 500px; margin: 0 auto; padding: 32px; border-radius: 16px; border: 1px solid #1c1f24;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">DailyPool</h2>
            <span style="font-size: 10px; color: #566171; text-transform: uppercase; letter-spacing: 2px;">Intra-City Carpooling</span>
          </div>
          <p style="font-size: 14px; color: #a0aaba; margin-top: 0;">Hello ${userName},</p>
          <p style="font-size: 14px; color: #a0aaba; line-height: 1.6;">To verify your account and join your workplace commuter circle, please use the following 6-digit verification code:</p>
          <div style="background-color: #15171b; border: 1px solid #1c1f24; padding: 20px; text-align: center; border-radius: 12px; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #007afc; font-family: Courier, monospace;">${otp}</span>
          </div>
          <p style="font-size: 12px; color: #8b96aa; line-height: 1.5; margin-bottom: 0;">This OTP verification session is active for 15 minutes. If you did not trigger this code, you can safely ignore this email.</p>
          <hr style="border: 0; border-top: 1px solid #1c1f24; margin: 24px 0;">
          <p style="font-size: 9px; color: #566171; text-align: center; margin: 0; text-transform: uppercase; letter-spacing: 1px;">DailyPool Inc. · Bangalore, KA</p>
        </div>
      `,
    };

    if (transporter) {
      await transporter.sendMail(mailOptions);
      console.log(`[SMTP SUCCESS] Verification OTP sent successfully to ${toEmail}`);
      return true;
    } else {
      console.log('====================================================');
      console.log(`[SMTP CONFIG OFFLINE] Verification OTP for ${toEmail}: ${otp}`);
      console.log('====================================================');
      return true;
    }
  } catch (error) {
    console.error(`[SMTP TRANSIT FAILED] Failed to send email to ${toEmail}: ${error.message}`);
    // Safe fallback print to console so registration is never blocked
    console.log('====================================================');
    console.log(`[SMTP ERROR FALLBACK] Verification OTP for ${toEmail}: ${otp}`);
    console.log('====================================================');
    return true; // Return true/continue so registration doesn't throw status 500 error
  }
};
