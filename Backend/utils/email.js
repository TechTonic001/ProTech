// utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  pool: true,           // reuse SMTP connections
  maxConnections: 3,
  maxMessages: 100,
  tls: {
    rejectUnauthorized: false
  }
});

// Test connection on startup (skip if placeholder values)
const isPlaceholderEmail =
  !process.env.EMAIL_USER ||
  process.env.EMAIL_USER.includes('your_gmail') ||
  !process.env.EMAIL_PASS ||
  process.env.EMAIL_PASS.includes('your_gmail_app_password');

if (isPlaceholderEmail) {
  console.log('⚠️ Email transporter in placeholder state — SMTP verification skipped.');
} else {
  transporter.verify((err, success) => {
    if (err) {
      console.error('❌ Email transporter FAILED:', err.message);
    } else {
      console.log('✅ Email transporter ready — Nodemailer connected');
    }
  });
}

const emailFooter = 'ProTech Automated Rent System • Ogbomoso, Oyo State, Nigeria';
const frontendUrl = (process.env.FRONTEND_URL || 'https://pro-tech-one.vercel.app').replace(/\/+$/, '');
const sendFrom = process.env.EMAIL_FROM || (process.env.EMAIL_USER ? `"ProTech" <${process.env.EMAIL_USER}>` : '"ProTech" <noreply@protech.com>');
const buildFrontEndLink = (path = '') => `${frontendUrl}/${String(path).replace(/^\/+/, '')}`;

const logEmailAttempt = (label, toEmail, subject) => {
  console.log(`[EMAIL] ${label}`, { toEmail, subject, from: sendFrom });
};

const sendOTPEmail = async (toEmail, otpCode) => {
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; background-color: white; margin: 0 auto; padding: 30px; border-radius: 8px;">
          <h2 style="color: #333; text-align: center;">ProTech Password Reset</h2>
          <p style="color: #666; text-align: center;">Your password reset code is:</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 48px; font-weight: bold; letter-spacing: 8px; color: #1a7f7e;">${otpCode}</span>
          </div>
          <p style="color: #d32f2f; text-align: center; font-weight: bold;">This code expires in 10 minutes</p>
          <p style="color: #666; font-size: 14px;">If you did not request a password reset, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">${emailFooter}</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `Your ProTech password reset code is: ${otpCode}\n\nThis code expires in 10 minutes.\n\n${emailFooter}`;

  try {
    logEmailAttempt('OTPEmail', toEmail, 'ProTech • Your Password Reset Code');
    await transporter.sendMail({
      from: sendFrom,
      to: toEmail,
      subject: 'ProTech • Your Password Reset Code',
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('[ERROR] OTP email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendPasswordChangedEmail = async (toEmail, fullName) => {
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; background-color: white; margin: 0 auto; padding: 30px; border-radius: 8px;">
          <h2 style="color: #333; text-align: center;">Password Changed Successfully</h2>
          <p style="color: #666;">Hello ${fullName},</p>
          <p style="color: #666;">Your ProTech account password has been changed successfully.</p>
          <p style="color: #d32f2f; font-weight: bold;">If you did not make this change, please contact our support team immediately.</p>
          <p style="color: #666;">Your account security is important to us.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">${emailFooter}</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `Hello ${fullName},\n\nYour ProTech account password has been changed successfully.\n\nIf you did not make this change, please contact support immediately.\n\n${emailFooter}`;

  try {
    logEmailAttempt('PasswordChangedEmail', toEmail, 'ProTech • Password Changed Successfully');
    await transporter.sendMail({
      from: sendFrom,
      to: toEmail,
      subject: 'ProTech • Password Changed Successfully',
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('[ERROR] Password change email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendApprovalEmail = async (toEmail, fullName, approved, propertyName) => {
  const subject = approved
    ? 'ProTech • Your Account Has Been Approved'
    : 'ProTech • Your Account Request Was Not Approved';

  const statusMessage = approved
    ? `Your account has been approved by the landlord of ${propertyName}. You can now log in and view your lease details.`
    : `Unfortunately, your account request for ${propertyName} has not been approved at this time. Please contact the landlord for more information.`;

  const actionButton = approved
    ? `<a href="${buildFrontEndLink('login')}" style="background-color: #1a7f7e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px;">Log In Now</a>`
    : '';

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; background-color: white; margin: 0 auto; padding: 30px; border-radius: 8px;">
          <h2 style="color: #333; text-align: center;">${approved ? 'Account Approved!' : 'Account Request Status'}</h2>
          <p style="color: #666;">Hello ${fullName},</p>
          <p style="color: #666;">${statusMessage}</p>
          <div style="text-align: center;">
            ${actionButton}
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">${emailFooter}</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `Hello ${fullName},\n\n${statusMessage}\n\n${emailFooter}`;

  try {
    logEmailAttempt('ApprovalEmail', toEmail, subject);
    await transporter.sendMail({
      from: sendFrom,
      to: toEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('[ERROR] Approval email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendRentReminderEmail = async (
  toEmail,
  tenantName,
  amount,
  dueDate,
  daysLeft,
  roomNumber,
  propertyName
) => {
  let subject = '';
  if (daysLeft === 0) {
    subject = 'OVERDUE: Your rent is past due';
  } else if (daysLeft === 1) {
    subject = 'Rent Reminder: Due TOMORROW';
  } else {
    subject = `Rent Reminder: ${daysLeft} days until your rent is due`;
  }

  const urgencyColor = daysLeft <= 0 ? '#d32f2f' : daysLeft === 1 ? '#f57c00' : '#1a7f7e';

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; background-color: white; margin: 0 auto; padding: 30px; border-radius: 8px;">
          <h2 style="color: ${urgencyColor}; text-align: center;">Rent Payment Reminder</h2>
          <p style="color: #666;">Hello ${tenantName},</p>
          <div style="background-color: #f9f9f9; padding: 20px; border-left: 4px solid ${urgencyColor}; margin: 20px 0;">
            <p style="color: #333; font-size: 16px; margin: 0;"><strong>Rent Amount:</strong></p>
            <p style="color: ${urgencyColor}; font-size: 32px; font-weight: bold; margin: 10px 0;">₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
            <p style="color: #666; margin: 10px 0;"><strong>Property:</strong> ${propertyName}</p>
            <p style="color: #666; margin: 10px 0;"><strong>Room:</strong> ${roomNumber}</p>
            <p style="color: #666; margin: 10px 0;"><strong>Due Date:</strong> ${dueDate}</p>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${buildFrontEndLink('pay')}" style="background-color: #1a7f7e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">Pay Now</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">${emailFooter}</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `Hello ${tenantName},\n\nRent Payment Reminder\n\nAmount: ₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}\nProperty: ${propertyName}\nRoom: ${roomNumber}\nDue Date: ${dueDate}\n\nPlease pay your rent on time.\n\n${emailFooter}`;

  try {
    logEmailAttempt('RentReminderEmail', toEmail, subject);
    await transporter.sendMail({
      from: sendFrom,
      to: toEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('[ERROR] Rent reminder email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendPaymentConfirmationEmail = async (
  toEmail,
  tenantName,
  amount,
  receiptNumber,
  roomNumber,
  propertyName,
  paymentDate
) => {
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; background-color: white; margin: 0 auto; padding: 30px; border-radius: 8px;">
          <h2 style="color: #1a7f7e; text-align: center;">Payment Confirmed</h2>
          <p style="color: #666;">Hello ${tenantName},</p>
          <p style="color: #666;">Your rent payment has been received and confirmed.</p>
          <div style="background-color: #f0f8f7; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #333; margin: 10px 0;"><strong>Receipt Number:</strong> ${receiptNumber}</p>
            <p style="color: #333; margin: 10px 0;"><strong>Amount Paid:</strong> <span style="color: #1a7f7e; font-weight: bold;">₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}</span></p>
            <p style="color: #333; margin: 10px 0;"><strong>Property:</strong> ${propertyName}</p>
            <p style="color: #333; margin: 10px 0;"><strong>Room:</strong> ${roomNumber}</p>
            <p style="color: #333; margin: 10px 0;"><strong>Payment Date:</strong> ${paymentDate}</p>
          </div>
          <p style="color: #666; font-size: 14px;">Keep this receipt for your records.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">${emailFooter}</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `Hello ${tenantName},\n\nPayment Confirmed\n\nReceipt Number: ${receiptNumber}\nAmount Paid: ₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}\nProperty: ${propertyName}\nRoom: ${roomNumber}\nPayment Date: ${paymentDate}\n\nKeep this receipt for your records.\n\n${emailFooter}`;

  try {
    logEmailAttempt('PaymentConfirmationEmail', toEmail, `Payment Confirmed Receipt ${receiptNumber}`);
    await transporter.sendMail({
      from: sendFrom,
      to: toEmail,
      subject: `Payment Confirmed Receipt ${receiptNumber}`,
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('[ERROR] Payment confirmation email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendAnnouncementEmail = async (toEmail, tenantName, title, messageBody) => {
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; background-color: white; margin: 0 auto; padding: 30px; border-radius: 8px;">
          <h2 style="color: #1a7f7e; text-align: center;">New Announcement</h2>
          <p style="color: #666;">Hello ${tenantName},</p>
          <p style="color: #333; font-size: 18px; font-weight: bold; margin: 20px 0;">${title}</p>
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #666; line-height: 1.6;">${messageBody.replace(/\n/g, '<br>')}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">${emailFooter}</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `Hello ${tenantName},\n\nNew Announcement\n\n${title}\n\n${messageBody}\n\n${emailFooter}`;

  try {
    logEmailAttempt('AnnouncementEmail', toEmail, `ProTech Announcement: ${title}`);
    await transporter.sendMail({
      from: sendFrom,
      to: toEmail,
      subject: `ProTech Announcement: ${title}`,
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('[ERROR] Announcement email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendLandlordWelcomeEmail = async (toEmail, fullName, hostelName, landlordCode) => {
  const hostelLine = hostelName
    ? `<p>Your landlord account for <strong>${hostelName}</strong> has been created successfully.</p>`
    : `<p>Your ProTech landlord account has been created successfully.</p>`;

  const hostelTextLine = hostelName
    ? `Your landlord account and hostel "${hostelName}" have been set up successfully.`
    : `Your ProTech landlord account has been set up successfully.`;

  const htmlContent = `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <div style="background:#0F2A5E;padding:24px;text-align:center;border-radius:12px 12px 0 0">
          <img src="https://pro-tech-one.vercel.app/logo192.png" alt="ProTech" width="60" style="display:block;margin:0 auto 12px" />
        </div>
      <div style="background:#fff;padding:28px;border-radius:0 0 12px 12px">
        <p>Dear ${fullName},</p>
        ${hostelLine}

        <div style="background:#FFFBEB;border:2px solid #F59E0B;
                    border-radius:12px;padding:20px;text-align:center;
                    margin:20px 0">
          <p style="margin:0;font-size:12px;color:#92400E;
                    text-transform:uppercase;letter-spacing:1px;
                    font-weight:bold">Your Unique Landlord Code</p>
          <p style="margin:8px 0;font-size:32px;font-weight:900;
                    color:#0F2A5E;letter-spacing:2px;
                    font-family:monospace">${landlordCode}</p>
          <p style="margin:0;font-size:12px;color:#92400E">
            Share this code with your tenants — NOT your username
          </p>
        </div>

        <p style="font-size:14px;color:#475569">
          <strong>Important:</strong> Your tenants will need this
          exact code to register and request access to your hostel.
          Each landlord on ProTech has a different code, so make
          sure you share <strong>${landlordCode}</strong> and not
          anyone else's code.
        </p>

        <a href="${buildFrontEndLink('login')}"
           style="display:inline-block;background:#1565C0;color:#fff;
                  padding:12px 28px;border-radius:8px;
                  text-decoration:none;font-weight:bold;margin-top:16px">
          Go to My Dashboard
        </a>
      </div>
    </div>
  `;

  const textContent = `Hello ${fullName},\n\n${hostelTextLine}\n\nYour unique landlord code is: ${landlordCode}\n\nShare this code with your tenants so they can register.\n\n${emailFooter}`;

  try {
    logEmailAttempt('LandlordWelcomeEmail', toEmail, `Welcome to ProTech — Your Code is ${landlordCode}`);
    await transporter.sendMail({
      from: sendFrom,
      to: toEmail,
      subject: `Welcome to ProTech — Your Code is ${landlordCode}`,
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('[ERROR] Landlord welcome email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendTenantWelcomeEmail = async (toEmail, tenantName, landlordName) => {
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; background-color: white; margin: 0 auto; padding: 30px; border-radius: 8px;">
          <h2 style="color: #1a7f7e; text-align: center;">Welcome to ProTech, ${tenantName}!</h2>
          <p style="color: #666;">Your tenant account has been registered successfully.</p>
          <p style="color: #666;">Your approval request has been forwarded to your landlord <strong>@${landlordName}</strong>. Once approved, you will be assigned to a room and can start paying rent online securely.</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">${emailFooter}</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `Hello ${tenantName},\n\nWelcome to ProTech! Your account has been created and is currently awaiting approval from landlord @${landlordName}.\n\n${emailFooter}`;

  try {
    logEmailAttempt('TenantWelcomeEmail', toEmail, 'Welcome to ProTech • Account Awaiting Approval');
    await transporter.sendMail({
      from: sendFrom,
      to: toEmail,
      subject: 'Welcome to ProTech • Account Awaiting Approval',
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('[ERROR] Tenant welcome email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendLandlordTenantRegistrationNotificationEmail = async (toEmail, landlordName, tenantName) => {
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 20px;">
        <div style="max-width: 600px; background-color: white; margin: 0 auto; padding: 30px; border-radius: 8px;">
          <h2 style="color: #1a7f7e; text-align: center;">New Tenant Awaiting Approval</h2>
          <p style="color: #666;">Hello ${landlordName},</p>
          <p style="color: #666;">A new tenant, <strong>${tenantName}</strong>, has registered on ProTech under your landlord space and is awaiting your approval.</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${buildFrontEndLink('login')}" style="background-color: #1a7f7e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">Approve Requests</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">${emailFooter}</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `Hello ${landlordName},\n\nNew Tenant Registration: ${tenantName} has registered under your space and is awaiting approval.\n\n${emailFooter}`;

  try {
    logEmailAttempt('LandlordTenantRegistrationNotificationEmail', toEmail, 'ProTech Alert • New Tenant Requesting Approval');
    await transporter.sendMail({
      from: sendFrom,
      to: toEmail,
      subject: 'ProTech Alert • New Tenant Requesting Approval',
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('[ERROR] Landlord tenant registration notification email error:', error.message);
    return { success: false, error: error.message };
  }
};

// ── Tenant rent reminder email (Issue 1B — cron notification engine) ──────────
// Called by runNotificationEngine for each lease that needs a notification.
const sendTenantRentReminderEmail = async ({
  toEmail, tenantName, hostelName, roomNumber,
  rentAmount, amountPaid, dueDate, daysUntilDue,
}) => {
  const balance = parseFloat(rentAmount) - parseFloat(amountPaid || 0);
  const balanceStr = `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  const rentStr   = `₦${parseFloat(rentAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  let subjectLine, statusBadge, headlineText, statusColor;

  if (daysUntilDue > 0) {
    subjectLine   = `Rent Reminder: ${daysUntilDue} Day${daysUntilDue === 1 ? '' : 's'} Until Your Rent is Due`;
    statusBadge   = `${daysUntilDue} DAY${daysUntilDue === 1 ? '' : 'S'} REMAINING`;
    headlineText  = `Your rent is due in <strong>${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}</strong>.`;
    statusColor   = '#1565C0';
  } else if (daysUntilDue === 0) {
    subjectLine   = 'Action Required: Your Rent is Due Today';
    statusBadge   = 'DUE TODAY';
    headlineText  = 'Your rent is <strong>due today</strong>. Please make your payment now to avoid late fees.';
    statusColor   = '#e65100';
  } else {
    const overdueDays = Math.abs(daysUntilDue);
    subjectLine   = `OVERDUE: Your Rent is ${overdueDays} Day${overdueDays === 1 ? '' : 's'} Past Due`;
    statusBadge   = `${overdueDays} DAY${overdueDays === 1 ? '' : 'S'} OVERDUE`;
    headlineText  = `Your rent is <strong>${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue</strong>. Please pay immediately.`;
    statusColor   = '#c62828';
  }

  const htmlContent = `
    <html>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8; padding: 24px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1565C0 0%, #0D47A1 100%); border-radius: 16px 16px 0 0; padding: 32px; text-align: center;">
            <h1 style="color: #fff; font-size: 22px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">ProTech Rent System</h1>
            <p style="color: rgba(255,255,255,0.75); font-size: 13px; margin: 6px 0 0;">Automated Rent Tracking & Notification</p>
          </div>

          <!-- Status Badge -->
          <div style="background: ${statusColor}; text-align: center; padding: 14px;">
            <span style="color: #fff; font-size: 13px; font-weight: 900; letter-spacing: 2px;">${statusBadge}</span>
          </div>

          <!-- Body -->
          <div style="background: #fff; border-radius: 0 0 16px 16px; padding: 32px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #1e293b; font-size: 16px; font-weight: 700; margin: 0 0 8px;">Hello ${tenantName},</p>
            <p style="color: #475569; font-size: 14px; margin: 0 0 24px; line-height: 1.6;">${headlineText}</p>

            <!-- Details Card -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td style="color: #94a3b8; padding: 6px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Hostel</td>
                  <td style="color: #1e293b; padding: 6px 0; font-weight: 700; text-align: right;">${hostelName || 'N/A'}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; padding: 6px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Room</td>
                  <td style="color: #1e293b; padding: 6px 0; font-weight: 700; text-align: right;">Room ${roomNumber}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; padding: 6px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Monthly Rent</td>
                  <td style="color: #1e293b; padding: 6px 0; font-weight: 700; text-align: right;">${rentStr}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="color: #94a3b8; padding: 10px 0 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Balance Due</td>
                  <td style="color: ${statusColor}; padding: 10px 0 6px; font-weight: 900; text-align: right; font-size: 16px;">${balanceStr}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; padding: 6px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</td>
                  <td style="color: #1e293b; padding: 6px 0; font-weight: 700; text-align: right;">${dueDate}</td>
                </tr>
              </table>
            </div>

            <!-- CTA -->
            <div style="text-align: center; margin: 28px 0;">
              <a href="${buildFrontEndLink('tenant/login')}"
                 style="background-color: #1565C0; color: #fff; padding: 14px 36px; text-decoration: none;
                        border-radius: 10px; font-weight: 800; font-size: 14px; display: inline-block;
                        letter-spacing: 0.5px; box-shadow: 0 4px 14px rgba(21,101,192,0.4);">
                Pay Rent Now →
              </a>
            </div>

            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
              This is an automated reminder from ProTech. If you have already paid, please ignore this message.
            </p>
          </div>

          <!-- Footer -->
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 20px;">${emailFooter}</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `${subjectLine}\n\nHello ${tenantName},\n\nHostel: ${hostelName}\nRoom: ${roomNumber}\nBalance Due: ${balanceStr}\nDue Date: ${dueDate}\n\nPay at: ${buildFrontEndLink('tenant/login')}\n\n${emailFooter}`;

  try {
    logEmailAttempt('TenantRentReminderEmail', toEmail, subjectLine);
    await transporter.sendMail({
      from: sendFrom,
      to: toEmail,
      subject: subjectLine,
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('[ERROR] Tenant rent reminder email error:', error.message);
    return { success: false, error: error.message };
  }
};

// ── Landlord rent alert email (Issue 1B — cron notification engine) ───────────
// Brief informational alert to the landlord when a tenant's rent is due/overdue.
const sendLandlordRentAlertEmail = async ({
  toEmail, landlordName, tenantName, tenantUsername,
  roomNumber, hostelName, rentAmount, amountPaid,
  dueDate, daysUntilDue,
}) => {
  const balance  = parseFloat(rentAmount) - parseFloat(amountPaid || 0);
  const balanceStr = `₦${balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;

  const dayLabel = daysUntilDue >= 0
    ? `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} until due`
    : `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} OVERDUE`;

  const subjectLine = `Tenant Rent Alert: ${tenantName} — ${dayLabel}`;
  const headerColor = daysUntilDue < 0 ? '#c62828' : daysUntilDue === 0 ? '#e65100' : '#1565C0';

  const htmlContent = `
    <html>
      <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f0f4f8; padding: 24px; margin: 0;">
        <div style="max-width: 560px; margin: 0 auto;">
          <div style="background: ${headerColor}; border-radius: 12px 12px 0 0; padding: 24px 28px;">
            <h1 style="color: #fff; font-size: 18px; margin: 0; font-weight: 800;">Rent Status Alert</h1>
            <p style="color: rgba(255,255,255,0.8); font-size: 12px; margin: 4px 0 0;">ProTech Landlord Notification</p>
          </div>
          <div style="background: #fff; border-radius: 0 0 12px 12px; padding: 28px; border: 1px solid #e2e8f0; border-top: none;">
            <p style="color: #1e293b; font-size: 15px; font-weight: 700; margin: 0 0 6px;">Hello ${landlordName},</p>
            <p style="color: #475569; font-size: 13px; margin: 0 0 20px;">This is an automated alert about one of your tenants' rent status.</p>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin-bottom: 20px;">
              <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
                <tr>
                  <td style="color: #94a3b8; padding: 5px 0; font-weight: 600; text-transform: uppercase;">Tenant</td>
                  <td style="color: #1e293b; font-weight: 700; text-align: right;">${tenantName}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; padding: 5px 0; font-weight: 600; text-transform: uppercase;">Username</td>
                  <td style="color: #475569; font-weight: 600; text-align: right;">@${tenantUsername}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; padding: 5px 0; font-weight: 600; text-transform: uppercase;">Room</td>
                  <td style="color: #1e293b; font-weight: 700; text-align: right;">${hostelName} — Room ${roomNumber}</td>
                </tr>
                <tr style="border-top: 1px solid #e2e8f0;">
                  <td style="color: #94a3b8; padding: 8px 0 5px; font-weight: 600; text-transform: uppercase;">Balance Due</td>
                  <td style="color: ${headerColor}; font-weight: 900; font-size: 15px; text-align: right;">${balanceStr}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; padding: 5px 0; font-weight: 600; text-transform: uppercase;">Due Date</td>
                  <td style="color: #1e293b; font-weight: 700; text-align: right;">${dueDate}</td>
                </tr>
                <tr>
                  <td style="color: #94a3b8; padding: 5px 0; font-weight: 600; text-transform: uppercase;">Status</td>
                  <td style="color: ${headerColor}; font-weight: 800; text-align: right; text-transform: uppercase;">${dayLabel}</td>
                </tr>
              </table>
            </div>

            <p style="color: #94a3b8; font-size: 11px; text-align: center;">
              A reminder has also been sent to the tenant. No action required on your part unless rent remains unpaid.
            </p>
          </div>
          <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 16px;">${emailFooter}</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `${subjectLine}\n\nHello ${landlordName},\n\nTenant: ${tenantName} (@${tenantUsername})\nRoom: ${hostelName} - Room ${roomNumber}\nBalance Due: ${balanceStr}\nDue Date: ${dueDate}\nStatus: ${dayLabel}\n\n${emailFooter}`;

  try {
    logEmailAttempt('LandlordRentAlertEmail', toEmail, subjectLine);
    await transporter.sendMail({
      from: sendFrom,
      to: toEmail,
      subject: subjectLine,
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('[ERROR] Landlord rent alert email error:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendOTPEmail,
  sendPasswordChangedEmail,
  sendApprovalEmail,
  sendRentReminderEmail,
  sendPaymentConfirmationEmail,
  sendAnnouncementEmail,
  sendLandlordWelcomeEmail,
  sendTenantWelcomeEmail,
  sendLandlordTenantRegistrationNotificationEmail,
  sendTenantRentReminderEmail,
  sendLandlordRentAlertEmail,
};
