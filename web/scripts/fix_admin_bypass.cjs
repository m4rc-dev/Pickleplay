const fs = require('fs');
const path = require('path');
const APP_PATH = path.join(__dirname, '..', 'App.tsx');
let c = fs.readFileSync(APP_PATH, 'utf8').replace(/\r\n/g, '\n');

const before = `  const isAdminForFeatures = role === 'ADMIN';`;
const after   = `  // Bypass features for actual admins even when they've switched to a non-admin role
  const isAdminForFeatures = role === 'ADMIN' || isActualAdmin;`;

if (c.includes(before)) {
  c = c.replace(before, after);
  console.log('OK: isAdminForFeatures now includes isActualAdmin');
} else {
  console.log('MISS - current line:');
  const lines = c.split('\n');
  const idx = lines.findIndex(l => l.includes('isAdminForFeatures'));
  for (let i = idx - 1; i <= idx + 1; i++) console.log((i+1) + ': ' + lines[i]);
}

c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(APP_PATH, c, 'utf8');
console.log('lines=' + c.split('\r\n').length);
