// utils/notificationEngine.js
// ── ProTech Notification Engine ──────────────────────────────────────────────
// Runs every hour (via server.js cron), checks each active lease against the
// landlord's notification_settings, and fires emails + logs notifications.
// Only sends if the current hour matches the landlord's preferred send_time.

const db = require('../config/db');
const { sendTenantRentReminderEmail, sendLandlordRentAlertEmail } = require('./email');
const { sendPushNotification } = require('./push');

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * (Deprecated) Helper retained for legacy reasons — dates are now
 * derived from `end_date`. Previously the system used a `due_day` value
 * to compute monthly due dates; that has been replaced by the lease
 * `end_date`, which is the single source of truth for payment due dates.
 */
/**
 * Compute days until due based on an `YYYY-MM-DD` end_date string using
 * Africa/Lagos as the canonical timezone. Returns integer days (positive,
 * zero, or negative).
 * @param {string} endDateStr - 'YYYY-MM-DD'
 * @param {Date} [now] - optional now override for testing
 * @returns {number}
 */
function computeDaysUntilDue(endDateStr, now = null) {
  if (!endDateStr) return null;
  const todayWAT = (now || new Date()).toLocaleDateString('en-CA', { timeZone: 'Africa/Lagos' });
  const todayMs = new Date(`${todayWAT}T12:00:00`).getTime();
  const dueMs = new Date(`${endDateStr}T12:00:00`).getTime();
  const msPerDay = 86400000;
  return Math.round((dueMs - todayMs) / msPerDay);
}

/**
 * Determine whether a notification should be sent given days until due and
 * the landlord's notification settings. Returns { shouldNotify, notifyType }.
 */
function determineShouldNotify(days, ns) {
  const settings = {
    remind_30_days:    ns.remind_30_days    ?? true,
    remind_14_days:    ns.remind_14_days    ?? false,
    remind_7_days:     ns.remind_7_days     ?? true,
    remind_3_days:     ns.remind_3_days     ?? false,
    remind_1_day:      ns.remind_1_day      ?? true,
    remind_on_due:     ns.remind_on_due     ?? true,
    frequency_overdue: ns.frequency_overdue ?? 'daily',
  };

  let shouldNotify = false;
  let notifyType = '';

  if (days === 30 && settings.remind_30_days) {
    shouldNotify = true; notifyType = '30_day_reminder';
  } else if (days === 14 && settings.remind_14_days) {
    shouldNotify = true; notifyType = '14_day_reminder';
  } else if (days === 7 && settings.remind_7_days) {
    shouldNotify = true; notifyType = '7_day_reminder';
  } else if (days === 3 && settings.remind_3_days) {
    shouldNotify = true; notifyType = '3_day_reminder';
  } else if (days === 1 && settings.remind_1_day) {
    shouldNotify = true; notifyType = '1_day_reminder';
  } else if (days === 0 && settings.remind_on_due) {
    shouldNotify = true; notifyType = 'due_today';
  } else if (days < 0) {
    // Overdue — apply frequency_overdue logic
    const daysSinceOverdue = Math.abs(days);
    const freq = settings.frequency_overdue;
    if (freq === 'daily') {
      shouldNotify = true;
    } else if (freq === 'every_2_days' && daysSinceOverdue % 2 === 0) {
      shouldNotify = true;
    } else if (freq === 'weekly' && daysSinceOverdue % 7 === 0) {
      shouldNotify = true;
    }
    if (shouldNotify) notifyType = 'overdue';
  }

  return { shouldNotify, notifyType };
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
         TO_CHAR(l.end_date, 'YYYY-MM-DD') AS end_date,
         TO_CHAR(l.end_date, 'YYYY-MM-DD') AS due_date,
         l.rent_amount,
         COALESCE(l.amount_paid_this_cycle, 0) AS amount_paid_this_cycle,
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

        // ── STEP 3: Calculate days until due using lease.end_date (WAT)
        if (!lease.end_date) {
          notificationsSkipped++;
          continue;
        }

        const days = computeDaysUntilDue(lease.end_date);

        // ── STEP 5: Check if rent is fully paid this cycle ───────────────────
        const isFullyPaid =
          parseFloat(lease.amount_paid_this_cycle) >= parseFloat(lease.rent_amount);

        if (isFullyPaid) {
          notificationsSkipped++;
          continue; // Rent already paid — skip
        }

        // ── STEP 5 (cont.): Determine if notification is due today ────────────
        const { shouldNotify, notifyType } = determineShouldNotify(days, lease);

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

        // ── Build due date string from end_date ──────────────────────────────
        const dueDateStr = new Date(`${lease.end_date}T12:00:00`).toLocaleDateString('en-NG', {
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
        const tenantEmailResult = await sendTenantRentReminderEmail({
          toEmail:    lease.tenant_email,
          tenantName: lease.tenant_name,
          ...emailPayload,
        });

        const landlordEmailResult = await sendLandlordRentAlertEmail({
          toEmail:        lease.landlord_email,
          landlordName:   lease.landlord_name,
          tenantName:     lease.tenant_name,
          tenantUsername: lease.tenant_username || lease.tenant_email,
          ...emailPayload,
        });

        const tenantPushResult = await sendPushNotification(
          lease.tenant_id,
          `Rent Reminder: ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ${days < 0 ? 'overdue' : 'until due'}`,
          days < 0
            ? `Your rent is ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue. Pay now to avoid more penalties.`
            : `Your rent is due in ${days} day${days === 1 ? '' : 's'}. Balance: ₦${Math.max(0, parseFloat(lease.rent_amount || 0) - parseFloat(lease.amount_paid_this_cycle || 0)).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
        );

        const landlordPushResult = await sendPushNotification(
          lease.landlord_id,
          `Tenant Rent Alert: ${lease.tenant_name}`,
          days < 0
            ? `${lease.tenant_name} is ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue. Balance: ₦${Math.max(0, parseFloat(lease.rent_amount || 0) - parseFloat(lease.amount_paid_this_cycle || 0)).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
            : `${lease.tenant_name}'s rent is due in ${days} day${days === 1 ? '' : 's'}. Balance: ₦${Math.max(0, parseFloat(lease.rent_amount || 0) - parseFloat(lease.amount_paid_this_cycle || 0)).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
        );

        const deliveryStatus = tenantEmailResult.success && landlordEmailResult.success ? 'sent' : 'failed';
        const messageBody = `${notifyType} tenant email ${tenantEmailResult.success ? 'sent' : `failed: ${tenantEmailResult.error || 'unknown'}`} / landlord email ${landlordEmailResult.success ? 'sent' : `failed: ${landlordEmailResult.error || 'unknown'}`} / tenant push ${tenantPushResult?.success ? 'sent' : `failed: ${tenantPushResult?.error || 'unknown'}`} / landlord push ${landlordPushResult?.success ? 'sent' : `failed: ${landlordPushResult?.error || 'unknown'}`}`;

        // ── STEP 8: Log the notification in the database ──────────────────────
        await db.query(
          `INSERT INTO notifications
             (lease_id, tenant_id, landlord_id, channel,
              notification_type, message_body, delivery_status, sent_at)
           VALUES ($1, $2, $3, 'email', $4, $5, $6, NOW())`,
          [
            lease.lease_id,
            lease.tenant_id,
            lease.landlord_id,
            notifyType,
            messageBody,
            deliveryStatus,
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
