const fs = require('fs');
const path = require('path');
const APP_PATH = path.join(__dirname, '..', 'App.tsx');
let c = fs.readFileSync(APP_PATH, 'utf8').replace(/\r\n/g, '\n');

// Show lines 460-506 to diagnose
const lines = c.split('\n');
console.log('--- CONTEXT ---');
for (let i = 460; i < 510; i++) {
  console.log((i+1) + ': ' + lines[i]);
}
