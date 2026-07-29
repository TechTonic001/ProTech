const WAT_LOCALE = 'en-NG'
const WAT_TZ     = 'Africa/Lagos'

/**
 * Get today's date string in WAT as YYYY-MM-DD
 */
export const todayWAT = () => {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: WAT_TZ
  })
  // en-CA locale gives YYYY-MM-DD format
}

/**
 * Format any ISO date string or Date to "15 July 2026"
 * Always interprets the date in Africa/Lagos timezone.
 * Accepts: '2026-07-31', new Date(), '2026-07-31T00:00:00Z'
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return 'Not set'
  try {
    // Parse YYYY-MM-DD strings without timezone conversion
    // by appending T12:00:00 (noon) to avoid midnight
    // UTC-to-WAT shift
    const d = typeof dateInput === 'string'
      && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)
      ? new Date(`${dateInput}T12:00:00`)
      : new Date(dateInput)

    return d.toLocaleDateString(WAT_LOCALE, {
      timeZone: WAT_TZ,
      day:   'numeric',
      month: 'long',
      year:  'numeric'
    })
  } catch {
    return 'Invalid date'
  }
}

/**
 * Format to short date: "31 Jul 2026"
 */
export const formatDateShort = (dateInput) => {
  if (!dateInput) return '—'
  try {
    const d = typeof dateInput === 'string'
      && dateInput.match(/^\d{4}-\d{2}-\d{2}$/)
      ? new Date(`${dateInput}T12:00:00`)
      : new Date(dateInput)

    return d.toLocaleDateString(WAT_LOCALE, {
      timeZone: WAT_TZ,
      day:   'numeric',
      month: 'short',
      year:  'numeric'
    })
  } catch {
    return '—'
  }
}

/**
 * THE CORE FUNCTION — uses end_date as the due date.
 *
 * Calculates the number of days between today (WAT)
 * and the lease end_date (which IS the due date).
 *
 * Returns:
 *   Positive number → days remaining before due date
 *   Zero            → due date is today
 *   Negative number → days past due (overdue)
 *
 * @param {string} endDate — ISO date string 'YYYY-MM-DD'
 */
export const daysUntilDue = (endDate) => {
  if (!endDate) return null

  const today = todayWAT()  // 'YYYY-MM-DD'

  // Parse both as local dates (no timezone shift)
  const todayMs = new Date(`${today}T12:00:00`).getTime()
  const dueMs   = new Date(`${endDate}T12:00:00`).getTime()

  const msPerDay = 1000 * 60 * 60 * 24
  return Math.round((dueMs - todayMs) / msPerDay)
}

/**
 * Returns a human-readable status label based on
 * how many days remain until end_date.
 */
export const dueDateLabel = (endDate) => {
  const days = daysUntilDue(endDate)
  if (days === null) return 'No due date set'
  if (days > 1)  return `${days} days remaining`
  if (days === 1) return '1 day remaining'
  if (days === 0) return 'Due today'
  if (days === -1) return '1 day overdue'
  return `${Math.abs(days)} days overdue`
}

/**
 * Returns the CSS colour classes for a due date status:
 *   Green  → paid or more than 7 days remaining
 *   Amber  → 7 days or fewer remaining (warning)
 *   Red    → overdue or due today
 */
export const dueDateColour = (endDate, isFullyPaid) => {
  if (isFullyPaid) {
    return {
      bg: 'bg-green-100',
      text: 'text-green-700',
      border: 'border-green-200',
      label: 'Paid'
    }
  }
  const days = daysUntilDue(endDate)
  if (days === null) return {
    bg: 'bg-slate-100', text: 'text-slate-500',
    border: 'border-slate-200', label: 'Unknown'
  }
  if (days < 0) return {
    bg: 'bg-red-100', text: 'text-red-700',
    border: 'border-red-300', label: dueDateLabel(endDate)
  }
  if (days === 0) return {
    bg: 'bg-red-100', text: 'text-red-700',
    border: 'border-red-300', label: 'Due today'
  }
  if (days <= 7) return {
    bg: 'bg-amber-100', text: 'text-amber-700',
    border: 'border-amber-300', label: dueDateLabel(endDate)
  }
  return {
    bg: 'bg-green-100', text: 'text-green-700',
    border: 'border-green-200', label: dueDateLabel(endDate)
  }
}

/**
 * Check if a lease is overdue.
 * Overdue = end_date has passed AND rent not fully paid.
 */
export const isLeaseOverdue = (endDate, amountPaid,
                                rentAmount) => {
  const days = daysUntilDue(endDate)
  if (days === null) return false
  const fullyPaid = parseFloat(amountPaid || 0)
                 >= parseFloat(rentAmount || 0)
  return days < 0 && !fullyPaid
}

/**
 * Lease duration label from start to end:
 * "1 Aug 2026 → 31 Jul 2027"
 */
export const leasePeriodLabel = (startDate, endDate) => {
  return `${formatDateShort(startDate)} → ${formatDateShort(endDate)}`
}

