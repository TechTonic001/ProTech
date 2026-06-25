// jobs/notificationCron.js
const cron = require('node-cron');
const pool = require('../config/db');
const { sendRentReminderEmail } = require('../utils/email');
const { sendSMS } = require('../utils/sms');
const { sendPushNotification } = require('../utils/push');


const startNotificationCron = () => {
  // Run every morning at 6 AM
  cron.schedule('0 6 * * *', async () => {
    try {
      console.log('[CRON] Starting rent reminder notifications...');

      // Get all active leases with tenant details and days until due
      const leasesResult = await pool.query(
        `SELECT 
          l.lease_id, l.tenant_id, l.rent_amount, l.due_day,
          u.full_name as tenant_name, u.email as tenant_email, u.phone_number,
          p.property_name, r.room_number,
          (MAKE_DATE(EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER, EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER, l.due_day::INTEGER) - CURRENT_DATE) AS days_until_due
            FROM leases l
            JOIN users u ON l.tenant_id = u.user_id
            JOIN rooms r ON l.room_id = r.room_id
            JOIN properties p ON r.property_id = p.property_id
            WHERE l.lease_status = 'active'`
      );

      const leases = leasesResult.rows;
      let emailCount = 0;
      let pushCount = 0;
      let leasesEvaluated = 0;

      for (const lease of leases || []) {
        leasesEvaluated++;

        // Check if days_until_due is in [30, 7, 1, 0]
        if (![30, 7, 1, 0].includes(lease.days_until_due)) {
          continue;
        }

        // Duplicate prevention
        const existingNotificationsResult = await pool.query(
          'SELECT notification_id FROM notifications WHERE lease_id = $1 AND days_before_due = $2 AND sent_at::date = CURRENT_DATE',
          [lease.lease_id, Math.abs(lease.days_until_due)]
        );

        if (existingNotificationsResult.rows.length > 0) {
          continue;
        }

        // Overdue check (only for days_until_due = 0)
        if (lease.days_until_due === 0) {
          const paidThisMonthResult = await pool.query(
            'SELECT payment_id FROM payments WHERE lease_id = $1 AND payment_status = $2 AND EXTRACT(MONTH FROM payment_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)',
            [lease.lease_id, 'success']
          );

          if (paidThisMonthResult.rows.length > 0) {
            continue;
          }
        }

        // Build message and send
        const dueDate = new Date();
        dueDate.setDate(lease.due_day);
        const dueDateStr = dueDate.toLocaleDateString('en-NG', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const messageBody = `Rent payment reminder: ₦${parseFloat(lease.rent_amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })} is due on ${dueDateStr}`;

        // Send email
        try {
          await sendRentReminderEmail(
            lease.tenant_email,
            lease.tenant_name,
            lease.rent_amount,
            dueDateStr,
            lease.days_until_due,
            lease.room_number,
            lease.property_name
          );

          await pool.query(
            'INSERT INTO notifications (lease_id, tenant_id, channel, message_body, days_before_due) VALUES ($1, $2, $3, $4, $5)',
            [lease.lease_id, lease.tenant_id, 'email', messageBody, Math.abs(lease.days_until_due)]
          );

          emailCount++;
        } catch (emailError) {
          console.error(`Error sending email for lease ${lease.lease_id}:`, emailError.message);
        }

        // Send SMS (stub - won't fail)
        try {
          await sendSMS(lease.phone_number, messageBody);
        } catch (smsError) {
          console.error(`SMS error for lease ${lease.lease_id}:`, smsError.message);
        }

        // Send push notification
        try {
          await sendPushNotification(
            lease.tenant_id,
            'Rent Reminder',
            messageBody,
            `${process.env.FRONTEND_URL}/pay`
          );

          await pool.query(
            'INSERT INTO notifications (lease_id, tenant_id, channel, message_body, days_before_due) VALUES ($1, $2, $3, $4, $5)',
            [lease.lease_id, lease.tenant_id, 'push', messageBody, Math.abs(lease.days_until_due)]
          );

          pushCount++;
        } catch (pushError) {
          console.error(`Error sending push for lease ${lease.lease_id}:`, pushError.message);
        }
      }

      console.log(
        `[CRON COMPLETE] Emails: ${emailCount} | Push: ${pushCount} | Leases evaluated: ${leasesEvaluated}`
      );
    } catch (error) {
      console.error('[CRON ERROR]', error.message);
    }
  }, { timezone: 'Africa/Lagos' });

  console.log('[CRON] Rent reminder notifications scheduled for 6 AM Lagos time daily');
};

module.exports = { startNotificationCron };
