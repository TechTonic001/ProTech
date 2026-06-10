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
});

const emailFooter = 'ProTech Automated Rent System — Ogbomoso, Oyo State, Nigeria';

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
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: 'ProTech — Your Password Reset Code',
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('OTP email error:', error.message);
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
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: 'ProTech — Password Changed Successfully',
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('Password change email error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendApprovalEmail = async (toEmail, fullName, approved, propertyName) => {
  const subject = approved
    ? 'ProTech — Your Account Has Been Approved'
    : 'ProTech — Your Account Request Was Not Approved';

  const statusMessage = approved
    ? `Your account has been approved by the landlord of ${propertyName}. You can now log in and view your lease details.`
    : `Unfortunately, your account request for ${propertyName} has not been approved at this time. Please contact the landlord for more information.`;

  const actionButton = approved
    ? '<a href="' + process.env.FRONTEND_URL + '/login" style="background-color: #1a7f7e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin-top: 15px;">Log In Now</a>'
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
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('Approval email error:', error.message);
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
            <a href="${process.env.FRONTEND_URL}/pay" style="background-color: #1a7f7e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; display: inline-block;">Pay Now</a>
          </div>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">${emailFooter}</p>
        </div>
      </body>
    </html>
  `;

  const textContent = `Hello ${tenantName},\n\nRent Payment Reminder\n\nAmount: ₦${parseFloat(amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}\nProperty: ${propertyName}\nRoom: ${roomNumber}\nDue Date: ${dueDate}\n\nPlease pay your rent on time.\n\n${emailFooter}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: subject,
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('Rent reminder email error:', error.message);
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
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `Payment Confirmed — Receipt ${receiptNumber}`,
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('Payment confirmation email error:', error.message);
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
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: toEmail,
      subject: `ProTech Announcement: ${title}`,
      html: htmlContent,
      text: textContent,
    });
    return { success: true };
  } catch (error) {
    console.error('Announcement email error:', error.message);
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
};
