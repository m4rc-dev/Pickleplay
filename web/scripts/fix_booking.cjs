const fs = require('fs');
const path = require('path');
const APP_PATH = path.join(__dirname, '..', 'App.tsx');
let c = fs.readFileSync(APP_PATH, 'utf8').replace(/\r\n/g, '\n');

// Fix 1: merge the two opening lines into one valid expression
// FROM: {feat('booking') && (\n                {isSidebarCollapsed ? (
// TO:   {feat('booking') && (isSidebarCollapsed ? (
const badOpen = `                {feat('booking') && (\n                {isSidebarCollapsed ? (`;
const goodOpen = `                {feat('booking') && (isSidebarCollapsed ? (`;
if (c.includes(badOpen)) {
  c = c.replace(badOpen, goodOpen);
  console.log('OK: merged opening');
} else {
  console.log('MISS: opening - checking current state...');
}

// Fix 2: merge the two closing )} into one ))}
// The ternary closes with )} and then our outer && closes with )}
// They appear back-to-back right before {feat('messages')
const badClose = `                )}\n                )}\n                {feat('messages')`;
const goodClose = `                ))}\n                {feat('messages')`;
if (c.includes(badClose)) {
  c = c.replace(badClose, goodClose);
  console.log('OK: merged closing');
} else {
  console.log('MISS: closing - checking...');
  // Print lines 488-498
  const lines = c.split('\n');
  for (let i = 488; i < 498; i++) {
    console.log((i+1) + ': ' + JSON.stringify(lines[i]));
  }
}

c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(APP_PATH, c, 'utf8');
console.log('lines=' + c.split('\r\n').length);
