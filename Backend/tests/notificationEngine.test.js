const assert = require('assert');
const { computeDaysUntilDue, determineShouldNotify } = require('../utils/notificationEngine');

function testComputeDays() {
  // Use a fixed 'today' for deterministic tests
  const today = new Date('2026-07-29T12:00:00Z');

  // due today
  assert.strictEqual(computeDaysUntilDue('2026-07-29', today), 0);

  // due tomorrow
  assert.strictEqual(computeDaysUntilDue('2026-07-30', today), 1);

  // due 7 days ahead
  assert.strictEqual(computeDaysUntilDue('2026-08-05', today), 7);

  // overdue by 1
  assert.strictEqual(computeDaysUntilDue('2026-07-28', today), -1);

  console.log('[TEST] computeDaysUntilDue passed');
}

function testDetermineShouldNotify() {
  const baseSettings = {};

  let r;
  r = determineShouldNotify(30, baseSettings);
  assert.strictEqual(r.shouldNotify, true);
  assert.strictEqual(r.notifyType, '30_day_reminder');

  r = determineShouldNotify(14, { remind_14_days: true });
  assert.strictEqual(r.shouldNotify, true);
  assert.strictEqual(r.notifyType, '14_day_reminder');

  r = determineShouldNotify(7, baseSettings);
  assert.strictEqual(r.shouldNotify, true);
  assert.strictEqual(r.notifyType, '7_day_reminder');

  r = determineShouldNotify(3, { remind_3_days: true });
  assert.strictEqual(r.shouldNotify, true);
  assert.strictEqual(r.notifyType, '3_day_reminder');

  r = determineShouldNotify(1, baseSettings);
  assert.strictEqual(r.shouldNotify, true);
  assert.strictEqual(r.notifyType, '1_day_reminder');

  r = determineShouldNotify(0, baseSettings);
  assert.strictEqual(r.shouldNotify, true);
  assert.strictEqual(r.notifyType, 'due_today');

  r = determineShouldNotify(-1, { frequency_overdue: 'daily' });
  assert.strictEqual(r.shouldNotify, true);
  assert.strictEqual(r.notifyType, 'overdue');

  r = determineShouldNotify(-2, { frequency_overdue: 'every_2_days' });
  assert.strictEqual(r.shouldNotify, true);

  r = determineShouldNotify(-3, { frequency_overdue: 'every_2_days' });
  assert.strictEqual(r.shouldNotify, false);

  console.log('[TEST] determineShouldNotify passed');
}

function runAll() {
  testComputeDays();
  testDetermineShouldNotify();
  console.log('[TEST] All notificationEngine tests passed');
}

if (require.main === module) runAll();

module.exports = { runAll };
