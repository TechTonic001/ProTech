// scripts/paystack-test.js
// Simple local test runner for Paystack utils: getBanks and resolveAccountNumber
// Usage:
//   PAYSTACK_SECRET_KEY=sk_test_... node scripts/paystack-test.js banks
//   PAYSTACK_SECRET_KEY=sk_test_... node scripts/paystack-test.js resolve --account 0123456789 --bank 044

const path = require('path');
const rawArgs = process.argv.slice(2);
const argv = { _: [], };
let i = 0;
while (i < rawArgs.length) {
  const a = rawArgs[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const v = rawArgs[i+1] && !rawArgs[i+1].startsWith('--') ? rawArgs[++i] : true;
    argv[k] = v;
  } else if (a.startsWith('-')) {
    const k = a.slice(1);
    const v = rawArgs[i+1] && !rawArgs[i+1].startsWith('-') ? rawArgs[++i] : true;
    argv[k] = v;
  } else {
    argv._.push(a);
  }
  i++;
}

const PAYSTACK = require(path.join(__dirname, '..', 'Backend', 'utils', 'paystack'));

async function run() {
  const cmd = argv._[0] || 'banks';
  console.log('Running paystack-test command:', cmd);

  try {
    if (cmd === 'banks') {
      const banks = await PAYSTACK.getBanks();
      console.log('Banks fetched:', banks.length);
      console.log(banks.slice(0, 10).map(b => ({ name: b.name, code: b.code, slug: b.slug })));
    } else if (cmd === 'resolve') {
      const account = argv.account || argv.a;
      const bank = argv.bank || argv.b;
      if (!account || !bank) {
        console.error('Missing --account or --bank');
        process.exit(2);
      }
      const res = await PAYSTACK.resolveAccountNumber(account, bank);
      console.log('Resolve result:', res);
    } else {
      console.error('Unknown command:', cmd);
      process.exit(2);
    }
  } catch (err) {
    console.error('Paystack test error:', err.message || err);
    process.exit(1);
  }
}

run();
