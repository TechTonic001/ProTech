const assert = require('node:assert/strict');
const { hasLandlordPaymentSetup } = require('../utils/paymentGuard');

const tests = [
  {
    name: 'returns false when landlord has no payment setup',
    input: {},
    expected: false,
  },
  {
    name: 'returns true when a subaccount code exists',
    input: { subaccount_code: 'ACCT_123' },
    expected: true,
  },
  {
    name: 'returns true when bank details are present',
    input: { bank_name: 'Access Bank', account_number: '1234567890', account_name: 'Jane Doe' },
    expected: true,
  },
];

for (const test of tests) {
  const result = hasLandlordPaymentSetup(test.input);
  assert.equal(result, test.expected, `${test.name} failed`);
}

console.log(`paymentGuard tests passed (${tests.length})`);
