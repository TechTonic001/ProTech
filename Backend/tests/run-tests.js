const path = require('path');
const testModule = require('./notificationEngine.test');

try {
  testModule.runAll();
  console.log('[RUN TESTS] Success');
  process.exit(0);
} catch (err) {
  console.error('[RUN TESTS] Failure:', err && err.stack ? err.stack : err);
  process.exit(1);
}
