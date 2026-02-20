const fs = require('fs');
const path = require('path');
const APP_PATH = path.join(__dirname, '..', 'App.tsx');
let c = fs.readFileSync(APP_PATH, 'utf8').replace(/\r\n/g, '\n');

// Remove the navigate call from FeatureGate — route-level <FeatureUnavailable />
// handles display, so the navigate causes a redirect loop.
const before = `    if (matchedFeature && !enabledFeatures.has(matchedFeature)) {
      console.warn('[FeatureGate] BLOCK', { role, currentPath, matchedFeature, enabledFeatures: [...enabledFeatures] });
      navigate('/', { replace: true });
    }`;

const after = `    if (matchedFeature && !enabledFeatures.has(matchedFeature)) {
      console.warn('[FeatureGate] BLOCK', { role, currentPath, matchedFeature, enabledFeatures: [...enabledFeatures] });
      // Route-level <FeatureUnavailable /> handles the blocked UI — no redirect needed.
    }`;

if (c.includes(before)) {
  c = c.replace(before, after);
  console.log('OK: removed navigate from FeatureGate');
} else {
  console.log('MISS — checking current state:');
  const lines = c.split('\n');
  const idx = lines.findIndex(l => l.includes('[FeatureGate] BLOCK'));
  if (idx >= 0) {
    for (let i = idx - 1; i <= idx + 3; i++) console.log((i+1) + ': ' + lines[i]);
  }
}

c = c.replace(/\n/g, '\r\n');
fs.writeFileSync(APP_PATH, c, 'utf8');
console.log('lines=' + c.split('\r\n').length);
