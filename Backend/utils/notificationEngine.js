// utils/notificationEngine.js
// ── ProTech Notification Engine ──────────────────────────────────────────────
// Runs every hour (via server.js cron), checks each active lease against the
// landlord's notification_settings, and fires emails + logs notifications.
// Only sends if the current hour matches the landlord's preferred send_time.

const db = require('../config/db');
const { sendTenantRentReminderEmail, sendLandlordRentAlertEmail } = require('./email');

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Get the next due date for a lease based on due_day.
 * If the due day this month has already passed, return next month's due date.
 * @param {number} dueDay - Day of month the rent is due (e.g. 5 = 5th of each month)
 * @returns {Date}
 */
function getNextDueDate(dueDay) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let due = new Date(year, month, dueDay);
  if (due <= now) {
    // Due date already passed this month — next is next month
    due = new Date(year, month + 1, dueDay);
  }
  return due;
}

/**
 * Calculate difference in whole days between a due date and now.
 * Positive = days until due; 0 = due today; negative = days overdue.
 * @param {Date} dueDate
 * @returns {number}
 */
function daysDiff(dueDate) {
  const now = new Date();
  const msPerDay = 86400000;
  return Math.round((dueDate - now) / msPerDay);
}

// ── Main engine ────────────────────────────────────────────────────────────────

/**
 * Run the full notification engine for the given hour.
 * Called by the hourly cron in server.js.
 * @param {string} currentHour - Zero-padded 24h hour string, e.g. "08" or "20"
 */
const runNotificationEngine = async (currentHour) => {
  console.log(`[CRON ENGINE] Running notification engine for hour ${currentHour}:00 WAT`);

  // ── STEP 1: Determine today's date string in Africa/Lagos ──────────────────
  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' }); // YYYY-MM-DD

  try {
    // ── STEP 2: Fetch all active leases with landlord notification settings ──
    const leasesResult = await db.query(
      `SELECT
         l.lease_id,
         l.tenant_id,
         l.landlord_id,
         l.room_id,
         l.due_day,
         l.rent_amount,
         COALESCE(l.amount_paid_this_cycle, 0) AS amount_paid_this_cycle,
         l.end_date,
         u_tenant.email       AS tenant_email,
         u_tenant.full_name   AS tenant_name,
         u_tenant.username    AS tenant_username,
         u_landlord.email     AS landlord_email,
         u_landlord.full_name AS landlord_name,
         u_landlord.username  AS landlord_username,
         u_landlord.hostel_name,
         r.room_number,
         ns.remind_30_days,
         ns.remind_14_days,
         ns.remind_7_days,
         ns.remind_3_days,
         ns.remind_1_day,
         ns.remind_on_due,
         ns.frequency_overdue,
         ns.send_time
       FROM leases l
       JOIN users u_tenant   ON l.tenant_id   = u_tenant.user_id
       JOIN users u_landlord ON l.landlord_id  = u_landlord.user_id
       JOIN rooms r          ON l.room_id      = r.room_id
       LEFT JOIN notification_settings ns ON ns.landlord_id = l.landlord_id
       WHERE l.lease_status = 'active'
         AND u_tenant.is_approved = 1
         AND u_tenant.deleted_at IS NULL`
    );

    const leases = leasesResult.rows;
    let notificationsSent = 0;
    let notificationsSkipped = 0;

    for (const lease of leases) {
      try {
        // ── STEP 10 (send_time filter): Only process if current hour matches
        //    the landlord's preferred send_time hour. Defaults to 08 if unset.
        const preferredHour = String((lease.send_time || '08:00').split(':')[0]).padStart(2, '0');
        if (preferredHour !== currentHour) {
          notificationsSkipped++;
          continue;
        }

        // ── STEP 3: Calculate next due date ───────────────────────────────────
        const nextDue = getNextDueDate(Number(lease.due_day));

        // ── STEP 4: Days until (or since) due ────────────────────────────────
        const days = daysDiff(nextDue);

        // ── STEP 5: Check if rent is fully paid this cycle ───────────────────
        const isFullyPaid =
          parseFloat(lease.amount_paid_this_cycle) >= parseFloat(lease.rent_amount);

        if (isFullyPaid) {
          notificationsSkipped++;
          continue; // Rent already paid — skip
        }

        // ── STEP 5 (cont.): Determine if notification is due today ────────────
        const ns = {
          remind_30_days:    lease.remind_30_days    ?? true,
          remind_14_days:    lease.remind_14_days    ?? false,
          remind_7_days:     lease.remind_7_days     ?? true,
          remind_3_days:     lease.remind_3_days     ?? false,
          remind_1_day:      lease.remind_1_day      ?? true,
          remind_on_due:     lease.remind_on_due     ?? true,
          frequency_overdue: lease.frequency_overdue ?? 'daily',
        };

        let shouldNotify = false;
        let notifyType   = '';

        if (days === 30 && ns.remind_30_days) {
          shouldNotify = true; notifyType = '30_day_reminder';
        } else if (days === 14 && ns.remind_14_days) {
          shouldNotify = true; notifyType = '14_day_reminder';
        } else if (days === 7 && ns.remind_7_days) {
          shouldNotify = true; notifyType = '7_day_reminder';
        } else if (days === 3 && ns.remind_3_days) {
          shouldNotify = true; notifyType = '3_day_reminder';
        } else if (days === 1 && ns.remind_1_day) {
          shouldNotify = true; notifyType = '1_day_reminder';
        } else if (days === 0 && ns.remind_on_due) {
          shouldNotify = true; notifyType = 'due_today';
        } else if (days < 0) {
          // Overdue — apply frequency_overdue logic
          const daysSinceOverdue = Math.abs(days);
          const freq = ns.frequency_overdue;
          if (freq === 'daily') {
            shouldNotify = true;
          } else if (freq === 'every_2_days' && daysSinceOverdue % 2 === 0) {
            shouldNotify = true;
          } else if (freq === 'weekly' && daysSinceOverdue % 7 === 0) {
            shouldNotify = true;
          }
          if (shouldNotify) notifyType = 'overdue';
        }

        if (!shouldNotify) {
          notificationsSkipped++;
          continue;
        }

        // ── STEP 6: Duplicate prevention — skip if already sent today ─────────
        const existingResult = await db.query(
          `SELECT notification_id FROM notifications
           WHERE lease_id          = $1
             AND notification_type = $2
             AND DATE(sent_at AT TIME ZONE 'Africa/Lagos') = $3`,
          [lease.lease_id, notifyType, todayStr]
        );

        if (existingResult.rows.length > 0) {
          notificationsSkipped++;
          continue; // Already sent this type of notification today
        }

        // ── Build due date string ─────────────────────────────────────────────
        const dueDateStr = nextDue.toLocaleDateString('en-NG', {
          timeZone: 'Africa/Lagos',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        const emailPayload = {
          hostelName:    lease.hostel_name || 'Your Hostel',
          roomNumber:    lease.room_number,
          rentAmount:    lease.rent_amount,
          amountPaid:    lease.amount_paid_this_cycle,
          dueDate:       dueDateStr,
          daysUntilDue:  days,
        };

        // ── STEP 7: Send emails (non-blocking — .catch() prevents engine halt) ─
        sendTenantRentReminderEmail({
          toEmail:    lease.tenant_email,
          tenantName: lease.tenant_name,
          ...emailPayload,
        }).catch((err) =>
          console.error(`[EMAIL ERROR] Tenant email failed for lease ${lease.lease_id}:`, err.message)
        );

        sendLandlordRentAlertEmail({
          toEmail:        lease.landlord_email,
          landlordName:   lease.landlord_name,
          tenantName:     lease.tenant_name,
          tenantUsername: lease.tenant_username || lease.tenant_email,
          ...emailPayload,
        }).catch((err) =>
          console.error(`[EMAIL ERROR] Landlord email failed for lease ${lease.lease_id}:`, err.message)
        );

        // ── STEP 8: Log the notification in the database ──────────────────────
        await db.query(
          `INSERT INTO notifications
             (lease_id, tenant_id, landlord_id, channel,
              notification_type, message_body, delivery_status, sent_at)
           VALUES ($1, $2, $3, 'email', $4, $5, 'sent', NOW())`,
          [
            lease.lease_id,
            lease.tenant_id,
            lease.landlord_id,
            notifyType,
            `${notifyType} sent to ${lease.tenant_email}`,
          ]
        );

        // ── STEP 9: Console log for monitoring ────────────────────────────────
        const balance = parseFloat(lease.rent_amount) - parseFloat(lease.amount_paid_this_cycle);
        console.log(
          `[CRON] ${notifyType} → ${lease.tenant_email} (${days} days, balance ₦${balance.toLocaleString('en-NG')})`
        );

        notificationsSent++;
      } catch (leaseError) {
        console.error(
          `[CRON ERROR] Failed to process lease ${lease.lease_id}:`,
          leaseError.message
        );
      }
    }

    console.log(
      `[CRON ENGINE] Done — Sent: ${notificationsSent} | Skipped: ${notificationsSkipped} | Total leases: ${leases.length}`
    );
  } catch (error) {
    console.error('[CRON ENGINE ERROR]', error.message);
  }
};

module.exports = { runNotificationEngine };
