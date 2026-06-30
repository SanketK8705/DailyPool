import nodemailer from 'nodemailer';

const host = process.env.SMTP_HOST || 'smtp.gmail.com';
const port = parseInt(process.env.SMTP_PORT || '587');
const secure = port === 465;
const user = process.env.EMAIL_USER || process.env.SMTP_USER;
const pass = process.env.EMAIL_APP_PASSWORD || process.env.SMTP_PASS;
const resendApiKey = process.env.RESEND_API_KEY;

let transporter = null;

if (user && pass && !resendApiKey) {
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
 * Supports Resend API (HTTPS-based, bypasses Render port blocks) and standard SMTP.
 */
export const sendOTPEmail = async (toEmail, otp, userName = 'Commuter') => {
  const htmlContent = `
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
  `;

  try {
    // 1. If Resend API Key is available, dispatch via HTTPS
    if (resendApiKey) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: 'DailyPool <onboarding@resend.dev>',
          to: [toEmail],
          subject: `DailyPool OTP Verification Code — ${otp}`,
          html: htmlContent,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        console.log(`[RESEND SUCCESS] Verification OTP sent to ${toEmail} (ID: ${data.id})`);
        return true;
      } else {
        throw new Error(data.message || 'Resend API returned error status');
      }
    }

    // 2. Fall back to standard SMTP if configured
    if (transporter) {
      await transporter.sendMail({
        from: `"DailyPool" <${user}>`,
        to: toEmail,
        subject: `DailyPool OTP Verification Code — ${otp}`,
        html: htmlContent,
      });
      console.log(`[SMTP SUCCESS] Verification OTP sent successfully to ${toEmail}`);
      return true;
    }

    // 3. If neither is available, log code locally
    console.log('====================================================');
    console.log(`[SMTP CONFIG OFFLINE] Verification OTP for ${toEmail}: ${otp}`);
    console.log('====================================================');
    return true;
  } catch (error) {
    console.error(`[MAIL TRANSIT FAILED] Failed to send email to ${toEmail}`);
    console.error(`Error Message: ${error.message}`);
    console.error(`Error Code: ${error.code || 'N/A'}`);
    console.error('Full Error Object:', error);

    // Safe fallback so registration doesn't throw 500 error
    console.log('====================================================');
    console.log(`[SMTP ERROR FALLBACK] Verification OTP for ${toEmail}: ${otp}`);
    console.log('====================================================');
    return true;
  }
};
