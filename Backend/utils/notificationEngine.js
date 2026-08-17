// Complete rewrite of notification engine per spec
const db = require('../config/db');
const {
  sendRentReminderEmail,
  sendLandlordRentAlert,
} = require('./email');

const runNotificationEngine = async (currentHour) => {
  console.log(`
    [CRON] Notification engine running — WAT hour: ${currentHour}
  `);

  // Today in Africa/Lagos as YYYY-MM-DD string
  const todayWAT = new Date().toLocaleDateString('en-CA', {
    timeZone: 'Africa/Lagos'
  });

  try {
    const [leases] = await db.query(`
      SELECT
        l.lease_id,
        l.tenant_id,
        l.landlord_id,
        l.rent_amount,
        l.amount_paid_this_cycle,
        l.rent_amount - l.amount_paid_this_cycle AS remaining,
        TO_CHAR(l.end_date, 'YYYY-MM-DD')   AS end_date,
        TO_CHAR(l.end_date, 'YYYY-MM-DD')   AS due_date,
        (l.end_date::DATE -
          (NOW() AT TIME ZONE 'Africa/Lagos')::DATE
        )                                    AS days_remaining,
        u_t.email      AS tenant_email,
        u_t.full_name  AS tenant_name,
        u_l.email      AS landlord_email,
        u_l.full_name  AS landlord_name,
        u_l.hostel_name,
        r.room_number,
        p.property_name,
        COALESCE(ns.remind_30_days,  TRUE)   AS remind_30_days,
        COALESCE(ns.remind_14_days,  FALSE)  AS remind_14_days,
        COALESCE(ns.remind_7_days,   TRUE)   AS remind_7_days,
        COALESCE(ns.remind_3_days,   FALSE)  AS remind_3_days,
        COALESCE(ns.remind_1_day,    TRUE)   AS remind_1_day,
        COALESCE(ns.remind_on_due,   TRUE)   AS remind_on_due,
        COALESCE(ns.send_time,      '08:00') AS send_time,
        COALESCE(ns.frequency_overdue,'daily') AS frequency_overdue
      FROM leases l
      JOIN users u_t   ON l.tenant_id   = u_t.user_id
      JOIN users u_l   ON l.landlord_id = u_l.user_id
      JOIN rooms r     ON l.room_id     = r.room_id
      JOIN properties p ON r.property_id = p.property_id
      LEFT JOIN notification_settings ns
        ON ns.landlord_id = l.landlord_id
      WHERE l.is_active = TRUE
        AND l.amount_paid_this_cycle < l.rent_amount
        AND u_t.deleted_at IS NULL
        AND r.deleted_at IS NULL
        AND p.deleted_at IS NULL
    `);

    console.log(`[CRON] Found ${leases.length} active unpaid leases`);

    let sent = 0; let skipped = 0;

    for (const lease of leases) {

      const days = parseInt(lease.days_remaining);

      // ── Send-time filter ──────────────────────────────
      const preferredHour = (lease.send_time || '08:00')
        .split(':')[0].padStart(2,'0')

      if (preferredHour !== currentHour) {
        skipped++
        continue
      }

      // ── Determine notification type ───────────────────
      let notifyType = null

      if (days === 30 && lease.remind_30_days)
        notifyType = 'reminder_30_days'
      else if (days === 14 && lease.remind_14_days)
        notifyType = 'reminder_14_days'
      else if (days === 7  && lease.remind_7_days)
        notifyType = 'reminder_7_days'
      else if (days === 3  && lease.remind_3_days)
        notifyType = 'reminder_3_days'
      else if (days === 1  && lease.remind_1_day)
        notifyType = 'reminder_1_day'
      else if (days === 0  && lease.remind_on_due)
        notifyType = 'due_today'
      else if (days < 0) {
        const daysPast = Math.abs(days)
        const freq = lease.frequency_overdue || 'daily'
        let shouldSend = false

        if (freq === 'daily')
          shouldSend = true
        else if (freq === 'every_2_days' && daysPast % 2 === 0)
          shouldSend = true
        else if (freq === 'weekly' && daysPast % 7 === 0)
          shouldSend = true

        if (shouldSend) notifyType = 'overdue'
      }

      if (!notifyType) { skipped++; continue }

      // ── Duplicate prevention (per-day idempotency) ───
      const [existing] = await db.query(`
        SELECT notification_id FROM notifications
        WHERE lease_id = $1
          AND notification_type = $2
          AND DATE(
            sent_at AT TIME ZONE 'Africa/Lagos'
          ) = $3::DATE
      `, [lease.lease_id, notifyType, todayWAT])

      if (existing.length > 0) {
        console.log(
          `[CRON] Duplicate skipped: ${notifyType} for lease ${lease.lease_id}`
        )
        skipped++
        continue
      }

      // ── Build urgency label and email subject ─────────
      const remaining = parseFloat(lease.remaining || 0)
      let urgencyLabel, tenantSubject, landlordSubject

      if (days > 0) {
        urgencyLabel   = `${days} day${days===1?'':'s'} remaining`
        tenantSubject  = `Rent Reminder: ${urgencyLabel} until your rent is due`
        landlordSubject= `Tenant Rent Alert: ${lease.tenant_name} — ${urgencyLabel}`
      } else if (days === 0) {
        urgencyLabel   = 'Due TODAY'
        tenantSubject  = 'Action Required: Your rent is due today'
        landlordSubject= `Tenant Rent Alert: ${lease.tenant_name} — due TODAY`
      } else {
        const d = Math.abs(days)
        urgencyLabel   = `${d} day${d===1?'':'s'} OVERDUE`
        tenantSubject  = `OVERDUE: Your rent is ${urgencyLabel}`
        landlordSubject= `OVERDUE ALERT: ${lease.tenant_name} — ${urgencyLabel}`
      }

      // ── Send TENANT email ─────────────────────────────
      sendRentReminderEmail(
        lease.tenant_email,
        lease.tenant_name,
        {
          subject:         tenantSubject,
          hostelName:      lease.hostel_name || lease.property_name,
          propertyName:    lease.property_name,
          roomNumber:      lease.room_number,
          amountRemaining: remaining,
          dueDate:         lease.due_date,
          urgencyLabel,
          notifyType,
          days,
          payNowLink: `${process.env.FRONTEND_URL}/tenant/login`
        }
      ).then(() => {
        console.log(
          `[CRON] ✅ ${notifyType} → tenant ${lease.tenant_email}`
          + ` | ${urgencyLabel} | ₦${remaining.toLocaleString()} remaining`
        )
      }).catch(err => {
        console.error(
          `[CRON] ❌ Tenant email FAILED for lease ${lease.lease_id}:`,
          err.message
        )
      })

      // ── Send LANDLORD alert email ─────────────────────
      sendLandlordRentAlert(
        lease.landlord_email,
        lease.landlord_name,
        {
          subject:         landlordSubject,
          tenantName:      lease.tenant_name,
          roomNumber:      lease.room_number,
          amountRemaining: remaining,
          dueDate:         lease.due_date,
          urgencyLabel,
          notifyType,
          days
        }
      ).then(() => {
        console.log(
          `[CRON] ✅ ${notifyType} → landlord ${lease.landlord_email}`
        )
      }).catch(err => {
        console.error(
          `[CRON] ❌ Landlord alert FAILED for lease ${lease.lease_id}:`,
          err.message
        )
      })

      // ── Log notification to database ──────────────────
      await db.query(`
        INSERT INTO notifications
          (lease_id, tenant_id, landlord_id,
           channel, notification_type, message_body,
           delivery_status, sent_at)
        VALUES ($1,$2,$3,'email',$4,$5,'sent',NOW())
      `, [
        lease.lease_id,
        lease.tenant_id,
        lease.landlord_id,
        notifyType,
        `${notifyType}: ${urgencyLabel} — ₦${remaining.toLocaleString()} remaining — due ${lease.due_date}`
      ])

      sent++
    }

    console.log(
      `[CRON] Complete — ${sent} notifications sent, `
      + `${skipped} skipped (time filter or already sent)`
    )

  } catch (err) {
    console.error('[CRON] Notification engine error:', err.message)
  }
}

module.exports = { runNotificationEngine }
  